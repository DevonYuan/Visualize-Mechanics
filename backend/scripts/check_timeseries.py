#!/usr/bin/env python3
"""
Check time series length and content.
"""

import asyncio
import json
from app.services.pipeline import PipelineService
from app.services.image import image_to_base64


async def check_timeseries():
    image_path = r"C:\Users\devon\Downloads\image.jpeg"

    print(f"Testing with image: {image_path}")

    image_b64 = image_to_base64(image_path)
    print(f"Image encoded, length: {len(image_b64)} chars")

    pipeline = PipelineService()

    try:
        print("Running pipeline...")
        response = await pipeline.solve_problem(image_b64)

        print("\n" + "=" * 60)
        print("RESULT")
        print("=" * 60)
        print(f"Scenario: {response.scenario}")
        print(f"Parameters: {json.dumps(response.parameters, indent=2)}")
        
        ts = response.time_series
        print(f"\nTime Series:")
        print(f"  t length: {len(ts.t) if ts.t else 0}")
        print(f"  x length: {len(ts.x) if ts.x else 0}")
        print(f"  v length: {len(ts.v) if ts.v else 0}")
        print(f"  a length: {len(ts.a) if ts.a else 0}")
        print(f"  f_normal length: {len(ts.f_normal) if ts.f_normal else 0}")
        print(f"  f_friction length: {len(ts.f_friction) if ts.f_friction else 0}")
        print(f"  y length: {len(ts.y) if ts.y else 0}")
        print(f"  vx length: {len(ts.vx) if ts.vx else 0}")
        print(f"  vy length: {len(ts.vy) if ts.vy else 0}")
        
        if ts.t:
            print(f"  t range: {ts.t[0]} to {ts.t[-1]}")
            print(f"  t step: {ts.t[1] - ts.t[0] if len(ts.t) > 1 else 'N/A'}")
            print(f"  Expected FPS: {1/(ts.t[1] - ts.t[0]) if len(ts.t) > 1 else 'N/A'}")
        
        if ts.x:
            print(f"  x first 5: {ts.x[:5]}")
            print(f"  x last 5: {ts.x[-5:]}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(check_timeseries())