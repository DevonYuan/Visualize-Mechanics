# Implementation Plan: Rotational Kinematics Support

This document outlines the plan to bring rotational kinematics support to parity with the existing inclined_plane, projectile_motion, and mass_spring scenes.

## Current State Analysis

### ✅ Already Implemented
| Component | Status |
|-----------|--------|
| Schema enums (`VisionOutput`, `ReasoningOutput`) | `rotational_kinematics` included |
| `TimeSeries` schema | `theta`, `omega`, `alpha` fields |
| `NIMClient._verify_and_correct()` | Verifies `alpha = tau / I` when torque + moment of inertia given |
| `NIMClient._expand_time_series()` | Constant angular acceleration generation: `theta = theta0 + omega0*t + 0.5*alpha*t²`, `omega = omega0 + alpha*t` |
| `RotationalKinematicsScene.jsx` | 3D scene with rotating object (disk/rod/hoop/sphere), ω/α axis vectors, θ arc |
| `SceneSelector.jsx` | Routes `rotational_kinematics` to `RotationalKinematicsScene` |
| Formulas reference | Full `## ROTATIONAL MOTION` section present |
| Reasoning prompt | Basic scenario guidance present (parameters, 5 key frames, camera) |

### ❌ Missing / Incomplete
| Component | Gap |
|-----------|-----|
| Vision prompt | No rotational detection rules or few-shot examples |
| Reasoning prompt | No worked example JSON for `rotational_kinematics` |
| Reasoning prompt | No calculator tool usage examples for rotational formulas |
| Backend verification | Only verifies `alpha` from `tau/I`; no verification of final `omega` / `theta` from kinematics, no handling of rpm/revolutions inputs |
| Backend parameter normalization | No canonicalization of `omega0`/`alpha`/`theta0` aliases (e.g. `initial_omega`, `angular_velocity`) |
| Backend test script | No `test_rotational_kinematics.py` |
| Frontend scene | Contains unnecessary components/fluff (in-3D `Html` panels for legend/parameters/values, support stand, angle-arc label) — scene should be cleaned to only the scenario + a side time-series overlay |
| Frontend test component | No `TestRotational.jsx` (analogous to `TestMassSpring.jsx`/`TestAngleRender.jsx`) |

---

## Implementation Tasks

### 1. Frontend Scene Cleanup (`frontend/src/scenes/RotationalKinematicsScene.jsx`) — DONE ✅

**Goal:** Match the style of the tested scenes (`MassSpringScene.jsx`): only the scenario itself in 3D, with the time-series values in a screen-space overlay off to the side.

**Remove (fluff):**
- In-3D `Html` value displays floating near the object (ω, α, t labels)
- In-3D `Html` legend panel ("Rotational Kinematics", "I = ...", vector key)
- In-3D `Html` parameters panel (ω₀, α, duration, τ, m)
- Angle-arc `Html` label ("θ = X°") inside the canvas
- Decorative support stand + horizontal arm
- Unused `useThree` import

**Keep (scenario only):**
- Ground grid (orientation reference, same as `MassSpringScene`)
- Rotating object (disk default, rod, hoop, sphere variants with rotation markers)
- Angular velocity vector (green, right-hand rule along axis)
- Angular acceleration vector (orange)
- Static reference line + current angle arc (visualizes θ)

**Add:**
- Screen-space overlay (absolute, top-right, same styling as `MassSpringScene`) with:
  - **Parameters:** ω₀, α, t_end, object type + radius (+ m if present)
  - **Derived:** moment of inertia I, ω_max
  - **Current:** θ (°), ω (rad/s), α (rad/s²), t (s) — live from time series

### 2. Vision Prompt Enhancement (`backend/app/prompts/vision.txt`)

**Add rotational detection rules:**

```markdown
**ROTATIONAL KINEMATICS DETECTION RULES:**
- If problem mentions "rotates", "spinning", "angular", "wheel", "disk", "pulley spins", "flywheel", "rpm", "revolutions"
- If diagram shows a rotating object with angle, angular velocity, or axis labels
- Look for: angular velocity (ω or "rpm"), angle (θ or "revolutions"), angular acceleration (α), time (t), radius (r), torque (τ), moment of inertia (I)
- Convert "rpm" → rad/s (multiply by 2π/60), "revolutions" → radians (multiply by 2π)
```

**Add few-shot examples:**

```markdown
Example 7: "A wheel initially at rest rotates with constant angular acceleration 2.0 rad/s² for 5.0 s. Find the final angular velocity and the total angle turned."
→ suggested_scenario: "rotational_kinematics"
→ knowns: {"omega0": "0 rad/s", "alpha": "2.0 rad/s^2", "t": "5.0 s"}
→ unknowns: ["omega", "theta"]

Example 8: "A disk of radius 0.3 m and mass 2 kg experiences a torque of 4.0 N·m. Find the angular acceleration."
→ suggested_scenario: "rotational_kinematics"
→ knowns: {"mass": "2 kg", "radius": "0.3 m", "torque": "4.0 N-m"}
→ unknowns: ["alpha"]
```

**Add to SCENARIO CLASSIFICATION RULE:**
- If problem involves rotation/spinning/angular quantities (ω, θ, α, rpm, revolutions) → `rotational_kinematics`
- NOTE: plain circular-motion problems without angular quantities (centripetal) are NOT rotational kinematics in this app's scope.

### 3. Reasoning Prompt Enhancement (`backend/app/prompts/reasoning.txt`)

**Add worked example JSON (5 key frames):**

```json
ROTATIONAL_KINEMATICS EXAMPLE (5 key frames):
{"scenario": "rotational_kinematics", "parameters": {"theta0": 0.0, "omega0": 0.0, "alpha": 2.0, "t_end": 5.0, "radius": 0.3, "object_type": "disk"}, "animation_spec": {"duration_s": 5.0, "fps": 30}, "worked_solution": {"steps": [{"step": 1, "description": "Identify knowns: omega0 = 0 rad/s, alpha = 2.0 rad/s^2, t = 5.0 s", "equation": null}, {"step": 2, "description": "Calculate final angular velocity", "equation": "omega = omega0 + alpha * t"}, {"step": 3, "description": "Calculate total angle turned", "equation": "theta = theta0 + omega0 * t + 0.5 * alpha * t^2"}], "final_answer": {"omega": "10.0 rad/s", "theta": "25.0 rad"}}, "time_series": {"t": [0.0, 0.0333, 0.0667, 2.5, 5.0], "theta": [0.0, 0.0011, 0.0044, 6.25, 25.0], "omega": [0.0, 0.0667, 0.1333, 5.0, 10.0], "alpha": [2.0, 2.0, 2.0, 2.0, 2.0]}}
```

**Add calculator tool usage examples:**

```markdown
ROTATIONAL CALCULATOR EXAMPLES:
- calculator({"expression": "omega0 + alpha * t", "variables": {"omega0": 0.0, "alpha": 2.0, "t": 5.0}})  // final omega
- calculator({"expression": "theta0 + omega0 * t + 0.5 * alpha * t**2", "variables": {"theta0": 0.0, "omega0": 0.0, "alpha": 2.0, "t": 5.0}})  // angle turned
- calculator({"expression": "omega0**2 + 2 * alpha * d_theta", ...})  // omega² kinematics
- calculator({"expression": "sqrt(omega0**2 + 2 * alpha * d_theta)", ...})  // omega (no t given)
- calculator({"expression": "rpm * 2 * pi / 60", ...})  // rpm → rad/s
- calculator({"expression": "rev * 2 * pi", ...})  // revolutions → radians
- calculator({"expression": "tau / I", ...})  // angular acceleration from torque
- calculator({"expression": "0.5 * m * r**2", ...})  // disk I
- calculator({"expression": "m * r**2", ...})  // hoop I
- calculator({"expression": "0.4 * m * r**2", ...})  // sphere I
- calculator({"expression": "(1/12) * m * L**2", ...})  // rod I
```

**Update scenario guidance:** keep the existing `rotational_kinematics:` section (parameters `theta0, omega0, alpha, t_end` are correct); add a note that `object_type` (`disk|rod|hoop|sphere`) and `radius` should be included when derivable from the problem/diagram so the scene can render the right object.

### 4. Backend Verification & Normalization (`backend/app/services/nim_client.py`)

**Enhance `_verify_and_correct()` for rotational_kinematics:**
- After `alpha_verified` from `tau/I`, also verify:
  - `omega_final = omega0 + alpha * t` when omega0 and t are given
  - `theta_total = theta0 + omega0*t + 0.5*alpha*t²`
  - `omega_final_2 = sqrt(omega0² + 2*alpha*theta)` when t is not given
- Accept unit aliases found in vision `knowns`: `omega0`, `omega`, `initial_omega`, `rpm`, `revolutions`, `rev`, `angle`, `theta`, `t`, `radius`, `r`, `torque`, `tau`, `I`, `mass`, `m`

**Enhance `_normalize_parameters()` for rotational keys:**
- Canonicalize `omega0` (aliases: `initial_omega`, `angular_velocity`, `omega` when it's the initial value)
- Canonicalize `alpha`
- Canonicalize `theta0`
- Canonicalize `radius` (alias `r`), keep `object_type`

### 5. Backend Test Script (`backend/scripts/test_rotational_kinematics.py`)

Create new test file modeled after `test_mass_spring.py` (test cases below use placeholder values; **replace/expand with the user's eval questions**):

```python
#!/usr/bin/env python3
"""
Test rotational_kinematics scenario with full pipeline including verification.

IMPORTANT: Test cases should be seeded from the user's eval questions.
"""

import asyncio
import json
import math
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput


async def test_rotational_pipeline():
    # Test Case 1: Wheel from rest, constant angular acceleration + time
    vision_output = VisionOutput(
        problem_text="A wheel initially at rest rotates with constant angular acceleration 2.0 rad/s^2 for 5.0 s. Find the final angular velocity and the total angle turned.",
        knowns={"omega0": "0 rad/s", "alpha": "2.0 rad/s^2", "t": "5.0 s"},
        unknowns=["omega", "theta"],
        diagram_description="Wheel rotating about its axis",
        suggested_scenario="rotational_kinematics",
    )

    print("Testing rotational_kinematics (from rest, constant alpha)")
    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print(f"\nScenario: {result.scenario}")
    print(f"Parameters: {json.dumps(result.parameters, indent=2)}")
    print(f"Animation Spec: {json.dumps(result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution, indent=2) if result.worked_solution else None}")

    ts = result.time_series
    print(f"Time Series lengths: t={len(ts.t)}, theta={len(ts.theta)}, omega={len(ts.omega)}, alpha={len(ts.alpha)}")
    if ts.t:
        print(f"t range: {ts.t[0]:.4f} to {ts.t[-1]:.4f}")
        print(f"t step: {ts.t[1] - ts.t[0]:.4f}")
        print(f"theta first 5: {ts.theta[:5]}")

        # Physics verification
        omega0 = 0.0; alpha = 2.0; t_end = 5.0
        expected_omega = omega0 + alpha * t_end
        expected_theta = omega0 * t_end + 0.5 * alpha * t_end**2
        print(f"\n*** Physics Verification ***")
        print(f"Expected omega_final: {expected_omega:.3f} rad/s, Got params omega: {result.parameters.get('omega', 'N/A')}")
        print(f"Expected theta_total: {expected_theta:.3f} rad, Got params theta: {result.parameters.get('theta', 'N/A')}")
        print(f"Got omega[-1]: {ts.omega[-1]:.3f} (should be ~{expected_omega})")
        print(f"Got theta[-1]: {ts.theta[-1]:.3f} (should be ~{expected_theta})")
        print(f"Got alpha constant: {all(abs(a - alpha) < 0.05 for a in ts.alpha)}")


# Test Case 2: Torque + moment of inertia (verifies alpha = tau / I)
# Knowns: {"mass": "2 kg", "radius": "0.3 m", "torque": "4.0 N-m"} -> alpha = tau / (0.5*m*r^2)


if __name__ == "__main__":
    asyncio.run(test_rotational_pipeline())
```

### 6. Frontend Test Component (`frontend/src/components/TestRotational.jsx`)

- Model after `TestMassSpring.jsx`: synthetic time series generator using `theta = theta0 + omega0*t + 0.5*alpha*t²`, `omega = omega0 + alpha*t`, `alpha` constant.
- Supports switching object type (disk/rod/hoop/sphere) and radius for visual QA.
- Wire into `App.jsx` test-mode toggle with a "Test Rotational Kinematics" button (same pattern as the existing "Test Mass Spring System" button).

### 7. Evaluation Checklist

With the user's eval questions (images), verify:

| # | Check | Expected |
|---|-------|----------|
| 1 | Vision classifies as `rotational_kinematics` | JSON scenario correct |
| 2 | Knowns extraction (ω₀, α, t, rpm/rev conversion) | correct units + values |
| 3 | Worked solution math is correct | steps valid, final_answer right |
| 4 | Parameters have `theta0, omega0, alpha, t_end` as floats | yes |
| 5 | `_verify_and_correct` produces `*_verified` keys | matches hand calc |
| 6 | Time series expanded to 30 FPS, θ/ω continuous | duration = t_end |
| 7 | Scene renders rotating object + θ arc, ω/α vectors | visually correct |
| 8 | Overlay shows correct live θ/ω/α/t values | matches time series |
| 9 | No 3D `Html` panels / legend / fluff in scene | removed |
| 10 | No console errors in frontend | clean |