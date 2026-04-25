"""
PIXEL — Mars Rover RL Environment (Deep Autonomy + Delayed Comm)
================================================================
Simulates communication delays and forces the rover to make autonomous decisions.
"""
import random
from typing import Tuple, Dict, Any
from backend.environment import PIXELEnvironment, parse_action

class MarsRoverEnv(PIXELEnvironment):
    def __init__(self):
        super().__init__()
        self.command_queue = []  # Queue for delayed commands from Earth
        self.comm_delay_steps = random.randint(3, 5) # 3-5 steps (sols) delay
        
    def reset(self) -> str:
        obs = super().reset()
        self.command_queue = []
        self.comm_delay_steps = random.randint(3, 5)
        return obs

    def step(self, earth_command: str) -> Tuple[str, float, bool, Dict[str, Any]]:
        # 1. Earth sends command -> goes to queue
        if earth_command:
            self.command_queue.append({
                "command": earth_command,
                "steps_remaining": self.comm_delay_steps
            })

        # 2. Process queue: decrement delay
        for cmd in self.command_queue:
            cmd["steps_remaining"] -= 1
        
        # 3. Check if any command arrived
        arrived_commands = [c for c in self.command_queue if c["steps_remaining"] <= 0]
        self.command_queue = [c for c in self.command_queue if c["steps_remaining"] > 0]

        # 4. Rover makes autonomous decision
        ws = self._world.get_state()
        rover_action = "safe_mode" # Default fallback
        rover_override_reason = ""

        if arrived_commands:
            # Execute the oldest arrived command
            arrived_cmd = arrived_commands[0]["command"]
            parsed_earth = parse_action(arrived_cmd)
            
            # Deep Autonomy Override Logic
            if parsed_earth == "drill" and ws["weather"] == "dust_storm":
                rover_override_reason = f"⚠ OVERRIDE: Earth sent 'drill' but dust storm is active. Executing 'safe_mode'."
                rover_action = "safe_mode"
            elif self._battery < 0.2 and parsed_earth != "charge":
                rover_override_reason = f"⚠ OVERRIDE: Battery critical. Ignoring Earth command '{parsed_earth}'. Executing 'charge'."
                rover_action = "charge"
            elif ws["anomaly_active"] and parsed_earth != "safe_mode":
                rover_override_reason = f"⚠ OVERRIDE: System anomaly active. Ignoring Earth command. Executing 'safe_mode'."
                rover_action = "safe_mode"
            else:
                rover_override_reason = f"✓ COMM RECEIVED: Executing Earth command '{parsed_earth}'."
                rover_action = parsed_earth
        else:
            # No command from Earth. Rover acts fully autonomously due to comm delay.
            rover_override_reason = "📡 COMM DELAY: No command received from Earth. Autonomously deciding action."
            if self._battery < 0.3:
                rover_action = "charge"
                rover_override_reason += " -> Chosen 'charge' due to low battery."
            elif ws["anomaly_active"] or ws["weather"] == "dust_storm":
                rover_action = "safe_mode"
                rover_override_reason += " -> Chosen 'safe_mode' due to hazard."
            elif "image" in self._tasks_available:
                rover_action = "image"
                rover_override_reason += " -> Chosen 'image' opportunistically."
            else:
                rover_action = "charge"
                rover_override_reason += " -> Chosen 'charge'."

        # 5. Execute the final chosen action in the base environment
        obs, reward, done, info = super().step(rover_action)
        
        # Track specific Mars details
        info["earth_command_sent"] = earth_command
        info["rover_action_taken"] = rover_action
        info["rover_override_reason"] = rover_override_reason
        info["comm_delay"] = self.comm_delay_steps
        info["in_transit_commands"] = len(self.command_queue)
        
        # Modify observation string for the LLM to see the delay and autonomy
        mars_log = f"\n[Mars Autonomy Log] {rover_override_reason}\n[Signal Delay: {self.comm_delay_steps * 5} minutes | Commands in transit: {len(self.command_queue)}]"
        obs += mars_log
        
        # Mars long-horizon reward modifier: reward autonomy surviving delays
        if "OVERRIDE" in rover_override_reason:
            reward += 0.5 # Bonus for smart overrides!
            
        return obs, reward, done, info
