from typing import Dict, Any, Tuple
from backend.environment import PIXELEnvironment
from backend.satellite_env import SatelliteEnv

class CombinedEnv:
    """
    Combined PIXEL Environment
    Integrates the Mars Rover (PIXELEnvironment) and the Satellite Network (SatelliteEnv)
    to form a complete Mission Control RL environment.
    """
    def __init__(self):
        self.rover_env = PIXELEnvironment()
        self.satellite_env = SatelliteEnv()
        self.step_count = 0

    def reset(self) -> Dict[str, Any]:
        rover_obs = self.rover_env.reset()
        sat_obs = self.satellite_env.reset()
        self.step_count = 0
        return self._generate_observation(rover_obs, sat_obs)

    def state(self) -> Dict[str, Any]:
        return {
            "rover": self.rover_env.state(),
            "satellites": self.satellite_env.state()
        }

    def _generate_observation(self, rover_obs: str, sat_obs: str) -> Dict[str, Any]:
        return {
            "rover_obs": rover_obs,
            "satellite_obs": sat_obs,
            "state": self.state()
        }

    def step(self, rover_action: str, sat_action: str) -> Tuple[Dict[str, Any], float, bool, Dict[str, Any]]:
        self.step_count += 1
        
        # Step both environments
        rover_obs, rover_reward, rover_done, rover_info = self.rover_env.step(rover_action)
        sat_obs, sat_reward, sat_done, sat_info = self.satellite_env.step(sat_action)
        
        # Cross-environment interactions (Communication Layer)
        # E.g., if Rover tries to transmit but Satellites have no bandwidth or visibility
        cross_reward = 0.0
        if rover_action == "transmit":
            sat_network = self.satellite_env.state()
            # Find an available communication satellite (SAT-A)
            sat_a = next((s for s in sat_network["satellites"] if s["id"] == "SAT-A"), None)
            if sat_a and sat_a["bandwidth_available"] >= 20 and sat_a["visible_to_earth"]:
                # Successful relay from rover to earth
                cross_reward += 0.5
            else:
                # Rover transmission failed due to satellite network issues
                rover_reward -= 0.5
                cross_reward -= 0.5
                rover_info["transmission_failed"] = "Satellite network unavailable"

        total_reward = rover_reward + sat_reward + cross_reward
        done = rover_done or sat_done or self.step_count >= 100
        
        info = {
            "rover_info": rover_info,
            "satellite_info": sat_info,
            "cross_reward": cross_reward
        }
        
        obs = self._generate_observation(rover_obs, sat_obs)
        return obs, total_reward, done, info
