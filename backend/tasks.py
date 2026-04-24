from backend.models import ScienceTask, TaskType
from typing import List, Dict, Any


# ─── Base Science Task Pool (inspired by real Perseverance mission targets) ───

BASE_TASKS = [
    ScienceTask(
        task_id="img_001",
        name="Panoramic Imaging - Jezero Crater Rim",
        task_type=TaskType.IMAGING,
        energy_cost=45.0,
        science_value=0.7,
        duration_hours=1.5,
        requires_daylight=True,
        requires_comms=False,
        priority=3,
    ),
    ScienceTask(
        task_id="spec_001",
        name="SHERLOC Raman Spectroscopy - Rock Sample A",
        task_type=TaskType.SPECTROSCOPY,
        energy_cost=80.0,
        science_value=0.9,
        duration_hours=2.0,
        requires_daylight=False,
        requires_comms=False,
        priority=5,
    ),
    ScienceTask(
        task_id="drill_001",
        name="Core Sample Drilling - Sediment Layer",
        task_type=TaskType.DRILLING,
        energy_cost=150.0,
        science_value=1.0,
        duration_hours=3.5,
        requires_daylight=False,
        requires_comms=False,
        priority=5,
    ),
    ScienceTask(
        task_id="atm_001",
        name="MEDA Atmospheric Monitoring",
        task_type=TaskType.ATMOSPHERIC,
        energy_cost=20.0,
        science_value=0.4,
        duration_hours=0.5,
        requires_daylight=False,
        requires_comms=False,
        priority=2,
    ),
    ScienceTask(
        task_id="nav_001",
        name="Drive to Next Waypoint - 50m",
        task_type=TaskType.NAVIGATION,
        energy_cost=100.0,
        science_value=0.3,
        duration_hours=2.0,
        requires_daylight=True,
        requires_comms=False,
        priority=3,
    ),
    ScienceTask(
        task_id="img_002",
        name="Close-Up Imaging - Ancient River Delta",
        task_type=TaskType.IMAGING,
        energy_cost=35.0,
        science_value=0.6,
        duration_hours=1.0,
        requires_daylight=True,
        requires_comms=False,
        priority=3,
    ),
    ScienceTask(
        task_id="spec_002",
        name="PIXL X-Ray Spectroscopy - Mineral Vein",
        task_type=TaskType.SPECTROSCOPY,
        energy_cost=90.0,
        science_value=0.85,
        duration_hours=2.5,
        requires_daylight=False,
        requires_comms=False,
        priority=4,
    ),
    ScienceTask(
        task_id="comms_001",
        name="Telemetry Upload - Science Data to Earth",
        task_type=TaskType.NAVIGATION,
        energy_cost=25.0,
        science_value=0.2,
        duration_hours=0.75,
        requires_daylight=False,
        requires_comms=True,
        priority=4,
    ),
    ScienceTask(
        task_id="charge_001",
        name="Solar Charging - Full Panel Deployment",
        task_type=TaskType.CHARGING,
        energy_cost=-200.0,   # negative = charges battery
        science_value=0.0,
        duration_hours=4.0,
        requires_daylight=True,
        requires_comms=False,
        priority=1,
    ),
    ScienceTask(
        task_id="safe_001",
        name="Enter Safe Mode - Anomaly Recovery",
        task_type=TaskType.SAFE_MODE,
        energy_cost=10.0,
        science_value=0.0,
        duration_hours=1.0,
        requires_daylight=False,
        requires_comms=False,
        priority=5,
    ),
]


# ─── Task Definitions per Difficulty ──────────────────────────────────────────

TASKS: Dict[str, Dict[str, Any]] = {

    "easy": {
        "id": "easy",
        "name": "Single Sol Optimization",
        "description": (
            "Schedule one Martian day (Sol) of rover activities. "
            "Battery starts at 600Wh, daylight lasts 12 hours. "
            "Maximize science return without depleting battery below 100Wh."
        ),
        "difficulty": "easy",
        "mission_sol_limit": 1,
        "initial_battery": 600.0,
        "initial_daylight": 12.0,
        "solar_efficiency": 1.0,
        "dust_storm_active": False,
        "anomaly_active": False,
        "comms_window_open": True,
        "comms_window_hours": 3.0,
        "available_task_ids": [
            "img_001", "spec_001", "atm_001", "img_002", "comms_001", "charge_001"
        ],
        "max_steps": 10,
    },

    "medium": {
        "id": "medium",
        "name": "Dust Storm Survival Mission",
        "description": (
            "Plan 5 Martian sols during a regional dust storm that cuts solar efficiency by 60%. "
            "Battery management becomes critical. Prioritize survival and key science."
        ),
        "difficulty": "medium",
        "mission_sol_limit": 5,
        "initial_battery": 700.0,
        "initial_daylight": 12.0,
        "solar_efficiency": 0.4,   # dust storm
        "dust_storm_active": True,
        "anomaly_active": False,
        "comms_window_open": False,
        "comms_window_hours": 0.0,
        "available_task_ids": [
            "img_001", "spec_001", "drill_001", "atm_001",
            "nav_001", "img_002", "spec_002", "comms_001", "charge_001"
        ],
        "comms_opens_at_sol": 3,   # comms window opens mid-mission
        "max_steps": 30,
    },

    "hard": {
        "id": "hard",
        "name": "Anomaly Recovery & Science Maximization",
        "description": (
            "Mid-mission a motor anomaly disables navigation. "
            "Diagnose, enter safe mode, recover, then maximize remaining science "
            "over 7 sols with degraded capabilities. Every decision counts."
        ),
        "difficulty": "hard",
        "mission_sol_limit": 7,
        "initial_battery": 750.0,
        "initial_daylight": 12.0,
        "solar_efficiency": 0.85,
        "dust_storm_active": False,
        "anomaly_active": False,        # starts normal
        "anomaly_triggers_at_step": 8,  # anomaly hits at step 8
        "anomaly_type": "motor_fault",
        "comms_window_open": True,
        "comms_window_hours": 2.0,
        "available_task_ids": [
            "img_001", "spec_001", "drill_001", "atm_001",
            "nav_001", "img_002", "spec_002", "comms_001",
            "charge_001", "safe_001"
        ],
        "max_steps": 50,
    },
}


def get_task_pool(task_ids: List[str]) -> List[ScienceTask]:
    task_map = {t.task_id: t for t in BASE_TASKS}
    return [task_map[tid] for tid in task_ids if tid in task_map]
