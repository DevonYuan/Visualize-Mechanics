import logging
from app.services.nim_client import NIMClient
from app.services.image import preprocess_image
from app.schemas import VisionOutput, ReasoningOutput, SolveResponse

logger = logging.getLogger(__name__)


class PipelineService:
    def __init__(self):
        self.nim_client = NIMClient()

    async def solve_problem(self, image_b64: str, content_type: str = "image/jpeg") -> SolveResponse:
        """
        Full pipeline: preprocess image -> vision extract -> reasoning solve -> return response.
        """
        logger.info("Starting problem solving pipeline")

        # 1. Preprocess image
        logger.debug("Preprocessing image")
        processed_b64 = preprocess_image(image_b64)

        # 2. Vision extraction
        logger.info("Calling vision model")
        vision_output: VisionOutput = await self.nim_client.vision_extract(processed_b64, content_type)
        logger.info(f"Vision extracted scenario: {vision_output.suggested_scenario}")

        # 3. Reasoning
        logger.info("Calling reasoning model")
        reasoning_output: ReasoningOutput = await self.nim_client.reasoning_solve(vision_output)
        logger.info(f"Reasoning classified scenario: {reasoning_output.scenario}")

        # 4. Build final response
        response = SolveResponse(
            scenario=reasoning_output.scenario,
            parameters=reasoning_output.parameters,
            animation_spec=reasoning_output.animation_spec,
            worked_solution=reasoning_output.worked_solution,
            time_series=reasoning_output.time_series,
        )

        logger.info("Pipeline completed successfully")
        return response