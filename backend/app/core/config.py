import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

from app.core.database import get_nim_api_key, init_db


# Support both root .env and backend/.env - check VISUALIZE_ROOT first, then cwd
VISUALIZE_ROOT = os.getenv("VISUALIZE_ROOT")
if VISUALIZE_ROOT:
    ROOT_DIR = VISUALIZE_ROOT
else:
    ROOT_DIR = os.getcwd()

# Check for .env in root, then in backend/
ENV_FILE = os.path.join(ROOT_DIR, ".env")
if not os.path.exists(ENV_FILE):
    ENV_FILE = os.path.join(ROOT_DIR, "backend", ".env")


# Initialize database on module load (creates DB if it doesn't exist)
init_db()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # NIM - API key is read from database, not .env
    # Default is a placeholder; actual value is loaded from database in model_post_init
    NIM_API_KEY: str = "test-key"
    NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NIM_VISION_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    NIM_REASONING_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b"

    # Server
    PORT: int = 3000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: str = "*"

    def model_post_init(self, __context) -> None:
        """Override NIM_API_KEY with value from database after initialization.

        The database is the sole source of truth for NIM_API_KEY.
        If not in database, falls back to 'test-key' (for development/testing).
        """
        db_key = get_nim_api_key()
        if db_key:
            self.NIM_API_KEY = db_key
        else:
            # No key in database - use test-key fallback
            # (In production, you should set the key in the database)
            self.NIM_API_KEY = "test-key"


# Only instantiate if not in test mode
if os.getenv("PYTEST_CURRENT_TEST") is None:
    settings = Settings()
else:
    settings = Settings(_env_file=None)  # Use defaults for tests