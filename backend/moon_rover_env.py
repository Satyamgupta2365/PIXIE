"""
PIXEL — Moon Rover RL Environment (Short-term Ops + Energy Survival)
====================================================================
Simulates low-latency but extreme day/night cycle constraints.
"""
import random
from typing import Tuple, Dict, Any
from backend.environment import PIXELEnvironment, parse_action

class MoonRoverEnv(PIXELEnvironment):
    def __init__(self):
        super().__init__()
        self.daylight_remaining = 14 # 14 steps of daylight
        self.is_night = False
        
    def reset(self) -> str:
        obs = super().reset()
        self.daylight_remaining = 14
        self.is_night = False
        return obs

    def step(self, action: str) -> Tuple[str, float, bool, Dict[str, Any]]:
        # In Moon, action is executed almost immediately (no delay)
        parsed_action = parse_action(action)
        ws = self._world.get_state()
        
        # Advance time
        self.daylight_remaining -= 1
        if self.daylight_remaining <= 0 and not self.is_night:
            self.is_night = True
            self.daylight_remaining = 14 # 14 steps of night
        elif self.daylight_remaining <= 0 and self.is_night:
            self.is_night = False
            self.daylight_remaining = 14 # 14 steps of daylight
            
        # Enforce Lunar Night constraints
        if self.is_night:
            self._world._weather = "lunar_night"
            ws["solar_efficiency"] = 0.0 # No solar power at night
            ws["weather"] = "lunar_night"

        # Apply base logic
        obs, reward, done, info = super().step(parsed_action)
        
        # Override battery / reward logic for Moon
        moon_log = ""
        if self.is_night:
            if parsed_action not in ["safe_mode"]:
                # Heavy penalty for operating during freezing lunar night
                self._battery -= 0.25 # Extra severe drain
                reward -= 1.0 # Significant negative reward
                moon_log = f"\n[Moon Survival Log] ⚠ CRITICAL WARNING: Operating during Lunar Night. Battery drain accelerated due to extreme cold (-130°C)!"
            else:
                # Proper survival behavior
                moon_log = f"\n[Moon Survival Log] Hibernating safely during Lunar Night. Conserving heat."
                reward += 0.2 # Small survival bonus
        else:
             # Encourage fast optimization during day
             moon_log = f"\n[Moon Ops Log] Daylight remaining: {self.daylight_remaining} steps. Executing task fast (Latency: 1.2s)."
             if parsed_action in ["drill", "soil_sample", "image"]:
                 reward += 0.2 # Speed bonus during day

        # Clamp battery
        self._battery = max(0.0, min(1.0, self._battery))
        if self._battery <= 0.0:
            done = True
            
        # Update obs with log
        obs += moon_log
        
        # Expose specific moon metrics
        info["is_night"] = self.is_night
        info["daylight_remaining"] = self.daylight_remaining
        info["latency_ms"] = random.randint(1100, 1500) # Real-world ~1.2s delay
        
        return obs, reward, done, info
