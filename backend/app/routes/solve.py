import base64
import logging
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from typing import Optional

from app.schemas import SolveRequest, SolveResponse
from app.services.pipeline import PipelineService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["solve"])

pipeline = PipelineService()


@router.post("/solve", response_model=SolveResponse)
async def solve_problem(
    file: Optional[UploadFile] = File(None),
    image_b64: Optional[str] = Form(None),
    content_type: Optional[str] = Form("image/jpeg"),
):
    """
    Solve a physics problem from an image.

    Accepts either:
    - multipart/form-data: `file` (image) + optional `content_type`
    - application/json: `image_b64` + `content_type` (via form fields for simplicity)
    """
    # Validate input
    if file is None and image_b64 is None:
        raise HTTPException(
            status_code=400,
            detail="Either 'file' (multipart) or 'image_b64' (form) must be provided",
        )

    # Get image as base64
    if file is not None:
        # Validate file type
        if file.content_type not in ("image/jpeg", "image/png"):
            raise HTTPException(
                status_code=400,
                detail="File must be JPEG or PNG",
            )
        # Read and encode
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="File too large (max 10MB)",
            )
        image_b64 = base64.b64encode(contents).decode("utf-8")
        content_type = file.content_type

    # Validate base64
    if image_b64:
        try:
            base64.b64decode(image_b64, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 encoding")

    # Run pipeline
    try:
        logger.info("Received solve request")
        result = await pipeline.solve_problem(image_b64, content_type or "image/jpeg")
        return result
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=f"Failed to parse problem: {str(e)}")
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/health")
async def health_check():
    return {"status": "ok"}