#!/usr/bin/env python3
"""
Test torque scenario with full pipeline including verification.
"""

import asyncio
import json
import math
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_torque_pipeline():
    nim_client = NIMClient()

    # Test Case 1: Single force at end, pivot at end (like Example 12 in vision.txt)
    print("=" * 60)
    print("Test Case 1: Single force at end, pivot at end")
    print("=" * 60)
    
    vision_output1 = VisionOutput(
        problem_text="A uniform rod of mass 2 kg and length 1.5 m is pivoted at one end. A force of 10 N is applied perpendicular to the rod at the free end. Find the angular acceleration and the angular velocity after 2 seconds.",
        knowns={"mass": "2 kg", "length": "1.5 m", "force": "10 N", "pivot": "end", "r": "1.5 m", "force_angle": "90°", "t": "2 s"},
        unknowns=["alpha", "omega", "theta", "tau_net"],
        diagram_description="Rod pivoted at left end, horizontal, force of 10 N applied upward at right end",
        suggested_scenario="torque",
    )

    print(f"Vision: {vision_output1.suggested_scenario}")
    print(f"Knowns: {vision_output1.knowns}")

    result1 = await nim_client.reasoning_solve(vision_output1)

    print(f"\nScenario: {result1.scenario}")
    print(f"Parameters: {json.dumps(result1.parameters, indent=2)}")
    
    ts = result1.time_series
    print(f"Time Series lengths: t={len(ts.t)}, theta={len(ts.theta)}, omega={len(ts.omega)}, alpha={len(ts.alpha)}, torque={len(ts.torque)}")
    
    if ts.t:
        print(f"t range: {ts.t[0]:.4f} to {ts.t[-1]:.4f}")
        print(f"t step: {ts.t[1] - ts.t[0]:.4f}")
        print(f"Expected FPS: {1/(ts.t[1] - ts.t[0]):.1f}")
        print(f"theta first 5: {ts.theta[:5]}")
        print(f"omega first 5: {ts.omega[:5]}")
        print(f"alpha first 5: {ts.alpha[:5]}")
        print(f"torque first 5: {ts.torque[:5]}")

        # Physics Verification
        mass = 2.0
        length = 1.5
        force = 10.0
        r = 1.5
        force_angle = 90.0
        
        # Moment of inertia for rod pivoted at end
        I_expected = (1/3) * mass * length**2
        # Torque = r * F * sin(angle)
        tau_expected = r * force * math.sin(math.radians(force_angle))
        # Angular acceleration
        alpha_expected = tau_expected / I_expected
        # Angular velocity after t=2s (starting from rest)
        t_eval = 2.0
        omega_expected = alpha_expected * t_eval
        # Angular displacement
        theta_expected = 0.5 * alpha_expected * t_eval**2
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected I (end): {I_expected:.4f} kg·m², Got: {result1.parameters.get('I_verified', 'N/A')}")
        print(f"Expected tau_net: {tau_expected:.4f} N·m, Got: {result1.parameters.get('tau_net_verified', 'N/A')}")
        print(f"Expected alpha: {alpha_expected:.4f} rad/s², Got: {result1.parameters.get('alpha_verified', 'N/A')}")
        print(f"Expected omega at t={t_eval}s: {omega_expected:.4f} rad/s")
        print(f"Expected theta at t={t_eval}s: {theta_expected:.4f} rad")
        print(f"Got theta[-1]: {ts.theta[-1]:.4f} (expected ~{theta_expected:.4f})")
        print(f"Got omega[-1]: {ts.omega[-1]:.4f} (expected ~{omega_expected:.4f})")
        print(f"Got alpha[0]: {ts.alpha[0]:.4f} (expected ~{alpha_expected:.4f})")
        print(f"Got torque[0]: {ts.torque[0]:.4f} (expected ~{tau_expected:.4f})")
        
        # Check time series consistency
        if len(ts.theta) > 1:
            dt = ts.t[1] - ts.t[0]
            # Check alpha from omega derivative
            alpha_from_omega = (ts.omega[1] - ts.omega[0]) / dt
            print(f"Alpha from omega diff: {alpha_from_omega:.4f} (expected {alpha_expected:.4f})")
            # Check omega from theta derivative
            omega_from_theta = (ts.theta[1] - ts.theta[0]) / dt
            print(f"Omega from theta diff: {omega_from_theta:.4f} (expected 0 at start)")

    # Test Case 2: Two forces, pivot at center (like Example 13)
    print("\n" + "=" * 60)
    print("Test Case 2: Two forces, pivot at center")
    print("=" * 60)
    
    vision_output2 = VisionOutput(
        problem_text="A uniform rod of mass 1 kg and length 2 m is pivoted at its center. A force of 5 N is applied at 0.5 m from the pivot at 30° to the rod on the right side. Another force of 8 N is applied at 0.8 m from the pivot perpendicular to the rod on the left side. Find the net torque and angular acceleration.",
        knowns={"mass": "1 kg", "length": "2 m", "pivot": "center", "force1": "5 N", "r1": "0.5 m", "force_angle1": "30°", "force2": "8 N", "r2": "0.8 m", "force_angle2": "90°"},
        unknowns=["tau_net", "alpha", "omega", "theta"],
        diagram_description="Rod pivoted at center, F1=5N at 0.5m right at 30°, F2=8N at 0.8m left at 90°",
        suggested_scenario="torque",
    )

    print(f"Vision: {vision_output2.suggested_scenario}")
    print(f"Knowns: {vision_output2.knowns}")

    result2 = await nim_client.reasoning_solve(vision_output2)

    print(f"\nScenario: {result2.scenario}")
    print(f"Parameters: {json.dumps(result2.parameters, indent=2)}")
    
    ts2 = result2.time_series
    if ts2.t:
        print(f"t range: {ts2.t[0]:.4f} to {ts2.t[-1]:.4f}")
        print(f"theta first 5: {ts2.theta[:5]}")
        print(f"omega first 5: {ts2.omega[:5]}")
        print(f"alpha first 5: {ts2.alpha[:5]}")
        print(f"torque first 5: {ts2.torque[:5]}")

        # Physics Verification
        mass = 1.0
        length = 2.0
        force1 = 5.0
        r1 = 0.5
        angle1 = 30.0
        force2 = 8.0
        r2 = 0.8
        angle2 = 90.0
        
        I_expected = (1/12) * mass * length**2
        f1_perp = force1 * math.sin(math.radians(angle1))
        f2_perp = force2 * math.sin(math.radians(angle2))
        tau1 = r1 * f1_perp
        tau2 = r2 * f2_perp
        # F2 on left side creates opposite torque
        tau_net_expected = tau1 - tau2
        alpha_expected = tau_net_expected / I_expected
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected I (center): {I_expected:.4f} kg·m², Got: {result2.parameters.get('I_verified', 'N/A')}")
        print(f"F1_perp: {f1_perp:.4f} N, tau1: {tau1:.4f} N·m")
        print(f"F2_perp: {f2_perp:.4f} N, tau2: {tau2:.4f} N·m")
        print(f"Expected tau_net: {tau_net_expected:.4f} N·m, Got: {result2.parameters.get('tau_net_verified', 'N/A')}")
        print(f"Expected alpha: {alpha_expected:.4f} rad/s², Got: {result2.parameters.get('alpha_verified', 'N/A')}")
        print(f"Got torque[0]: {ts2.torque[0]:.4f} (expected ~{tau_net_expected:.4f})")
        print(f"Got alpha[0]: {ts2.alpha[0]:.4f} (expected ~{alpha_expected:.4f})")

    # Test Case 3: Gravity torque from angled release (like Example 14)
    print("\n" + "=" * 60)
    print("Test Case 3: Gravity torque from angled release")
    print("=" * 60)
    
    vision_output3 = VisionOutput(
        problem_text="A uniform rod of mass 3 kg and length 1 m is pivoted at one end. It is held at 45° above horizontal and released from rest. Find the initial angular acceleration and the angular velocity when it passes through horizontal.",
        knowns={"mass": "3 kg", "length": "1 m", "pivot": "end", "theta0": "45°", "omega0": "0 rad/s", "g": "9.8 m/s²"},
        unknowns=["alpha_initial", "omega_at_horizontal", "period"],
        diagram_description="Rod pivoted at left end, held at 45° above horizontal, released from rest",
        suggested_scenario="torque",
    )

    print(f"Vision: {vision_output3.suggested_scenario}")
    print(f"Knowns: {vision_output3.knowns}")

    result3 = await nim_client.reasoning_solve(vision_output3)

    print(f"\nScenario: {result3.scenario}")
    print(f"Parameters: {json.dumps(result3.parameters, indent=2)}")
    
    ts3 = result3.time_series
    if ts3.t:
        print(f"t range: {ts3.t[0]:.4f} to {ts3.t[-1]:.4f}")
        print(f"theta first 5: {ts3.theta[:5]}")
        print(f"omega first 5: {ts3.omega[:5]}")
        print(f"alpha first 5: {ts3.alpha[:5]}")
        print(f"torque first 5: {ts3.torque[:5]}")

        # Physics Verification
        mass = 3.0
        length = 1.0
        theta0 = math.radians(45.0)
        omega0 = 0.0
        g = 9.8
        
        I_expected = (1/3) * mass * length**2
        # Torque due to gravity: mg * (L/2) * sin(theta)
        tau_initial = mass * g * (length / 2) * math.sin(theta0)
        alpha_initial = tau_initial / I_expected
        # Energy conservation: mg*(L/2)*(1-cos(theta0)) = 0.5 * I * omega^2 at horizontal
        omega_at_horizontal = math.sqrt(2 * mass * g * (length/2) * (1 - math.cos(theta0)) / I_expected)
        
        print(f"\n*** Physics Verification ***")
        print(f"Expected I (end): {I_expected:.4f} kg·m², Got: {result3.parameters.get('I_verified', 'N/A')}")
        print(f"Expected initial tau: {tau_initial:.4f} N·m, Got: {result3.parameters.get('tau_net_verified', 'N/A')}")
        print(f"Expected initial alpha: {alpha_initial:.4f} rad/s², Got: {result3.parameters.get('alpha_verified', 'N/A')}")
        print(f"Expected omega at horizontal: {omega_at_horizontal:.4f} rad/s")
        print(f"Got theta0: {ts3.theta[0]:.4f} (expected {theta0:.4f})")
        print(f"Got alpha[0]: {ts3.alpha[0]:.4f} (expected ~{alpha_initial:.4f})")
        print(f"Got torque[0]: {ts3.torque[0]:.4f} (expected ~{tau_initial:.4f})")

    # Summary
    print("\n" + "=" * 60)
    print("TORQUE SCENARIO TESTS COMPLETE")
    print("=" * 60)
    print("All three torque variants tested:")
    print("  1. Single force, pivot at end")
    print("  2. Two forces, pivot at center")
    print("  3. Gravity torque, pivot at end")


if __name__ == "__main__":
    asyncio.run(test_torque_pipeline())