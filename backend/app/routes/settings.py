"""Settings API routes for managing NIM API key."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.database import get_nim_api_key, set_nim_api_key, delete_nim_api_key, get_db_path

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class NIMKeyRequest(BaseModel):
    api_key: str


class NIMKeyResponse(BaseModel):
    api_key: str | None = None
    has_key: bool


@router.get("/nim-key", response_model=NIMKeyResponse)
async def get_nim_key():
    """Get the current NIM API key (masked for security)."""
    key = get_nim_api_key()
    return NIMKeyResponse(
        api_key=key[:8] + "..." + key[-4:] if key else None,
        has_key=key is not None,
    )


@router.post("/nim-key", response_model=NIMKeyResponse)
async def set_nim_key(request: NIMKeyRequest):
    """Set the NIM API key in the database."""
    if not request.api_key or not request.api_key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    api_key = request.api_key.strip()
    set_nim_api_key(api_key)

    # Return masked key
    return NIMKeyResponse(
        api_key=api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else api_key,
        has_key=True,
    )


@router.delete("/nim-key", response_model=NIMKeyResponse)
async def delete_nim_key():
    """Delete the NIM API key from the database."""
    delete_nim_api_key()
    return NIMKeyResponse(api_key=None, has_key=False)


@router.get("/db-path")
async def get_database_path():
    """Get the database file path (for debugging)."""
    return {"path": str(get_db_path())}