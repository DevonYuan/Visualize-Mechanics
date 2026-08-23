import base64
import io
from PIL import Image


def preprocess_image(image_b64: str, max_dim: int = 1024, quality: int = 85) -> str:
    """
    Resize image to max_dim, preserve PNG if small, else convert to JPEG.
    Avoids JPEG compression artifacts on text for small images.
    """
    # Decode base64
    image_data = base64.b64decode(image_b64)
    image = Image.open(io.BytesIO(image_data))

    # Check if resize is needed
    needs_resize = max(image.size) > max_dim

    # Convert to RGB if needed (handles RGBA, P, etc.) - only if saving as JPEG
    if needs_resize and image.mode != "RGB":
        image = image.convert("RGB")

    # Resize if needed
    if needs_resize:
        image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Save - preserve PNG for small images to avoid text degradation
    buffer = io.BytesIO()
    if needs_resize:
        image.save(buffer, format="JPEG", quality=quality, optimize=True)
    else:
        # Convert to RGB for PNG to ensure compatibility
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(buffer, format="PNG", optimize=True)
    compressed_data = buffer.getvalue()

    # Return base64
    return base64.b64encode(compressed_data).decode("utf-8")


def image_to_base64(image_path: str, max_dim: int = 1024, quality: int = 85) -> str:
    """Load image from file, preprocess, return base64."""
    with open(image_path, "rb") as f:
        image_data = f.read()
    return preprocess_image(base64.b64encode(image_data).decode("utf-8"), max_dim, quality)