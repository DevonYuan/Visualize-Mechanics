import json
import re
from typing import Any


def extract_json(text: str) -> dict[str, Any] | list[Any]:
    """
    Extract JSON from LLM response. Idempotent: valid JSON passes through unchanged.

    Handles:
    - Raw JSON: '{"key": "value"}'
    - Markdown fenced: '```json\n{"key": "value"}\n```'
    - Conversational: 'Here is your JSON:\n{"key": "value"}'
    - Mixed: '```json\n{"key": "value"}\n``` Thanks!'
    Prefers objects over arrays.
    """
    if not text or not text.strip():
        raise ValueError("Empty response")

    text = text.strip()

    # Fast path: already valid JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences (```json ... ``` or ``` ... ```)
    fence_pattern = r"^```(?:json)?\s*\n?(.*?)\n?```$"
    match = re.search(fence_pattern, text, re.DOTALL | re.IGNORECASE)
    if match:
        candidate = match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Find JSON objects first (prefer objects over arrays)
    # Look for the outermost { ... } with balanced braces
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start_idx = text.find(start_char)
        if start_idx == -1:
            continue

        # Find matching closing brace - track the deepest nesting
        depth = 0
        best_end = -1
        for i, ch in enumerate(text[start_idx:], start=start_idx):
            if ch == start_char:
                depth += 1
            elif ch == end_char:
                depth -= 1
                if depth == 0:
                    best_end = i
                    # For objects, break immediately to get the outermost
                    # For arrays, keep going in case there's an object later
                    if start_char == "{":
                        break

        if best_end != -1:
            candidate = text[start_idx : best_end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not extract valid JSON from response: {text[:200]}...")