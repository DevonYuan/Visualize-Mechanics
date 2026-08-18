# Read prompt files at import time
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent

with open(PROMPTS_DIR / "vision.txt", "r") as f:
    VISION_PROMPT = f.read()

with open(PROMPTS_DIR / "reasoning.txt", "r") as f:
    REASONING_PROMPT = f.read()

with open(PROMPTS_DIR / "formulas_reference.txt", "r") as f:
    FORMULAS_REFERENCE = f.read()

__all__ = ["VISION_PROMPT", "REASONING_PROMPT", "FORMULAS_REFERENCE"]