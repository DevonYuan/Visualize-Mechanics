"""
Calculator tool for the reasoning model to compute numerical values accurately.
"""
import math
from typing import Dict, Any, Optional


class Calculator:
    """Safe calculator for physics computations."""

    # Safe namespace with only math functions and constants
    BASE_NAMESPACE = {
        # Constants
        'pi': math.pi,
        'e': math.e,
        'g': 9.8,

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
    def evaluate(cls, expression: str, variables: Optional[Dict[str, float]] = None) -> float:
        """
        Safely evaluate a mathematical expression with optional variables.

        Args:
            expression: Mathematical expression string
            variables: Optional dict of variable names to values (e.g., {"m": 2.0, "v0": 20.0})

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

        # Build namespace with base + variables
        namespace = dict(cls.BASE_NAMESPACE)
        if variables:
            namespace.update(variables)

        try:
            result = eval(expression, {"__builtins__": {}}, namespace)
            return float(result)
        except Exception as e:
            raise ValueError(f"Calculator error: {str(e)}")


def calculator_tool(expression: str, variables: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """
    Calculator tool function for use with function calling.

    Args:
        expression: Mathematical expression to evaluate
        variables: Optional dict of variable names to values (e.g., {"m": 2.0, "v0": 20.0})

    Returns:
        Dict with result or error
    """
    try:
        result = Calculator.evaluate(expression, variables)
        return {"result": result, "expression": expression, "variables": variables}
    except Exception as e:
        return {"error": str(e), "expression": expression, "variables": variables}


# Tool definition for OpenAI function calling
CALCULATOR_TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "calculator",
        "description": "Evaluate a mathematical expression. Use for all numerical computations. Supports: basic arithmetic (+, -, *, /, **), trig functions (sin, cos, tan, asin, acos, atan) in RADIANS, sqrt, pow, log, log10, pi, e, g, degrees(), radians(), round(), abs(), min(), max(). You can pass known values as variables.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate. Use RADIANS for trig functions. Example: '2 * v0 * sin(theta) / g' with variables {'v0': 20, 'theta': 0.785}"
                },
                "variables": {
                    "type": "object",
                    "description": "Known variable values to substitute. Map variable names to numeric values.",
                    "additionalProperties": {"type": "number"},
                    "default": {}
                }
            },
            "required": ["expression"],
            "additionalProperties": False
        }
    }
}