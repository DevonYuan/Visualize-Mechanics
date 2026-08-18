#!/usr/bin/env python3
"""
Debug script to see vision output.
"""

import asyncio
from app.services.nim_client import NIMClient
from app.services.image import image_to_base64, preprocess_image


async def debug_vision():
    image_path = r"C:\Users\devon\Downloads\image.jpeg"

    print(f"Testing with image: {image_path}")

    # Load and encode image
    image_b64 = image_to_base64(image_path)
    print(f"Image encoded, length: {len(image_b64)} chars")

    # Process image
    processed_b64 = preprocess_image(image_b64)
    print(f"Processed image length: {len(processed_b64)} chars")

    # Run vision
    nim_client = NIMClient()

    try:
        print("Running vision extraction...")
        vision_output = await nim_client.vision_extract(processed_b64)

        print("\n" + "=" * 60)
        print("VISION OUTPUT")
        print("=" * 60)
        print(f"Problem Text: {vision_output.problem_text}")
        print(f"Knowns: {vision_output.knowns}")
        print(f"Unknowns: {vision_output.unknowns}")
        print(f"Diagram: {vision_output.diagram_description}")
        print(f"Suggested Scenario: {vision_output.suggested_scenario}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(debug_vision())