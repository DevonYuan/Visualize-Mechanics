#!/usr/bin/env python3
"""
Test inclined_plane scenario with full pipeline including verification.
"""

import asyncio
import json
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_inclined_plane_pipeline():
    # Mock vision output for an inclined plane problem
    vision_output = VisionOutput(
        problem_text="A block of mass 5 kg on a 30° incline with μ_k = 0.2. Find the acceleration and distance after 3 seconds.",
        knowns={"mass": "5 kg", "angle": "30 deg", "mu_k": "0.2", "time": "3.0 s"},
        unknowns=["acceleration", "distance"],
        diagram_description="Block on inclined plane with friction",
        suggested_scenario="inclined_plane",
    )

    print("Testing inclined_plane scenario with full pipeline")
    print(f"Vision: {vision_output.suggested_scenario}")
    print(f"Knowns: {vision_output.knowns}")

    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print(f"\nScenario: {result.scenario}")
    print(f"Parameters: {json.dumps(result.parameters.model_dump() if hasattr(result.parameters, 'model_dump') else result.parameters, indent=2)}")
    print(f"Animation Spec: {json.dumps(result.animation_spec.model_dump() if hasattr(result.animation_spec, 'model_dump') else result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution.model_dump() if hasattr(result.worked_solution, 'model_dump') else result.worked_solution, indent=2) if result.worked_solution else None}")
    print(f"Time Series lengths: t={len(result.time_series.t)}, x={len(result.time_series.x)}, v={len(result.time_series.v)}, a={len(result.time_series.a)}, f_normal={len(result.time_series.f_normal)}, f_friction={len(result.time_series.f_friction)}")
    
    if result.time_series.t:
        print(f"t range: {result.time_series.t[0]:.4f} to {result.time_series.t[-1]:.4f}")
        print(f"t step: {result.time_series.t[1] - result.time_series.t[0]:.4f}")
        print(f"Expected FPS: {1/(result.time_series.t[1] - result.time_series.t[0]):.1f}")
        print(f"x first 5: {result.time_series.x[:5]}")
        print(f"x last 5: {result.time_series.x[-5:]}")
        print(f"v first 5: {result.time_series.v[:5]}")
        print(f"v last 5: {result.time_series.v[-5:]}")
        print(f"a first 5: {result.time_series.a[:5]}")
        print(f"f_normal first 5: {result.time_series.f_normal[:5]}")
        print(f"f_friction first 5: {result.time_series.f_friction[:5]}")
        
        # Verify physics
        import math
        angle_rad = math.radians(30.0)
        expected_a = 9.8 * (math.sin(angle_rad) - 0.2 * math.cos(angle_rad))
        expected_f_normal = 5.0 * 9.8 * math.cos(angle_rad)
        expected_f_friction = 0.2 * expected_f_normal
        expected_x_at_3 = 0.5 * expected_a * 9
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected a: {expected_a:.3f} m/s^2, Got: {result.time_series.a[-1]:.3f} m/s^2")
        print(f"Expected f_normal: {expected_f_normal:.3f} N, Got: {result.time_series.f_normal[-1]:.3f} N")
        print(f"Expected f_friction: {expected_f_friction:.3f} N, Got: {result.time_series.f_friction[-1]:.3f} N")
        print(f"Expected x at t=3: {expected_x_at_3:.3f} m, Got: {result.time_series.x[-1]:.3f} m")


if __name__ == "__main__":
    asyncio.run(test_inclined_plane_pipeline())