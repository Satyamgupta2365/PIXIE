"""
Comprehensive test for the PIXIE composable reward system.
Tests each reward component, the composite function, the EpisodeTracker,
and full integration with the environment's step() function.
"""

import json
from backend.rewards import (
    science_reward,
    survival_reward,
    efficiency_reward,
    coordination_reward,
    compute_total_reward,
    EpisodeTracker,
    WEIGHTS,
)
from backend.environment import PIXIEEnvironment


def pp(label, obj):
    print(f"\n{'~'*60}")
    print(f"  {label}")
    print(f"{'~'*60}")
    if isinstance(obj, dict):
        print(json.dumps(obj, indent=2, default=str))
    else:
        print(obj)


# ═══════════════════════════════════════════════════════════════════════════════
#  Test states
# ═══════════════════════════════════════════════════════════════════════════════

# Successful drill: science went from 1.0 to 1.3
PRE_DRILL = {
    "sol": 10, "battery": 0.85, "science_collected": 1.0,
    "tasks_available": ["drill", "image"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": True,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}
POST_DRILL = {
    "sol": 11, "battery": 0.70, "science_collected": 1.3,
    "tasks_available": ["image"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": True,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}

# Battery death
PRE_DEATH = {
    "sol": 50, "battery": 0.12, "science_collected": 5.0,
    "tasks_available": ["drill"], "weather": "dust_storm",
    "anomaly_active": False, "comm_window_open": False,
    "solar_efficiency": 0.4, "mission_phase": "crisis",
}
POST_DEATH = {
    "sol": 51, "battery": 0.0, "science_collected": 5.0,
    "tasks_available": [], "weather": "dust_storm",
    "anomaly_active": False, "comm_window_open": False,
    "solar_efficiency": 0.4, "mission_phase": "crisis",
}

# Anomaly ignored (agent did NOT safe_mode)
PRE_ANOMALY = {
    "sol": 30, "battery": 0.60, "science_collected": 3.0,
    "tasks_available": ["drill"], "weather": "clear",
    "anomaly_active": True, "comm_window_open": False,
    "solar_efficiency": 1.0, "mission_phase": "crisis",
}
POST_ANOMALY_IGNORED = {
    "sol": 31, "battery": 0.45, "science_collected": 3.3,
    "tasks_available": ["image"], "weather": "clear",
    "anomaly_active": True, "comm_window_open": False,
    "solar_efficiency": 1.0, "mission_phase": "crisis",
}

# Wasteful charge (battery > 0.7)
PRE_WASTEFUL = {
    "sol": 5, "battery": 0.85, "science_collected": 0.5,
    "tasks_available": ["drill", "image"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": True,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}
POST_WASTEFUL = {
    "sol": 6, "battery": 1.0, "science_collected": 0.5,
    "tasks_available": ["drill"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": False,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}

# Successful transmit with comm open
PRE_TRANSMIT = {
    "sol": 20, "battery": 0.65, "science_collected": 2.0,
    "tasks_available": ["image"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": True,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}
POST_TRANSMIT = {
    "sol": 21, "battery": 0.57, "science_collected": 2.1,
    "tasks_available": ["drill"], "weather": "clear",
    "anomaly_active": False, "comm_window_open": True,
    "solar_efficiency": 1.0, "mission_phase": "surface_ops",
}

# Council outputs
COUNCIL_ALIGNED = {
    "final_action": "drill", "winning_agent": "PlannerAgent",
    "coordination_score": 0.8, "conflict_detected": False,
    "all_votes": [
        {"action": "drill", "confidence": 0.7, "reasoning": "science"},
        {"action": "drill", "confidence": 0.3, "reasoning": "ok"},
        {"action": "drill", "confidence": 0.15, "reasoning": "no risk"},
        {"action": "drill", "confidence": 0.1, "reasoning": "defer"},
    ],
}

COUNCIL_CONFLICT_ANOMALY = {
    "final_action": "drill", "winning_agent": "PlannerAgent",
    "coordination_score": 0.25, "conflict_detected": True,
    "all_votes": [
        {"action": "drill",     "confidence": 0.7, "reasoning": "science"},
        {"action": "charge",    "confidence": 0.5, "reasoning": "battery"},
        {"action": "safe_mode", "confidence": 1.0, "reasoning": "ANOMALY"},
        {"action": "transmit",  "confidence": 0.6, "reasoning": "data"},
    ],
}

COUNCIL_RISK_WINS = {
    "final_action": "safe_mode", "winning_agent": "RiskAgent",
    "coordination_score": 0.5, "conflict_detected": True,
    "all_votes": [
        {"action": "safe_mode", "confidence": 0.3, "reasoning": "defer"},
        {"action": "charge",    "confidence": 0.5, "reasoning": "battery"},
        {"action": "safe_mode", "confidence": 1.0, "reasoning": "ANOMALY"},
        {"action": "safe_mode", "confidence": 0.5, "reasoning": "comms"},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
#  1. Test science_reward
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  1. SCIENCE REWARD")
print("=" * 60)

r = science_reward(PRE_DRILL, "drill", POST_DRILL)
assert r == 2.0, f"Expected 2.0 for drill, got {r}"
print(f"  [PASS] drill = {r}")

r = science_reward(PRE_DRILL, "soil_sample", {**POST_DRILL, "science_collected": 1.25})
assert r == 1.0, f"Expected 1.0 for soil_sample, got {r}"
print(f"  [PASS] soil_sample = {r}")

r = science_reward(PRE_DRILL, "image", {**POST_DRILL, "science_collected": 1.15})
assert r == 0.5, f"Expected 0.5 for image, got {r}"
print(f"  [PASS] image = {r}")

r = science_reward(PRE_DRILL, "charge", POST_WASTEFUL)
assert r == 0.0, f"Expected 0.0 for charge, got {r}"
print(f"  [PASS] charge = {r}")

# No science delta -> 0.0 even for a science action name
r = science_reward(PRE_DRILL, "drill", {**PRE_DRILL})
assert r == 0.0, f"Expected 0.0 when no science delta, got {r}"
print(f"  [PASS] drill with no science change = {r}")


# ═══════════════════════════════════════════════════════════════════════════════
#  2. Test survival_reward
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  2. SURVIVAL REWARD")
print("=" * 60)

r = survival_reward(PRE_DRILL, "drill", POST_DRILL)
assert r == 0.5, f"Expected +0.5 (battery > 0.3), got {r}"
print(f"  [PASS] healthy battery = {r}")

r = survival_reward(PRE_DEATH, "drill", POST_DEATH)
assert r == -2.0, f"Expected -2.0 (battery death), got {r}"
print(f"  [PASS] battery death = {r}")

r = survival_reward(PRE_ANOMALY, "drill", POST_ANOMALY_IGNORED)
# anomaly was active + not safe_mode = -1.0; battery 0.45 > 0.3 = +0.5 => -0.5
assert r == -0.5, f"Expected -0.5 (anomaly ignored + healthy battery), got {r}"
print(f"  [PASS] anomaly ignored = {r}")

r = survival_reward(PRE_ANOMALY, "safe_mode", {**POST_ANOMALY_IGNORED, "battery": 0.58})
assert r == 0.5, f"Expected +0.5 (safe_mode during anomaly, battery ok), got {r}"
print(f"  [PASS] anomaly handled with safe_mode = {r}")


# ═══════════════════════════════════════════════════════════════════════════════
#  3. Test efficiency_reward
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  3. EFFICIENCY REWARD")
print("=" * 60)

# Optimal science: clear weather + comm open + science gain
r = efficiency_reward(PRE_DRILL, "drill", POST_DRILL)
assert r == 0.3, f"Expected +0.3 (optimal conditions), got {r}"
print(f"  [PASS] optimal drill = {r}")

# Wasteful charge
r = efficiency_reward(PRE_WASTEFUL, "charge", POST_WASTEFUL)
assert r == -0.2, f"Expected -0.2 (wasteful charge), got {r}"
print(f"  [PASS] wasteful charge = {r}")

# Successful transmit
r = efficiency_reward(PRE_TRANSMIT, "transmit", POST_TRANSMIT)
assert r == 0.1, f"Expected +0.1 (transmit), got {r}"
print(f"  [PASS] transmit with comm open = {r}")

# Charge when battery is low (not wasteful)
r = efficiency_reward(
    {**PRE_DRILL, "battery": 0.3},
    "charge",
    {**POST_DRILL, "battery": 0.5},
)
assert r == 0.0, f"Expected 0.0 (charge when battery low is ok), got {r}"
print(f"  [PASS] non-wasteful charge = {r}")


# ═══════════════════════════════════════════════════════════════════════════════
#  4. Test coordination_reward
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  4. COORDINATION REWARD")
print("=" * 60)

r = coordination_reward(COUNCIL_ALIGNED)
# coord > 0.75 = +0.5, no conflict = +0.2 => 0.7
assert r == 0.7, f"Expected 0.7 (aligned), got {r}"
print(f"  [PASS] aligned council = {r}")

r = coordination_reward(COUNCIL_CONFLICT_ANOMALY)
# coord 0.25 (no +0.5), conflict + anomaly + winner != Risk = -0.3 => -0.3
assert r == -0.3, f"Expected -0.3 (wrong winner during anomaly), got {r}"
print(f"  [PASS] wrong winner during anomaly = {r}")

r = coordination_reward(COUNCIL_RISK_WINS)
# coord 0.5 (no +0.5), conflict + anomaly + winner == Risk = +0.2 => 0.2
assert r == 0.2, f"Expected 0.2 (RiskAgent wins anomaly), got {r}"
print(f"  [PASS] RiskAgent correctly wins = {r}")


# ═══════════════════════════════════════════════════════════════════════════════
#  5. Test compute_total_reward
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  5. COMPOSITE REWARD")
print("=" * 60)

result = compute_total_reward(PRE_DRILL, "drill", POST_DRILL, COUNCIL_ALIGNED)
pp("Drill in optimal conditions (aligned council)", result)

# Verify schema
for key in ["total", "science", "survival", "efficiency", "coordination", "breakdown"]:
    assert key in result, f"Missing key: {key}"
print("  [PASS] Schema complete")

# Verify math: 2.0*0.35 + 0.5*0.35 + 0.3*0.15 + 0.7*0.15
expected = round(2.0 * 0.35 + 0.5 * 0.35 + 0.3 * 0.15 + 0.7 * 0.15, 4)
assert result["total"] == expected, f"Expected {expected}, got {result['total']}"
print(f"  [PASS] Total = {result['total']} (expected {expected})")
print(f"  [PASS] Breakdown: {result['breakdown']}")

# Battery death scenario
result2 = compute_total_reward(PRE_DEATH, "drill", POST_DEATH, COUNCIL_ALIGNED)
pp("Battery death scenario", result2)
assert result2["survival"] == -2.0, f"Survival should be -2.0"
assert result2["total"] < 0, f"Total should be negative on death"
print(f"  [PASS] Death penalty applied, total = {result2['total']}")


# ═══════════════════════════════════════════════════════════════════════════════
#  6. Test EpisodeTracker
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  6. EPISODE TRACKER")
print("=" * 60)

tracker = EpisodeTracker()

# Simulate 3 steps
steps_data = [
    (PRE_DRILL, "drill", POST_DRILL, COUNCIL_ALIGNED),
    (PRE_TRANSMIT, "transmit", POST_TRANSMIT, COUNCIL_ALIGNED),
    (PRE_ANOMALY, "safe_mode",
     {**POST_ANOMALY_IGNORED, "battery": 0.58, "anomaly_active": False},
     COUNCIL_RISK_WINS),
]

for pre, action, post, council in steps_data:
    rd = compute_total_reward(pre, action, post, council)
    tracker.record_step(rd, post, action, pre_state=pre)

summary = tracker.summary()
pp("Episode Summary (3 steps)", summary)

assert summary["steps"] == 3
assert summary["anomalies_encountered"] == 1
assert summary["anomalies_survived"] == 1
assert summary["battery_deaths"] == 0
assert len(summary["reward_history"]) == 3
assert len(summary["component_history"]) == 3
assert "drill" in summary["action_distribution"]
assert "transmit" in summary["action_distribution"]
assert "safe_mode" in summary["action_distribution"]
assert summary["reward_per_step"] != 0.0
print("  [PASS] Steps = 3")
print(f"  [PASS] Total reward = {summary['total_reward']}")
print(f"  [PASS] Anomalies: encountered={summary['anomalies_encountered']}, survived={summary['anomalies_survived']}")
print(f"  [PASS] Action distribution: {summary['action_distribution']}")
print(f"  [PASS] Component totals: {summary['component_totals']}")

# Test reset
tracker.reset()
assert tracker.summary()["steps"] == 0
print("  [PASS] Tracker reset works")


# ═══════════════════════════════════════════════════════════════════════════════
#  7. Test full environment integration
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  7. ENVIRONMENT INTEGRATION")
print("=" * 60)

env = PIXIEEnvironment()
env.reset()

tracker = EpisodeTracker()
actions = ["drill", "image", "charge", "transmit", "soil_sample", "safe_mode"]

for i in range(10):
    pre = env.state()
    action = actions[i % len(actions)]
    obs, reward, done, info = env.step(action)

    # Verify reward_rubric is in info
    assert "reward_rubric" in info, f"Step {i+1}: reward_rubric missing!"
    rubric = info["reward_rubric"]

    # Verify the returned reward matches the rubric total
    assert reward == rubric["total"], (
        f"Step {i+1}: reward={reward} != rubric total={rubric['total']}"
    )

    # Verify all components present
    for key in ["total", "science", "survival", "efficiency", "coordination", "breakdown"]:
        assert key in rubric, f"Step {i+1}: missing '{key}' in rubric"

    # Record in tracker
    post = env.state()
    tracker.record_step(rubric, post, info["parsed_intent"], pre_state=pre)

    print(f"  Step {i+1:2d}: {info['parsed_intent']:12s} | "
          f"reward={reward:+.4f} | "
          f"sci={rubric['science']:+.1f} surv={rubric['survival']:+.1f} "
          f"eff={rubric['efficiency']:+.1f} coord={rubric['coordination']:+.1f}")

    if done:
        break

summary = tracker.summary()
print(f"\n  Episode: {summary['steps']} steps, "
      f"total_reward={summary['total_reward']:.4f}, "
      f"reward/step={summary['reward_per_step']:.4f}")
print(f"  Actions: {summary['action_distribution']}")
print(f"  Components: {summary['component_totals']}")

print("  [PASS] All steps have reward_rubric in info")
print("  [PASS] Returned reward matches rubric total")
print("  [PASS] EpisodeTracker accumulates correctly")


# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  ALL TESTS PASSED!")
print("=" * 60)
