import base64
import pytest
from unittest.mock import AsyncMock, patch
from PIL import Image
from io import BytesIO

from app.services.pipeline import PipelineService
from app.schemas import VisionOutput, ReasoningOutput, AnimationSpec, CameraSpec, SolutionStep, WorkedSolution, TimeSeries, SolveResponse
from app.services.nim_client import NIMClient


def create_test_image_b64() -> str:
    """Create a simple valid test image as base64."""
    img = Image.new("RGB", (100, 100), color="red")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


class TestPipelineService:
    @pytest.fixture
    def mock_vision_output(self):
        return VisionOutput(
            problem_text="A ball is thrown at 20 m/s at 45 degrees",
            knowns={"v0": "20 m/s", "angle": "45 deg"},
            unknowns=["range", "max_height"],
            diagram_description="Parabolic trajectory",
            suggested_scenario="projectile_motion",
        )

    @pytest.fixture
    def mock_reasoning_output(self):
        return ReasoningOutput(
            scenario="projectile_motion",
            parameters={"v0": 20.0, "angle_deg": 45.0, "g": 9.8},
            animation_spec=AnimationSpec(
                duration_s=2.89,
                fps=30,
                camera=CameraSpec(position=[0, 5, 15], target=[0, 2, 0]),
            ),
            worked_solution=WorkedSolution(
                steps=[SolutionStep(step=1, description="Identify knowns", equation=None)],
                final_answer={"range": "40.8 m"},
            ),
            time_series=TimeSeries(t=[0.0, 0.1], x=[0.0, 1.41], y=[0.0, 1.32]),
        )

    @pytest.mark.asyncio
    async def test_solve_problem_success(self, mock_vision_output, mock_reasoning_output):
        with patch.object(NIMClient, "vision_extract", new=AsyncMock(return_value=mock_vision_output)):
            with patch.object(NIMClient, "reasoning_solve", new=AsyncMock(return_value=mock_reasoning_output)):
                pipeline = PipelineService()
                result = await pipeline.solve_problem(create_test_image_b64())

                assert isinstance(result, SolveResponse)
                assert result.scenario == "projectile_motion"

    @pytest.mark.asyncio
    async def test_solve_problem_vision_failure(self):
        with patch.object(NIMClient, "vision_extract", new=AsyncMock(side_effect=ValueError("Vision failed"))):
            pipeline = PipelineService()
            with pytest.raises(ValueError, match="Vision failed"):
                await pipeline.solve_problem(create_test_image_b64())

    @pytest.mark.asyncio
    async def test_solve_problem_reasoning_failure(self, mock_vision_output):
        with patch.object(NIMClient, "vision_extract", new=AsyncMock(return_value=mock_vision_output)):
            with patch.object(NIMClient, "reasoning_solve", new=AsyncMock(side_effect=ValueError("Reasoning failed"))):
                pipeline = PipelineService()
                with pytest.raises(ValueError, match="Reasoning failed"):
                    await pipeline.solve_problem(create_test_image_b64())