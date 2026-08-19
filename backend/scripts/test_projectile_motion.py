#!/usr/bin/env python3
"""
Test projectile_motion scenario with full pipeline including verification.
"""

import asyncio
import json
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_projectile_motion_pipeline():
    # Mock vision output for a projectile motion problem
    vision_output = VisionOutput(
        problem_text="A ball is thrown at 20 m/s at 45 degrees from ground level. Find the time of flight, range, and maximum height.",
        knowns={"v0": "20 m/s", "angle": "45 deg"},
        unknowns=["time_of_flight", "range", "max_height"],
        diagram_description="Parabolic trajectory from ground",
        suggested_scenario="projectile_motion",
    )

    print("Testing projectile_motion scenario with full pipeline")
    print(f"Vision: {vision_output.suggested_scenario}")
    print(f"Knowns: {vision_output.knowns}")

    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print(f"\nScenario: {result.scenario}")
    print(f"Parameters: {json.dumps(result.parameters.model_dump() if hasattr(result.parameters, 'model_dump') else result.parameters, indent=2)}")
    print(f"Animation Spec: {json.dumps(result.animation_spec.model_dump() if hasattr(result.animation_spec, 'model_dump') else result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution.model_dump() if hasattr(result.worked_solution, 'model_dump') else result.worked_solution, indent=2) if result.worked_solution else None}")
    print(f"Time Series lengths: t={len(result.time_series.t)}, x={len(result.time_series.x)}, y={len(result.time_series.y)}, vx={len(result.time_series.vx)}, vy={len(result.time_series.vy)}, v={len(result.time_series.v)}")
    
    if result.time_series.t:
        print(f"t range: {result.time_series.t[0]:.4f} to {result.time_series.t[-1]:.4f}")
        print(f"t step: {result.time_series.t[1] - result.time_series.t[0]:.4f}")
        print(f"Expected FPS: {1/(result.time_series.t[1] - result.time_series.t[0]):.1f}")
        print(f"x first 5: {result.time_series.x[:5]}")
        print(f"x last 5: {result.time_series.x[-5:]}")
        print(f"y first 5: {result.time_series.y[:5]}")
        print(f"y last 5: {result.time_series.y[-5:]}")
        print(f"vx first 5: {result.time_series.vx[:5]}")
        print(f"vy first 5: {result.time_series.vy[:5]}")
        
        # Verify physics
        import math
        v0 = 20.0
        angle_deg = 45.0
        g = 9.8
        angle_rad = math.radians(angle_deg)
        expected_t_flight = 2 * v0 * math.sin(angle_rad) / g
        expected_range = v0 * math.cos(angle_rad) * expected_t_flight
        expected_max_height = v0 * math.sin(angle_rad) * expected_t_flight / 2 - 0.5 * g * (expected_t_flight/2)**2
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected t_flight: {expected_t_flight:.3f} s")
        print(f"Expected range: {expected_range:.3f} m")
        print(f"Expected max_height: {expected_max_height:.3f} m")
        print(f"Got t end: {result.time_series.t[-1]:.3f} s")
        print(f"Got x end: {result.time_series.x[-1]:.3f} m")
        print(f"Got y max: {max(result.time_series.y):.3f} m")


if __name__ == "__main__":
    asyncio.run(test_projectile_motion_pipeline())