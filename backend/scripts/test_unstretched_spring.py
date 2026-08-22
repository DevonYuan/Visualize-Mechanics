#!/usr/bin/env python3
"""Test vertical spring released from unstretched with g=10"""

import asyncio
import json
import math
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test():
    vision_output = VisionOutput(
        problem_text="A 0.1 kg block is attached to an initially unstretched spring (k = 40 N/m) and released from rest. g = 10 m/s^2. What is the amplitude of the resulting SHM?",
        knowns={"mass": "0.1 kg", "k": "40 N/m", "g": "10 m/s^2", "v0": "0 m/s"},
        unknowns=["amplitude", "period", "omega"],
        diagram_description="Vertical spring initially unstretched, block attached and released",
        suggested_scenario="mass_spring",
    )

    nim_client = NIMClient()
    try:
        result = await nim_client.reasoning_solve(vision_output)

        print(f"Scenario: {result.scenario}")
        print(f"Parameters: {json.dumps(result.parameters, indent=2)}")
        print(f"Animation Spec: {result.animation_spec}")
        print(f"Worked Solution: {result.worked_solution}")
        print(f"Time Series: {result.time_series}")
        
        ts = result.time_series
        if ts and ts.t:
            print(f"Time Series: t={len(ts.t)}, x_eq={len(ts.x_eq)}, v={len(ts.v)}")
            
            mass = 0.1
            k = 40.0
            g = 10.0
            expected_omega = math.sqrt(k / mass)
            expected_amplitude = mass * g / k
            expected_period = 2 * math.pi / expected_omega
            
            print(f"Expected omega: {expected_omega:.3f}, amplitude: {expected_amplitude:.3f}, period: {expected_period:.3f}")
            print(f"Got omega: {result.parameters.get('omega')}, amplitude: {result.parameters.get('amplitude')}, period: {result.parameters.get('period')}")
            print(f"Got g: {result.parameters.get('g')}")
            print(f"Got x_eq[0]: {ts.x_eq[0]:.3f} (should be {expected_amplitude})")
        else:
            print("No time series generated")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test())