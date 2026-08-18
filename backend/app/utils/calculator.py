"""
Calculator tool for the reasoning model to compute numerical values accurately.
"""
import math
from typing import Dict, Any


class Calculator:
    """Safe calculator for physics computations."""

    # Safe namespace with only math functions and constants
    SAFE_NAMESPACE = {
        # Constants
        'pi': math.pi,
        'e': math.e,
        'g': 9.8,

        # Basic arithmetic operators are handled by eval
        # Trigonometric functions (radians)
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'asin': math.asin,
        'acos': math.acos,
        'atan': math.atan,
        'atan2': math.atan2,
        'sinh': math.sinh,
        'cosh': math.cosh,
        'tanh': math.tanh,

        # Degree/radian conversion
        'degrees': math.degrees,
        'radians': math.radians,

        # Powers and roots
        'sqrt': math.sqrt,
        'pow': math.pow,
        'exp': math.exp,
        'log': math.log,      # natural log
        'log10': math.log10,  # base 10
        'log2': math.log2,    # base 2

        # Rounding
        'ceil': math.ceil,
        'floor': math.floor,
        'round': round,

        # Absolute value
        'abs': abs,

        # Min/Max
        'min': min,
        'max': max,

        # Constants
        'inf': float('inf'),
        'nan': float('nan'),
    }

    @classmethod
    def evaluate(cls, expression: str) -> float:
        """
        Safely evaluate a mathematical expression.

        Args:
            expression: Mathematical expression string

        Returns:
            Computed float value

        Raises:
            ValueError: If expression is invalid or contains unsafe operations
        """
        # Validate expression - only allow safe characters
        allowed_chars = set('0123456789+-*/.()^% ')
        allowed_chars.update('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_')

        # Check for potentially dangerous patterns (as whole words/identifiers)
        import re
        dangerous_patterns = [
            r'\b__\b', r'\bimport\b', r'\bexec\b', r'\beval\b', r'\bcompile\b',
            r'\bopen\b', r'\bread\b', r'\bwrite\b', r'\bsubprocess\b', r'\bos\b',
            r'\bsys\b', r'\bbuiltins\b', r'\bglobals\b', r'\blocals\b', r'\bvars\b',
            r'\bgetattr\b', r'\bsetattr\b', r'\bdelattr\b', r'\bclassmethod\b', r'\bstaticmethod\b'
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, expression):
                raise ValueError(f"Expression contains disallowed pattern: {pattern}")

        # Replace ^ with ** for power
        expression = expression.replace('^', '**')

        try:
            result = eval(expression, {"__builtins__": {}}, cls.SAFE_NAMESPACE)
            return float(result)
        except Exception as e:
            raise ValueError(f"Calculator error: {str(e)}")


def calculator_tool(expression: str) -> Dict[str, Any]:
    """
    Calculator tool function for use with function calling.

    Args:
        expression: Mathematical expression to evaluate

    Returns:
        Dict with result or error
    """
    try:
        result = Calculator.evaluate(expression)
        return {"result": result, "expression": expression}
    except Exception as e:
        return {"error": str(e), "expression": expression}


# Tool definition for OpenAI function calling
CALCULATOR_TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "calculator",
        "description": "Evaluate a mathematical expression. Use for all numerical computations. Supports: basic arithmetic (+, -, *, /, **), trig functions (sin, cos, tan, asin, acos, atan) in RADIANS, sqrt, pow, log, log10, pi, e, degrees(), radians(), round(), abs(), min(), max().",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate. Use RADIANS for trig functions. Example: '2 * 20 * sin(45 * pi / 180) / 9.8'"
                }
            },
            "required": ["expression"],
            "additionalProperties": False
        }
    }
}