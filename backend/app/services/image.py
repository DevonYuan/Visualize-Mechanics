import base64
import io
from PIL import Image


def preprocess_image(image_b64: str, max_dim: int = 1024, quality: int = 85) -> str:
    """
    Resize image to max_dim, convert to JPEG, compress, return base64.
    Handles PNG -> JPEG conversion (strips alpha).
    """
    # Decode base64
    image_data = base64.b64decode(image_b64)
    image = Image.open(io.BytesIO(image_data))

    # Convert to RGB if needed (handles RGBA, P, etc.)
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Resize if needed
    if max(image.size) > max_dim:
        image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Save as JPEG to bytes
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    compressed_data = buffer.getvalue()

    # Return base64
    return base64.b64encode(compressed_data).decode("utf-8")


def image_to_base64(image_path: str, max_dim: int = 1024, quality: int = 85) -> str:
    """Load image from file, preprocess, return base64."""
    with open(image_path, "rb") as f:
        image_data = f.read()
    return preprocess_image(base64.b64encode(image_data).decode("utf-8"), max_dim, quality)