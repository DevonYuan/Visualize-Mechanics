from pydantic import BaseModel, Field
from typing import Literal


class SolveRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded image")
    content_type: Literal["image/jpeg", "image/png"] = "image/jpeg"


class SolveRequestMultipart(BaseModel):
    """For multipart/form-data parsing"""
    file: bytes
    content_type: Literal["image/jpeg", "image/png"] = "image/jpeg"