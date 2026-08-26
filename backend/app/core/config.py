import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


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


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # NIM
    NIM_API_KEY: str = "test-key"
    NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NIM_VISION_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    NIM_REASONING_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b"

    # Server
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: str = "*"


# Only instantiate if not in test mode
if os.getenv("PYTEST_CURRENT_TEST") is None:
    settings = Settings()
else:
    settings = Settings(_env_file=None)  # Use defaults for tests