from pydantic import BaseModel, Field
from app.schemas.reasoning import AnimationSpec, WorkedSolution, TimeSeries


class SolveResponse(BaseModel):
    scenario: str = Field(..., description="Classified scenario")
    parameters: dict[str, float] = Field(..., description="All parameters in SI units")
    animation_spec: AnimationSpec = Field(..., description="Animation configuration")
    worked_solution: WorkedSolution = Field(..., description="Step-by-step worked solution")
    time_series: TimeSeries = Field(..., description="Time-series data at 30 FPS")