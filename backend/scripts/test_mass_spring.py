#!/usr/bin/env python3
"""
Test mass_spring scenario with full pipeline including verification.
"""

import asyncio
import json
import math
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_mass_spring_pipeline():
    # Test Case 1: Horizontal spring, released from rest
    vision_output = VisionOutput(
        problem_text="A 0.5 kg mass attached to a spring (k = 200 N/m) is displaced 0.1 m from equilibrium and released from rest. Find the period, maximum speed, and maximum acceleration.",
        knowns={"mass": "0.5 kg", "k": "200 N/m", "x0": "0.1 m", "v0": "0 m/s"},
        unknowns=["period", "max_speed", "max_acceleration", "omega"],
        diagram_description="Horizontal mass-spring system, mass displaced to right",
        suggested_scenario="mass_spring",
    )

    print("Testing mass_spring scenario (horizontal, undamped)")
    print(f"Vision: {vision_output.suggested_scenario}")
    print(f"Knowns: {vision_output.knowns}")

    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print(f"\nScenario: {result.scenario}")
    print(f"Parameters: {json.dumps(result.parameters, indent=2)}")
    print(f"Animation Spec: {json.dumps(result.animation_spec.model_dump() if hasattr(result.animation_spec, 'model_dump') else result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution.model_dump() if hasattr(result.worked_solution, 'model_dump') else result.worked_solution, indent=2) if result.worked_solution else None}")
    
    ts = result.time_series
    print(f"Time Series lengths: t={len(ts.t)}, x_eq={len(ts.x_eq)}, v={len(ts.v)}, a={len(ts.a)}, force={len(ts.force)}, ke={len(ts.ke)}, pe={len(ts.pe)}, e_total={len(ts.e_total)}")
    
    if ts.t:
        print(f"t range: {ts.t[0]:.4f} to {ts.t[-1]:.4f}")
        print(f"t step: {ts.t[1] - ts.t[0]:.4f}")
        print(f"Expected FPS: {1/(ts.t[1] - ts.t[0]):.1f}")
        print(f"x_eq first 5: {ts.x_eq[:5]}")
        print(f"x_eq last 5: {ts.x_eq[-5:]}")
        print(f"v first 5: {ts.v[:5]}")
        print(f"a first 5: {ts.a[:5]}")
        print(f"force first 5: {ts.force[:5]}")
        print(f"ke first 5: {ts.ke[:5]}")
        print(f"pe first 5: {ts.pe[:5]}")
        print(f"e_total first 5: {ts.e_total[:5]}")
        
        # Physics Verification
        mass = 0.5
        k = 200.0
        x0 = 0.1
        v0 = 0.0
        
        expected_omega = math.sqrt(k / mass)
        expected_period = 2 * math.pi / expected_omega
        expected_A = math.sqrt(x0**2 + (v0/expected_omega)**2)
        expected_v_max = expected_A * expected_omega
        expected_a_max = expected_A * expected_omega**2
        expected_E = 0.5 * k * expected_A**2
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected omega: {expected_omega:.3f} rad/s, Got params omega: {result.parameters.get('omega', 'N/A')}")
        print(f"Expected period: {expected_period:.3f} s, Got params period: {result.parameters.get('period', 'N/A')}")
        print(f"Expected amplitude: {expected_A:.3f} m, Got params amplitude: {result.parameters.get('amplitude', 'N/A')}")
        print(f"Expected v_max: {expected_v_max:.3f} m/s")
        print(f"Expected a_max: {expected_a_max:.3f} m/s^2")
        print(f"Expected total E: {expected_E:.3f} J")
        print(f"Got x_eq[0]: {ts.x_eq[0]:.3f} (should be {x0})")
        print(f"Got v[0]: {ts.v[0]:.3f} (should be {v0})")
        print(f"Got max |x_eq|: {max(map(abs, ts.x_eq)):.3f} (should be ~{expected_A})")
        print(f"Got max |v|: {max(map(abs, ts.v)):.3f} (should be ~{expected_v_max})")
        print(f"Got max |a|: {max(map(abs, ts.a)):.3f} (should be ~{expected_a_max})")
        print(f"Got E constant: {all(abs(e - expected_E) < 0.01 for e in ts.e_total)}")
        print(f"Got duration ~3 periods: {ts.t[-1]:.3f} (expected ~{3*expected_period:.3f})")


    # Test Case 2: Vertical spring
    print("\n" + "="*60)
    print("Testing mass_spring scenario (vertical)")
    
    vision_output2 = VisionOutput(
        problem_text="A 2 kg mass hangs from a vertical spring (k = 50 N/m). The mass is pulled down 0.15 m from equilibrium and released from rest. Find the period and maximum speed.",
        knowns={"mass": "2 kg", "k": "50 N/m", "x0": "0.15 m", "v0": "0 m/s"},
        unknowns=["period", "max_speed", "omega"],
        diagram_description="Vertical spring with hanging mass, displaced downward",
        suggested_scenario="mass_spring",
    )

    nim_client = NIMClient()
    try:
        result2 = await nim_client.reasoning_solve(vision_output2)

        print(f"Scenario: {result2.scenario}")
        print(f"Parameters: {json.dumps(result2.parameters, indent=2)}")
        print(f"Has g=9.8: {result2.parameters.get('g') == 9.8 or abs(result2.parameters.get('g', 0) - 9.8) < 0.1}")
        
        ts2 = result2.time_series
        if ts2.t:
            print(f"Time Series: t={len(ts2.t)}, x_eq={len(ts2.x_eq)}, v={len(ts2.v)}")
            print(f"t range: {ts2.t[0]:.4f} to {ts2.t[-1]:.4f}")
            
            mass = 2.0
            k = 50.0
            x0 = 0.15
            expected_omega = math.sqrt(k / mass)
            expected_period = 2 * math.pi / expected_omega
            
            print(f"Expected omega: {expected_omega:.3f}, period: {expected_period:.3f}")
            print(f"Got omega: {result2.parameters.get('omega')}, period: {result2.parameters.get('period')}")
    except Exception as e:
        print(f"Vertical spring test failed: {e}")


    # Test Case 3: Spring with initial velocity
    print("\n" + "="*60)
    print("Testing mass_spring scenario (with initial velocity)")
    
    vision_output3 = VisionOutput(
        problem_text="A 1.0 kg mass on a spring (k = 100 N/m) is at equilibrium (x=0) but given an initial velocity of 2.0 m/s. Find the amplitude, period, and maximum acceleration.",
        knowns={"mass": "1.0 kg", "k": "100 N/m", "x0": "0 m", "v0": "2.0 m/s"},
        unknowns=["amplitude", "period", "max_acceleration", "omega"],
        diagram_description="Horizontal mass-spring system, mass at equilibrium with initial velocity",
        suggested_scenario="mass_spring",
    )

    nim_client = NIMClient()
    try:
        result3 = await nim_client.reasoning_solve(vision_output3)

        print(f"Scenario: {result3.scenario}")
        print(f"Parameters: {json.dumps(result3.parameters, indent=2)}")
        
        ts3 = result3.time_series
        if ts3.t:
            mass = 1.0
            k = 100.0
            x0 = 0.0
            v0 = 2.0
            expected_omega = math.sqrt(k / mass)
            expected_period = 2 * math.pi / expected_omega
            expected_A = math.sqrt(x0**2 + (v0/expected_omega)**2)
            expected_a_max = expected_A * expected_omega**2
            
            print(f"Expected omega: {expected_omega:.3f}, period: {expected_period:.3f}")
            print(f"Expected amplitude: {expected_A:.3f}")
            print(f"Expected a_max: {expected_a_max:.3f}")
            print(f"Got amplitude: {result3.parameters.get('amplitude')}")
            print(f"Got omega: {result3.parameters.get('omega')}")
            print(f"Got period: {result3.parameters.get('period')}")
            print(f"Got x_eq[0]: {ts3.x_eq[0]:.3f} (should be {x0})")
            print(f"Got v[0]: {ts3.v[0]:.3f} (should be {v0})")
    except Exception as e:
        print(f"Initial velocity test failed: {e}")


    # Test Case 4: Vertical spring released from unstretched (g=10)
    print("\n" + "="*60)
    print("Testing mass_spring scenario (vertical, released from unstretched, g=10)")
    
    vision_output4 = VisionOutput(
        problem_text="A 0.1 kg block is attached to an initially unstretched spring (k = 40 N/m) and released from rest. g = 10 m/s². What is the amplitude of the resulting SHM?",
        knowns={"mass": "0.1 kg", "k": "40 N/m", "g": "10 m/s^2", "v0": "0 m/s"},
        unknowns=["amplitude", "period", "omega"],
        diagram_description="Vertical spring initially unstretched, block attached and released",
        suggested_scenario="mass_spring",
    )

    nim_client = NIMClient()
    try:
        result4 = await nim_client.reasoning_solve(vision_output4)

        print(f"Scenario: {result4.scenario}")
        print(f"Parameters: {json.dumps(result4.parameters, indent=2)}")
        
        ts4 = result4.time_series
        if ts4.t:
            print(f"Time Series: t={len(ts4.t)}, x_eq={len(ts4.x_eq)}, v={len(ts4.v)}")
            
            mass = 0.1
            k = 40.0
            g = 10.0
            expected_omega = math.sqrt(k / mass)
            expected_amplitude = mass * g / k  # mg/k for unstretched release
            expected_period = 2 * math.pi / expected_omega
            
            print(f"Expected omega: {expected_omega:.3f}, amplitude: {expected_amplitude:.3f}, period: {expected_period:.3f}")
            print(f"Got omega: {result4.parameters.get('omega')}, amplitude: {result4.parameters.get('amplitude')}, period: {result4.parameters.get('period')}")
            print(f"Got g: {result4.parameters.get('g')}")
            print(f"Got x_eq[0]: {ts4.x_eq[0]:.3f} (should be {expected_amplitude})")
    except Exception as e:
        print(f"Unstretched spring test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_mass_spring_pipeline())