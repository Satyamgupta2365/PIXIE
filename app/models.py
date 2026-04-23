from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class TaskType(str, Enum):
    IMAGING = "imaging"
    SPECTROSCOPY = "spectroscopy"
    DRILLING = "drilling"
    ATMOSPHERIC = "atmospheric"
    NAVIGATION = "navigation"
    CHARGING = "charging"
    SAFE_MODE = "safe_mode"


class ScienceTask(BaseModel):
    task_id: str
    name: str
    task_type: TaskType
    energy_cost: float = Field(..., description="Energy required in Wh")
    science_value: float = Field(..., description="Science return value 0.0-1.0")
    duration_hours: float = Field(..., description="Time required in Martian hours")
    requires_daylight: bool = True
    requires_comms: bool = False
    priority: int = Field(..., description="Mission priority 1=low, 5=critical")


class Observation(BaseModel):
    sol: int = Field(..., description="Current Martian day (Sol)")
    battery_level: float = Field(..., description="Current battery charge in Wh (0-1000)")
    daylight_remaining: float = Field(..., description="Hours of daylight remaining this sol")
    comms_window_open: bool = Field(..., description="Is Earth communication window open")
    comms_window_hours_remaining: float = Field(..., description="Hours until comms window closes")
    solar_efficiency: float = Field(..., description="Solar panel efficiency 0.0-1.0 (reduced by dust)")
    available_tasks: List[ScienceTask] = Field(..., description="Tasks available to schedule")
    completed_tasks: List[str] = Field(default=[], description="Task IDs completed this sol")
    total_science_collected: float = Field(default=0.0, description="Cumulative science value")
    anomaly_active: bool = Field(default=False, description="Is there an active system anomaly")
    anomaly_type: Optional[str] = Field(default=None, description="Type of anomaly if active")
    dust_storm_active: bool = Field(default=False, description="Is dust storm reducing solar power")
    mission_sol_limit: int = Field(..., description="Total sols in this mission")


class Action(BaseModel):
    task_id: str = Field(..., description="ID of task to execute, or 'wait' to idle, 'charge' to prioritize charging")
    notes: Optional[str] = Field(default=None, description="Optional agent reasoning notes")


class Reward(BaseModel):
    value: float = Field(..., description="Reward for this step")
    science_gained: float = Field(default=0.0)
    energy_penalty: float = Field(default=0.0)
    comms_penalty: float = Field(default=0.0)
    anomaly_bonus: float = Field(default=0.0)
    breakdown: Dict[str, float] = Field(default={})


class StepResult(BaseModel):
    observation: Observation
    reward: Reward
    done: bool
    info: Dict[str, Any] = Field(default={})


class ResetResult(BaseModel):
    observation: Observation
    info: Dict[str, Any] = Field(default={})


class StateResult(BaseModel):
    observation: Observation
    step_count: int
    total_reward: float
    task_id: str
    done: bool
