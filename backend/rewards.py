"""
PIXEL — Composable Reward System (OpenEnv Rubric)
==================================================
A modular reward pipeline where each reward component is a pure function
scoring one dimension of rover performance.  ``compute_total_reward``
combines them with configurable weights, and ``EpisodeTracker``
accumulates statistics across a full episode for training analysis.

Usage:
    from backend.rewards import compute_total_reward, EpisodeTracker

    tracker = EpisodeTracker()
    ...
    reward_dict = compute_total_reward(pre_state, intent, post_state, council)
    tracker.record_step(reward_dict, post_state, intent)
    ...
    print(tracker.summary())
"""

from __future__ import annotations

from typing import Dict, Any, List

# ── Component weights ────────────────────────────────────────────────────────

WEIGHTS = {
    "science":       0.35,
    "survival":      0.35,
    "efficiency":    0.15,
    "coordination":  0.15,
}


# ═══════════════════════════════════════════════════════════════════════════════
#  1. Science Reward
# ═══════════════════════════════════════════════════════════════════════════════

_SCIENCE_VALUES = {
    "drill":       2.0,
    "soil_sample": 1.0,
    "image":       0.5,
}


def science_reward(
    state: Dict[str, Any],
    action: str,
    next_state: Dict[str, Any],
) -> float:
    """
    Reward for successfully executing a science-producing action.

    Returns
    -------
    +2.0  for a successful drill
    +1.0  for soil_sample
    +0.5  for image
     0.0  for anything else
    """
    # A science action is "successful" if science_collected increased
    science_delta = next_state["science_collected"] - state["science_collected"]
    if science_delta <= 0:
        return 0.0

    return _SCIENCE_VALUES.get(action, 0.0)


# ═══════════════════════════════════════════════════════════════════════════════
#  2. Survival Reward
# ═══════════════════════════════════════════════════════════════════════════════

def survival_reward(
    state: Dict[str, Any],
    action: str,
    next_state: Dict[str, Any],
) -> float:
    """
    Reward for keeping the rover alive.

    Returns
    -------
    +0.5  if battery > 0.3 after the action
    -2.0  if battery dropped to 0.0 (mission failure)
    -1.0  if anomaly was active and agent did NOT choose safe_mode
    """
    reward = 0.0

    post_battery = next_state["battery"]

    # Battery death — catastrophic
    if post_battery <= 0.0:
        reward -= 2.0

    # Healthy battery bonus
    elif post_battery > 0.3:
        reward += 0.5

    # Anomaly mishandling — the *pre*-step state had an active anomaly
    # and the agent chose something other than safe_mode
    if state["anomaly_active"] and action != "safe_mode":
        reward -= 1.0

    return reward


# ═══════════════════════════════════════════════════════════════════════════════
#  3. Efficiency Reward
# ═══════════════════════════════════════════════════════════════════════════════

_SCIENCE_ACTIONS = {"drill", "image", "soil_sample"}


def efficiency_reward(
    state: Dict[str, Any],
    action: str,
    next_state: Dict[str, Any],
) -> float:
    """
    Reward for making the most of environmental conditions.

    Returns
    -------
    +0.3  if a science task was completed during optimal weather
          (clear weather AND comm window open)
    -0.2  if the agent charged when battery was already > 0.7 (wasteful)
    +0.1  for each successful transmit
    """
    reward = 0.0

    # Optimal science conditions: clear + comm open at *pre*-step state
    if action in _SCIENCE_ACTIONS:
        science_delta = next_state["science_collected"] - state["science_collected"]
        if science_delta > 0 and state["weather"] == "clear" and state["comm_window_open"]:
            reward += 0.3

    # Wasteful charge — battery was already healthy
    if action == "charge" and state["battery"] > 0.7:
        reward -= 0.2

    # Successful transmit
    if action == "transmit":
        # Transmit is "successful" if science_collected changed (rover
        # sends data) or at minimum the comm window was actually open
        if state["comm_window_open"]:
            reward += 0.1

    return reward


# ═══════════════════════════════════════════════════════════════════════════════
#  4. Coordination Reward  (uses agent council output)
# ═══════════════════════════════════════════════════════════════════════════════

def coordination_reward(council_output: Dict[str, Any]) -> float:
    """
    Reward based on how well the multi-agent council converged.

    Returns
    -------
    +0.5  if coordination_score > 0.75 (agents mostly agreed)
    -0.3  if conflict_detected and winning agent was NOT RiskAgent
          during an anomaly situation (i.e. Risk should have led)
    +0.2  if the winning agent correctly matched the situation

    The "anomaly situation" is detected by checking whether any agent
    voted for safe_mode with confidence >= 0.9 (which only happens when
    RiskAgent sees anomaly_active = True).
    """
    reward = 0.0

    coord_score = council_output.get("coordination_score", 0.0)
    conflict = council_output.get("conflict_detected", False)
    winner = council_output.get("winning_agent", "")
    votes = council_output.get("all_votes", [])

    # High coordination — agents are aligned
    if coord_score > 0.75:
        reward += 0.5

    # Detect whether an anomaly situation exists in the votes
    # (RiskAgent votes safe_mode with confidence 1.0 during anomalies)
    anomaly_situation = any(
        v.get("action") == "safe_mode" and v.get("confidence", 0) >= 0.95
        for v in votes
    )

    if conflict and anomaly_situation and winner != "RiskAgent":
        # Risk should have led during an anomaly but didn't win
        reward -= 0.3

    # Situational match bonus — winning agent fits the circumstances
    # (heuristic: if no conflict, winner is appropriate by definition)
    if not conflict:
        reward += 0.2
    elif anomaly_situation and winner == "RiskAgent":
        reward += 0.2
    elif not anomaly_situation and winner == "PlannerAgent":
        reward += 0.2

    return reward


# ═══════════════════════════════════════════════════════════════════════════════
#  Composite Reward
# ═══════════════════════════════════════════════════════════════════════════════

def compute_total_reward(
    state: Dict[str, Any],
    action: str,
    next_state: Dict[str, Any],
    council_output: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute the full rubric-based reward by calling all four component
    functions and combining them with configurable weights.

    Parameters
    ----------
    state : dict          Pre-step environment state.
    action : str          The parsed action intent that was executed.
    next_state : dict     Post-step environment state.
    council_output : dict Output from ``run_agent_council()``.

    Returns
    -------
    dict
        {
            "total":        float,   # weighted sum
            "science":      float,   # raw science component
            "survival":     float,   # raw survival component
            "efficiency":   float,   # raw efficiency component
            "coordination": float,   # raw coordination component
            "breakdown":    str,     # human-readable explanation
        }
    """
    sci  = science_reward(state, action, next_state)
    surv = survival_reward(state, action, next_state)
    eff  = efficiency_reward(state, action, next_state)
    crd  = coordination_reward(council_output)

    total = round(
        sci  * WEIGHTS["science"]
        + surv * WEIGHTS["survival"]
        + eff  * WEIGHTS["efficiency"]
        + crd  * WEIGHTS["coordination"],
        4,
    )

    # Build human-readable breakdown
    parts: List[str] = []
    if sci != 0.0:
        parts.append(f"science {sci:+.2f} (x{WEIGHTS['science']})")
    if surv != 0.0:
        parts.append(f"survival {surv:+.2f} (x{WEIGHTS['survival']})")
    if eff != 0.0:
        parts.append(f"efficiency {eff:+.2f} (x{WEIGHTS['efficiency']})")
    if crd != 0.0:
        parts.append(f"coordination {crd:+.2f} (x{WEIGHTS['coordination']})")
    breakdown = " | ".join(parts) if parts else "no reward signals"

    return {
        "total":        total,
        "science":      round(sci, 4),
        "survival":     round(surv, 4),
        "efficiency":   round(eff, 4),
        "coordination": round(crd, 4),
        "breakdown":    breakdown,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Episode Tracker
# ═══════════════════════════════════════════════════════════════════════════════

class EpisodeTracker:
    """
    Accumulates per-step reward data across a full episode for analysis
    and training-curve generation.

    Usage::

        tracker = EpisodeTracker()
        for step in episode:
            reward_dict = compute_total_reward(...)
            tracker.record_step(reward_dict, next_state, action)
        stats = tracker.summary()
    """

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        """Clear all accumulated data for a new episode."""
        self._steps: int = 0
        self._total_reward: float = 0.0
        self._science_reward_sum: float = 0.0
        self._survival_reward_sum: float = 0.0
        self._efficiency_reward_sum: float = 0.0
        self._coordination_reward_sum: float = 0.0

        self._science_collected: float = 0.0
        self._battery_deaths: int = 0
        self._anomalies_encountered: int = 0
        self._anomalies_survived: int = 0
        self._actions_taken: List[str] = []
        self._reward_history: List[float] = []
        self._component_history: List[Dict[str, float]] = []

    def record_step(
        self,
        reward_dict: Dict[str, Any],
        next_state: Dict[str, Any],
        action: str,
        pre_state: Dict[str, Any] | None = None,
    ) -> None:
        """
        Record one step's reward and state data.

        Parameters
        ----------
        reward_dict : dict   Output from ``compute_total_reward()``.
        next_state : dict    Post-step environment state.
        action : str         The action that was executed.
        pre_state : dict     Optional pre-step state for anomaly tracking.
        """
        self._steps += 1
        total = reward_dict["total"]
        self._total_reward += total
        self._reward_history.append(total)

        self._science_reward_sum += reward_dict["science"]
        self._survival_reward_sum += reward_dict["survival"]
        self._efficiency_reward_sum += reward_dict["efficiency"]
        self._coordination_reward_sum += reward_dict["coordination"]

        self._component_history.append({
            "science":      reward_dict["science"],
            "survival":     reward_dict["survival"],
            "efficiency":   reward_dict["efficiency"],
            "coordination": reward_dict["coordination"],
            "total":        total,
        })

        self._science_collected = next_state["science_collected"]
        self._actions_taken.append(action)

        # Track battery death
        if next_state["battery"] <= 0.0:
            self._battery_deaths += 1

        # Track anomaly encounters and survival
        if pre_state is not None and pre_state.get("anomaly_active", False):
            self._anomalies_encountered += 1
            if action == "safe_mode":
                self._anomalies_survived += 1

    def summary(self) -> Dict[str, Any]:
        """
        Return final episode statistics.

        Returns
        -------
        dict
            {
                "steps": int,
                "total_reward": float,
                "science_collected": float,
                "battery_deaths": int,
                "anomalies_encountered": int,
                "anomalies_survived": int,
                "reward_per_step": float,
                "component_totals": {
                    "science": float,
                    "survival": float,
                    "efficiency": float,
                    "coordination": float,
                },
                "action_distribution": dict[str, int],
                "reward_history": list[float],
                "component_history": list[dict],
            }
        """
        # Action frequency distribution
        action_dist: Dict[str, int] = {}
        for a in self._actions_taken:
            action_dist[a] = action_dist.get(a, 0) + 1

        return {
            "steps":                 self._steps,
            "total_reward":          round(self._total_reward, 4),
            "science_collected":     round(self._science_collected, 4),
            "battery_deaths":        self._battery_deaths,
            "anomalies_encountered": self._anomalies_encountered,
            "anomalies_survived":    self._anomalies_survived,
            "reward_per_step":       round(self._total_reward / max(1, self._steps), 4),
            "component_totals": {
                "science":       round(self._science_reward_sum, 4),
                "survival":      round(self._survival_reward_sum, 4),
                "efficiency":    round(self._efficiency_reward_sum, 4),
                "coordination":  round(self._coordination_reward_sum, 4),
            },
            "action_distribution":   action_dist,
            "reward_history":        [round(r, 4) for r in self._reward_history],
            "component_history":     self._component_history,
        }
