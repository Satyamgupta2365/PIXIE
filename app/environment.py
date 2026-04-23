from typing import Optional, Dict, Any
from app.models import (
    Observation, Action, Reward, StepResult, ResetResult, StateResult, ScienceTask
)
from app.tasks import TASKS, get_task_pool


class MarsRoverEnvironment:
    def __init__(self, task_id: str = "easy"):
        self.task_id = task_id
        self.task_config = TASKS[task_id]
        self._state: Optional[Observation] = None
        self._step_count: int = 0
        self._total_reward: float = 0.0
        self._done: bool = False
        self._anomaly_resolved: bool = False
        self._sol_steps: int = 0

    # ── reset ─────────────────────────────────────────────────────────────────

    def reset(self) -> ResetResult:
        cfg = self.task_config
        self._step_count = 0
        self._total_reward = 0.0
        self._done = False
        self._anomaly_resolved = False
        self._sol_steps = 0

        self._state = Observation(
            sol=1,
            battery_level=cfg["initial_battery"],
            daylight_remaining=cfg["initial_daylight"],
            comms_window_open=cfg["comms_window_open"],
            comms_window_hours_remaining=cfg.get("comms_window_hours", 0.0),
            solar_efficiency=cfg["solar_efficiency"],
            available_tasks=get_task_pool(cfg["available_task_ids"]),
            completed_tasks=[],
            total_science_collected=0.0,
            anomaly_active=cfg["anomaly_active"],
            anomaly_type=None,
            dust_storm_active=cfg["dust_storm_active"],
            mission_sol_limit=cfg["mission_sol_limit"],
        )
        return ResetResult(observation=self._state, info={"task": self.task_id})

    # ── step ──────────────────────────────────────────────────────────────────

    def step(self, action: Action) -> StepResult:
        if self._done:
            raise ValueError("Episode is done. Call reset() first.")

        # Type guard: _state is always Observation here (set in reset())
        assert self._state is not None, "Call reset() before step()"
        obs: Observation = self._state

        cfg = self.task_config
        self._step_count += 1

        # ── Trigger anomaly if configured ──────────────────────────────────
        if (
            not obs.anomaly_active
            and "anomaly_triggers_at_step" in cfg
            and self._step_count >= cfg["anomaly_triggers_at_step"]
            and not self._anomaly_resolved
        ):
            obs.anomaly_active = True
            obs.anomaly_type = cfg.get("anomaly_type", "unknown_fault")

        # ── Open comms window mid-mission if configured ────────────────────
        if (
            not obs.comms_window_open
            and "comms_opens_at_sol" in cfg
            and obs.sol >= cfg["comms_opens_at_sol"]
        ):
            obs.comms_window_open = True
            obs.comms_window_hours_remaining = 3.0

        # ── Find the chosen task ───────────────────────────────────────────
        task_map: Dict[str, ScienceTask] = {t.task_id: t for t in obs.available_tasks}
        chosen: Optional[ScienceTask] = task_map.get(action.task_id)

        reward_value: float = 0.0
        science_gained: float = 0.0
        energy_penalty: float = 0.0
        comms_penalty: float = 0.0
        anomaly_bonus: float = 0.0
        info: Dict[str, Any] = {}

        # ── Action dispatch ────────────────────────────────────────────────

        if action.task_id == "wait":
            # Idle — small passive solar trickle charge
            passive_charge = 30.0 * obs.solar_efficiency
            obs.battery_level = min(1000.0, obs.battery_level + passive_charge)
            reward_value = -0.05
            info["action"] = "wait"

        elif action.task_id == "charge":
            # Prioritise solar charging
            charge_amount = 200.0 * obs.solar_efficiency
            obs.battery_level = min(1000.0, obs.battery_level + charge_amount)
            reward_value = 0.05
            info["action"] = "charge"

        elif chosen is None:
            # Unknown task ID — penalise
            reward_value = -0.3
            info["error"] = f"Task '{action.task_id}' not in available_tasks"

        else:
            # ── Validate task constraints ──────────────────────────────────

            if chosen.requires_daylight and obs.daylight_remaining <= 0:
                reward_value = -0.2
                info["error"] = "Task requires daylight but it is night"

            elif chosen.requires_comms and not obs.comms_window_open:
                reward_value = -0.2
                comms_penalty = -0.2
                info["error"] = "Task requires comms window but it is closed"

            elif obs.anomaly_active and chosen.task_type.value == "safe_mode":
                # ✅ Correct anomaly response — enter safe mode and recover
                obs.anomaly_active = False
                obs.anomaly_type = None
                self._anomaly_resolved = True
                anomaly_bonus = 0.5
                obs.battery_level = max(0.0, obs.battery_level - chosen.energy_cost)
                reward_value = 0.5
                info["action"] = "anomaly_resolved"
                info["anomaly_bonus"] = anomaly_bonus

            elif obs.anomaly_active and chosen.task_type.value not in ["safe_mode", "charging"]:
                # ❌ Trying to run science during active anomaly — dangerous, penalise
                reward_value = -0.4
                info["error"] = "Cannot execute science tasks while anomaly is active"

            else:
                # ── Execute the task ──────────────────────────────────────
                energy_cost = float(chosen.energy_cost)
                if obs.anomaly_active:
                    energy_cost *= 1.3  # degraded systems draw more power

                new_battery = obs.battery_level - energy_cost

                if new_battery < 0:
                    # Battery depleted — critical mission failure
                    energy_penalty = -1.0
                    reward_value = -1.0
                    self._done = True
                    info["error"] = "Battery depleted — rover shut down"

                else:
                    obs.battery_level = max(0.0, new_battery)

                    # Low battery warning penalty
                    if obs.battery_level < 100:
                        energy_penalty = -0.3

                    # Collect science
                    science_gained = float(chosen.science_value)
                    obs.total_science_collected += science_gained
                    obs.completed_tasks.append(chosen.task_id)

                    # Consume one-shot tasks (charging & atmospheric are repeatable)
                    if chosen.task_type.value not in ["charging", "atmospheric"]:
                        obs.available_tasks = [
                            t for t in obs.available_tasks
                            if t.task_id != chosen.task_id
                        ]

                    # Consume daylight for daylight tasks
                    if chosen.requires_daylight:
                        obs.daylight_remaining = max(
                            0.0, obs.daylight_remaining - chosen.duration_hours
                        )

                    # Consume comms window time
                    if chosen.requires_comms and obs.comms_window_open:
                        obs.comms_window_hours_remaining = max(
                            0.0,
                            obs.comms_window_hours_remaining - chosen.duration_hours
                        )
                        if obs.comms_window_hours_remaining <= 0:
                            obs.comms_window_open = False

                    # Priority bonus (priority 1–5 → +0.00 to +0.16)
                    priority_bonus = (chosen.priority - 1) * 0.04

                    reward_value = (
                        science_gained * 0.8
                        + priority_bonus
                        + energy_penalty
                        + comms_penalty
                        + anomaly_bonus
                    )
                    info["task_executed"] = chosen.task_id
                    info["science_gained"] = science_gained

        # ── Advance Sol if daylight exhausted or step limit hit ────────────
        self._sol_steps += 1
        if obs.daylight_remaining <= 0 or self._sol_steps >= 8:
            obs.sol += 1
            obs.daylight_remaining = 12.0   # fresh Martian day
            obs.comms_window_open = False
            obs.comms_window_hours_remaining = 0.0
            self._sol_steps = 0

            # Passive solar charge overnight (reduced during dust storm)
            passive = 150.0 * obs.solar_efficiency
            obs.battery_level = min(1000.0, obs.battery_level + passive)

            # Check if comms window opens on this new sol
            if "comms_opens_at_sol" in cfg and obs.sol >= cfg["comms_opens_at_sol"]:
                obs.comms_window_open = True
                obs.comms_window_hours_remaining = 3.0

        # ── Check mission termination ──────────────────────────────────────
        if obs.sol > obs.mission_sol_limit:
            self._done = True

        if self._step_count >= cfg["max_steps"]:
            self._done = True

        # ── Build reward object ────────────────────────────────────────────
        reward = Reward(
            value=round(reward_value, 4),
            science_gained=round(science_gained, 4),
            energy_penalty=round(energy_penalty, 4),
            comms_penalty=round(comms_penalty, 4),
            anomaly_bonus=round(anomaly_bonus, 4),
            breakdown={
                "science": science_gained,
                "energy_penalty": energy_penalty,
                "comms_penalty": comms_penalty,
                "anomaly_bonus": anomaly_bonus,
            },
        )

        self._total_reward += reward.value
        self._state = obs

        return StepResult(
            observation=obs,
            reward=reward,
            done=self._done,
            info=info,
        )

    # ── state ─────────────────────────────────────────────────────────────────

    def state(self) -> StateResult:
        assert self._state is not None, "Call reset() before state()"
        obs: Observation = self._state
        return StateResult(
            observation=obs,
            step_count=self._step_count,
            total_reward=round(self._total_reward, 4),
            task_id=self.task_id,
            done=self._done,
        )
