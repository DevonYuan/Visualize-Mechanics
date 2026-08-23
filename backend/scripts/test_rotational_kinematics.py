#!/usr/bin/env python3
"""
Test rotational_kinematics scenario with full pipeline including verification.

IMPORTANT: These are LIVE tests that call the NIM reasoning API - requires keys to be set.

Test cases (seed from the user's eval questions where applicable):
  1. Wheel from rest under constant angular acceleration + time
     -> expects omega_final = omega0 + alpha*t, theta_total = theta0 + omega0*t + 0.5*alpha*t^2
  2. Torque + mass + radius (disk) -> expects alpha = tau / I with I = 0.5*m*r^2
  3. Flywheel at 300 rpm -> expects rpm converted to rad/s (omega0 = 300*2*pi/60)
  4. Wheel braked to rest over N revolutions -> expects revolutions converted to radians
"""

import asyncio
import json
import math
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_rotational_pipeline():
    # Test Case 1: Wheel from rest, constant alpha + time
    vision_output = VisionOutput(
        problem_text="A wheel initially at rest rotates with constant angular acceleration 2.0 rad/s^2 for 5.0 s. Find the final angular velocity and the total angle turned.",
        knowns={"omega0": "0 rad/s", "alpha": "2.0 rad/s^2", "time": "5.0 s"},
        unknowns=["omega", "theta"],
        diagram_description="Wheel rotating about its center axis",
        suggested_scenario="rotational_kinematics",
    )

    print("=" * 60)
    print("Test Case 1: from rest, constant alpha = 2.0, t = 5.0 s")
    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print(f"Scenario: {result.scenario}")
    print(f"Parameters: {json.dumps(result.parameters, indent=2)}")
    print(f"Animation Spec: {json.dumps(result.animation_spec.model_dump() if hasattr(result.animation_spec, 'model_dump') else result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution.model_dump() if hasattr(result.worked_solution, 'model_dump') else result.worked_solution, indent=2) if result.worked_solution else None}")

    ts = result.time_series
    print(f"Time Series lengths: t={len(ts.t)}, theta={len(ts.theta)}, omega={len(ts.omega)}, alpha={len(ts.alpha)}")

    if ts.t:
        print(f"t range: {ts.t[0]:.4f} to {ts.t[-1]:.4f}")
        print(f"t step: {ts.t[1] - ts.t[0]:.4f}")
        print(f"theta first 5: {[round(x, 4) for x in ts.theta[:5]]}")
        print(f"omega first 5: {[round(x, 4) for x in ts.omega[:5]]}")

        # Physics verification
        omega0 = 0.0; alpha = 2.0; t_end = 5.0
        expected_omega = omega0 + alpha * t_end
        expected_theta = omega0 * t_end + 0.5 * alpha * t_end**2
        print(f"\n*** Physics Verification ***")
        print(f"Expected omega_final: {expected_omega:.3f} rad/s, Got params omega_final_verified: {result.parameters.get('omega_final_verified', 'N/A')}")
        print(f"Expected theta_total: {expected_theta:.3f} rad, Got params theta_total_verified: {result.parameters.get('theta_total_verified', 'N/A')}")
        print(f"Got omega[-1]: {ts.omega[-1]:.3f} (should be ~{expected_omega})")
        print(f"Got theta[-1]: {ts.theta[-1]:.3f} (should be ~{expected_theta})")
        print(f"Got alpha constant: {all(abs(a - alpha) < 0.05 for a in ts.alpha)}")
        print(f"Got omega0 param: {result.parameters.get('omega0', 'N/A')} (should be 0.0)")
        print(f"Got theta0 param: {result.parameters.get('theta0', 'N/A')} (should be 0.0)")
        print(f"Got object_type: {result.parameters.get('object_type', 'N/A')} (should be disk or similar)")
        print(f"Got radius: {result.parameters.get('radius', 'N/A')}")

    # Test Case 2: Torque + moment of inertia (alpha = tau / I)
    print("\n" + "=" * 60)
    print("Test Case 2: torque + mass + radius (disk)")
    vision_output2 = VisionOutput(
        problem_text="A disk of radius 0.3 m and mass 2 kg experiences a torque of 4.0 N-m about its center. Find the angular acceleration.",
        knowns={"mass": "2 kg", "radius": "0.3 m", "torque": "4.0 N-m"},
        unknowns=["alpha"],
        diagram_description="Disk with radius 0.3 m, torque arrow about center",
        suggested_scenario="rotational_kinematics",
    )
    try:
        result2 = await nim_client.reasoning_solve(vision_output2)
        print(f"Scenario: {result2.scenario}")
        print(f"Parameters: {json.dumps(result2.parameters, indent=2)}")
        expected_I = 0.5 * 2.0 * 0.3**2
        expected_alpha = 4.0 / expected_I
        print(f"\n*** Physics Verification ***")
        print(f"Expected I (0.5*m*r^2): {expected_I:.4f} kg*m^2")
        print(f"Got I_verified: {result2.parameters.get('I_verified', 'N/A')}")
        print(f"Expected alpha (tau/I): {expected_alpha:.4f} rad/s^2")
        print(f"Got alpha_verified: {result2.parameters.get('alpha_verified', 'N/A')}")
        ts2 = result2.time_series
        if ts2 and ts2.t:
            print(f"Got alpha[0]: {ts2.alpha[0]:.4f} (should be ~{expected_alpha})")
    except Exception as e:
        print(f"Test case 2 failed: {e}")

    # Test Case 3: rpm -> rad/s conversion
    print("\n" + "=" * 60)
    print("Test Case 3: flywheel at 300 rpm (unit conversion)")
    vision_output3 = VisionOutput(
        problem_text="A flywheel spins at 300 rpm. What is its angular speed in rad/s?",
        knowns={"omega": "300 rpm"},
        unknowns=["omega"],
        diagram_description="Flywheel labeled 300 rpm",
        suggested_scenario="rotational_kinematics",
    )
    try:
        result3 = await nim_client.reasoning_solve(vision_output3)
        print(f"Scenario: {result3.scenario}")
        print(f"Parameters: {json.dumps(result3.parameters, indent=2)}")
        print(f"\n*** Physics Verification ***")
        print(f"Expected omega0 (300 rpm): {300 * 2 * math.pi / 60:.4f} rad/s")
        print(f"Got params omega0: {result3.parameters.get('omega0', 'N/A')}")
    except Exception as e:
        print(f"Test case 3 failed: {e}")

    # Test Case 4: rpm + revolutions -> stop (omega^2 = omega0^2 + 2*alpha*theta)
    print("\n" + "=" * 60)
    print("Test Case 4: 300 rpm -> rest in 8 revolutions")
    vision_output4 = VisionOutput(
        problem_text="A flywheel spinning at 300 rpm is braked to rest after turning through 8 revolutions. Find the (constant) angular acceleration.",
        knowns={"omega": "300 rpm", "delta_theta": "8 revolutions"},
        unknowns=["alpha"],
        diagram_description="Flywheel with braking torque",
        suggested_scenario="rotational_kinematics",
    )
    try:
        result4 = await nim_client.reasoning_solve(vision_output4)
        print(f"Scenario: {result4.scenario}")
        print(f"Parameters: {json.dumps(result4.parameters, indent=2)}")
        w0 = 300 * 2 * math.pi / 60
        dt = 8 * 2 * math.pi
        expected_alpha = -w0**2 / (2 * dt)
        print(f"\n*** Physics Verification ***")
        print(f"Expected omega0: {w0:.4f} rad/s")
        print(f"Expected delta_theta: {dt:.4f} rad")
        print(f"Expected alpha: {expected_alpha:.4f} rad/s^2 (negative/deceleration)")
        print(f"Got params alpha: {result4.parameters.get('alpha', 'N/A')}")
        print(f"Got omega_final_verified: {result4.parameters.get('omega_final_verified', 'N/A')}")
    except Exception as e:
        print(f"Test case 4 failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_rotational_pipeline())