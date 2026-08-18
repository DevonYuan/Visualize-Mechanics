"""
Calculator tool using simpleeval for safe expression evaluation.
"""
import math
import re
from typing import Dict, Any, Optional, Union

from simpleeval import simple_eval, EvalWithCompoundTypes


class Calculator:
    """Safe calculator for physics computations using simpleeval."""

    # Allowed functions for simpleeval
    ALLOWED_FUNCTIONS = {
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
    }

    # Constants
    CONSTANTS = {
        'pi': math.pi,
        'e': math.e,
        'g': 9.8,
        'inf': float('inf'),
        'nan': float('nan'),
    }

    @classmethod
    def _coerce_to_float(cls, value: Union[str, int, float]) -> float:
        """Convert a value to float, handling strings with units or simple expressions."""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Try direct float conversion first
            try:
                return float(value)
            except ValueError:
                pass
            # Extract leading number from strings like "20 m/s", "5 kg", "9.8"
            match = re.match(r'^([\d.]+)', value.strip())
            if match:
                return float(match.group(1))
            # If it's an expression like "arcsin(27 / (0.5 * 3**2))", evaluate it
            try:
                return cls.evaluate(value)
            except Exception:
                pass
        raise ValueError(f"Cannot convert to float: {value}")

    @classmethod
    def _sanitize_variables(cls, variables: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Convert variable values to floats, handling strings and expressions."""
        if not variables:
            return {}
        sanitized = {}
        for key, value in variables.items():
            try:
                sanitized[key] = cls._coerce_to_float(value)
            except Exception:
                # Skip invalid variables
                pass
        return sanitized

    @classmethod
    def evaluate(cls, expression: str, variables: Optional[Dict[str, Any]] = None) -> float:
        """
        Safely evaluate a mathematical expression with optional variables.

        Args:
            expression: Mathematical expression string
            variables: Optional dict of variable names to values (e.g., {"m": 2.0, "v0": 20.0})
                       Values can be numbers, strings like "20 m/s", or simple expressions.

        Returns:
            Computed float value

        Raises:
            ValueError: If expression is invalid or contains unsafe operations
        """
        # Replace ^ with ** for power
        expression = expression.replace('^', '**')

        # Build names dict with constants + sanitized variables
        names = dict(cls.CONSTANTS)
        if variables:
            sanitized_vars = cls._sanitize_variables(variables)
            names.update(sanitized_vars)

        try:
            result = simple_eval(
                expression,
                functions=cls.ALLOWED_FUNCTIONS,
                names=names
            )
            return float(result)
        except Exception as e:
            raise ValueError(f"Calculator error: {str(e)}")


def calculator_tool(expression: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Calculator tool function for use with function calling.

    Args:
        expression: Mathematical expression to evaluate
        variables: Optional dict of variable names to values (e.g., {"m": 2.0, "v0": "20 m/s"})
                   Values can be numbers, strings with units, or simple expressions.

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
        "description": "Evaluate a mathematical expression. Use for all numerical computations. Supports: basic arithmetic (+, -, *, /, **), trig functions (sin, cos, tan, asin, acos, atan) in RADIANS, sqrt, pow, log, log10, pi, e, g, degrees(), radians(), round(), abs(), min(), max(). You can pass known values as variables. Variable values can be numbers or strings like \"20 m/s\" - units will be stripped automatically.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate. Use RADIANS for trig functions. Example: '2 * v0 * sin(theta) / g' with variables {'v0': 20, 'theta': 0.785}"
                },
                "variables": {
                    "type": "object",
                    "description": "Known variable values to substitute. Map variable names to numeric values or strings like \"20 m/s\". Units will be stripped automatically.",
                    "additionalProperties": True,
                    "default": {}
                }
            },
            "required": ["expression"],
            "additionalProperties": False
        }
    }
}