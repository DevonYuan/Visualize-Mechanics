import pytest
from app.utils.json_extract import extract_json


class TestExtractJson:
    def test_raw_json_object(self):
        result = extract_json('{"key": "value", "num": 42}')
        assert result == {"key": "value", "num": 42}

    def test_raw_json_array(self):
        result = extract_json('[1, 2, 3]')
        assert result == [1, 2, 3]

    def test_markdown_fence_json(self):
        result = extract_json('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_markdown_fence_no_lang(self):
        result = extract_json('```\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_markdown_fence_with_trailing_text(self):
        result = extract_json('```json\n{"key": "value"}\n``` Thanks!')
        assert result == {"key": "value"}

    def test_conversational_prefix(self):
        result = extract_json('Here is your JSON:\n{"key": "value"}')
        assert result == {"key": "value"}

    def test_conversational_suffix(self):
        result = extract_json('{"key": "value"}\n\nHope this helps!')
        assert result == {"key": "value"}

    def test_conversational_both(self):
        result = extract_json('Sure! Here it is:\n{"key": "value"}\n\nLet me know if you need more.')
        assert result == {"key": "value"}

    def test_mixed_markdown_and_conversational(self):
        result = extract_json('Here is the result:\n```json\n{"key": "value"}\n```\n\nDone!')
        assert result == {"key": "value"}

    def test_nested_json_object(self):
        result = extract_json('{"outer": {"inner": [1, 2, 3]}}')
        assert result == {"outer": {"inner": [1, 2, 3]}}

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="Empty response"):
            extract_json("")

    def test_whitespace_only_raises(self):
        with pytest.raises(ValueError, match="Empty response"):
            extract_json("   \n\t  ")

    def test_no_json_raises(self):
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json("This is just text with no JSON")

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json('{"key": "value"')  # Missing closing brace

    def test_json_with_newlines_and_spaces(self):
        result = extract_json('  \n  {\n    "key": "value"\n  }\n  ')
        assert result == {"key": "value"}

    def test_array_in_text(self):
        result = extract_json('The array is [1, 2, 3] here')
        assert result == [1, 2, 3]

    def test_multiple_objects_first_wins(self):
        result = extract_json('{"first": 1} and {"second": 2}')
        assert result == {"first": 1}