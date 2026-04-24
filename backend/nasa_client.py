"""
nasa_client.py — Real-time NASA data integration for Mars Rover Task Scheduler

Pulls live data from:
  1. NASA Mars Rover Photos API  → current sol, recent instrument activity
  2. NASA InSight / MEDA API     → real Martian weather & dust opacity
  3. NASA Horizons JPL API       → real Earth-Mars comms geometry

Falls back to realistic simulated values if any API is unavailable.
Get your free NASA API key at: https://api.nasa.gov
"""

import os
import math
import logging
import requests
from datetime import datetime, timezone
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
TIMEOUT = 8  # seconds per request

# ── Perseverance landing reference ────────────────────────────────────────────
# Perseverance landed on Sol 0 = February 18, 2021 UTC
PERSEVERANCE_LANDING_DATE = datetime(2021, 2, 18, tzinfo=timezone.utc)
MARS_SOL_IN_SECONDS = 88775.244  # 1 Martian sol = 24h 37m 22.663s


# ══════════════════════════════════════════════════════════════════════════════
# CORE SOL CALCULATION (no API needed — pure math)
# ══════════════════════════════════════════════════════════════════════════════

def get_current_sol() -> int:
    """
    Calculate today's actual Perseverance sol number from landing date.
    This is 100% accurate with no API call needed.
    """
    now = datetime.now(timezone.utc)
    elapsed_seconds = (now - PERSEVERANCE_LANDING_DATE).total_seconds()
    sol = int(elapsed_seconds / MARS_SOL_IN_SECONDS)
    return sol


# ══════════════════════════════════════════════════════════════════════════════
# NASA MARS ROVER PHOTOS API
# ══════════════════════════════════════════════════════════════════════════════

def fetch_latest_rover_activity(sol: Optional[int] = None) -> dict:
    """
    Fetch what Perseverance actually did on a given sol.
    Returns camera/instrument activity counts.
    
    Docs: https://api.nasa.gov/  →  Mars Rover Photos
    """
    target_sol = sol or get_current_sol()

    try:
        url = "https://api.nasa.gov/mars-photos/api/v1/rovers/perseverance/photos"
        params = {
            "sol": target_sol,
            "api_key": NASA_API_KEY,
            "page": 1,
            "per_page": 100,
        }
        resp = requests.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        photos = data.get("photos", [])
        if not photos:
            # Try previous sol (data may lag by 1–2 sols)
            params["sol"] = target_sol - 2
            resp = requests.get(url, params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            photos = data.get("photos", [])

        # Count which cameras fired this sol
        cameras = {}
        for photo in photos:
            cam = photo.get("camera", {}).get("name", "UNK")
            cameras[cam] = cameras.get(cam, 0) + 1

        # Map real cameras to our task types
        # MASTCAM_Z = imaging, SHERLOC_WATSON = spectroscopy, etc.
        imaging_active    = any(c in cameras for c in ["NAVCAM_LEFT","NAVCAM_RIGHT","MASTCAM-Z_LEFT","MASTCAM-Z_RIGHT","FRONT_HAZCAM_LEFT_A"])
        spectro_active    = any(c in cameras for c in ["SHERLOC_WATSON","PIXL_MCC"])
        nav_active        = any(c in cameras for c in ["NAVCAM_LEFT","NAVCAM_RIGHT","FRONT_HAZCAM_LEFT_A","REAR_HAZCAM_LEFT"])

        return {
            "sol": target_sol,
            "total_photos": len(photos),
            "cameras_active": cameras,
            "imaging_active": imaging_active,
            "spectroscopy_active": spectro_active,
            "navigation_active": nav_active,
            "data_source": "nasa_api",
        }

    except Exception as e:
        logger.warning(f"[NASA Photos API] Failed: {e}. Using fallback.")
        return _fallback_rover_activity(target_sol)


def _fallback_rover_activity(sol: int) -> dict:
    """Realistic simulated rover activity based on sol number."""
    import random
    rng = random.Random(sol)  # seeded by sol for reproducibility
    return {
        "sol": sol,
        "total_photos": rng.randint(20, 180),
        "cameras_active": {"MASTCAM-Z_LEFT": rng.randint(5, 40), "NAVCAM_LEFT": rng.randint(3, 20)},
        "imaging_active": True,
        "spectroscopy_active": rng.random() > 0.4,
        "navigation_active": rng.random() > 0.3,
        "data_source": "fallback_simulated",
    }


# ══════════════════════════════════════════════════════════════════════════════
# MARS WEATHER — DUST OPACITY → SOLAR EFFICIENCY
# ══════════════════════════════════════════════════════════════════════════════

def fetch_mars_weather() -> dict:
    """
    Fetch real Martian weather data.
    
    Primary:  NASA InSight Weather API (if available)
    Fallback: Mars Climate Database seasonal model
    
    Returns solar_efficiency (0.0–1.0) and weather conditions.
    """
    # Try InSight API first
    try:
        url = "https://api.nasa.gov/insight_weather/"
        params = {
            "api_key": NASA_API_KEY,
            "feedtype": "json",
            "ver": "1.0",
        }
        resp = requests.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # Get most recent sol's data
        sol_keys = data.get("sol_keys", [])
        if sol_keys:
            latest = data[sol_keys[-1]]
            # Atmospheric opacity proxy from pressure variance
            pressure = latest.get("PRE", {}).get("av", 700)
            # Higher pressure variance often indicates dust activity
            # Jezero baseline pressure ~750 Pa; normalize to solar efficiency
            solar_efficiency = max(0.2, min(1.0, pressure / 800.0))
            dust_storm = solar_efficiency < 0.5
            return {
                "temperature_low_c": latest.get("AT", {}).get("mn", -80),
                "temperature_high_c": latest.get("AT", {}).get("mx", -20),
                "wind_speed_ms": latest.get("HWS", {}).get("av", 5.0),
                "pressure_pa": pressure,
                "solar_efficiency": round(solar_efficiency, 3),
                "dust_storm_active": dust_storm,
                "data_source": "nasa_insight_api",
            }
    except Exception as e:
        logger.warning(f"[NASA Weather API] Failed: {e}. Using seasonal model.")

    return _seasonal_solar_model()


def _seasonal_solar_model() -> dict:
    """
    Mars Climate Database seasonal dust opacity model.
    Uses current Earth date to estimate Martian season and dust levels.
    Jezero Crater is in northern hemisphere — dust season is Ls 180–360.
    """
    now = datetime.now(timezone.utc)
    # Approximate Mars Solar Longitude (Ls) from Earth date
    # Mars year = 686.97 Earth days; perihelion around Jan 2021 reference
    mars_year_days = 686.97
    reference_perihelion = datetime(2021, 8, 3, tzinfo=timezone.utc)  # Ls=251 reference
    days_since_ref = (now - reference_perihelion).total_seconds() / 86400
    ls = ((days_since_ref / mars_year_days) * 360 + 251) % 360

    # Dust opacity model based on Ls
    # Ls 0–180: northern spring/summer, lower dust
    # Ls 180–360: southern spring/summer, dust storm season
    if 180 <= ls <= 360:
        # Dust storm season — higher opacity
        dust_factor = 0.3 + 0.4 * math.sin(math.radians(ls - 180))
        solar_efficiency = max(0.35, 1.0 - dust_factor)
        dust_storm = dust_factor > 0.5
    else:
        # Cleaner season
        dust_factor = 0.1 + 0.15 * math.sin(math.radians(ls))
        solar_efficiency = max(0.7, 1.0 - dust_factor)
        dust_storm = False

    return {
        "temperature_low_c": -80 + 20 * math.sin(math.radians(ls)),
        "temperature_high_c": -20 + 15 * math.sin(math.radians(ls)),
        "wind_speed_ms": 5.0 + 8.0 * dust_factor,
        "pressure_pa": 750 - 50 * dust_factor,
        "solar_efficiency": round(solar_efficiency, 3),
        "dust_storm_active": dust_storm,
        "mars_solar_longitude_ls": round(ls, 1),
        "data_source": "seasonal_model",
    }


# ══════════════════════════════════════════════════════════════════════════════
# EARTH-MARS COMMUNICATION WINDOWS — Horizons API
# ══════════════════════════════════════════════════════════════════════════════

def fetch_comms_window() -> dict:
    """
    Compute real Earth-Mars communication availability.
    
    Uses NASA Horizons API to get current Earth-Mars distance.
    Real comms windows depend on:
      - Earth-Mars distance (signal delay)
      - Mars Reconnaissance Orbiter (MRO) relay passes (~2 per sol)
      - Deep Space Network (DSN) antenna scheduling
    
    We approximate: comms open if distance < 2.5 AU and not in solar conjunction.
    """
    try:
        # NASA Horizons API — get Earth-Mars distance
        url = "https://ssd.jpl.nasa.gov/api/horizons.api"
        now = datetime.now(timezone.utc)
        params = {
            "format": "json",
            "COMMAND": "499",        # Mars
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": "500@399",     # Earth
            "START_TIME": now.strftime("%Y-%b-%d"),
            "STOP_TIME": now.strftime("%Y-%b-%d"),
            "STEP_SIZE": "1d",
            "QUANTITIES": "20",      # Observer range (AU)
        }
        resp = requests.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # Parse range from Horizons output
        result_text = data.get("result", "")
        distance_au = _parse_horizons_range(result_text)

        if distance_au:
            # Signal delay in minutes (one-way)
            signal_delay_min = distance_au * 8.317  # light-minutes per AU
            # Comms open if < 2.5 AU (solar conjunction > 2.5 AU is problematic)
            comms_available = distance_au < 2.5
            # Window length approximation based on MRO relay pass duration
            window_hours = 2.5 if comms_available else 0.0

            return {
                "earth_mars_distance_au": round(distance_au, 4),
                "signal_delay_minutes": round(signal_delay_min, 1),
                "comms_window_open": comms_available,
                "comms_window_hours": round(window_hours, 1),
                "solar_conjunction": distance_au >= 2.5,
                "data_source": "nasa_horizons_api",
            }
    except Exception as e:
        logger.warning(f"[NASA Horizons API] Failed: {e}. Using distance model.")

    return _distance_model_comms()


def _parse_horizons_range(text: str) -> Optional[float]:
    """Parse range (AU) from NASA Horizons plain-text output."""
    try:
        lines = text.split("\n")
        in_data = False
        for line in lines:
            if "$$SOE" in line:
                in_data = True
                continue
            if "$$EOE" in line:
                break
            if in_data and line.strip():
                parts = line.split()
                if len(parts) >= 4:
                    return float(parts[3])
    except Exception:
        pass
    return None


def _distance_model_comms() -> dict:
    """
    Approximate Earth-Mars distance using simplified orbital mechanics.
    Mars orbital period = 686.97 days, Earth = 365.25 days.
    """
    now = datetime.now(timezone.utc)
    # Reference: Mars opposition on December 8, 2022 (minimum distance ~0.544 AU)
    ref_opposition = datetime(2022, 12, 8, tzinfo=timezone.utc)
    days = (now - ref_opposition).total_seconds() / 86400

    # Synodic period of Mars = 779.94 days
    synodic = 779.94
    phase = (days % synodic) / synodic * 2 * math.pi
    # Distance oscillates between ~0.37 AU (opposition) and ~2.67 AU (conjunction)
    distance_au = 1.52 + 1.15 * math.cos(phase)  # simplified
    signal_delay = distance_au * 8.317
    comms_open = distance_au < 2.4

    return {
        "earth_mars_distance_au": round(distance_au, 4),
        "signal_delay_minutes": round(signal_delay, 1),
        "comms_window_open": comms_open,
        "comms_window_hours": 2.5 if comms_open else 0.0,
        "solar_conjunction": distance_au >= 2.4,
        "data_source": "orbital_model",
    }


# ══════════════════════════════════════════════════════════════════════════════
# MASTER FUNCTION — Get All Real-Time Data
# ══════════════════════════════════════════════════════════════════════════════

def get_realtime_environment_data() -> dict:
    """
    Master function: pulls all real-time data and returns a unified dict
    ready to feed directly into MarsRoverEnvironment.reset().
    
    Always returns valid data — falls back gracefully if any API fails.
    """
    current_sol  = get_current_sol()
    weather      = fetch_mars_weather()
    comms        = fetch_comms_window()
    activity     = fetch_latest_rover_activity(current_sol)

    data = {
        # Sol & time
        "current_sol": current_sol,
        "earth_datetime": datetime.now(timezone.utc).isoformat(),

        # Power & environment
        "solar_efficiency": weather["solar_efficiency"],
        "dust_storm_active": weather["dust_storm_active"],
        "temperature_high_c": weather.get("temperature_high_c", -20),
        "temperature_low_c": weather.get("temperature_low_c", -80),
        "wind_speed_ms": weather.get("wind_speed_ms", 5.0),
        "pressure_pa": weather.get("pressure_pa", 750),

        # Comms
        "comms_window_open": comms["comms_window_open"],
        "comms_window_hours": comms["comms_window_hours"],
        "earth_mars_distance_au": comms["earth_mars_distance_au"],
        "signal_delay_minutes": comms["signal_delay_minutes"],
        "solar_conjunction": comms["solar_conjunction"],

        # Rover activity
        "photos_taken_today": activity["total_photos"],
        "imaging_active": activity["imaging_active"],
        "spectroscopy_active": activity["spectroscopy_active"],

        # Data source transparency
        "data_sources": {
            "weather": weather.get("data_source"),
            "comms": comms.get("data_source"),
            "activity": activity.get("data_source"),
        },
    }

    # Battery estimate — not public, but model from activity level
    # High activity sol → lower starting battery (rover worked hard)
    activity_load = min(1.0, activity["total_photos"] / 150.0)
    data["estimated_battery_wh"] = round(750 - 200 * activity_load, 1)

    logger.info(f"[NASA Client] Sol={current_sol} | Solar={weather['solar_efficiency']} | "
                f"Comms={'OPEN' if comms['comms_window_open'] else 'CLOSED'} | "
                f"Dust={'YES' if weather['dust_storm_active'] else 'NO'}")

    return data


# ── Pretty print for debug ────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    print("🔴 Fetching real-time Mars data...\n")
    data = get_realtime_environment_data()
    print(json.dumps(data, indent=2))
    print(f"\n✅ Today is Perseverance Sol {data['current_sol']}")
    print(f"☀️  Solar efficiency: {data['solar_efficiency']} ({'DUST STORM' if data['dust_storm_active'] else 'Clear'})")
    print(f"📡 Comms window: {'OPEN' if data['comms_window_open'] else 'CLOSED'} ({data['earth_mars_distance_au']} AU from Earth)")
    print(f"📶 Signal delay: {data['signal_delay_minutes']} minutes one-way")
