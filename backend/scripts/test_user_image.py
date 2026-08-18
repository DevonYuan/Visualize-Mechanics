#!/usr/bin/env python3
"""
Test script to run the pipeline on the user's test image.
"""

import asyncio
import base64
import json
from pathlib import Path

from app.services.pipeline import PipelineService
from app.services.image import image_to_base64


async def test_user_image():
    image_path = r"C:\Users\devon\Downloads\image.jpeg"

    print(f"Testing with image: {image_path}")

    # Load and encode image
    image_b64 = image_to_base64(image_path)
    print(f"Image encoded, length: {len(image_b64)} chars")

    # Run pipeline
    pipeline = PipelineService()

    try:
        print("Running pipeline...")
        response = await pipeline.solve_problem(image_b64)

        print("\n" + "=" * 60)
        print("RESULT")
        print("=" * 60)
        print(f"Scenario: {response.scenario}")
        print(f"Parameters: {json.dumps(response.parameters, indent=2)}")
        print(f"Animation Spec: {json.dumps(response.animation_spec.model_dump(), indent=2) if response.animation_spec else None}")
        print(f"Worked Solution: {json.dumps(response.worked_solution.model_dump(), indent=2) if response.worked_solution else None}")
        print(f"Time Series (first 3): t={response.time_series.t[:3] if response.time_series.t else []}, x={response.time_series.x[:3] if response.time_series.x else []}")

        # Check for acceleration parameter
        if 'a' in response.parameters:
            print(f"\n*** ACCELERATION (a): {response.parameters['a']} m/s^2 ***")
            print(f"Expected: ~6 m/s^2 (for inclined plane with theta=30 deg, g*sin(30)=4.9)")
            print(f"Previous bug: was outputting 9 m/s^2 (using g instead of g*sin(theta))")

        if 'a_verified' in response.parameters:
            print(f"Verified acceleration: {response.parameters['a_verified']} m/s^2")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_user_image())