from pydantic import BaseModel, Field
from typing import Literal


class VisionOutput(BaseModel):
    problem_text: str = Field(..., description="Full problem text extracted via OCR")
    knowns: dict[str, float | str] = Field(..., description="Known variables with values and units")
    unknowns: list[str] = Field(..., description="Unknown variables asked for")
    diagram_description: str = Field(..., description="Description of diagram (objects, forces, coordinates, angles)")
    suggested_scenario: Literal[
        "projectile_motion",
        "kinematics_1d",
        "inclined_plane",
        "atwood_machine",
        "collision_1d",
        "rotational_kinematics",
        "mass_spring",
        "unknown"
    ] = Field(..., description="Suggested scenario classification")