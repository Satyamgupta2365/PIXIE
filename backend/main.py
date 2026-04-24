"""
PIXEL — OpenEnv Server
======================
FastAPI server that wraps the PIXEL Mars Rover environment with the
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

from backend import satellite_service

from backend.environment import PIXELEnvironment


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
    title="PIXEL — Mars Rover RL Environment",
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

_envs: Dict[str, PIXELEnvironment] = {}

TASK_CONFIGS = {
    "easy":   {"description": "Survive 100 sols with clear weather bias", "sol_limit": 100},
    "medium": {"description": "Dust storms and anomalies — resource constrained", "sol_limit": 100},
    "hard":   {"description": "Extreme conditions with frequent crises", "sol_limit": 100},
}


def get_env(task_id: str = "easy") -> PIXELEnvironment:
    if task_id not in TASK_CONFIGS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown task_id: {task_id}. Choose from: {list(TASK_CONFIGS.keys())}"
        )
    if task_id not in _envs:
        _envs[task_id] = PIXELEnvironment()
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
        <title>PIXEL — Mars Rover RL Environment</title>
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
            <h1>🔴 PIXEL</h1>
            <p class="subtitle">
                Mars Rover RL Environment — OpenEnv compatible.<br>
                Control a rover with natural language. Manage battery, science, weather, and anomalies across 100 Martian sols.
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
    return {"status": "ok", "environment": "PIXEL", "version": "1.0.0"}


# ── OpenEnv Core Endpoints ───────────────────────────────────────────────────

@app.post("/reset", response_model=ResetResponse)
def reset_default():
    """Reset the default (easy) environment and return initial observation."""
    return reset("easy")


@app.post("/reset/{task_id}", response_model=ResetResponse)
def reset(task_id: str = "easy") -> ResetResponse:
    """Reset the environment and return initial observation string."""
    if task_id not in TASK_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Unknown task_id: {task_id}")
    _envs[task_id] = PIXELEnvironment()
    obs_str = _envs[task_id].reset()
    return ResetResponse(
        observation=obs_str,
        info={"task_id": task_id, "config": TASK_CONFIGS[task_id]},
    )


@app.post("/step", response_model=StepResponse)
def step_default(action: ActionRequest):
    """Execute one action on the default (easy) environment."""
    return step("easy", action)


@app.post("/step/{task_id}", response_model=StepResponse)
def step(task_id: str, action: ActionRequest) -> StepResponse:
    """Accept a natural-language action and return (observation, reward, done, info)."""
    env = get_env(task_id)
    obs, reward, done, info = env.step(action.action)
    return StepResponse(observation=obs, reward=reward, done=done, info=info)


@app.get("/state", response_model=StateResponse)
def state_default():
    """Return current state of the default (easy) environment."""
    return state("easy")


@app.get("/state/{task_id}", response_model=StateResponse)
def state(task_id: str = "easy") -> StateResponse:
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
    """Run the PIXEL OpenEnv server."""
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("pixel.server:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
