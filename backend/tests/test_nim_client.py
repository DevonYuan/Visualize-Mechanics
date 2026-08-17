import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from openai import AsyncOpenAI

from app.services.nim_client import NIMClient
from app.schemas import VisionOutput, ReasoningOutput


class TestNIMClient:
    @pytest.fixture
    def client(self):
        with patch("app.services.nim_client.settings") as mock_settings:
            mock_settings.NIM_API_KEY = "test-key"
            mock_settings.NIM_BASE_URL = "https://test.api"
            mock_settings.NIM_VISION_MODEL = "test-vision"
            mock_settings.NIM_REASONING_MODEL = "test-reasoning"
            return NIMClient()

    @pytest.mark.asyncio
    async def test_vision_extract_success(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"problem_text": "test", "knowns": {}, "unknowns": [], "diagram_description": "test", "suggested_scenario": "projectile_motion"}'

        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            result = await client.vision_extract("dGVzdA==")
            assert isinstance(result, VisionOutput)
            assert result.suggested_scenario == "projectile_motion"

    @pytest.mark.asyncio
    async def test_vision_extract_with_markdown_fence(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '```json\n{"problem_text": "test", "knowns": {}, "unknowns": [], "diagram_description": "test", "suggested_scenario": "kinematics_1d"}\n```'

        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            result = await client.vision_extract("dGVzdA==")
            assert result.suggested_scenario == "kinematics_1d"

    @pytest.mark.asyncio
    async def test_vision_extract_empty_response(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = ""

        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            with pytest.raises(ValueError, match="Empty response from vision model"):
                await client.vision_extract("dGVzdA==")

    @pytest.mark.asyncio
    async def test_reasoning_solve_success(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = """
        {
            "scenario": "projectile_motion",
            "parameters": {"v0": 20.0, "angle_deg": 45.0, "g": 9.8},
            "animation_spec": {"duration_s": 2.89, "fps": 30, "camera": {"position": [0,5,15], "target": [0,2,0]}},
            "worked_solution": {"steps": [{"step": 1, "description": "test", "equation": "v = v0 + at"}], "final_answer": {"range": "40.8 m"}},
            "time_series": {"t": [0.0], "x": [0.0], "y": [0.0]}
        }
        """

        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            vision_out = VisionOutput(
                problem_text="test",
                knowns={},
                unknowns=[],
                diagram_description="test",
                suggested_scenario="projectile_motion",
            )
            result = await client.reasoning_solve(vision_out)
            assert isinstance(result, ReasoningOutput)
            assert result.scenario == "projectile_motion"

    @pytest.mark.asyncio
    async def test_reasoning_solve_with_conversational_wrapper(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Here is your solution:\n```json\n{\"scenario\": \"collision_1d\", \"parameters\": {\"m1\": 2.0, \"m2\": 1.0}, \"animation_spec\": {\"duration_s\": 5.0, \"fps\": 30, \"camera\": {\"position\": [0,0,0], \"target\": [0,0,0]}}, \"worked_solution\": {\"steps\": [{\"step\": 1, \"description\": \"test\"}], \"final_answer\": {}}, \"time_series\": {\"t\": [0.0]}}\n```"

        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            vision_out = VisionOutput(
                problem_text="test",
                knowns={},
                unknowns=[],
                diagram_description="test",
                suggested_scenario="unknown",
            )
            result = await client.reasoning_solve(vision_out)
            assert result.scenario == "collision_1d"