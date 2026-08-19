#!/usr/bin/env python3
"""
Test inclined_plane scenario time series generation.
"""

import asyncio
import json
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput
from app.prompts import REASONING_PROMPT, FORMULAS_REFERENCE
from app.utils.calculator import Calculator, CALCULATOR_TOOL_DEFINITION


async def test_inclined_plane():
    # Mock vision output for an inclined plane problem
    vision_output = VisionOutput(
        problem_text="A block of mass 5 kg on a 30° incline with μ_k = 0.2. Find the acceleration and distance after 3 seconds.",
        knowns={"mass": "5 kg", "angle": "30 deg", "mu_k": "0.2", "time": "3.0 s"},
        unknowns=["acceleration", "distance"],
        diagram_description="Block on inclined plane with friction",
        suggested_scenario="inclined_plane",
    )

    print("Testing inclined_plane scenario")
    print(f"Vision: {vision_output.suggested_scenario}")
    print(f"Knowns: {vision_output.knowns}")

    nim_client = NIMClient()
    
    # Extract known numeric values
    known_values = {}
    if vision_output.knowns:
        import re
        for key, value in vision_output.knowns.items():
            match = re.match(r'^([\d.]+)', str(value).strip())
            if match:
                try:
                    known_values[key] = float(match.group(1))
                except ValueError:
                    pass
    print(f"Known values for calculator: {known_values}")

    system_prompt = f"{REASONING_PROMPT}\n\n--- FORMULAS REFERENCE ---\n{FORMULAS_REFERENCE}"

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

        if not message.tool_calls:
            print("No tool calls - final answer")
            content = message.content or ""
            try:
                data = json.loads(content.strip() if content else "{}")
                print(f"Parsed final answer: {json.dumps(data, indent=2)}")
                
                # Check time series
                ts = data.get('time_series', {})
                print(f"\nTime Series Analysis:")
                for key, val in ts.items():
                    if isinstance(val, list):
                        print(f"  {key}: length={len(val)}, first 3={val[:3]}, last={val[-1] if val else 'N/A'}")
                
                if ts.get('t'):
                    if len(ts['t']) > 1:
                        step = ts['t'][1] - ts['t'][0]
                        print(f"  t step: {step}, FPS: {1/step if step > 0 else 'N/A'}")
                break
            except Exception as e:
                print(f"Could not parse final answer as JSON: {e}")
                print(f"Content: {content}")
            break

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

        for tool_call in message.tool_calls:
            if tool_call.function.name == "calculator":
                import json as json_module
                args = json_module.loads(tool_call.function.arguments)
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
                    "content": json_module.dumps(tool_result),
                })

    # Final attempt
    print("\n--- Final attempt without tools ---")
    response = await nim_client.client.chat.completions.create(
        model=nim_client.reasoning_model,
        messages=messages + [{"role": "user", "content": "Provide the final JSON answer now."}],
        max_tokens=4096,
        temperature=0.1,
    )

    message = response.choices[0].message
    content = message.content or ""
    print(f"Final content: {content}")
    try:
        data = json.loads(content.strip() if content else "{}")
        print(f"Parsed final answer: {json.dumps(data, indent=2)}")
    except:
        print(f"Could not parse final answer as JSON")


if __name__ == "__main__":
    asyncio.run(test_inclined_plane())