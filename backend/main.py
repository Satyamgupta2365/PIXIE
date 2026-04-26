"""
PIXIE — OpenEnv Server
======================
FastAPI server that wraps the PIXIE Mars Rover environment with the
standard OpenEnv endpoints:  POST /reset, POST /step, GET /state

Also includes /health, /tasks, /grader, and a landing page.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

import sys
import os

# Add parent directory to path so it can be run from the backend folder
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import satellite_service
from backend.environment import PIXIEEnvironment
from backend.nasa_client import get_realtime_environment_data


# ── Pydantic models for API ──────────────────────────────────────────────────

class ActionRequest(BaseModel):
    action: str = Field(..., description="Natural-language action string for the rover")


class StepResponse(BaseModel):
    observation: str
    reward: float
    done: bool
    info: Dict[str, Any] = {}


class ResetResponse(BaseModel):
    observation: str
    info: Dict[str, Any] = {}


class StateResponse(BaseModel):
    sol: int
    battery: float
    science_collected: float
    tasks_available: List[str]
    weather: str
    anomaly_active: bool
    comm_window_open: bool
    solar_efficiency: float
    mission_phase: str


class GraderResponse(BaseModel):
    score: float
    science_collected: float
    sol_reached: int
    battery_remaining: float
    done: bool


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PIXIE — Mars Rover RL Environment",
    description=(
        "An OpenEnv-compatible Mars Rover environment where an LLM agent "
        "makes natural-language decisions to manage battery, conduct science, "
        "and survive 100 Martian sols."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Active environment instances (keyed by task difficulty) ───────────────────

_envs: Dict[str, Any] = {}

TASK_CONFIGS = {
    "mars": {"description": "Mars Rover: Deep Autonomy & Comm Delay", "sol_limit": 100},
    "moon": {"description": "Moon Rover: Extreme Day/Night Survival", "sol_limit": 100},
    "easy":   {"description": "Survive 100 sols with clear weather bias", "sol_limit": 100},
}


def get_env(task_id: str = "mars") -> Any:
    if task_id not in TASK_CONFIGS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown task_id: {task_id}. Choose from: {list(TASK_CONFIGS.keys())}"
        )
    if task_id not in _envs:
        if task_id == "mars":
            from backend.mars_rover_env import MarsRoverEnv
            _envs[task_id] = MarsRoverEnv()
        elif task_id == "moon":
            from backend.moon_rover_env import MoonRoverEnv
            _envs[task_id] = MoonRoverEnv()
        else:
            _envs[task_id] = PIXIEEnvironment()
    return _envs[task_id]


# ── Landing Page ──────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PIXIE — Autonomous Mission Control</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --mars-orange: #FF6B35;
                --mars-red: #E24C38;
                --mars-dark: #8C2411;
                --space-bg: #0A0C15;
                --panel-bg: rgba(20, 22, 35, 0.80);
                --text: #F0F0F0;
                --muted: #8A94A6;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: var(--space-bg);
                background-image:
                    radial-gradient(ellipse at 20% 50%, rgba(255,107,53,0.12), transparent 50%),
                    radial-gradient(ellipse at 80% 20%, rgba(140,36,17,0.15), transparent 50%);
                color: var(--text);
                font-family: 'Outfit', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                overflow: hidden;
            }
            .panel {
                background: var(--panel-bg);
                backdrop-filter: blur(24px);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 28px;
                padding: 4rem 3.5rem;
                max-width: 720px;
                width: 92%;
                text-align: center;
                box-shadow: 0 30px 60px -15px rgba(0,0,0,0.6);
                animation: rise 1s ease-out;
            }
            @keyframes rise {
                from { opacity: 0; transform: translateY(40px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            h1 {
                font-size: 3.4rem;
                font-weight: 700;
                background: linear-gradient(135deg, var(--mars-orange), var(--mars-red));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1rem;
                letter-spacing: -1px;
            }
            .subtitle {
                font-size: 1.15rem;
                color: var(--muted);
                line-height: 1.8;
                max-width: 560px;
                margin: 0 auto 2.5rem;
            }
            .btns { display: flex; gap: 1.2rem; justify-content: center; flex-wrap: wrap; }
            a.btn {
                text-decoration: none;
                padding: 0.9rem 2.2rem;
                border-radius: 50px;
                font-weight: 500;
                font-size: 1.05rem;
                transition: all 0.25s ease;
                display: inline-flex;
                align-items: center;
                gap: 0.6rem;
            }
            a.primary {
                background: linear-gradient(135deg, var(--mars-orange), var(--mars-dark));
                color: #fff;
                box-shadow: 0 8px 20px -4px rgba(255,107,53,0.4);
            }
            a.primary:hover { transform: translateY(-3px); box-shadow: 0 12px 28px -4px rgba(255,107,53,0.55); }
            a.secondary {
                background: rgba(255,255,255,0.04);
                color: #fff;
                border: 1px solid rgba(255,255,255,0.1);
            }
            a.secondary:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
            .badge {
                position: absolute;
                top: -14px;
                right: 28px;
                background: #10B981;
                color: #fff;
                font-size: 0.75rem;
                padding: 0.45rem 1.1rem;
                border-radius: 20px;
                font-weight: 700;
                letter-spacing: 1.2px;
                box-shadow: 0 4px 14px rgba(16,185,129,0.35);
            }
            .panel { position: relative; }
        </style>
    </head>
    <body>
        <div class="panel">
            <div class="badge">● ONLINE</div>
            <h1>🔴 PIXIE</h1>
            <p class="subtitle">
                Autonomous Satellite & Rover Mission Management — OpenEnv compatible.<br>
                Control a multi-agent satellite network and deep-space rovers using Reinforcement Learning.
            </p>
            <div class="btns">
                <a href="/docs" class="btn primary">📄 API Docs</a>
                <a href="/health" class="btn secondary">♥ Health Check</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIXIE System Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root { --mars:#FF6B35;--green:#10B981;--blue:#60A5FA;--bg:#080A12;--panel:rgba(15,18,30,0.9);--text:#F0F0F0;--muted:#6B7280; }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--bg);background-image:radial-gradient(ellipse at 15% 50%,rgba(255,107,53,.1),transparent 55%),radial-gradient(ellipse at 85% 20%,rgba(96,165,250,.07),transparent 55%);font-family:'Outfit',sans-serif;color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;}
        .card{background:var(--panel);border:1px solid rgba(255,255,255,.07);border-radius:24px;padding:3rem;max-width:640px;width:92%;backdrop-filter:blur(20px);box-shadow:0 40px 80px -20px rgba(0,0,0,.7);animation:rise .7s ease-out;}
        @keyframes rise{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .header{display:flex;align-items:center;gap:1.2rem;margin-bottom:2rem;}
        .logo{font-size:2.8rem;}
        .title h1{font-size:1.8rem;font-weight:700;letter-spacing:-.5px;}
        .title p{color:var(--muted);font-size:.9rem;font-family:'JetBrains Mono',monospace;}
        .status-pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:var(--green);padding:.4rem 1rem;border-radius:50px;font-size:.8rem;font-weight:600;letter-spacing:1px;margin-bottom:2rem;}
        .dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 1.5s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem;}
        .metric{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.2rem;}
        .metric .label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.4rem;}
        .metric .value{font-size:1.25rem;font-weight:600;font-family:'JetBrains Mono',monospace;}
        .green{color:var(--green)}.orange{color:var(--mars)}.blue{color:var(--blue)}.purple{color:#a78bfa}
        .envs{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:2rem;}
        .env-tag{padding:.35rem .9rem;border-radius:8px;font-size:.8rem;font-weight:600;background:rgba(255,107,53,.1);border:1px solid rgba(255,107,53,.25);color:var(--mars);}
        .env-tag.moon{background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.25);color:var(--blue);}
        .env-tag.sat{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25);color:var(--green);}
        .links{display:flex;gap:.8rem;flex-wrap:wrap;}
        a.btn{text-decoration:none;padding:.7rem 1.6rem;border-radius:12px;font-size:.9rem;font-weight:600;transition:all .2s;}
        a.primary{background:linear-gradient(135deg,var(--mars),#c0392b);color:#fff;}
        a.primary:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,107,53,.35);}
        a.ghost{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--text);}
        a.ghost:hover{background:rgba(255,255,255,.09);transform:translateY(-1px);}
        .footer{margin-top:2rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:var(--muted);}
        .label-sm{font-size:.75rem;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:.7rem;}
    </style>
</head>
<body>
<div class="card">
    <div class="header">
        <div class="logo">&#x1F534;</div>
        <div class="title">
            <h1>PIXIE Mission Control</h1>
            <p>v1.0.0 &nbsp;&middot;&nbsp; OpenEnv Compatible</p>
        </div>
    </div>
    <div class="status-pill"><div class="dot"></div> ALL SYSTEMS OPERATIONAL</div>
    <div class="grid">
        <div class="metric"><div class="label">API Status</div><div class="value green">&#x25CF; Online</div></div>
        <div class="metric"><div class="label">Environments</div><div class="value orange">3 Active</div></div>
        <div class="metric"><div class="label">Model</div><div class="value blue">Llama 3.1 8B</div></div>
        <div class="metric"><div class="label">Framework</div><div class="value purple">GRPO + LoRA</div></div>
    </div>
    <div class="label-sm">Active Environments</div>
    <div class="envs">
        <span class="env-tag">&#x1F680; Mars Rover</span>
        <span class="env-tag moon">&#x1F315; Moon Rover</span>
        <span class="env-tag sat">&#x1F6F0;&#xFE0F; Satellite Network</span>
    </div>
    <div class="links">
        <a href="/docs" class="btn primary">&#x1F4C4; API Docs</a>
        <a href="/redoc" class="btn ghost">&#x1F4D8; ReDoc</a>
        <a href="/state" class="btn ghost">&#x1F4E1; Live State</a>
    </div>
    <div class="footer">
        <span>OpenEnv Hackathon 2025</span>
        <span style="font-family:'JetBrains Mono',monospace;">{"status":"ok","version":"1.0.0"}</span>
    </div>
</div>
</body>
</html>"""
    return HTMLResponse(content=html)


# ── OpenEnv Core Endpoints ───────────────────────────────────────────────────

@app.post("/reset", response_model=ResetResponse)
def reset_default():
    """Reset the default (mars) environment and return initial observation."""
    return reset("mars")


@app.post("/reset/{task_id}", response_model=ResetResponse)
def reset(task_id: str = "mars") -> ResetResponse:
    """Reset the environment and return initial observation string."""
    if task_id not in TASK_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Unknown task_id: {task_id}")
    _envs[task_id] = get_env(task_id) # Ensure properly instantiated
    obs_str = _envs[task_id].reset()
    return ResetResponse(
        observation=obs_str,
        info={"task_id": task_id, "config": TASK_CONFIGS[task_id]},
    )


@app.post("/step", response_model=StepResponse)
def step_default(action: ActionRequest):
    """Execute one action on the default (mars) environment."""
    return step("mars", action)


@app.post("/step/{task_id}", response_model=StepResponse)
def step(task_id: str, action: ActionRequest) -> StepResponse:
    """Accept a natural-language action and return (observation, reward, done, info)."""
    env = get_env(task_id)
    obs, reward, done, info = env.step(action.action)
    return StepResponse(observation=obs, reward=reward, done=done, info=info)


@app.get("/state", response_model=StateResponse)
def state_default():
    """Return current state of the default (mars) environment."""
    return state("mars")


@app.get("/state/{task_id}", response_model=StateResponse)
def state(task_id: str = "mars") -> StateResponse:
    """Return the full environment state dictionary."""
    env = get_env(task_id)
    s = env.state()
    return StateResponse(**s)


# ── Extra Endpoints ──────────────────────────────────────────────────────────

@app.get("/tasks")
def list_tasks():
    """List available task configurations."""
    return {
        "tasks": [
            {"task_id": tid, **cfg}
            for tid, cfg in TASK_CONFIGS.items()
        ],
        "action_schema": {
            "action": "Natural language string — e.g. 'drill for samples', 'charge the battery', 'transmit telemetry'",
            "valid_intents": ["drill", "image", "soil_sample", "charge", "safe_mode", "transmit"],
        },
    }


@app.post("/grader/{task_id}", response_model=GraderResponse)
def grader(task_id: str):
    """Grade the current episode for a given task."""
    env = get_env(task_id)
    s = env.state()

    # Simple scoring: science / max_possible + survival bonus
    max_science = 100 * 0.30  # 100 sols × max per-step science
    science_score = min(1.0, s["science_collected"] / max_science) if max_science > 0 else 0.0
    survival_bonus = min(1.0, s["sol"] / 100.0)
    battery_bonus = s["battery"]

    score = (
        science_score * 0.50
        + survival_bonus * 0.30
        + battery_bonus * 0.20
    )
    score = round(max(0.01, min(0.99, score)), 4)

    return GraderResponse(
        score=score,
        science_collected=s["science_collected"],
        sol_reached=s["sol"],
        battery_remaining=s["battery"],
        done=s["sol"] >= 100 or s["battery"] <= 0.0,
    )


@app.post("/grader", response_model=GraderResponse)
def grader_default():
    """Grade the default (easy) task."""
    return grader("easy")


@app.get("/telemetry/live")
def telemetry_live():
    """Get the true live telemetry from NASA APIs + Moon Simulation"""
    try:
        mars_data = get_realtime_environment_data()
        
        # Determine Mars hazard based on NASA real data
        mars_hazard = "None"
        if mars_data.get("dust_storm_active"):
            mars_hazard = "Dust Storm Active"
        elif not mars_data.get("comms_window_open"):
            mars_hazard = "Signal Lost (Conjunction)"
            
        # Convert battery wh to percentage approx (0-100)
        battery_pct = round((mars_data.get("estimated_battery_wh", 750) / 750) * 100, 1)
            
        return {
            "mars": {
                "sol": mars_data.get("current_sol", 1000),
                "battery": battery_pct,
                "temp": mars_data.get("temperature_low_c", -60),
                "commDelay": f"{mars_data.get('signal_delay_minutes', 14)} min",
                "hazard": mars_hazard,
                "solar_efficiency": mars_data.get("solar_efficiency", 1.0)
            },
            "moon": {
                "sol": 14,
                "battery": 92,
                "temp": -20,
                "commDelay": "1.2s",
                "hazard": "Sunset in 2 hours",
                "solar_efficiency": 1.0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Satellite Routes (N2YO) ───────────────────────────────────────────────────

@app.get("/satellite/fleet")
async def satellite_fleet():
    """Real-time positions for ISS, Hubble, and NOAA-19 from N2YO."""
    try:
        return await satellite_service.get_fleet_positions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"N2YO API error: {str(e)}")

@app.get("/satellite/search")
async def satellite_search(query: str):
    """Search for satellites by name in the active Celestrak catalog."""
    try:
        return await satellite_service.search_satellites(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.get("/satellite/popular")
async def satellite_popular():
    """Get a list of ~50 popular satellites for the dashboard."""
    try:
        return await satellite_service.get_popular_satellites()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching popular satellites: {str(e)}")


@app.get("/satellite/position/{sat_id}")
async def satellite_position(sat_id: int, seconds: int = 1):
    """Real-time position for any satellite by NORAD ID."""
    try:
        return await satellite_service.get_position(sat_id, seconds)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"N2YO API error: {str(e)}")


@app.get("/satellite/tle/{sat_id}")
async def satellite_tle(sat_id: int):
    """Two-Line Elements for any satellite by NORAD ID."""
    try:
        return await satellite_service.get_tle(sat_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"N2YO API error: {str(e)}")


@app.get("/satellite/passes/{sat_id}")
async def satellite_passes(sat_id: int, days: int = 2, min_visibility: int = 60):
    """Upcoming visual passes for a satellite."""
    try:
        return await satellite_service.get_visual_passes(sat_id, days, min_visibility)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"N2YO API error: {str(e)}")


@app.get("/satellite/above")
async def satellites_above(radius: int = 70, category: int = 0):
    """All satellites above observer within given search radius."""
    try:
        return await satellite_service.get_above(radius, category)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"N2YO API error: {str(e)}")


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    """Run the PIXIE OpenEnv server."""
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
