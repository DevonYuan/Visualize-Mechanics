import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from openai import AsyncOpenAI

from app.services.nim_client import NIMClient
from app.schemas import (
    VisionOutput,
    ReasoningOutput,
    AnimationSpec,
    WorkedSolution,
    SolutionStep,
    TimeSeries,
)


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

    # ------------------------------------------------------------------
    # Rotational kinematics: unit conversion, normalization, verification
    # ------------------------------------------------------------------
    def _rotational_output(self, parameters=None, time_series=None, animation_spec=...):
        return ReasoningOutput(
            scenario="rotational_kinematics",
            parameters=parameters or {},
            animation_spec=animation_spec if animation_spec is not ... else AnimationSpec(duration_s=5.0, fps=30),
            worked_solution=WorkedSolution(
                steps=[SolutionStep(step=1, description="test")],
                final_answer={"omega": "10.0 rad/s"},
            ),
            time_series=time_series,
        )

    def test_extract_known_values_rpm_and_rev_conversion(self, client):
        vision_out = VisionOutput(
            problem_text="A flywheel spins at 300 rpm and is braked to rest in 8 revolutions.",
            knowns={"omega": "300 rpm", "delta_theta": "8 revolutions", "mass": "2 kg", "r": "0.3 m", "torque": "4.0 N-m"},
            unknowns=["alpha"],
            diagram_description="flywheel",
            suggested_scenario="rotational_kinematics",
        )
        knowns = client._extract_known_values(vision_out)
        import math
        assert knowns["omega"] == 300.0          # raw value preserved
        assert knowns["omega0"] == pytest.approx(300 * 2 * math.pi / 60)  # rpm -> rad/s
        assert knowns["delta_theta"] == pytest.approx(8 * 2 * math.pi)    # rev -> rad
        assert knowns["radius"] == 0.3            # r -> radius alias
        assert knowns["tau"] == 4.0               # torque -> tau alias
        assert knowns["mass"] == 2.0

    def test_extract_known_values_degree_to_rad(self, client):
        vision_out = VisionOutput(
            problem_text="wheel turns through an angle",
            knowns={"theta": "45 deg"},
            unknowns=[],
            diagram_description="",
            suggested_scenario="rotational_kinematics",
        )
        knowns = client._extract_known_values(vision_out)
        import math
        assert knowns["theta"] == 45.0
        assert knowns["delta_theta"] == pytest.approx(math.pi / 4)

    def test_normalize_parameters_rotational_aliases(self, client):
        params = client._normalize_parameters(
            {"initial_omega": 3.0, "angular_acceleration": 2.0, "initial_theta": 1.0, "r": 0.3, "object_type": "disk"},
            scenario="rotational_kinematics",
        )
        assert params["omega0"] == 3.0
        assert params["alpha"] == 2.0
        assert params["theta0"] == 1.0
        assert params["radius"] == 0.3

    def test_normalize_parameters_plain_omega_only_for_rotational(self, client):
        rot = client._normalize_parameters({"omega": 5.0}, scenario="rotational_kinematics")
        assert rot["omega0"] == 5.0
        ms = client._normalize_parameters({"omega": 20.0}, scenario="mass_spring")
        assert "omega0" not in ms      # SHM omega must NOT become omega0

    def test_verify_and_correct_rotational_torque(self, client):
        out = self._rotational_output(parameters={"object_type": "disk"})
        result = client._verify_and_correct(out, None, {"tau": 4.0, "mass": 2.0, "radius": 0.3})
        assert result.parameters["I_verified"] == pytest.approx(0.09)      # 0.5*2*0.3^2
        assert result.parameters["alpha_verified"] == pytest.approx(4.0 / 0.09)

    def test_verify_and_correct_rotational_kinematics(self, client):
        params = {"object_type": "disk"}
        out = self._rotational_output(parameters=params)
        knowns = {"omega0": 0.0, "alpha": 2.0, "time": 5.0}
        result = client._verify_and_correct(out, None, knowns)
        assert result.parameters["omega_final_verified"] == pytest.approx(10.0)
        assert result.parameters["theta_total_verified"] == pytest.approx(25.0)
        # Canonical params must now exist for time-series regeneration.
        assert result.parameters["omega0"] == 0.0
        assert result.parameters["alpha"] == 2.0
        assert result.parameters["theta0"] == 0.0

    def test_verify_and_correct_rotational_no_time_delta_theta(self, client):
        # Flywheel at 300 rpm braked to rest in 8 revolutions ("revolutions to stop",
        # no time given). omega0^2 + 2*alpha*delta_theta must give omega_final ~ 0.
        omega0 = 300 * 2 * 3.141592653589793 / 60   # ~31.416 rad/s
        delta_theta = 8 * 2 * 3.141592653589793     # ~50.265 rad
        alpha = -(omega0**2) / (2 * delta_theta)    # ~ -9.817 rad/s^2
        out = self._rotational_output(animation_spec=None)
        knowns = {"omega0": omega0, "alpha": alpha, "delta_theta": delta_theta}
        result = client._verify_and_correct(out, None, knowns)
        assert "omega_final_verified" in result.parameters
        assert result.parameters["omega_final_verified"] == pytest.approx(0.0, abs=0.5)
        assert result.parameters["alpha"] == pytest.approx(alpha)
        assert result.parameters["omega0"] == pytest.approx(omega0)

    def test_expand_time_series_rotational(self, client):
        ts = TimeSeries(
            t=[0.0, 2.5, 5.0],
            theta=[0.0, 6.25, 25.0],
            omega=[0.0, 5.0, 10.0],
            alpha=[2.0, 2.0, 2.0],
        )
        out = self._rotational_output(
            parameters={"theta0": 0.0, "omega0": 0.0, "alpha": 2.0, "t_end": 5.0},
            time_series=ts,
        )
        result = client._expand_time_series(out)
        assert len(result.time_series.t) == pytest.approx(30 * 5 + 1)
        assert result.time_series.theta[-1] == pytest.approx(25.0, abs=0.3)
        assert result.time_series.omega[-1] == pytest.approx(10.0, abs=0.01)
        assert all(abs(a - 2.0) < 1e-9 for a in result.time_series.alpha)

    @pytest.mark.asyncio
    async def test_reasoning_solve_rotational_full_flow(self, client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = """
        {
            "scenario": "rotational_kinematics",
            "parameters": {"theta0": 0.0, "omega0": 0.0, "alpha": 2.0, "t_end": 5.0, "radius": 0.3, "object_type": "disk", "mass": 2.0},
            "animation_spec": {"duration_s": 5.0, "fps": 30},
            "worked_solution": {"steps": [{"step": 1, "description": "Identify knowns", "equation": null}], "final_answer": {"omega": "10.0 rad/s", "theta": "25.0 rad"}},
            "time_series": {"t": [0.0, 0.0333, 0.0667, 2.5, 5.0], "theta": [0.0, 0.0011, 0.0044, 6.25, 25.0], "omega": [0.0, 0.0667, 0.1333, 5.0, 10.0], "alpha": [2.0, 2.0, 2.0, 2.0, 2.0]}
        }
        """
        with patch.object(client.client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            vision_out = VisionOutput(
                problem_text="A wheel initially at rest rotates with constant angular acceleration 2.0 rad/s^2 for 5.0 s.",
                knowns={"omega0": "0 rad/s", "alpha": "2.0 rad/s^2", "time": "5.0 s"},
                unknowns=["omega", "theta"],
                diagram_description="wheel",
                suggested_scenario="rotational_kinematics",
            )
            result = await client.reasoning_solve(vision_out)
            assert result.scenario == "rotational_kinematics"
            # verification injected from knowns
            assert result.parameters["omega_final_verified"] == pytest.approx(10.0, abs=0.01)
            assert result.parameters["theta_total_verified"] == pytest.approx(25.0, abs=0.01)
            # 30 FPS expansion applied
            assert len(result.time_series.t) == pytest.approx(30 * 5 + 1)