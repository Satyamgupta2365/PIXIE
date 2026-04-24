"""
PIXEL Satellite Service
=======================
Wraps N2YO REST API v1 to provide real-time satellite telemetry.
API Key: 6J75QX-QN6GA4-EYQY2X-5Q5E
"""

import httpx
from typing import Any, Dict, Optional

N2YO_API_KEY = "6J75QX-QN6GA4-EYQY2X-5Q5E"
N2YO_BASE = "https://api.n2yo.com/rest/v1/satellite"

# Observer location (New Delhi, India — can be parameterized later)
OBS_LAT = 28.6139
OBS_LNG = 77.2090
OBS_ALT = 0

# Well-known satellite IDs
SATELLITE_CATALOG = {
    "iss":     {"id": 25544, "name": "ISS (ZARYA)",          "type": "Space Station",     "orbit": "LEO", "inclination": 51.6},
    "hubble":  {"id": 20580, "name": "Hubble Space Telescope","type": "Space Telescope",   "orbit": "LEO", "inclination": 28.5},
    "noaa19":  {"id": 33591, "name": "NOAA 19",               "type": "Weather Satellite",  "orbit": "SSO", "inclination": 99.0},
}

CELESTRAK_CACHE = []

async def fetch_celestrak_active():
    """Fetch the active satellite catalog from CelesTrak and cache it in memory."""
    global CELESTRAK_CACHE
    if CELESTRAK_CACHE:
        return CELESTRAK_CACHE
    
    url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            data = resp.json()
            CELESTRAK_CACHE = [
                {
                    "id": sat["NORAD_CAT_ID"],
                    "name": sat["OBJECT_NAME"],
                    "orbit": "Unknown",
                    "type": "Satellite",
                    "inclination": sat.get("INCLINATION", 50.0)
                }
                for sat in data if "NORAD_CAT_ID" in sat and "OBJECT_NAME" in sat
            ]
            return CELESTRAK_CACHE
    except Exception as e:
        print(f"Error fetching CelesTrak data: {e}")
        return []

async def search_satellites(query: str) -> list:
    """Search for satellites by name in the active catalog."""
    query = query.lower().strip()
    if not query:
        return []
    
    catalog = await fetch_celestrak_active()
    results = [sat for sat in catalog if query in sat["name"].lower()]
    # Return top 20 matches to avoid huge payloads
    return results[:20]



async def get_position(sat_id: int, seconds: int = 1) -> Dict[str, Any]:
    """Fetch real-time satellite position from N2YO."""
    url = (
        f"{N2YO_BASE}/positions/{sat_id}/{OBS_LAT}/{OBS_LNG}/{OBS_ALT}/{seconds}/"
        f"&apiKey={N2YO_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = client.get(url)
        resp = await resp if hasattr(resp, "__await__") else resp
        data = resp.json()

    pos = data["positions"][0]
    return {
        "name":      data["info"]["satname"],
        "norad_id":  data["info"]["satid"],
        "latitude":  pos["satlatitude"],
        "longitude": pos["satlongitude"],
        "altitude_km": pos["sataltitude"],
        "azimuth":   pos["azimuth"],
        "elevation": pos["elevation"],
        "ra":        pos["ra"],
        "dec":       pos["dec"],
        "timestamp": pos["timestamp"],
        "transactions_count": data["info"]["transactionscount"],
    }


async def get_tle(sat_id: int) -> Dict[str, Any]:
    """Fetch TLE data for orbital propagation."""
    url = f"{N2YO_BASE}/tle/{sat_id}&apiKey={N2YO_API_KEY}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url)
        data = resp.json()
    return {
        "name":   data["info"]["satname"],
        "norad_id": data["info"]["satid"],
        "tle":    data["tle"],
    }


async def get_visual_passes(sat_id: int, days: int = 2, min_visibility: int = 60) -> Dict[str, Any]:
    """Get upcoming visual passes for a satellite."""
    url = (
        f"{N2YO_BASE}/visualpasses/{sat_id}/{OBS_LAT}/{OBS_LNG}/{OBS_ALT}/{days}/{min_visibility}/"
        f"&apiKey={N2YO_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url)
        data = resp.json()

    passes = []
    for p in data.get("passes", []):
        passes.append({
            "start_utc":   p["startUTC"],
            "max_utc":     p["maxUTC"],
            "end_utc":     p["endUTC"],
            "max_el":      p["maxEl"],
            "start_az":    p["startAzCompass"],
            "max_az":      p["maxAzCompass"],
            "end_az":      p["endAzCompass"],
            "magnitude":   p.get("mag", "N/A"),
            "duration_s":  p["duration"],
        })
    return {
        "name":  data["info"]["satname"],
        "passes": passes,
        "passes_count": data["info"].get("passescount", 0),
    }


async def get_above(search_radius: int = 70, category_id: int = 0) -> Dict[str, Any]:
    """Get all satellites above the observer within a search radius."""
    url = (
        f"{N2YO_BASE}/above/{OBS_LAT}/{OBS_LNG}/{OBS_ALT}/{search_radius}/{category_id}/"
        f"&apiKey={N2YO_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(url)
        data = resp.json()

    return {
        "category":    data["info"]["category"],
        "sat_count":   data["info"]["satcount"],
        "satellites": [
            {
                "id":          s["satid"],
                "name":        s["satname"],
                "designator":  s["intDesignator"],
                "launch_date": s["launchDate"],
                "latitude":    s["satlat"],
                "longitude":   s["satlng"],
                "altitude_km": s["satalt"],
            }
            for s in data.get("above", [])
        ],
    }


async def get_fleet_positions() -> Dict[str, Any]:
    """Fetch real-time positions for all 3 satellites in our catalog."""
    results = {}
    for key, sat in SATELLITE_CATALOG.items():
        try:
            pos = await get_position(sat["id"])
            results[key] = {**pos, "orbit": sat["orbit"], "type": sat["type"]}
        except Exception as e:
            results[key] = {"error": str(e), "name": sat["name"], "orbit": sat["orbit"], "type": sat["type"]}
    return results
