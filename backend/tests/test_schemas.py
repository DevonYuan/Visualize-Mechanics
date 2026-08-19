import pytest
from app.schemas import (
    SolveRequest,
    VisionOutput,
    ReasoningOutput,
    AnimationSpec,
    SolutionStep,
    WorkedSolution,
    TimeSeries,
    SolveResponse,
)


class TestSolveRequest:
    def test_valid_base64(self):
        req = SolveRequest(image_b64="dGVzdA==", content_type="image/jpeg")
        assert req.image_b64 == "dGVzdA=="

    def test_default_content_type(self):
        req = SolveRequest(image_b64="dGVzdA==")
        assert req.content_type == "image/jpeg"

    def test_invalid_content_type(self):
        with pytest.raises(ValueError):
            SolveRequest(image_b64="dGVzdA==", content_type="image/gif")


class TestVisionOutput:
    def test_valid(self):
        out = VisionOutput(
            problem_text="A ball is thrown...",
            knowns={"v0": "20 m/s", "angle": "45 deg"},
            unknowns=["range", "max_height"],
            diagram_description="Parabolic trajectory",
            suggested_scenario="projectile_motion",
        )
        assert out.suggested_scenario == "projectile_motion"

    def test_all_scenarios(self):
        for scenario in [
            "projectile_motion",
            "kinematics_1d",
            "inclined_plane",
            "atwood_machine",
            "collision_1d",
            "rotational_kinematics",
            "mass_spring",
            "unknown",
        ]:
            out = VisionOutput(
                problem_text="...",
                knowns={},
                unknowns=[],
                diagram_description="...",
                suggested_scenario=scenario,
            )
            assert out.suggested_scenario == scenario


class TestReasoningOutput:
    def test_minimal_valid(self):
        out = ReasoningOutput(
            scenario="projectile_motion",
            parameters={"v0": 20.0, "angle_deg": 45.0, "g": 9.8},
            animation_spec=AnimationSpec(
                duration_s=2.89,
                fps=30,
            ),
            worked_solution=WorkedSolution(
                steps=[SolutionStep(step=1, description="Step 1", equation="v = v0 + at")],
                final_answer={"range": "40.8 m"},
            ),
            time_series=TimeSeries(t=[0.0, 0.1], x=[0.0, 1.4], y=[0.0, 1.3]),
        )
        assert out.scenario == "projectile_motion"


class TestSolveResponse:
    def test_from_reasoning_output(self):
        reasoning = ReasoningOutput(
            scenario="projectile_motion",
            parameters={"v0": 20.0},
            animation_spec=AnimationSpec(
                duration_s=2.89, fps=30
            ),
            worked_solution=WorkedSolution(
                steps=[SolutionStep(step=1, description="Test")],
                final_answer={},
            ),
            time_series=TimeSeries(t=[0.0]),
        )
        response = SolveResponse(
            scenario=reasoning.scenario,
            parameters=reasoning.parameters,
            animation_spec=reasoning.animation_spec,
            worked_solution=reasoning.worked_solution,
            time_series=reasoning.time_series,
        )
        assert response.scenario == "projectile_motion"