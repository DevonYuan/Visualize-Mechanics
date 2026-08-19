#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to manually set angle parameter and test the full pipeline.
"""

import asyncio
import base64
import json
import sys
import io
from pathlib import Path

# Set UTF-8 encoding for stdout
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from app.services.pipeline import PipelineService
from app.services.image import image_to_base64


async def test_with_angle():
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
        
        # Check if angle was properly extracted
        if response.parameters.get("angle_deg") == 10.0:
            print("\n✓ SUCCESS: Angle properly extracted as 10.0 degrees!")
        else:
            print(f"\n✗ WARNING: Angle is {response.parameters.get('angle_deg')} instead of 10.0")
        
        # Save the result to a file for frontend testing
        result_file = Path("test_result_with_angle.json")
        with open(result_file, "w") as f:
            json.dump({
                "scenario": response.scenario,
                "parameters": response.parameters,
                "animation_spec": response.animation_spec.model_dump() if response.animation_spec else None,
                "worked_solution": response.worked_solution.model_dump() if response.worked_solution else None,
                "time_series": {
                    "t": response.time_series.t,
                    "x": response.time_series.x,
                    "v": response.time_series.v,
                    "a": response.time_series.a
                }
            }, f, indent=2)
        
        print(f"\nSaved test result to: {result_file}")
        print("Copy this file to frontend/public/ to test the 3D rendering.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_with_angle())