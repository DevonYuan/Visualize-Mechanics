import base64
import pytest
from PIL import Image
from io import BytesIO
from app.services.image import preprocess_image


def create_test_image(format: str = "PNG", size: tuple = (200, 200), mode: str = "RGB") -> str:
    """Create a test image and return base64."""
    img = Image.new(mode, size, color="red")
    buffer = BytesIO()
    img.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


class TestPreprocessImage:
    def test_small_png_preserved(self):
        png_b64 = create_test_image(format="PNG", size=(100, 100))
        result = preprocess_image(png_b64)
        decoded = base64.b64decode(result)
        img = Image.open(BytesIO(decoded))
        # Small images should preserve PNG format to avoid text degradation
        assert img.format == "PNG"

    def test_small_rgba_preserved_as_png(self):
        rgba_b64 = create_test_image(format="PNG", size=(100, 100), mode="RGBA")
        result = preprocess_image(rgba_b64)
        decoded = base64.b64decode(result)
        img = Image.open(BytesIO(decoded))
        # Small RGBA images converted to RGB PNG
        assert img.format == "PNG"
        assert img.mode == "RGB"

    def test_resize_large_image(self):
        large_b64 = create_test_image(format="PNG", size=(2000, 2000))
        result = preprocess_image(large_b64, max_dim=1024)
        decoded = base64.b64decode(result)
        img = Image.open(BytesIO(decoded))
        assert max(img.size) <= 1024

    def test_no_resize_small_image(self):
        small_b64 = create_test_image(format="PNG", size=(100, 100))
        result = preprocess_image(small_b64, max_dim=1024)
        decoded = base64.b64decode(result)
        img = Image.open(BytesIO(decoded))
        assert img.size == (100, 100)

    def test_quality_parameter(self):
        # Just verify it runs without error
        b64 = create_test_image(format="PNG", size=(100, 100))
        result = preprocess_image(b64, quality=50)
        assert len(result) > 0

    def test_output_is_valid_base64(self):
        b64 = create_test_image(format="PNG", size=(100, 100))
        result = preprocess_image(b64)
        # Should not raise
        base64.b64decode(result, validate=True)