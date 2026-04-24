"""
PIXEL — Multi-Agent Decision Council
=====================================
Four independent specialist agents analyze the Mars rover state and vote on
the best action.  A NegotiationEngine resolves conflicts using priority-weighted
consensus to produce a single coordinated decision.

Usage:
    from backend.agents import run_agent_council

    council_output = run_agent_council(env.state())
    # council_output["final_action"]  → str
    # council_output["winning_agent"] → str
    # council_output["coordination_score"] → float  (0–1)
    # council_output["all_votes"]     → list[dict]
    # council_output["conflict_detected"] → bool
"""

from __future__ import annotations

from typing import Dict, Any, List


# ═══════════════════════════════════════════════════════════════════════════════
#  Agent base protocol
# ═══════════════════════════════════════════════════════════════════════════════

class _AgentVote:
    """Thin value-object returned by every agent."""
    __slots__ = ("action", "confidence", "reasoning")

    def __init__(self, action: str, confidence: float, reasoning: str):
        self.action = action
        self.confidence = round(max(0.0, min(1.0, confidence)), 4)
        self.reasoning = reasoning

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Agent 1 — PlannerAgent  (maximize science)
# ═══════════════════════════════════════════════════════════════════════════════

class PlannerAgent:
    """
    Goal : maximise cumulative science_collected over the full mission.
    Preference : drill > soil_sample > image > transmit.
    Avoids charge / safe_mode unless the situation is critical.
    """

    name = "PlannerAgent"

    # Ranked science priority (highest first)
    _SCIENCE_PRIORITY = ["drill", "soil_sample", "image", "transmit"]

    def decide(self, state: Dict[str, Any]) -> _AgentVote:
        battery = state["battery"]
        anomaly = state["anomaly_active"]
        tasks = state["tasks_available"]
        comm_open = state["comm_window_open"]
        sol = state["sol"]

        # Safety guard — defer to other agents when critical
        if anomaly:
            return _AgentVote(
                "safe_mode", 0.3,
                "Anomaly active — deferring to RiskAgent for safe_mode."
            )
        if battery < 0.15:
            return _AgentVote(
                "charge", 0.3,
                "Battery critically low — science must wait."
            )

        # Pick the highest-priority science task that is actually available
        if battery > 0.3:
            for action in self._SCIENCE_PRIORITY:
                if action in tasks:
                    # More science left to do → higher confidence
                    remaining_sols = max(1, 100 - sol)
                    urgency = min(1.0, remaining_sols / 100)
                    confidence = 0.6 + 0.2 * urgency
                    return _AgentVote(
                        action, confidence,
                        f"Best available science task is '{action}' "
                        f"with {remaining_sols} sols remaining."
                    )
                # transmit needs comm window
                if action == "transmit" and comm_open:
                    return _AgentVote(
                        "transmit", 0.55,
                        "No lab tasks available — transmit data while comm is open."
                    )

        # Fallback: if battery is moderate but no science tasks
        if comm_open:
            return _AgentVote(
                "transmit", 0.45,
                "No science tasks available — transmitting collected data."
            )

        return _AgentVote(
            "charge", 0.25,
            "No productive science action available — conserving energy."
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  Agent 2 — ResourceAgent  (preserve battery / ensure survival)
# ═══════════════════════════════════════════════════════════════════════════════

class ResourceAgent:
    """
    Goal : keep the rover alive for the full 100-sol mission.
    Core rule: battery < 0.4 → recommend charge (confidence 0.9).
    Penalises any non-charge action when battery < 0.2.
    """

    name = "ResourceAgent"

    def decide(self, state: Dict[str, Any]) -> _AgentVote:
        battery = state["battery"]
        solar = state["solar_efficiency"]
        weather = state["weather"]

        # Critical battery — must charge
        if battery < 0.2:
            return _AgentVote(
                "charge", 0.95,
                f"Battery at {battery:.0%} — CRITICAL. "
                f"Must charge immediately to avoid mission loss."
            )

        # Low battery — strongly prefer charge
        if battery < 0.4:
            charge_effectiveness = 0.20 * solar  # expected gain
            return _AgentVote(
                "charge", 0.9,
                f"Battery at {battery:.0%} with solar efficiency {solar:.0%}. "
                f"Charging would restore ~{charge_effectiveness:.0%}."
            )

        # Moderate battery during dust storm — pre-emptive charge
        if battery < 0.55 and weather == "dust_storm":
            return _AgentVote(
                "charge", 0.65,
                f"Dust storm active and battery at {battery:.0%} — "
                f"pre-emptive charging recommended."
            )

        # Healthy battery — low-priority suggestion to charge if solar is good
        if battery < 0.7 and solar > 0.8:
            return _AgentVote(
                "charge", 0.30,
                f"Battery at {battery:.0%} and solar is strong ({solar:.0%}). "
                f"Good opportunity to top up, but not urgent."
            )

        # Battery is fine — no strong opinion
        return _AgentVote(
            "charge", 0.10,
            f"Battery healthy at {battery:.0%}. No charging needed — "
            f"deferring to other agents."
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  Agent 3 — RiskAgent  (avoid mission failure)
# ═══════════════════════════════════════════════════════════════════════════════

class RiskAgent:
    """
    Goal : prevent mission-ending events.
    Anomaly active → safe_mode with confidence 1.0.
    Dust storm → charge with confidence 0.8.
    """

    name = "RiskAgent"

    def decide(self, state: Dict[str, Any]) -> _AgentVote:
        anomaly = state["anomaly_active"]
        weather = state["weather"]
        battery = state["battery"]

        # Highest priority: active anomaly
        if anomaly:
            return _AgentVote(
                "safe_mode", 1.0,
                "ANOMALY ACTIVE — entering safe_mode is mandatory to "
                "prevent cascading system failure."
            )

        # Dust storm — high risk of power loss
        if weather == "dust_storm":
            # Even more urgent if battery is already low
            conf = 0.85 if battery < 0.4 else 0.8
            return _AgentVote(
                "charge", conf,
                f"Dust storm in progress (solar at {state['solar_efficiency']:.0%}). "
                f"Charging to buffer against extended storm."
            )

        # Low visibility — moderate concern
        if weather == "low_visibility":
            return _AgentVote(
                "charge", 0.4,
                "Low visibility conditions — mild risk. "
                "Suggesting charge as precaution."
            )

        # Low battery even in clear weather
        if battery < 0.15:
            return _AgentVote(
                "safe_mode", 0.85,
                f"Battery dangerously low ({battery:.0%}) — "
                f"safe_mode to preserve remaining power."
            )

        # All clear
        return _AgentVote(
            "image", 0.15,
            "No immediate risks detected. Deferring to science agents."
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  Agent 4 — CommAgent  (maximize data transmitted)
# ═══════════════════════════════════════════════════════════════════════════════

class CommAgent:
    """
    Goal : seize communication windows to transmit collected science.
    Transmit when comm_window_open = True and science_collected > 0.
    """

    name = "CommAgent"

    def decide(self, state: Dict[str, Any]) -> _AgentVote:
        comm_open = state["comm_window_open"]
        science = state["science_collected"]
        anomaly = state["anomaly_active"]

        # Can't transmit during anomaly (safety override)
        if anomaly:
            return _AgentVote(
                "safe_mode", 0.5,
                "Anomaly active — comms are secondary to system recovery."
            )

        # Prime opportunity: window open and data to send
        if comm_open and science > 0:
            # More data = more urgency to transmit
            data_urgency = min(1.0, science / 3.0)
            confidence = 0.6 + 0.15 * data_urgency
            return _AgentVote(
                "transmit", round(confidence, 4),
                f"Comm window OPEN with {science:.2f} pts of science "
                f"queued — transmitting to Earth."
            )

        # Window open but no data yet
        if comm_open and science == 0:
            return _AgentVote(
                "drill", 0.35,
                "Comm window open but no science collected yet — "
                "gather data first, transmit next turn."
            )

        # Window closed — nothing to do on comms
        return _AgentVote(
            "image", 0.10,
            "Comm window closed. No transmission possible — "
            "deferring to other agents."
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  Negotiation Engine
# ═══════════════════════════════════════════════════════════════════════════════

# Priority order for tie-breaking: Risk > Resource > Comm > Planner
_AGENT_PRIORITY = {
    "RiskAgent":     4,   # highest
    "ResourceAgent": 3,
    "CommAgent":     2,
    "PlannerAgent":  1,   # lowest
}


class NegotiationEngine:
    """
    Resolves multi-agent voting conflicts.

    Resolution rules:
      1. If any agent has confidence > 0.9 → that agent wins outright.
         (If multiple agents exceed 0.9, the one with the highest priority wins.)
      2. Otherwise, weighted score = confidence × priority_weight.
         Highest weighted score wins.
      3. coordination_score = 1 - (unique_actions / 4).
    """

    def resolve(
        self, votes: List[Dict[str, Any]], agent_names: List[str]
    ) -> Dict[str, Any]:

        # ── Detect conflicts ──────────────────────────────────────────────
        unique_actions = set(v["action"] for v in votes)
        conflict_detected = len(unique_actions) > 1
        coordination_score = round(1.0 - (len(unique_actions) / 4.0), 4)

        # ── Rule 1: High-confidence override (>0.9) ──────────────────────
        high_conf = [
            (v, name) for v, name in zip(votes, agent_names)
            if v["confidence"] > 0.9
        ]

        if high_conf:
            # Among high-confidence agents, pick the one with highest priority
            high_conf.sort(
                key=lambda pair: _AGENT_PRIORITY.get(pair[1], 0),
                reverse=True,
            )
            winner_vote, winner_name = high_conf[0]
            return {
                "final_action": winner_vote["action"],
                "winning_agent": winner_name,
                "coordination_score": coordination_score,
                "all_votes": votes,
                "conflict_detected": conflict_detected,
            }

        # ── Rule 2: Priority-weighted scoring ─────────────────────────────
        best_score = -1.0
        winner_vote = votes[0]
        winner_name = agent_names[0]

        for v, name in zip(votes, agent_names):
            priority = _AGENT_PRIORITY.get(name, 1)
            weighted = v["confidence"] * priority
            if weighted > best_score:
                best_score = weighted
                winner_vote = v
                winner_name = name

        return {
            "final_action": winner_vote["action"],
            "winning_agent": winner_name,
            "coordination_score": coordination_score,
            "all_votes": votes,
            "conflict_detected": conflict_detected,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Public API — run_agent_council
# ═══════════════════════════════════════════════════════════════════════════════

# Singleton instances
_planner  = PlannerAgent()
_resource = ResourceAgent()
_risk     = RiskAgent()
_comm     = CommAgent()
_engine   = NegotiationEngine()

_AGENTS = [_planner, _resource, _risk, _comm]


def run_agent_council(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run all 4 specialist agents on the current environment state,
    pass their votes to the NegotiationEngine, and return the
    full council decision.

    Parameters
    ----------
    state : dict
        The environment state dict (from PIXELEnvironment.state()).

    Returns
    -------
    dict
        {
            "final_action": str,
            "winning_agent": str,
            "coordination_score": float,
            "all_votes": list[dict],
            "conflict_detected": bool,
        }
    """
    votes: List[Dict[str, Any]] = []
    names: List[str] = []

    for agent in _AGENTS:
        vote = agent.decide(state)
        votes.append(vote.to_dict())
        names.append(agent.name)

    result = _engine.resolve(votes, names)
    return result
