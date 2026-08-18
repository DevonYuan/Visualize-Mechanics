import os
from typing import Optional
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

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

            # If no tool calls, we have the final answer
            if not message.tool_calls:
                raw_content = message.content
                if not raw_content:
                    raise ValueError("Empty response from reasoning model")

                data = extract_json(raw_content)
                return ReasoningOutput.model_validate(data)

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
            for tool_call in message.tool_calls:
                if tool_call.function.name == "calculator":
                    import json
                    args = json.loads(tool_call.function.arguments)
                    expression = args.get("expression", "")
                    result = Calculator.evaluate(expression)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"result": result, "expression": expression}),
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
        return ReasoningOutput.model_validate(data)