"""
PIXEL World Model — Mars Environmental Dynamics
================================================
Manages all stochastic world state that evolves each Martian sol:

Classes:
  MarsWorldModel  — stateful weather / anomaly / solar / comm simulation
  MissionClock    — sol counter with mission-phase classification

Legacy standalone functions are preserved at the bottom for backward
compatibility but new code should use the class-based API.
"""

from __future__ import annotations

import random
from typing import Dict, Any, Optional, Tuple, List


# ═══════════════════════════════════════════════════════════════════════════════
#  Constants
# ═══════════════════════════════════════════════════════════════════════════════

WEATHER_STATES = ("clear", "dust_storm", "low_visibility")

# Transition probabilities  (row = current, col = next)
WEATHER_TRANSITIONS = {
    "clear":          {"clear": 0.60, "low_visibility": 0.25, "dust_storm": 0.15},
    "low_visibility": {"clear": 0.60, "low_visibility": 0.10, "dust_storm": 0.30},
    "dust_storm":     {"clear": 0.10, "low_visibility": 0.40, "dust_storm": 0.50},
}

# Solar efficiency ranges per weather state
SOLAR_RANGE = {
    "clear":          (0.90, 1.00),
    "low_visibility": (0.50, 0.70),
    "dust_storm":     (0.10, 0.30),
}

# Fixed-point solar values used by legacy API
WEATHER_SOLAR_MODIFIER = {
    "clear":          1.0,
    "low_visibility": 0.75,
    "dust_storm":     0.40,
}

ANOMALY_CHANCE = 0.10   # 10 % per sol
ANOMALY_TYPES  = ["motor_fault", "sensor_failure", "comms_blackout"]

COMM_WINDOW_CHANCE   = 0.30   # 30 % of sols
COMM_WINDOW_DURATION = (1, 3) # sols

DUST_STORM_DURATION  = (2, 5) # sols

ALL_TASKS = ["drill", "image", "soil_sample"]


# ═══════════════════════════════════════════════════════════════════════════════
#  MissionClock
# ═══════════════════════════════════════════════════════════════════════════════

class MissionClock:
    """
    Tracks the current Martian sol (0-100) and classifies the mission phase.

    Phases:
      - "early"  (sol 0–30)   — exploration & baseline science
      - "mid"    (sol 31–70)  — peak operations
      - "late"   (sol 71–100) — wrap-up & data transmission
    """

    MAX_SOL = 100

    def __init__(self) -> None:
        self._sol: int = 0

    # ── core ──────────────────────────────────────────────────────────────

    def reset(self) -> None:
        """Reset the clock to sol 0."""
        self._sol = 0

    def tick(self) -> int:
        """Advance one sol and return the new sol number."""
        self._sol = min(self._sol + 1, self.MAX_SOL)
        return self._sol

    # ── queries ───────────────────────────────────────────────────────────

    @property
    def sol(self) -> int:
        return self._sol

    @sol.setter
    def sol(self, value: int) -> None:
        self._sol = max(0, min(value, self.MAX_SOL))

    @property
    def phase(self) -> str:
        """Return the current mission phase string."""
        if self._sol <= 30:
            return "early"
        if self._sol <= 70:
            return "mid"
        return "late"

    def time_remaining(self) -> int:
        """Return the number of sols remaining in the mission."""
        return max(0, self.MAX_SOL - self._sol)

    def is_complete(self) -> bool:
        return self._sol >= self.MAX_SOL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sol": self._sol,
            "phase": self.phase,
            "time_remaining": self.time_remaining(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  MarsWorldModel
# ═══════════════════════════════════════════════════════════════════════════════

class MarsWorldModel:
    """
    Stateful Mars world simulation.

    Manages weather (with dust-storm duration tracking), solar efficiency,
    communication windows (with multi-sol duration), and anomalies (with
    typed faults and auto-resolution timers).

    Typical usage::

        world = MarsWorldModel()
        world.reset()
        for sol in range(100):
            world_state = world.step_world(sol)
            obs_text    = world.get_observation_string()
    """

    def __init__(self) -> None:
        # ── Weather ───────────────────────────────────────────────────────
        self._weather: str = "clear"
        self._solar_efficiency: float = 1.0
        self._dust_storm_remaining: int = 0    # sols left in current storm

        # ── Comm window ───────────────────────────────────────────────────
        self._comm_window_open: bool = False
        self._comm_window_remaining: int = 0   # sols left in current window

        # ── Anomaly ───────────────────────────────────────────────────────
        self._anomaly_active: bool = False
        self._anomaly_type: Optional[str] = None
        self._anomaly_remaining: int = 0       # sols until auto-resolve

        # ── Internal sol for observation string ───────────────────────────
        self._current_sol: int = 0

    # ── reset ─────────────────────────────────────────────────────────────

    def reset(self) -> Dict[str, Any]:
        """Reset world to a random initial state and return it."""
        self._weather = random.choice(WEATHER_STATES)
        self._solar_efficiency = self._sample_solar(self._weather)
        self._dust_storm_remaining = (
            random.randint(*DUST_STORM_DURATION)
            if self._weather == "dust_storm" else 0
        )

        self._comm_window_open = random.random() < COMM_WINDOW_CHANCE
        self._comm_window_remaining = (
            random.randint(*COMM_WINDOW_DURATION)
            if self._comm_window_open else 0
        )

        self._anomaly_active = False
        self._anomaly_type = None
        self._anomaly_remaining = 0
        self._current_sol = 0

        return self.get_state()

    # ── step_world ────────────────────────────────────────────────────────

    def step_world(self, current_sol: int) -> Dict[str, Any]:
        """
        Advance all world dynamics by one sol.

        Called every sol to update weather, solar, comm, and anomalies.

        Parameters
        ----------
        current_sol : int
            The sol number *after* this tick (i.e. the sol we are
            stepping into).

        Returns
        -------
        dict   Updated world state.
        """
        self._current_sol = current_sol

        # ── Weather ───────────────────────────────────────────────────────
        self._advance_weather()

        # ── Solar efficiency ──────────────────────────────────────────────
        self._solar_efficiency = self._sample_solar(self._weather)

        # ── Comm window ───────────────────────────────────────────────────
        self._advance_comm_window()

        # ── Anomaly ───────────────────────────────────────────────────────
        self._advance_anomaly()

        return self.get_state()

    # ── get_state ─────────────────────────────────────────────────────────

    def get_state(self) -> Dict[str, Any]:
        """Return the current world state as a plain dict."""
        return {
            "weather":             self._weather,
            "solar_efficiency":    round(self._solar_efficiency, 4),
            "comm_window_open":    self._comm_window_open,
            "anomaly_active":      self._anomaly_active,
            "anomaly_type":        self._anomaly_type,
            "dust_storm_remaining": self._dust_storm_remaining,
            "comm_window_remaining": self._comm_window_remaining,
            "anomaly_remaining":   self._anomaly_remaining,
        }

    # ── get_observation_string ────────────────────────────────────────────

    def get_observation_string(self) -> str:
        """
        Return a natural-language description of the current world state
        suitable for an LLM agent to read.
        """
        parts: List[str] = [f"Sol {self._current_sol}."]

        # Weather
        if self._weather == "dust_storm":
            parts.append(
                f"Weather: dust storm active "
                f"({self._dust_storm_remaining} sol{'s' if self._dust_storm_remaining != 1 else ''} remaining)."
            )
        elif self._weather == "low_visibility":
            parts.append("Weather: low visibility conditions.")
        else:
            parts.append("Weather: clear skies.")

        # Solar
        pct = round(self._solar_efficiency * 100)
        parts.append(f"Solar efficiency at {pct}%.")

        # Comm
        if self._comm_window_open:
            parts.append(
                f"Communication window OPEN "
                f"({self._comm_window_remaining} sol{'s' if self._comm_window_remaining != 1 else ''} remaining)."
            )
        else:
            parts.append("Communication window closed.")

        # Anomaly
        if self._anomaly_active:
            label = (self._anomaly_type or "unknown fault").replace("_", " ")
            parts.append(f"WARNING: {label} detected.")
        else:
            parts.append("All systems nominal.")

        return " ".join(parts)

    # ── predict_next_sol ──────────────────────────────────────────────────

    def predict_next_sol(self) -> Dict[str, Any]:
        """
        Return a probabilistic forecast for the *next* sol.

        Used by PlannerAgent for horizon-aware decisions.
        """
        # Weather forecast
        probs = WEATHER_TRANSITIONS.get(
            self._weather, WEATHER_TRANSITIONS["clear"]
        )
        # Most-likely next weather
        predicted_weather = max(probs, key=probs.get)  # type: ignore[arg-type]
        predicted_prob = probs[predicted_weather]

        # If we're inside a dust storm with remaining sols, storm continues
        if self._weather == "dust_storm" and self._dust_storm_remaining > 1:
            predicted_weather = "dust_storm"
            predicted_prob = 0.90  # very likely to persist

        # Comm forecast
        if self._comm_window_open and self._comm_window_remaining > 1:
            predicted_comm = True
        else:
            predicted_comm = False  # default expectation

        # Solar forecast
        lo, hi = SOLAR_RANGE.get(predicted_weather, (0.5, 1.0))
        predicted_solar = round((lo + hi) / 2, 2)

        # Anomaly forecast
        anomaly_risk = ANOMALY_CHANCE
        if self._anomaly_active and self._anomaly_remaining > 0:
            anomaly_risk = 0.0  # already active, won't re-roll

        return {
            "weather":      predicted_weather,
            "probability":  round(predicted_prob, 2),
            "comm_window":  predicted_comm,
            "solar_efficiency_est": predicted_solar,
            "anomaly_risk": round(anomaly_risk, 2),
        }

    # ── is_critical ───────────────────────────────────────────────────────

    def is_critical(self) -> bool:
        """
        Return True if the world is in a critical state that should
        trigger RiskAgent's safe_mode recommendation.

        Critical when:
          - anomaly is active, OR
          - solar efficiency < 0.2, OR
          - weather is dust_storm
        """
        if self._anomaly_active:
            return True
        if self._solar_efficiency < 0.2:
            return True
        if self._weather == "dust_storm":
            return True
        return False

    # ── manual anomaly resolution ─────────────────────────────────────────

    def resolve_anomaly(self) -> None:
        """Immediately resolve any active anomaly (e.g. agent chose safe_mode)."""
        self._anomaly_active = False
        self._anomaly_type = None
        self._anomaly_remaining = 0

    # ── private helpers ───────────────────────────────────────────────────

    def _advance_weather(self) -> None:
        """Transition weather, respecting dust-storm duration."""
        if self._weather == "dust_storm" and self._dust_storm_remaining > 0:
            # Storm is still active — count down
            self._dust_storm_remaining -= 1
            if self._dust_storm_remaining <= 0:
                # Storm ends → transition out
                self._weather = random.choices(
                    ["clear", "low_visibility"],
                    weights=[0.60, 0.40],
                    k=1,
                )[0]
                self._dust_storm_remaining = 0
            return  # stay in storm this sol

        # Normal Markov transition
        probs = WEATHER_TRANSITIONS.get(
            self._weather, WEATHER_TRANSITIONS["clear"]
        )
        states = list(probs.keys())
        weights = list(probs.values())
        new_weather = random.choices(states, weights=weights, k=1)[0]

        # If entering a new dust storm, assign duration
        if new_weather == "dust_storm" and self._weather != "dust_storm":
            self._dust_storm_remaining = random.randint(*DUST_STORM_DURATION)

        self._weather = new_weather

    def _advance_comm_window(self) -> None:
        """Update comm window state with multi-sol duration tracking."""
        if self._comm_window_open and self._comm_window_remaining > 0:
            self._comm_window_remaining -= 1
            if self._comm_window_remaining <= 0:
                self._comm_window_open = False
            return  # window is still open this sol

        # Roll for a new window opening
        if random.random() < COMM_WINDOW_CHANCE:
            self._comm_window_open = True
            self._comm_window_remaining = random.randint(*COMM_WINDOW_DURATION)
        else:
            self._comm_window_open = False
            self._comm_window_remaining = 0

    def _advance_anomaly(self) -> None:
        """Update anomaly state with auto-resolution timer."""
        if self._anomaly_active:
            if self._anomaly_remaining > 0:
                self._anomaly_remaining -= 1
            if self._anomaly_remaining <= 0:
                # Auto-resolve after duration expires
                self._anomaly_active = False
                self._anomaly_type = None
            return  # don't re-roll while one is active

        # Roll for a new anomaly
        if random.random() < ANOMALY_CHANCE:
            self._anomaly_active = True
            self._anomaly_type = random.choice(ANOMALY_TYPES)
            self._anomaly_remaining = random.randint(1, 2)

    @staticmethod
    def _sample_solar(weather: str) -> float:
        """Sample a solar efficiency value within the range for `weather`."""
        lo, hi = SOLAR_RANGE.get(weather, (0.9, 1.0))
        return round(random.uniform(lo, hi), 4)


# ═══════════════════════════════════════════════════════════════════════════════
#  Legacy standalone functions  (preserved for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════════

def advance_weather(current_weather: str) -> str:
    """
    Transition weather to next sol using a Markov chain.
    Returns the new weather string.
    """
    probs = WEATHER_TRANSITIONS.get(current_weather, WEATHER_TRANSITIONS["clear"])
    states = list(probs.keys())
    weights = list(probs.values())
    return random.choices(states, weights=weights, k=1)[0]


def random_weather() -> str:
    """Pick a random initial weather condition."""
    return random.choice(list(WEATHER_STATES))


def compute_solar_efficiency(weather: str) -> float:
    """
    Return solar panel efficiency in [0.0, 1.0] based on weather.
    Dust storm -> 0.4 reduction from nominal 1.0.
    """
    return round(WEATHER_SOLAR_MODIFIER.get(weather, 1.0), 2)


def roll_anomaly() -> bool:
    """10% chance each sol to trigger a random fault."""
    return random.random() < ANOMALY_CHANCE


def roll_comm_window(sol: int) -> bool:
    """
    Determine if the communication window to Earth is open this sol.
    Opens roughly every 3 sols, with some noise.
    """
    if sol % 3 == 0:
        return True
    return random.random() < 0.20


def determine_mission_phase(
    battery: float,
    anomaly_active: bool,
    weather: str,
) -> str:
    """
    Classify the current mission phase based on conditions.
    Returns one of: "surface_ops" | "crisis" | "charging"
    """
    if anomaly_active or weather == "dust_storm":
        return "crisis"
    if battery < 0.25:
        return "charging"
    return "surface_ops"


def random_available_tasks() -> list:
    """
    Return a random subset of science tasks available this sol.
    Always includes at least 1 task.
    """
    n = random.randint(1, len(ALL_TASKS))
    return sorted(random.sample(ALL_TASKS, n))


def advance_sol(
    current_weather: str,
    current_sol: int,
) -> Tuple[str, float, bool, bool, list, str]:
    """
    Advance the world by one sol.  Returns:
      (new_weather, solar_efficiency, anomaly_active, comm_window_open,
       tasks_available, mission_phase)
    """
    new_weather = advance_weather(current_weather)
    solar_eff = compute_solar_efficiency(new_weather)
    anomaly = roll_anomaly()
    comm = roll_comm_window(current_sol + 1)
    tasks = random_available_tasks()
    phase = determine_mission_phase(1.0, anomaly, new_weather)
    return new_weather, solar_eff, anomaly, comm, tasks, phase
