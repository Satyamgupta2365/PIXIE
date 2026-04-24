"""
PIXEL — Mars Rover RL Environment (Core Logic)
===============================================
An OpenEnv-compatible environment where an LLM agent controls a Mars rover,
making natural-language decisions about drilling, imaging, sampling, charging,
and transmitting data across 100 Martian sols.

Implements:
  - reset()  → initial observation string
  - step(action: str) → (observation, reward, done, info)
  - state()  → full state dict
"""

import random
import re
from typing import Tuple, Dict, Any, List, Optional

from backend.world import (
    MarsWorldModel,
    MissionClock,
    determine_mission_phase,
    random_available_tasks,
)
from backend.agents import run_agent_council
from backend.rewards import compute_total_reward


# ── Action costs / gains ─────────────────────────────────────────────────────

ACTION_BATTERY_COST = {
    "drill":       0.15,
    "image":       0.05,
    "soil_sample": 0.10,
    "charge":     -0.20,   # negative cost = battery gain
    "safe_mode":   0.02,
    "transmit":    0.08,
}

SCIENCE_REWARD = {
    "drill":       0.30,
    "image":       0.15,
    "soil_sample": 0.25,
    "charge":      0.00,
    "safe_mode":   0.00,
    "transmit":    0.10,   # transmitting collected data has value
}

VALID_ACTIONS = list(ACTION_BATTERY_COST.keys())

MAX_SOL = 100


# ── NLP Intent Parser ────────────────────────────────────────────────────────

_ACTION_PATTERNS = {
    "drill":       re.compile(r"\bdrill(?:ing)?\b", re.IGNORECASE),
    "image":       re.compile(r"\b(?:image|imag(?:e|ing)|photo|photograph|picture|capture|camera|panoram)\b", re.IGNORECASE),
    "soil_sample": re.compile(r"\b(?:soil|sample|collect|scoop|regolith)\b", re.IGNORECASE),
    "charge":      re.compile(r"\b(?:charge|charg(?:e|ing)|solar|recharge|power\s*up|battery)\b", re.IGNORECASE),
    "safe_mode":   re.compile(r"\b(?:safe|safe.mode|shutdown|protect|hibernate|standby|emergency)\b", re.IGNORECASE),
    "transmit":    re.compile(r"\b(?:transmit|send|uplink|downlink|comm(?:unicate)?|relay|broadcast|upload|telemetry)\b", re.IGNORECASE),
}


def parse_action(raw: str) -> str:
    """
    Parse a natural-language action string into one of the valid action intents.
    Returns the best-matching action, or 'safe_mode' as a conservative fallback.
    """
    raw_lower = raw.strip().lower()

    # Exact match first
    if raw_lower in VALID_ACTIONS:
        return raw_lower

    # Pattern matching — score by earliest match position
    best_action = None
    best_pos = len(raw_lower) + 1

    for action, pattern in _ACTION_PATTERNS.items():
        match = pattern.search(raw_lower)
        if match and match.start() < best_pos:
            best_pos = match.start()
            best_action = action

    return best_action or "safe_mode"


# ── Environment ──────────────────────────────────────────────────────────────

class PIXELEnvironment:
    """
    Mars Rover PIXEL Environment.

    State schema:
        sol, battery, science_collected, tasks_available, weather,
        anomaly_active, comm_window_open, solar_efficiency, mission_phase

    Action space (natural language → parsed intent):
        drill, image, soil_sample, charge, safe_mode, transmit
    """

    def __init__(self):
        self._world = MarsWorldModel()
        self._clock = MissionClock()
        self._battery: float = 1.0
        self._science_collected: float = 0.0
        self._tasks_available: List[str] = []
        self._mission_phase: str = "surface_ops"
        self._done: bool = False
        self._step_count: int = 0

    # ── reset ─────────────────────────────────────────────────────────────────

    def reset(self) -> str:
        """
        Randomize the world and return an initial observation string
        suitable for feeding to an LLM agent.
        """
        self._clock.reset()
        self._world.reset()
        self._battery = round(random.uniform(0.6, 1.0), 2)
        self._science_collected = 0.0
        self._tasks_available = random_available_tasks()
        ws = self._world.get_state()
        self._mission_phase = determine_mission_phase(
            self._battery, ws["anomaly_active"], ws["weather"]
        )
        self._done = False
        self._step_count = 0

        return self._build_observation_str(event="Mission initialized. You are the Mars rover PIXEL.")

    # ── step ──────────────────────────────────────────────────────────────────

    def step(self, action: str) -> Tuple[str, float, bool, Dict[str, Any]]:
        """
        Accept a natural-language action string, parse the intent, update
        the world, and return (observation_str, reward, done, info).
        """
        if self._done:
            return (
                "Mission is complete. Call reset() to start a new episode.",
                0.0,
                True,
                {"error": "Episode already done"},
            )

        # Parse intent
        intent = parse_action(action)
        info: Dict[str, Any] = {"raw_action": action, "parsed_intent": intent}

        # ── Snapshot pre-step state (for rubric reward computation) ────────
        pre_state = self.state()

        # ── Multi-Agent Council (runs BEFORE reward computation) ──────────
        council_output = run_agent_council(pre_state)
        info["agent_council"] = council_output

        # ── Forced safe_mode if battery critically low ────────────────────
        forced_safe = False
        if self._battery < 0.1 and intent != "charge":
            info["forced_safe_mode"] = True
            info["original_intent"] = intent
            intent = "safe_mode"
            forced_safe = True

        # ── Forced safe_mode if anomaly is active ─────────────────────────
        ws = self._world.get_state()
        if ws["anomaly_active"] and intent != "safe_mode":
            info["anomaly_forced_safe_mode"] = True
            info["original_intent"] = intent
            intent = "safe_mode"

        # ── Validate action against available tasks ───────────────────────
        if intent in ("drill", "image", "soil_sample") and intent not in self._tasks_available:
            info["task_unavailable"] = True
            post_state = self.state()  # state unchanged
            rubric = compute_total_reward(pre_state, intent, post_state, council_output)
            info["reward_rubric"] = rubric
            observation = (
                f"Sol {self._clock.sol}: Action '{intent}' is not available this sol. "
                f"Available science tasks: {self._tasks_available}. "
                f"You can also: charge, safe_mode, transmit."
            )
            info["world_state"] = ws
            info["world_observation"] = self._world.get_observation_string()
            info["world_forecast"] = self._world.predict_next_sol()
            info["world_critical"] = self._world.is_critical()
            info["mission_clock"] = self._clock.to_dict()
            return observation, rubric["total"], False, info

        # ── Validate transmit requires comm window ────────────────────────
        if intent == "transmit" and not ws["comm_window_open"]:
            info["no_comm_window"] = True
            post_state = self.state()  # state unchanged
            rubric = compute_total_reward(pre_state, intent, post_state, council_output)
            info["reward_rubric"] = rubric
            observation = (
                f"Sol {self._clock.sol}: Cannot transmit — communication window is closed. "
                f"Wait for the next comm window or choose another action."
            )
            info["world_state"] = ws
            info["world_observation"] = self._world.get_observation_string()
            info["world_forecast"] = self._world.predict_next_sol()
            info["world_critical"] = self._world.is_critical()
            info["mission_clock"] = self._clock.to_dict()
            return observation, rubric["total"], False, info

        # ── Apply action (mutate state) ───────────────────────────────────
        battery_cost = ACTION_BATTERY_COST[intent]
        science_gain = SCIENCE_REWARD[intent]

        # Apply battery change
        self._battery = round(self._battery - battery_cost, 4)
        self._battery = max(0.0, min(1.0, self._battery))

        # Apply science
        self._science_collected = round(self._science_collected + science_gain, 4)

        # Resolve anomaly if safe_mode
        ws = self._world.get_state()
        if intent == "safe_mode" and ws["anomaly_active"]:
            self._world.resolve_anomaly()
            info["anomaly_resolved"] = True

        # ── Advance sol (delegate to MarsWorldModel + MissionClock) ───────
        new_sol = self._clock.tick()
        self._step_count += 1
        ws = self._world.step_world(new_sol)

        # Refresh available tasks
        self._tasks_available = random_available_tasks()

        # Update mission phase
        self._mission_phase = determine_mission_phase(
            self._battery, ws["anomaly_active"], ws["weather"]
        )

        # Attach world model extras to info
        info["world_state"] = ws
        info["world_observation"] = self._world.get_observation_string()
        info["world_forecast"] = self._world.predict_next_sol()
        info["world_critical"] = self._world.is_critical()
        info["mission_clock"] = self._clock.to_dict()

        # ── Check termination ─────────────────────────────────────────────
        if self._clock.is_complete():
            self._done = True
            info["termination"] = "max_sol_reached"

        if self._battery <= 0.0:
            self._done = True
            info["termination"] = "battery_depleted"

        # ── Compute rubric reward (post-mutation) ─────────────────────────
        post_state = self.state()
        reward_rubric = compute_total_reward(
            pre_state, intent, post_state, council_output
        )
        reward = reward_rubric["total"]
        info["reward_rubric"] = reward_rubric

        # Build observation string
        event_parts = [f"Executed '{intent}'"]
        if forced_safe:
            event_parts.append("(battery critical — forced safe_mode)")
        if info.get("anomaly_resolved"):
            event_parts.append("Anomaly resolved!")
        if ws["anomaly_active"]:
            event_parts.append("⚠ NEW ANOMALY DETECTED — enter safe_mode next turn!")
        if self._done:
            event_parts.append(f"Mission {'complete' if self._clock.is_complete() else 'FAILED — battery depleted'}.")

        observation = self._build_observation_str(event=" | ".join(event_parts))

        return observation, reward, self._done, info

    # ── state ─────────────────────────────────────────────────────────────────

    def state(self) -> Dict[str, Any]:
        """Return the full environment state as a dictionary."""
        ws = self._world.get_state()
        return {
            "sol": self._clock.sol,
            "battery": round(self._battery, 4),
            "science_collected": round(self._science_collected, 4),
            "tasks_available": list(self._tasks_available),
            "weather": ws["weather"],
            "anomaly_active": ws["anomaly_active"],
            "comm_window_open": ws["comm_window_open"],
            "solar_efficiency": ws["solar_efficiency"],
            "mission_phase": self._mission_phase,
        }

    # ── Observation builder ───────────────────────────────────────────────

    def _build_observation_str(self, event: str = "") -> str:
        """Build a human-readable observation string for the LLM agent."""
        ws = self._world.get_state()
        sol = self._clock.sol
        lines = [
            f"═══ PIXEL Mars Rover — Sol {sol}/{MAX_SOL} ═══",
            f"Event: {event}" if event else "",
            f"Battery: {self._battery:.0%}",
            f"Science collected: {self._science_collected:.2f} pts",
            f"Weather: {ws['weather']}",
            f"Solar efficiency: {ws['solar_efficiency']:.0%}",
            f"Anomaly active: {'YES ⚠' if ws['anomaly_active'] else 'No'}",
            f"Comm window: {'OPEN ✓' if ws['comm_window_open'] else 'Closed'}",
            f"Mission phase: {self._mission_phase}",
            f"Available science tasks: {', '.join(self._tasks_available)}",
            f"Always available: charge, safe_mode, transmit",
            f"{'═' * 45}",
        ]
        return "\n".join(line for line in lines if line)
