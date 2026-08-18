#!/usr/bin/env python3
"""
Debug script to trace reasoning model calls - full flow.
"""

import asyncio
import json
import re
from app.services.nim_client import NIMClient
from app.services.image import image_to_base64, preprocess_image
from app.schemas import VisionOutput
from app.utils.calculator import Calculator


async def debug_reasoning():
    image_path = r"C:\Users\devon\Downloads\image.jpeg"

    print(f"Testing with image: {image_path}")

    # Load and encode image
    image_b64 = image_to_base64(image_path)
    processed_b64 = preprocess_image(image_b64)

    # Run vision
    nim_client = NIMClient()
    vision_output = await nim_client.vision_extract(processed_b64)

    print("\n" + "=" * 60)
    print("VISION OUTPUT")
    print("=" * 60)
    print(f"Problem Text: {vision_output.problem_text}")
    print(f"Knowns: {vision_output.knowns}")
    print(f"Unknowns: {vision_output.unknowns}")
    print(f"Diagram: {vision_output.diagram_description}")
    print(f"Suggested Scenario: {vision_output.suggested_scenario}")

    # Extract known numeric values for calculator variables
    known_values = {}
    if vision_output.knowns:
        for key, value in vision_output.knowns.items():
            match = re.match(r'^([\d.]+)', str(value).strip())
            if match:
                try:
                    known_values[key] = float(match.group(1))
                except ValueError:
                    pass
    print(f"Known values for calculator: {known_values}")

    # Build system prompt with formulas reference
    from app.prompts import REASONING_PROMPT, FORMULAS_REFERENCE
    system_prompt = f"{REASONING_PROMPT}\n\n--- FORMULAS REFERENCE ---\n{FORMULAS_REFERENCE}"

    # Build context from vision output
    problem_context = f"""
Problem Text: {vision_output.problem_text}
Knowns: {vision_output.knowns}
Unknowns: {vision_output.unknowns}
Diagram: {vision_output.diagram_description}
Suggested Scenario: {vision_output.suggested_scenario}
"""

    max_iterations = 5
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Solve this physics problem:\n{problem_context}"},
    ]

    from app.utils.calculator import CALCULATOR_TOOL_DEFINITION

    for iteration in range(max_iterations):
        print(f"\n--- Iteration {iteration + 1} ---")
        response = await nim_client.client.chat.completions.create(
            model=nim_client.reasoning_model,
            messages=messages,
            max_tokens=4096,
            temperature=0.1,
            tools=[CALCULATOR_TOOL_DEFINITION],
            tool_choice="auto",
        )

        message = response.choices[0].message
        print(f"Assistant content: {message.content}")
        print(f"Tool calls: {message.tool_calls}")

        # Check if model put tool call in content (some models do this)
        content = message.content or ""
        if not message.tool_calls and content.strip().startswith('{'):
            try:
                potential_tool_call = json.loads(content.strip())
                if isinstance(potential_tool_call, dict) and "name" in potential_tool_call and potential_tool_call["name"] == "calculator":
                    print("DETECTED TOOL CALL IN CONTENT!")
                    # Simulate tool call
                    args = potential_tool_call.get("parameters", {})
                    expression = args.get("expression", "")
                    variables = args.get("variables", {})
                    merged_vars = {**known_values, **variables}
                    print(f"Calculator call: expression='{expression}', variables={merged_vars}")
                    try:
                        result = Calculator.evaluate(expression, merged_vars)
                        tool_result = {"result": result, "expression": expression, "variables": merged_vars}
                        print(f"Calculator result: {result}")
                    except Exception as e:
                        tool_result = {"error": str(e), "expression": expression, "variables": merged_vars}
                        print(f"Calculator error: {e}")

                    # Add tool result to messages
                    messages.append({
                        "role": "assistant",
                        "content": content,
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": f"fake_{iteration}",
                        "content": json.dumps(tool_result),
                    })
                    continue
            except json.JSONDecodeError:
                pass

        # If no tool calls, we have the final answer
        if not message.tool_calls:
            print("No tool calls - final answer")
            # Try to parse the JSON
            try:
                data = json.loads(content.strip() if content else "{}")
                print(f"Parsed final answer: {json.dumps(data, indent=2)}")
            except:
                print("Could not parse final answer as JSON")
            break

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
                args = json.loads(tool_call.function.arguments)
                expression = args.get("expression", "")
                variables = args.get("variables", {})
                merged_vars = {**known_values, **variables}
                print(f"Calculator call: expression='{expression}', variables={merged_vars}")
                try:
                    result = Calculator.evaluate(expression, merged_vars)
                    tool_result = {"result": result, "expression": expression, "variables": merged_vars}
                    print(f"Calculator result: {result}")
                except Exception as e:
                    tool_result = {"error": str(e), "expression": expression, "variables": merged_vars}
                    print(f"Calculator error: {e}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_result),
                })


if __name__ == "__main__":
    asyncio.run(debug_reasoning())