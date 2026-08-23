from pydantic import BaseModel, Field, field_validator
from typing import Any, Literal, Optional


class AnimationSpec(BaseModel):
    duration_s: float = Field(..., description="Total animation duration in seconds")
    fps: int = Field(30, description="Frames per second for time series")


class SolutionStep(BaseModel):
    step: int = Field(..., ge=1, description="Step number")
    description: str = Field(..., description="Human-readable explanation")
    equation: Optional[str] = Field(None, description="Equation used in this step")


class WorkedSolution(BaseModel):
    steps: list[SolutionStep] = Field(..., min_length=1, description="Step-by-step solution")
    final_answer: dict[str, str] = Field(..., description="Final answers with units (e.g., {'range': '40.8 m'})")


class TimeSeries(BaseModel):
    t: list[float] = Field(..., description="Time points (seconds)")
    # Translational (single object)
    x: Optional[list[float]] = None
    y: Optional[list[float]] = None
    z: Optional[list[float]] = None
    vx: Optional[list[float]] = None
    vy: Optional[list[float]] = None
    vz: Optional[list[float]] = None
    v: Optional[list[float]] = None
    ax: Optional[list[float]] = None
    ay: Optional[list[float]] = None
    az: Optional[list[float]] = None
    a: Optional[list[float]] = None
    # Translational (two objects for collision_1d)
    x1: Optional[list[float]] = None
    x2: Optional[list[float]] = None
    v1: Optional[list[float]] = None
    v2: Optional[list[float]] = None
    a1: Optional[list[float]] = None
    a2: Optional[list[float]] = None
    # Vertical positions (two objects for atwood_machine)
    y1: Optional[list[float]] = None
    y2: Optional[list[float]] = None
    # Rotational
    theta: Optional[list[float]] = None
    omega: Optional[list[float]] = None
    alpha: Optional[list[float]] = None
    # Energy
    ke: Optional[list[float]] = None
    pe: Optional[list[float]] = None
    e_total: Optional[list[float]] = None
    # Spring
    x_eq: Optional[list[float]] = None  # displacement from equilibrium
    # Forces
    f_normal: Optional[list[float]] = None
    f_friction: Optional[list[float]] = None
    tension: Optional[list[float]] = None
    force: Optional[list[float]] = None  # spring force or collision force


class ReasoningOutput(BaseModel):
    scenario: Literal[
        "projectile_motion",
        "kinematics_1d",
        "inclined_plane",
        "atwood_machine",
        "collision_1d",
        "rotational_kinematics",
        "mass_spring",
        "energy_conservation",
        "conceptual_mc"
    ] = Field(..., description="Classified scenario")
    parameters: dict[str, Any] = Field(default_factory=dict, description="All parameters in SI units (numeric values coerced to float; non-numeric scene metadata like object_type kept as-is)")

    @field_validator("parameters", mode="before")
    @classmethod
    def coerce_parameter_values(cls, raw):
        """Coerce numeric strings to float but keep non-numeric values (e.g.

        ``object_type: "disk"``) so the scene can render the right object.
        Previously the dict was ``dict[str, float]`` which silently rejected
        any string parameter and crashed the whole pipeline.
        """
        if not isinstance(raw, dict):
            return raw
        out = {}
        for key, val in raw.items():
            if isinstance(val, bool):
                out[key] = val
            elif isinstance(val, (int, float)):
                out[key] = float(val)
            elif isinstance(val, str):
                try:
                    out[key] = float(val)
                except (TypeError, ValueError):
                    out[key] = val  # e.g. "disk", "hoop"
            else:
                out[key] = val
        return out
    animation_spec: Optional[AnimationSpec] = Field(None, description="Animation configuration")
    worked_solution: WorkedSolution = Field(..., description="Step-by-step worked solution")
    time_series: Optional[TimeSeries] = Field(None, description="Time-series data at 30 FPS")