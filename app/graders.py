"""
Deterministic graders for each task.
Each grader returns a score strictly between 0.0 and 1.0 (exclusive),
as required by the OpenEnv Phase 2 validator.
"""

from app.models import StateResult

# OpenEnv requires scores strictly in (0, 1) — never exactly 0.0 or 1.0
# Use a margin that ensures scores are clearly within bounds
_SCORE_MIN = 0.01
_SCORE_MAX = 0.99


def _clamp(score: float) -> float:
    """Clamp score to the open interval (0, 1) as required by OpenEnv."""
    clamped = min(_SCORE_MAX, max(_SCORE_MIN, float(score)))
    return round(clamped, 4)


def grade_easy(state: StateResult) -> float:
    """
    Easy task grader: Single Sol Optimization

    Scoring:
    - Science collected vs theoretical max (60% weight)
    - Battery safety (didn't go below 100Wh) (20% weight)
    - Completed at least 3 tasks (20% weight)
    """
    obs = state.observation

    # Max possible science in easy task: img_001(0.7) + spec_001(0.9) + atm_001(0.4) + img_002(0.6) = 2.6
    MAX_SCIENCE = 2.6
    science_score = min(1.0, obs.total_science_collected / MAX_SCIENCE)

    # Battery safety — never went below 100Wh (we track via final battery)
    battery_score = 1.0 if obs.battery_level >= 100 else max(0.0, obs.battery_level / 100.0)

    # Task completion breadth
    unique_types = len(set(obs.completed_tasks))
    completion_score = min(1.0, unique_types / 3.0)

    score = (
        science_score * 0.60
        + battery_score * 0.20
        + completion_score * 0.20
    )
    return _clamp(score)


def grade_medium(state: StateResult) -> float:
    """
    Medium task grader: Dust Storm Survival Mission

    Scoring:
    - Survived all 5 sols without battery death (40% weight)
    - Science collected under constraints (30% weight)
    - Used comms window when available (20% weight)
    - Battery never critically low (<50Wh) (10% weight)
    """
    obs = state.observation

    # Survival: completed all 5 sols
    survived_sols = min(obs.sol - 1, obs.mission_sol_limit)
    sol_limit = max(1, obs.mission_sol_limit)  # guard against division by zero
    survival_score = survived_sols / sol_limit

    # Science under storm conditions (max realistic with 40% solar = ~2.0)
    MAX_SCIENCE_STORM = 2.0
    science_score = min(1.0, obs.total_science_collected / MAX_SCIENCE_STORM)

    # Comms usage — did agent upload telemetry?
    comms_used = "comms_001" in obs.completed_tasks
    comms_score = 0.95 if comms_used else 0.05

    # Battery safety
    battery_score = 1.0 if obs.battery_level >= 50 else max(0.0, obs.battery_level / 50.0)

    score = (
        survival_score * 0.40
        + science_score * 0.30
        + comms_score * 0.20
        + battery_score * 0.10
    )
    return _clamp(score)


def grade_hard(state: StateResult) -> float:
    """
    Hard task grader: Anomaly Recovery & Science Maximization

    Scoring:
    - Anomaly resolved (entered safe mode) (35% weight)
    - Science collected post-recovery (30% weight)
    - Mission survived all 7 sols (20% weight)
    - No destructive actions during anomaly (15% weight)
    """
    obs = state.observation

    # Anomaly resolution — if anomaly is no longer active and safe_001 was used
    anomaly_resolved = "safe_001" in obs.completed_tasks
    anomaly_score = 0.95 if anomaly_resolved else 0.05

    # Science collected (max realistic post-anomaly over 7 sols ~ 3.5)
    MAX_SCIENCE_HARD = 3.5
    science_score = min(1.0, obs.total_science_collected / MAX_SCIENCE_HARD)

    # Mission survival
    survived_sols = min(obs.sol - 1, obs.mission_sol_limit)
    sol_limit = max(1, obs.mission_sol_limit)  # guard against division by zero
    survival_score = survived_sols / sol_limit

    # No destructive actions — battery still healthy
    safety_score = 1.0 if obs.battery_level >= 100 else max(0.0, obs.battery_level / 100.0)

    score = (
        anomaly_score * 0.35
        + science_score * 0.30
        + survival_score * 0.20
        + safety_score * 0.15
    )
    return _clamp(score)


GRADERS = {
    "easy": grade_easy,
    "medium": grade_medium,
    "hard": grade_hard,
}


def grade(task_id: str, state: StateResult) -> float:
    if task_id not in GRADERS:
        raise ValueError(f"Unknown task: {task_id}")
    return GRADERS[task_id](state)
