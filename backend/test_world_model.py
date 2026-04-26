"""
Tests for the MarsWorldModel and MissionClock classes.
Validates world dynamics, observation strings, forecasting,
critical-state detection, and mission clock behaviour.
"""

import json
from backend.world import MarsWorldModel, MissionClock


def pp(label, obj):
    print(f"\n{'~'*60}")
    print(f"  {label}")
    print(f"{'~'*60}")
    if isinstance(obj, dict):
        print(json.dumps(obj, indent=2, default=str))
    else:
        print(obj)


# ═══════════════════════════════════════════════════════════════════════════════
#  1. MissionClock
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  1. MISSION CLOCK")
print("=" * 60)

clock = MissionClock()
assert clock.sol == 0
assert clock.phase == "early"
assert clock.time_remaining() == 100
assert not clock.is_complete()
print("  [PASS] Initial state: sol=0, phase=early, remaining=100")

# Tick through phases
for _ in range(30):
    clock.tick()
assert clock.sol == 30
assert clock.phase == "early"  # boundary: 0-30
print("  [PASS] Sol 30 -> phase=early (boundary)")

clock.tick()
assert clock.sol == 31
assert clock.phase == "mid"
print("  [PASS] Sol 31 -> phase=mid")

for _ in range(39):
    clock.tick()
assert clock.sol == 70
assert clock.phase == "mid"  # boundary
print("  [PASS] Sol 70 -> phase=mid (boundary)")

clock.tick()
assert clock.sol == 71
assert clock.phase == "late"
assert clock.time_remaining() == 29
print("  [PASS] Sol 71 -> phase=late, remaining=29")

# Run to completion
for _ in range(30):
    clock.tick()
assert clock.sol == 100  # capped
assert clock.is_complete()
assert clock.time_remaining() == 0
print("  [PASS] Sol 100 -> complete, remaining=0")

# Cannot exceed 100
clock.tick()
assert clock.sol == 100
print("  [PASS] Sol capped at 100 after extra ticks")

# Reset
clock.reset()
assert clock.sol == 0
assert clock.phase == "early"
print("  [PASS] Reset works")

# to_dict
d = clock.to_dict()
assert d["sol"] == 0
assert d["phase"] == "early"
assert d["time_remaining"] == 100
print(f"  [PASS] to_dict: {d}")


# ═══════════════════════════════════════════════════════════════════════════════
#  2. MarsWorldModel — reset and get_state
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  2. MARS WORLD MODEL — reset / get_state")
print("=" * 60)

world = MarsWorldModel()
state = world.reset()
pp("Reset state", state)

assert state["weather"] in ("clear", "dust_storm", "low_visibility")
assert 0.0 <= state["solar_efficiency"] <= 1.0
assert isinstance(state["comm_window_open"], bool)
assert isinstance(state["anomaly_active"], bool)
assert state["anomaly_type"] in (None, "motor_fault", "sensor_failure", "comms_blackout")
print("  [PASS] Reset returns valid state schema")

# Solar range matches weather
if state["weather"] == "clear":
    assert 0.9 <= state["solar_efficiency"] <= 1.0
elif state["weather"] == "dust_storm":
    assert 0.1 <= state["solar_efficiency"] <= 0.3
elif state["weather"] == "low_visibility":
    assert 0.5 <= state["solar_efficiency"] <= 0.7
print(f"  [PASS] Solar {state['solar_efficiency']} in range for '{state['weather']}'")


# ═══════════════════════════════════════════════════════════════════════════════
#  3. MarsWorldModel — step_world
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  3. MARS WORLD MODEL — step_world")
print("=" * 60)

world = MarsWorldModel()
world.reset()

weather_counts = {"clear": 0, "dust_storm": 0, "low_visibility": 0}
anomaly_count = 0
comm_count = 0

for sol in range(1, 101):
    ws = world.step_world(sol)
    weather_counts[ws["weather"]] += 1
    if ws["anomaly_active"]:
        anomaly_count += 1
    if ws["comm_window_open"]:
        comm_count += 1

pp("100-sol weather distribution", weather_counts)
print(f"  Anomaly active sols: {anomaly_count}")
print(f"  Comm window open sols: {comm_count}")

# Sanity: all weathers should appear across 100 sols (very likely)
assert sum(weather_counts.values()) == 100
print("  [PASS] 100 sols stepped successfully")
print(f"  [PASS] Weather distribution: {weather_counts}")


# ═══════════════════════════════════════════════════════════════════════════════
#  4. Dust storm duration tracking
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  4. DUST STORM DURATION")
print("=" * 60)

# Force a dust storm and verify it persists
world2 = MarsWorldModel()
world2.reset()
world2._weather = "dust_storm"
world2._dust_storm_remaining = 3

ws1 = world2.step_world(1)
assert ws1["weather"] == "dust_storm", f"Storm should persist, got {ws1['weather']}"
assert ws1["dust_storm_remaining"] == 2
print(f"  [PASS] Storm persists: remaining={ws1['dust_storm_remaining']}")

ws2 = world2.step_world(2)
assert ws2["weather"] == "dust_storm"
assert ws2["dust_storm_remaining"] == 1
print(f"  [PASS] Storm countdown: remaining={ws2['dust_storm_remaining']}")

ws3 = world2.step_world(3)
# Storm duration expired -> transitions out
assert ws3["weather"] != "dust_storm" or ws3["dust_storm_remaining"] == 0
print(f"  [PASS] Storm expired -> weather='{ws3['weather']}', remaining={ws3['dust_storm_remaining']}")


# ═══════════════════════════════════════════════════════════════════════════════
#  5. Anomaly types and auto-resolution
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  5. ANOMALY TYPES & AUTO-RESOLUTION")
print("=" * 60)

world3 = MarsWorldModel()
world3.reset()
world3._anomaly_active = True
world3._anomaly_type = "motor_fault"
world3._anomaly_remaining = 1

ws = world3.step_world(10)
# Should have auto-resolved after 1 sol
assert not ws["anomaly_active"], f"Anomaly should have auto-resolved"
assert ws["anomaly_type"] is None
print("  [PASS] Anomaly auto-resolves after duration expires")

# Manual resolution
world3._anomaly_active = True
world3._anomaly_type = "sensor_failure"
world3._anomaly_remaining = 5
world3.resolve_anomaly()
ws = world3.get_state()
assert not ws["anomaly_active"]
assert ws["anomaly_type"] is None
assert ws["anomaly_remaining"] == 0
print("  [PASS] Manual resolve_anomaly() clears all anomaly state")


# ═══════════════════════════════════════════════════════════════════════════════
#  6. Comm window duration
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  6. COMM WINDOW DURATION")
print("=" * 60)

world4 = MarsWorldModel()
world4.reset()
world4._comm_window_open = True
world4._comm_window_remaining = 2

ws = world4.step_world(5)
assert ws["comm_window_open"], "Window should still be open"
assert ws["comm_window_remaining"] == 1
print(f"  [PASS] Comm window persists: remaining={ws['comm_window_remaining']}")

ws2 = world4.step_world(6)
assert not ws2["comm_window_open"], "Window should have closed"
print(f"  [PASS] Comm window closed after duration expired")


# ═══════════════════════════════════════════════════════════════════════════════
#  7. get_observation_string
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  7. OBSERVATION STRING")
print("=" * 60)

world5 = MarsWorldModel()
world5.reset()
world5._weather = "dust_storm"
world5._dust_storm_remaining = 3
world5._solar_efficiency = 0.2
world5._comm_window_open = False
world5._anomaly_active = True
world5._anomaly_type = "motor_fault"
world5._current_sol = 14

obs = world5.get_observation_string()
pp("Observation string", obs)

assert "Sol 14" in obs
assert "dust storm" in obs.lower()
assert "20%" in obs
assert "closed" in obs.lower()
assert "motor fault" in obs.lower()
print("  [PASS] Observation string contains all expected information")

# Clear state
world5._weather = "clear"
world5._anomaly_active = False
world5._comm_window_open = True
world5._comm_window_remaining = 2
world5._solar_efficiency = 0.95
obs2 = world5.get_observation_string()
pp("Clear observation", obs2)
assert "clear" in obs2.lower()
assert "nominal" in obs2.lower()
assert "OPEN" in obs2
print("  [PASS] Clear-weather observation is correct")


# ═══════════════════════════════════════════════════════════════════════════════
#  8. predict_next_sol
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  8. PREDICT NEXT SOL")
print("=" * 60)

world6 = MarsWorldModel()
world6.reset()
world6._weather = "clear"
world6._dust_storm_remaining = 0
world6._comm_window_open = False
world6._anomaly_active = False

forecast = world6.predict_next_sol()
pp("Forecast (clear weather)", forecast)

assert "weather" in forecast
assert "probability" in forecast
assert "comm_window" in forecast
assert "solar_efficiency_est" in forecast
assert "anomaly_risk" in forecast
assert 0.0 <= forecast["probability"] <= 1.0
print("  [PASS] Forecast schema valid")

# During a persistent dust storm
world6._weather = "dust_storm"
world6._dust_storm_remaining = 4
forecast2 = world6.predict_next_sol()
pp("Forecast (persistent storm)", forecast2)
assert forecast2["weather"] == "dust_storm"
assert forecast2["probability"] >= 0.85
print("  [PASS] Storm predicted to persist with high probability")


# ═══════════════════════════════════════════════════════════════════════════════
#  9. is_critical
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  9. IS_CRITICAL")
print("=" * 60)

world7 = MarsWorldModel()
world7.reset()
world7._weather = "clear"
world7._anomaly_active = False
world7._solar_efficiency = 0.95
assert not world7.is_critical()
print("  [PASS] Clear skies, no anomaly -> NOT critical")

world7._anomaly_active = True
assert world7.is_critical()
print("  [PASS] Anomaly active -> critical")

world7._anomaly_active = False
world7._weather = "dust_storm"
assert world7.is_critical()
print("  [PASS] Dust storm -> critical")

world7._weather = "clear"
world7._solar_efficiency = 0.15
assert world7.is_critical()
print("  [PASS] Solar < 0.2 -> critical")

world7._solar_efficiency = 0.5
assert not world7.is_critical()
print("  [PASS] Normal conditions -> NOT critical")


# ═══════════════════════════════════════════════════════════════════════════════
#  10. Integration: MarsWorldModel + MissionClock in environment
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("  10. ENVIRONMENT INTEGRATION")
print("=" * 60)

from backend.environment import PIXIEEnvironment

env = PIXIEEnvironment()
env.reset()

for i in range(5):
    actions = ["drill", "charge", "image", "transmit", "safe_mode"]
    obs, reward, done, info = env.step(actions[i])

    assert "world_state" in info, "world_state missing from info"
    assert "world_observation" in info, "world_observation missing"
    assert "world_forecast" in info, "world_forecast missing"
    assert "world_critical" in info, "world_critical missing"
    assert "mission_clock" in info, "mission_clock missing"

    ws = info["world_state"]
    mc = info["mission_clock"]

    print(f"  Step {i+1}: sol={mc['sol']} phase={mc['phase']} "
          f"weather={ws['weather']} solar={ws['solar_efficiency']:.2f} "
          f"anomaly={ws['anomaly_active']} "
          f"anomaly_type={ws['anomaly_type']} "
          f"comm={ws['comm_window_open']} "
          f"critical={info['world_critical']}")

    if done:
        break

print("  [PASS] All world model data accessible via info dict")


# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  ALL WORLD MODEL TESTS PASSED!")
print("=" * 60)
