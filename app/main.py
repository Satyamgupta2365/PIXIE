from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from typing import Dict, Any
import os

from app.models import Action, StepResult, ResetResult, StateResult
from app.environment import MarsRoverEnvironment
from app.graders import grade
from app.tasks import TASKS
from app import nasa_client

app = FastAPI(
    title="Mars Rover Task Scheduler — OpenEnv",
    description=(
        "An OpenEnv-compliant environment where an AI agent acts as mission control "
        "for a Mars rover, scheduling science tasks across Martian sols while managing "
        "battery, daylight, dust storms, and system anomalies."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Active environment instances (keyed by task_id) ───────────────────────────
_envs: Dict[str, MarsRoverEnvironment] = {}


def get_env(task_id: str) -> MarsRoverEnvironment:
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail=f"Unknown task_id: {task_id}. Choose from: {list(TASKS.keys())}")
    if task_id not in _envs:
        _envs[task_id] = MarsRoverEnvironment(task_id)
    return _envs[task_id]


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mars Rover Task Scheduler</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --mars-red: #E24C38;
                --mars-dark: #8C2411;
                --space-bg: #0B0D17;
                --panel-bg: rgba(26, 29, 41, 0.75);
                --text-light: #F2F2F2;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: var(--space-bg);
                background-image: 
                    radial-gradient(circle at 15% 50%, rgba(226, 76, 56, 0.15), transparent 25%),
                    radial-gradient(circle at 85% 30%, rgba(140, 36, 17, 0.2), transparent 25%);
                color: var(--text-light);
                font-family: 'Outfit', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                overflow-x: hidden;
            }
            .glass-panel {
                background: var(--panel-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 4rem 3rem;
                max-width: 800px;
                width: 90%;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: float 6s ease-in-out infinite;
                position: relative;
                z-index: 10;
            }
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }
            h1 {
                font-size: 3.2rem;
                font-weight: 700;
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #FF7B54, #E24C38);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -1px;
            }
            p.subtitle {
                font-size: 1.2rem;
                color: #A0AAB2;
                margin-bottom: 3rem;
                line-height: 1.7;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }
            .button-group {
                display: flex;
                gap: 1.5rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            a.btn {
                text-decoration: none;
                padding: 1rem 2.5rem;
                border-radius: 50px;
                font-weight: 500;
                font-size: 1.1rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: inline-flex;
                align-items: center;
                gap: 0.75rem;
            }
            a.btn-primary {
                background: linear-gradient(135deg, var(--mars-red), var(--mars-dark));
                color: white;
                box-shadow: 0 10px 20px -5px rgba(226, 76, 56, 0.4);
            }
            a.btn-primary:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 0 15px 25px -5px rgba(226, 76, 56, 0.6);
            }
            a.btn-secondary {
                background: rgba(255, 255, 255, 0.05);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            a.btn-secondary:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-3px);
            }
            .stars {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none;
                z-index: 1;
                background: transparent url('https://www.transparenttextures.com/patterns/stardust.png');
                opacity: 0.3;
                animation: twinkle 150s linear infinite;
            }
            @keyframes twinkle {
                from { background-position: 0 0; }
                to { background-position: -10000px 5000px; }
            }
            .badge {
                position: absolute;
                top: -15px;
                right: 30px;
                background: #10B981;
                color: white;
                font-size: 0.8rem;
                padding: 0.5rem 1.25rem;
                border-radius: 20px;
                font-weight: 700;
                letter-spacing: 1px;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .status-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                background-color: #fff;
                border-radius: 50%;
                margin-right: 6px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(0.8); }
                100% { opacity: 1; transform: scale(1); }
            }
        </style>
    </head>
    <body>
        <div class="stars"></div>
        <div class="glass-panel">
            <div class="badge"><span class="status-dot"></span>SYSTEMS OPERATIONAL</div>
            <h1>🚀 Mars Rover Task Scheduler</h1>
            <p class="subtitle">An OpenEnv-compliant AI agent environment built for real Mars mission operations. Schedule instruments, manage battery life, and survive planetary dust storms.</p>
            <div class="button-group">
                <a href="/docs" class="btn btn-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>
                    Interactive API Space
                </a>
                <a href="/nasa-dashboard" class="btn btn-secondary" target="_blank">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    Live Mars Telemetry
                </a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── OpenEnv Core Endpoints ────────────────────────────────────────────────────

@app.post("/reset", response_model=ResetResult)
def reset_default() -> ResetResult:
    """Reset the environment with default task (easy) and return initial observation."""
    task_id = "easy"
    _envs[task_id] = MarsRoverEnvironment(task_id)
    return _envs[task_id].reset()


@app.post("/reset/{task_id}", response_model=ResetResult)
def reset(task_id: str) -> ResetResult:
    """Reset the environment and return initial observation."""
    env = get_env(task_id)
    _envs[task_id] = MarsRoverEnvironment(task_id)   # fresh instance
    return _envs[task_id].reset()


@app.post("/step", response_model=StepResult)
def step_default(action: Action) -> StepResult:
    """Execute one action on default (easy) task."""
    task_id = "easy"
    env = get_env(task_id)
    if env._state is None:
        raise HTTPException(status_code=400, detail="Environment not initialized. Call /reset first.")
    try:
        return env.step(action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/step/{task_id}", response_model=StepResult)
def step(action: Action, task_id: str) -> StepResult:
    """Execute one action and return (observation, reward, done, info)."""
    env = get_env(task_id)
    if env._state is None:
        raise HTTPException(status_code=400, detail="Environment not initialized. Call /reset first.")
    try:
        return env.step(action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/state", response_model=StateResult)
def state_default() -> StateResult:
    """Return current environment state for default (easy) task."""
    task_id = "easy"
    env = get_env(task_id)
    if env._state is None:
        raise HTTPException(status_code=400, detail="Environment not initialized. Call /reset first.")
    return env.state()


@app.get("/state/{task_id}", response_model=StateResult)
def state(task_id: str) -> StateResult:
    """Return current environment state."""
    env = get_env(task_id)
    if env._state is None:
        raise HTTPException(status_code=400, detail="Environment not initialized. Call /reset first.")
    return env.state()


# ── Extra Required Endpoints ──────────────────────────────────────────────────

@app.get("/tasks")
def list_tasks():
    """Returns list of tasks and the action schema."""
    return {
        "tasks": [
            {
                "task_id": tid,
                "name": cfg["name"],
                "description": cfg["description"],
                "difficulty": cfg["difficulty"],
                "mission_sol_limit": cfg["mission_sol_limit"],
                "max_steps": cfg["max_steps"],
            }
            for tid, cfg in TASKS.items()
        ],
        "action_schema": {
            "task_id": "string — ID of task to execute, or 'wait' or 'charge'",
            "notes": "string (optional) — agent reasoning",
        },
    }


@app.post("/grader")
def grader_default():
    """Returns grader score for default (easy) task."""
    task_id = "easy"
    env = get_env(task_id)
    # Auto-reset if not yet initialized so grader always returns a valid score
    if env._state is None:
        _envs[task_id] = MarsRoverEnvironment(task_id)
        _envs[task_id].reset()
        env = _envs[task_id]
    current_state = env.state()
    score = grade(task_id, current_state)
    return {
        "task_id": task_id,
        "score": score,
        "total_science_collected": current_state.observation.total_science_collected,
        "completed_tasks": current_state.observation.completed_tasks,
        "sol_reached": current_state.observation.sol,
        "battery_remaining": current_state.observation.battery_level,
        "done": current_state.done,
    }


@app.post("/grader/{task_id}")
def grader(task_id: str):
    """Returns grader score after an episode is completed."""
    env = get_env(task_id)
    # Auto-reset if not yet initialized so grader always returns a valid score
    if env._state is None:
        _envs[task_id] = MarsRoverEnvironment(task_id)
        _envs[task_id].reset()
        env = _envs[task_id]
    current_state = env.state()
    score = grade(task_id, current_state)
    return {
        "task_id": task_id,
        "score": score,
        "total_science_collected": current_state.observation.total_science_collected,
        "completed_tasks": current_state.observation.completed_tasks,
        "sol_reached": current_state.observation.sol,
        "battery_remaining": current_state.observation.battery_level,
        "done": current_state.done,
    }


@app.post("/baseline")
def baseline():
    """Trigger baseline inference script and return scores for all 3 tasks."""
    import subprocess
    import json

    script_path = os.path.join(os.path.dirname(__file__), "..", "baseline.py")

    if not os.path.exists(script_path):
        return {"error": "baseline.py not found"}

    try:
        result = subprocess.run(
            ["python", script_path, "--output-json"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            return {"error": result.stderr, "stdout": result.stdout}

        # Parse JSON output from baseline script
        lines = result.stdout.strip().split("\n")
        for line in reversed(lines):
            try:
                return json.loads(line)
            except Exception:
                continue

        return {"stdout": result.stdout, "stderr": result.stderr}

    except subprocess.TimeoutExpired:
        return {"error": "Baseline script timed out"}
    except Exception as e:
        return {"error": str(e)}


# ── NASA Real-Time Data ───────────────────────────────────────────────────────

@app.get("/nasa")
def nasa_live():
    """
    Returns real-time NASA data for Perseverance rover:
    - Current Martian Sol (calculated from landing date — always accurate)
    - Solar efficiency & dust storm status (NASA InSight API → seasonal model fallback)
    - Earth-Mars distance & signal delay (NASA Horizons API → orbital model fallback)
    - Communications window status
    - Recent rover activity (NASA Mars Photos API → seeded fallback)

    Set NASA_API_KEY in your environment / HuggingFace Spaces secrets to unlock
    live InSight weather and rover photo data. Physics-based fallbacks are always active.
    """
    try:
        data = nasa_client.get_realtime_environment_data()
        return {
            "sol": data["current_sol"],
            "earth_datetime": data["earth_datetime"],
            "solar_efficiency": data["solar_efficiency"],
            "dust_storm_active": data["dust_storm_active"],
            "temperature_high_c": data["temperature_high_c"],
            "temperature_low_c": data["temperature_low_c"],
            "wind_speed_ms": data["wind_speed_ms"],
            "pressure_pa": data["pressure_pa"],
            "earth_mars_distance_au": data["earth_mars_distance_au"],
            "signal_delay_minutes": data["signal_delay_minutes"],
            "comms_window_open": data["comms_window_open"],
            "comms_window_hours": data["comms_window_hours"],
            "solar_conjunction": data["solar_conjunction"],
            "photos_taken_today": data["photos_taken_today"],
            "imaging_active": data["imaging_active"],
            "spectroscopy_active": data["spectroscopy_active"],
            "estimated_battery_wh": data["estimated_battery_wh"],
            "data_sources": data["data_sources"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NASA data fetch failed: {e}")

@app.get("/nasa-dashboard", include_in_schema=False)
def nasa_dashboard():
    try:
        data = nasa_client.get_realtime_environment_data()
    except Exception as e:
        data = {"error": str(e)}
    
    # Safely extract data
    sol = data.get('current_sol', 'N/A')
    battery = round(data.get('estimated_battery_wh', 0), 1) if 'estimated_battery_wh' in data else 'N/A'
    efficiency = round(data.get('solar_efficiency', 1.0) * 100, 1) if 'solar_efficiency' in data else 100
    dust = data.get('dust_storm_active', False)
    high_temp = round(data.get('temperature_high_c', 0), 1) if 'temperature_high_c' in data else 'N/A'
    low_temp = round(data.get('temperature_low_c', 0), 1) if 'temperature_low_c' in data else 'N/A'
    wind = round(data.get('wind_speed_ms', 0), 2) if 'wind_speed_ms' in data else 'N/A'
    pressure = round(data.get('pressure_pa', 0), 1) if 'pressure_pa' in data else 'N/A'
    delay = round(data.get('signal_delay_minutes', 0), 1) if 'signal_delay_minutes' in data else 'N/A'
    distance = round(data.get('earth_mars_distance_au', 0), 4) if 'earth_mars_distance_au' in data else 'N/A'
    comms = data.get('comms_window_open', False)
    comms_hours = round(data.get('comms_window_hours', 0), 1) if 'comms_window_hours' in data else 0
    photos = data.get('photos_taken_today', 0)
    earth_date = str(data.get('earth_datetime', 'N/A'))[:19].replace('T', ' ')
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mars Telemetry Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --mars-red: #E24C38;
                --space-bg: #0B0D17;
                --card-bg: rgba(26, 29, 41, 0.7);
                --text-light: #F2F2F2;
                --text-muted: #A0AAB2;
            }}
            body {{
                margin: 0; padding: 2rem;
                background-color: var(--space-bg);
                background-image: 
                    radial-gradient(circle at 100% 0%, rgba(226, 76, 56, 0.15), transparent 40%),
                    radial-gradient(circle at 0% 100%, rgba(140, 36, 17, 0.1), transparent 40%);
                color: var(--text-light);
                font-family: 'Outfit', sans-serif;
                min-height: 100vh;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}
            .header {{
                text-align: center;
                margin-bottom: 3rem;
                animation: fadeIn 1s ease-in;
            }}
            h1 {{
                font-size: 3rem;
                margin-bottom: 0.5rem;
                background: linear-gradient(135deg, #FF7B54, #E24C38);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            .grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1.5rem;
                animation: slideUp 0.8s ease-out forwards;
                opacity: 0;
            }}
            .card {{
                background: var(--card-bg);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 2rem;
                transition: transform 0.3s ease, border-color 0.3s ease;
                box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
            }}
            .card:hover {{
                transform: translateY(-5px);
                border-color: var(--mars-red);
                background: rgba(26, 29, 41, 0.9);
            }}
            .label {{
                font-size: 0.9rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 0.8rem;
                font-weight: 600;
            }}
            .value {{
                font-size: 2.2rem;
                font-weight: 700;
                color: #fff;
            }}
            .value span {{
                font-size: 1.1rem;
                color: var(--text-muted);
                font-weight: 400;
                margin-left: 4px;
            }}
            .status-good {{ color: #10B981; }}
            .status-warn {{ color: #EF4444; }}
            .back-btn {{
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 2rem;
                text-decoration: none;
                color: var(--text-muted);
                font-weight: 600;
                transition: color 0.2s;
            }}
            .back-btn:hover {{ color: var(--mars-red); }}
            @keyframes slideUp {{
                from {{ transform: translateY(30px); opacity: 0; }}
                to {{ transform: translateY(0); opacity: 1; }}
            }}
            @keyframes fadeIn {{
                from {{ opacity: 0; }}
                to {{ opacity: 1; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Control Center
            </a>
            <div class="header">
                <h1>Live Mars Telemetry</h1>
                <p style="color: var(--text-muted); font-size: 1.1rem;">Streaming Real-Time Data from Perseverance Rover & InSight Models</p>
            </div>
            
            <div class="grid">
                <div class="card">
                    <div class="label">Mission Sol</div>
                    <div class="value">{sol}</div>
                </div>
                <div class="card">
                    <div class="label">System Battery</div>
                    <div class="value">{battery}<span>Wh</span></div>
                </div>
                <div class="card">
                    <div class="label">Solar Efficiency</div>
                    <div class="value status-{'warn' if efficiency < 70 else 'good'}">
                        {efficiency}<span>%</span>
                    </div>
                </div>
                <div class="card">
                    <div class="label">Dust Storm Scan</div>
                    <div class="value status-{'warn' if dust else 'good'}" style="font-size: 1.8rem;">
                        {'WARNING ACTIVE' if dust else 'CLEAR SKIES'}
                    </div>
                </div>
                <div class="card">
                    <div class="label">Temperature (High/Low)</div>
                    <div class="value">{high_temp}°<span>C</span> <span style="font-size: 1.5rem; margin: 0 5px;">/</span> {low_temp}°<span>C</span></div>
                </div>
                <div class="card">
                    <div class="label">Atmospheric Pressure</div>
                    <div class="value">{pressure}<span>Pa</span></div>
                </div>
                <div class="card">
                    <div class="label">Earth Comm Latency</div>
                    <div class="value">{delay}<span>minutes</span></div>
                </div>
                <div class="card">
                    <div class="label">Orbital Distance</div>
                    <div class="value">{distance}<span>AU</span></div>
                </div>
                <div class="card">
                    <div class="label">Telemetry Link Status</div>
                    <div class="value status-{'good' if comms else 'warn'}">
                        {'UPLINK OPEN' if comms else 'NOSIGNAL'} <span>({comms_hours} hrs)</span>
                    </div>
                </div>
                <div class="card">
                    <div class="label">Images Captured Today</div>
                    <div class="value">{photos}</div>
                </div>
                <div class="card" style="grid-column: 1 / -1;">
                    <div class="label">Last Synchronized (Earth Time)</div>
                    <div class="value" style="font-size: 1.5rem; letter-spacing: 1px;">{earth_date} UTC</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
