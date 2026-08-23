from pydantic import BaseModel, Field
from typing import Any, Optional
from app.schemas.reasoning import AnimationSpec, WorkedSolution, TimeSeries


class SolveResponse(BaseModel):
    scenario: str = Field(..., description="Classified scenario")
    parameters: dict[str, Any] = Field(default_factory=dict, description="All parameters in SI units (numeric) plus scene metadata like object_type")
    animation_spec: Optional[AnimationSpec] = Field(None, description="Animation configuration")
    worked_solution: WorkedSolution = Field(..., description="Step-by-step worked solution")
    time_series: Optional[TimeSeries] = Field(None, description="Time-series data at 30 FPS")