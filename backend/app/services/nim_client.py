import os
from typing import Optional
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import numpy as np

from app.core.config import settings
from app.utils.json_extract import extract_json
from app.utils.calculator import Calculator, CALCULATOR_TOOL_DEFINITION
from app.schemas import VisionOutput, ReasoningOutput
from app.prompts import VISION_PROMPT, REASONING_PROMPT, FORMULAS_REFERENCE


class NIMClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.NIM_API_KEY,
            base_url=settings.NIM_BASE_URL,
        )
        self.vision_model = settings.NIM_VISION_MODEL
        self.reasoning_model = settings.NIM_REASONING_MODEL

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def vision_extract(self, image_b64: str, content_type: str = "image/jpeg") -> VisionOutput:
        """Call NIM vision model to extract problem from image."""
        media_type = "image/jpeg" if content_type == "image/jpeg" else "image/png"

        response = await self.client.chat.completions.create(
            model=self.vision_model,
            messages=[
                {
                    "role": "system",
                    "content": VISION_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the physics problem from this image. Output ONLY valid JSON matching the schema. No text before or after. No markdown code fences. Start with { and end with }."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens=2048,
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise ValueError("Empty response from vision model")

        data = extract_json(raw_content)
        return VisionOutput.model_validate(data)

    def _extract_known_values(self, vision_output: VisionOutput) -> dict:
        """Extract numeric values from knowns dict for calculator variables."""
        knowns = {}
        if vision_output.knowns:
            for key, value in vision_output.knowns.items():
                # Parse "20 m/s" -> 20.0
                import re
                match = re.match(r'^([\d.]+)', str(value).strip())
                if match:
                    try:
                        knowns[key] = float(match.group(1))
                    except ValueError:
                        pass
        return knowns

    def _verify_and_correct(self, reasoning_output: ReasoningOutput, vision_output: VisionOutput, known_values: dict) -> ReasoningOutput:
        """Verify critical calculated values using calculator and correct if wrong."""
        scenario = reasoning_output.scenario
        params = reasoning_output.parameters.copy()

        try:
            if scenario == "inclined_plane":
                # Verify acceleration: a = g * sin(theta) or a = g * (sin(theta) - mu_k * cos(theta))
                theta = known_values.get("angle") or known_values.get("theta") or params.get("angle_deg")
                mu_k = known_values.get("mu_k") or params.get("mu_k", 0)

                if theta:
                    # Convert to radians if needed (known_values are already numeric)
                    import math
                    theta_rad = theta * math.pi / 180 if theta > 10 else theta  # assume deg if > 10

                    if mu_k:
                        a_correct = Calculator.evaluate("g * (sin(theta) - mu_k * cos(theta))",
                                                      {"theta": theta_rad, "mu_k": mu_k})
                    else:
                        a_correct = Calculator.evaluate("g * sin(theta)", {"theta": theta_rad})

                    # Check if parameters contain acceleration or if we can derive it
                    if "a" in params:
                        if abs(params["a"] - a_correct) > 0.5:  # Significant difference
                            params["a"] = a_correct
                    # Add corrected acceleration
                    params["a_verified"] = a_correct

            elif scenario == "projectile_motion":
                # Verify time of flight, range, max height
                v0 = known_values.get("v0") or params.get("v0")
                angle = known_values.get("angle") or known_values.get("theta") or params.get("angle_deg")

                if v0 and angle:
                    import math
                    angle_rad = angle * math.pi / 180 if angle > 10 else angle
                    g = params.get("g", 9.8)

                    # Time of flight
                    t_flight = Calculator.evaluate("2 * v0 * sin(angle) / g",
                                                 {"v0": v0, "angle": angle_rad, "g": g})
                    # Range
                    range_val = Calculator.evaluate("v0 * cos(angle) * t_flight",
                                                  {"v0": v0, "angle": angle_rad, "t_flight": t_flight})
                    # Max height
                    h_max = Calculator.evaluate("v0 * sin(angle) * t_flight / 2 - 0.5 * g * (t_flight/2)**2",
                                              {"v0": v0, "angle": angle_rad, "t_flight": t_flight, "g": g})

                    params["t_flight_verified"] = t_flight
                    params["range_verified"] = range_val
                    params["max_height_verified"] = h_max

            elif scenario == "atwood_machine":
                m1 = known_values.get("m1") or params.get("m1")
                m2 = known_values.get("m2") or params.get("m2")

                if m1 and m2:
                    a_correct = Calculator.evaluate("(m1 - m2) * g / (m1 + m2)",
                                                  {"m1": m1, "m2": m2})
                    params["a_verified"] = a_correct

            elif scenario == "kinematics_1d":
                # Handle case where distance and time are given (find acceleration)
                d = known_values.get("d") or known_values.get("distance") or params.get("d") or params.get("distance")
                t = known_values.get("t") or known_values.get("time") or params.get("t") or params.get("time")
                v0 = known_values.get("v0") or known_values.get("initial_v") or params.get("v0") or params.get("initial_v", 0)

                if d and t:
                    # a = 2*d / t^2 (from rest)
                    a_correct = Calculator.evaluate("2 * d / t**2", {"d": d, "t": t})
                    params["a"] = a_correct
                    params["a_verified"] = a_correct

                # Also verify if v0 and a are given
                v0 = known_values.get("v0") or params.get("v0")
                a = known_values.get("a") or params.get("a")

                if v0 and a:
                    # Time to stop
                    t_stop = Calculator.evaluate("v0 / a", {"v0": v0, "a": abs(a)})
                    # Distance
                    dist = Calculator.evaluate("v0 * t - 0.5 * a * t**2",
                                             {"v0": v0, "a": a, "t": t_stop})
                    params["t_stop_verified"] = t_stop
                    params["distance_verified"] = dist

        except Exception:
            # If verification fails, return original
            pass

        # Update parameters with verified values
        reasoning_output.parameters = params
        return reasoning_output

    def _expand_time_series(self, reasoning_output: ReasoningOutput) -> ReasoningOutput:
        """Expand 5 key-frame time series to full 30 FPS."""
        ts = reasoning_output.time_series
        if ts is None or not ts.t:
            return reasoning_output

        # Check if we have only 5 key frames (kinematics_1d pattern)
        if len(ts.t) == 5 and reasoning_output.scenario == "kinematics_1d":
            # Full 30 FPS expansion
            fps = reasoning_output.animation_spec.fps if reasoning_output.animation_spec else 30
            duration = reasoning_output.animation_spec.duration_s if reasoning_output.animation_spec else ts.t[-1]
            n_points = int(fps * duration) + 1

            # Generate full time array
            t_full = np.linspace(0, duration, n_points).tolist()

            # Get acceleration from parameters
            a = reasoning_output.parameters.get("a", 0.0)
            v0 = reasoning_output.parameters.get("v0", 0.0)
            x0 = reasoning_output.parameters.get("x0", 0.0)

            # Compute full arrays using kinematic equations
            x_full = [x0 + v0 * t + 0.5 * a * t * t for t in t_full]
            v_full = [v0 + a * t for t in t_full]
            a_full = [a] * n_points

            # Update time series
            ts.t = t_full
            ts.x = x_full
            ts.v = v_full
            ts.a = a_full

        return reasoning_output

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def reasoning_solve(self, vision_output: VisionOutput) -> ReasoningOutput:
        """Call NIM reasoning model to solve the physics problem with calculator tool."""
        # Build context from vision output
        problem_context = f"""
Problem Text: {vision_output.problem_text}
Knowns: {vision_output.knowns}
Unknowns: {vision_output.unknowns}
Diagram: {vision_output.diagram_description}
Suggested Scenario: {vision_output.suggested_scenario}
"""

        # Extract known numeric values for calculator variables
        known_values = self._extract_known_values(vision_output)

        # Build system prompt with formulas reference
        system_prompt = f"{REASONING_PROMPT}\n\n--- FORMULAS REFERENCE ---\n{FORMULAS_REFERENCE}"

        max_iterations = 5  # Prevent infinite loops
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Solve this physics problem:\n{problem_context}"},
        ]

        for iteration in range(max_iterations):
            response = await self.client.chat.completions.create(
                model=self.reasoning_model,
                messages=messages,
                max_tokens=4096,
                temperature=0.1,
                tools=[CALCULATOR_TOOL_DEFINITION],
                tool_choice="auto",
            )

            message = response.choices[0].message

            # If no tool calls, check if we have valid JSON final answer
            if not message.tool_calls:
                raw_content = message.content
                if not raw_content:
                    raise ValueError("Empty response from reasoning model")

                # Try to parse as JSON
                try:
                    data = extract_json(raw_content)
                    reasoning_output = ReasoningOutput.model_validate(data)

                    # Verify and correct critical calculated values
                    reasoning_output = self._verify_and_correct(reasoning_output, vision_output, known_values)
                    # Expand time series from key frames to full 30 FPS
                    reasoning_output = self._expand_time_series(reasoning_output)
                    return reasoning_output
                except Exception:
                    # Not valid JSON - continue loop with reminder to output JSON
                    messages.append({
                        "role": "assistant",
                        "content": message.content,
                    })
                    messages.append({
                        "role": "user",
                        "content": "Please provide the final answer as valid JSON only, following the schema. No explanations or conversational text."
                    })
                    continue

            # Add assistant message with tool calls
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ],
            })

            # Execute tool calls
            import json
            for tool_call in message.tool_calls:
                if tool_call.function.name == "calculator":
                    args = json.loads(tool_call.function.arguments)
                    expression = args.get("expression", "")
                    variables = args.get("variables", {})
                    # Merge with known values from vision
                    merged_vars = {**known_values, **variables}
                    result = Calculator.evaluate(expression, merged_vars)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"result": result, "expression": expression, "variables": merged_vars}),
                    })
                else:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"error": f"Unknown tool: {tool_call.function.name}"}),
                    })

        # If we exit the loop without a final answer, try one more time without tools
        response = await self.client.chat.completions.create(
            model=self.reasoning_model,
            messages=messages + [{"role": "user", "content": "Provide the final JSON answer now."}],
            max_tokens=4096,
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise ValueError("Empty response from reasoning model after tool use")

        data = extract_json(raw_content)
        reasoning_output = ReasoningOutput.model_validate(data)

        # Verify and correct critical calculated values
        reasoning_output = self._verify_and_correct(reasoning_output, vision_output, known_values)
        # Expand time series from key frames to full 30 FPS
        reasoning_output = self._expand_time_series(reasoning_output)
        return reasoning_output