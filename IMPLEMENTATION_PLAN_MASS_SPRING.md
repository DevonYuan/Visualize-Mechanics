# Implementation Plan: Mass-Spring System Support

This document outlines the plan to bring mass-spring system support to parity with the existing inclined_plane and projectile_motion scenes.

## Current State Analysis

### ✅ Already Implemented
| Component | Status |
|-----------|--------|
| Schema enums (`VisionOutput`, `ReasoningOutput`) | `mass_spring` included |
| `TimeSeries` schema | `x_eq` field for spring displacement |
| `NIMClient._verify_and_correct()` | Mass-spring verification (omega, period) |
| `NIMClient._expand_time_series()` | Full SHM time series generation (undamped/damped) |
| `MassSpringScene.jsx` | 3D scene with spring, mass, velocity vectors |
| `SceneSelector.jsx` | Routes `mass_spring` to `MassSpringScene` |
| `TestMassSpring.jsx` | Test component with synthetic data |
| Formulas reference | Complete SHM, energy, damping, vertical spring sections |

### ❌ Missing / Incomplete
| Component | Gap |
|-----------|-----|
| Vision prompt | No few-shot examples for mass_spring |
| Reasoning prompt | No worked example for mass_spring |
| Backend test script | No `test_mass_spring.py` |
| Vision prompt | No specific angle/diagram extraction guidance for springs |
| Reasoning prompt | No explicit calculator tool usage examples for SHM |

---

## Implementation Tasks

### 1. Vision Prompt Enhancement (`backend/app/prompts/vision.txt`)

**Add mass_spring classification rules and examples:**

```markdown
**MASS-SPRING DETECTION RULES:**
- If problem mentions "mass on a spring", "spring constant k", "oscillat", "SHM", "simple harmonic"
- If diagram shows a vertical/horizontal spring with attached mass
- Look for: spring constant (k), mass (m), initial displacement (x₀ or A), initial velocity (v₀)
- For vertical springs: equilibrium extension x_eq = mg/k may be shown

**FEW-SHOT EXAMPLES:**

Example 4: "A 0.5 kg mass attached to a spring (k = 200 N/m) is displaced 0.1 m from equilibrium and released from rest. Find the period and maximum speed."
→ suggested_scenario: "mass_spring"
→ knowns: {"mass": "0.5 kg", "k": "200 N/m", "x0": "0.1 m", "v0": "0 m/s"}
→ unknowns: ["period", "max_speed", "omega"]

Example 5: Diagram shows a vertical spring with mass m = 2 kg, spring constant k = 50 N/m. The mass is pulled down 0.15 m from equilibrium and released.
→ suggested_scenario: "mass_spring"
→ knowns: {"mass": "2 kg", "k": "50 N/m", "x0": "0.15 m", "v0": "0 m/s"}
→ unknowns: ["period", "frequency", "max_acceleration"]
```

**Add to SCENARIO CLASSIFICATION RULE:**
- If spring constant (k) and mass are given with initial conditions → `mass_spring`

---

### 2. Reasoning Prompt Enhancement (`backend/app/prompts/reasoning.txt`)

**Add worked example in EXAMPLE OUTPUT section:**

```json
MASS_SPRING EXAMPLE (5 key frames):
{"scenario": "mass_spring", "parameters": {"mass": 0.5, "k": 200.0, "x0": 0.1, "v0": 0.0, "omega": 20.0, "period": 0.314, "amplitude": 0.1, "g": 9.8, "damping": 0.0}, "animation_spec": {"duration_s": 0.94, "fps": 30}, "worked_solution": {"steps": [{"step": 1, "description": "Identify knowns: m = 0.5 kg, k = 200 N/m, x0 = 0.1 m, v0 = 0 m/s", "equation": null}, {"step": 2, "description": "Calculate angular frequency", "equation": "omega = sqrt(k / m)"}, {"step": 3, "description": "Calculate period", "equation": "T = 2 * pi / omega"}, {"step": 4, "description": "Calculate amplitude from initial conditions", "equation": "A = sqrt(x0^2 + (v0/omega)^2)"}, {"step": 5, "description": "Calculate maximum speed", "equation": "v_max = A * omega"}], "final_answer": {"period": "0.31 s", "max_speed": "2.0 m/s", "omega": "20.0 rad/s", "amplitude": "0.10 m"}}, "time_series": {"t": [0.0, 0.0393, 0.0785, 0.157, 0.314], "x_eq": [0.1, 0.0707, 0.0, -0.1, 0.1], "v": [0.0, -1.41, -2.0, 0.0, 0.0], "a": [0.0, -28.3, -40.0, 0.0, 0.0], "force": [-20.0, -14.1, 0.0, 20.0, -20.0], "ke": [0.0, 0.5, 1.0, 0.0, 0.0], "pe": [1.0, 0.5, 0.0, 1.0, 1.0], "e_total": [1.0, 1.0, 1.0, 1.0, 1.0]}}
```

**Add calculator tool usage examples for SHM:**

```markdown
MASS-SPRING CALCULATOR EXAMPLES:
- calculator({"expression": "sqrt(k / m)", "variables": {}})  // omega (k, m auto-provided)
- calculator({"expression": "2 * pi / omega", "variables": {}})  // period
- calculator({"expression": "sqrt(x0**2 + (v0/omega)**2)", "variables": {}})  // amplitude
- calculator({"expression": "A * omega", "variables": {"A": 0.1, "omega": 20.0}})  // v_max
- calculator({"expression": "A * omega**2", "variables": {"A": 0.1, "omega": 20.0}})  // a_max
- calculator({"expression": "0.5 * k * A**2", "variables": {"k": 200.0, "A": 0.1}})  // total energy
- calculator({"expression": "0.5 * m * (A*omega)**2", "variables": {"m": 0.5, "A": 0.1, "omega": 20.0}})  // max KE

DAMPED EXAMPLES (if damping given):
- calculator({"expression": "sqrt(k/m - b**2/(4*m**2))", "variables": {}})  // omega_damped
- calculator({"expression": "A * exp(-b*t/(2*m)) * cos(omega_d*t + phi)", "variables": {"A": 0.1, "b": 0.5, "m": 0.5, "omega_d": 19.9, "t": 0.1, "phi": 0}})  // damped position
```

**Add VERTICAL SPRING guidance:**

```markdown
VERTICAL SPRING HANDLING:
- If problem says "vertical spring" or diagram shows vertical orientation:
  - Equilibrium extension: x_eq_static = m * g / k
  - SHM still uses omega = sqrt(k / m) (same as horizontal)
  - Measure displacement x from NEW equilibrium (not natural length)
  - Total extension = x_eq_static + x(t)
  - Parameters should include g = 9.8
```

---

### 3. Backend Test Script (`backend/scripts/test_mass_spring.py`)

Create new test file modeled after `test_inclined_plane_full.py`:

```python
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
    print(f"Animation Spec: {json.dumps(result.animation_spec, indent=2) if result.animation_spec else None}")
    print(f"Worked Solution: {json.dumps(result.worked_solution, indent=2) if result.worked_solution else None}")
    
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


if __name__ == "__main__":
    asyncio.run(test_mass_spring_pipeline())
```

---

### 4. MassSpringScene.jsx Review & Enhancements

**Current state review:**
- ✅ Renders spring, mass, equilibrium line
- ✅ Displays velocity vector
- ✅ Shows mass value label
- ✅ Auto-scales bounds from time series

**Potential improvements:**

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Force vector display | Medium | Show spring force vector (like InclinedPlaneScene shows normal/friction) |
| Energy display overlay | Low | Show KE/PE/Total bars or graphs |
| Damping visualization | Low | Visual indication if damping > 0 |
| Vertical spring support | High | Ensure vertical orientation works (currently assumes vertical) |
| Phase indicator | Medium | Show phase (cos/sin) in UI |

**Key parameters expected from backend:**
```javascript
// Required in parameters
mass, k, x0, v0, omega, period, amplitude, g, damping

// Time series fields used
timeSeries.x_eq  // displacement from equilibrium (primary)
timeSeries.v     // velocity
timeSeries.a     // acceleration
timeSeries.force // spring force (-k * x)
timeSeries.ke    // kinetic energy
timeSeries.pe    // potential energy
timeSeries.e_total // total energy
```

**Verify bounds calculation handles edge cases:**
```javascript
// In bounds calculation - ensure springLength > maxDisp for visual clarity
const maxDisp = timeSeries?.x_eq ? Math.max(...timeSeries.x_eq.map(Math.abs)) : (parameters?.amplitude || parameters?.x0 || 0.1);
const amplitude = Math.max(maxDisp, 0.5);  // Good default
```

---

### 5. Integration Testing Checklist

After implementing the above, verify:

- [ ] Vision model correctly classifies mass_spring problems from images
- [ ] Reasoning model produces valid JSON with all required fields
- [ ] Time series has 30 FPS data (not just 5 key frames)
- [ ] Physics verification passes (omega, period, amplitude, energy conservation)
- [ ] Frontend MassSpringScene renders correctly with real API data
- [ ] Animation plays smoothly with play/pause/scrub controls
- [ ] Worked solution displays correctly in ResultScreen
- [ ] Both horizontal and vertical spring problems work
- [ ] Damped problems produce decaying amplitude time series

---

### 6. Optional Enhancements (Future)

| Feature | Effort | Value |
|---------|--------|-------|
| Energy graphs overlay in 3D scene | Medium | High |
| Phase space plot (v vs x) | Medium | Medium |
| Multiple spring configurations (series/parallel) | High | Low |
| Driven oscillation support | High | Low |
| Spring force vector animation | Low | High |

---

## Summary

The mass-spring infrastructure is **90% complete**. The main gaps are:
1. **Prompt engineering** - Vision and Reasoning prompts lack examples
2. **Test coverage** - No backend test script
3. **Minor frontend polish** - Force vectors, energy display

**Estimated effort:** 2-3 hours for core implementation, 1-2 hours for testing/polishing.

**Priority order:**
1. Add vision prompt examples (15 min)
2. Add reasoning prompt worked example + calculator usage (30 min)
3. Create test_mass_spring.py (30 min)
4. Run tests and fix any issues (60 min)
5. Frontend polish (30 min)