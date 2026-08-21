import os
from typing import Optional
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import numpy as np

from app.core.config import settings
from app.utils.json_extract import extract_json
from app.utils.calculator import Calculator, CALCULATOR_TOOL_DEFINITION
from app.schemas import VisionOutput, ReasoningOutput, AnimationSpec, TimeSeries
from app.prompts import VISION_PROMPT, REASONING_PROMPT, FORMULAS_REFERENCE


class NIMClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.NIM_API_KEY,
            base_url=settings.NIM_BASE_URL,
        )
        self.vision_model = settings.NIM_VISION_MODEL
        self.reasoning_model = settings.NIM_REASONING_MODEL

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def vision_extract(self, image_b64: str, content_type: str = "image/jpeg") -> VisionOutput:
        """Call NIM vision model to extract problem from image."""
        media_type = "image/jpeg" if content_type == "image/jpeg" else "image/png"

        response = await self.client.chat.completions.create(
            model=self.vision_model,
            messages=[
                {
                    "role": "system",
                    "content": VISION_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the physics problem from this image. Your entire response must be valid JSON and nothing else. No explanations, no conversational text, no 'Answer:' prefix, no markdown code fences. Start immediately with { and end with }. If you see an angle in the diagram, include it in the knowns."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens=2048,
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise ValueError("Empty response from vision model")

        data = extract_json(raw_content)
        return VisionOutput.model_validate(data)

    def _extract_known_values(self, vision_output: VisionOutput) -> dict:
        """Extract numeric values from knowns dict for calculator variables."""
        knowns = {}
        if vision_output.knowns:
            for key, value in vision_output.knowns.items():
                # Parse "20 m/s" -> 20.0
                import re
                match = re.match(r'^([\d.]+)', str(value).strip())
                if match:
                    try:
                        knowns[key] = float(match.group(1))
                    except ValueError:
                        pass
        return knowns

    def _verify_and_correct(self, reasoning_output: ReasoningOutput, vision_output: VisionOutput, known_values: dict) -> ReasoningOutput:
        """Verify critical calculated values using calculator and correct if wrong."""
        scenario = reasoning_output.scenario
        params = reasoning_output.parameters.copy()

        try:
            if scenario == "inclined_plane":
                # Verify acceleration: a = g * sin(theta) or a = g * (sin(theta) - mu_k * cos(theta))
                theta = known_values.get("angle") or known_values.get("theta") or params.get("angle_deg")
                mu_k = known_values.get("mu_k") or params.get("mu_k", 0)
                mass = known_values.get("mass") or params.get("mass")
                g = params.get("g", 9.8)

                if theta:
                    # Convert to radians if needed (known_values are already numeric)
                    import math
                    theta_rad = theta * math.pi / 180 if theta > 10 else theta  # assume deg if > 10

                    if mu_k:
                        a_correct = Calculator.evaluate("g * (sin(theta) - mu_k * cos(theta))",
                                                      {"theta": theta_rad, "mu_k": mu_k})
                    else:
                        a_correct = Calculator.evaluate("g * sin(theta)", {"theta": theta_rad})

                    # Check if parameters contain acceleration or if we can derive it
                    if "a" in params:
                        if abs(params["a"] - a_correct) > 0.5:  # Significant difference
                            params["a"] = a_correct
                    # Add corrected acceleration
                    params["a_verified"] = a_correct

                    # Verify normal force: N = m * g * cos(theta)
                    if mass:
                        f_normal_correct = Calculator.evaluate("mass * g * cos(theta)",
                                                             {"mass": mass, "g": g, "theta": theta_rad})
                        params["f_normal_verified"] = f_normal_correct
                        
                        # Verify friction force: f = mu_k * N
                        if mu_k:
                            f_friction_correct = Calculator.evaluate("mu_k * f_normal",
                                                                   {"mu_k": mu_k, "f_normal": f_normal_correct})
                            params["f_friction_verified"] = f_friction_correct

                    # Verify distance if time is given: x = 0.5 * a * t^2 (from rest)
                    t = known_values.get("time") or known_values.get("t") or params.get("t_end")
                    v0 = known_values.get("initial_v") or known_values.get("v0") or params.get("initial_v", params.get("v0", 0))
                    if t and v0 == 0:
                        x_correct = Calculator.evaluate("0.5 * a * t**2", {"a": a_correct, "t": t})
                        params["distance_verified"] = x_correct

            elif scenario == "projectile_motion":
                # Verify time of flight, range, max height
                v0 = known_values.get("v0") or params.get("v0")
                angle = known_values.get("angle") or known_values.get("theta") or params.get("angle_deg")

                if v0 and angle:
                    import math
                    angle_rad = angle * math.pi / 180 if angle > 10 else angle
                    g = params.get("g", 9.8)

                    # Time of flight
                    t_flight = Calculator.evaluate("2 * v0 * sin(angle) / g",
                                                 {"v0": v0, "angle": angle_rad, "g": g})
                    # Range
                    range_val = Calculator.evaluate("v0 * cos(angle) * t_flight",
                                                  {"v0": v0, "angle": angle_rad, "t_flight": t_flight})
                    # Max height
                    h_max = Calculator.evaluate("v0 * sin(angle) * t_flight / 2 - 0.5 * g * (t_flight/2)**2",
                                              {"v0": v0, "angle": angle_rad, "t_flight": t_flight, "g": g})

                    params["t_flight_verified"] = t_flight
                    params["range_verified"] = range_val
                    params["max_height_verified"] = h_max

            elif scenario == "atwood_machine":
                m1 = known_values.get("m1") or params.get("m1")
                m2 = known_values.get("m2") or params.get("m2")

                if m1 and m2:
                    a_correct = Calculator.evaluate("(m1 - m2) * g / (m1 + m2)",
                                                  {"m1": m1, "m2": m2})
                    params["a_verified"] = a_correct
                    
                    # Verify tension
                    tension_correct = Calculator.evaluate("2 * m1 * m2 * g / (m1 + m2)",
                                                        {"m1": m1, "m2": m2})
                    params["tension_verified"] = tension_correct

            elif scenario == "kinematics_1d":
                # Handle case where distance and time are given (find acceleration)
                d = known_values.get("d") or known_values.get("distance") or params.get("d") or params.get("distance")
                t = known_values.get("t") or known_values.get("time") or params.get("t") or params.get("time")
                v0 = known_values.get("v0") or known_values.get("initial_v") or params.get("v0") or params.get("initial_v", 0)
                
                # Preserve angle parameter if present (for 3D rendering)
                angle = known_values.get("angle") or known_values.get("theta") or params.get("angle_deg")
                if angle:
                    params["angle_deg"] = angle

                if d and t:
                    # a = 2*d / t^2 (from rest)
                    a_correct = Calculator.evaluate("2 * d / t**2", {"d": d, "t": t})
                    params["a"] = a_correct
                    params["a_verified"] = a_correct

                # Also verify if v0 and a are given
                v0 = known_values.get("v0") or params.get("v0")
                a = known_values.get("a") or params.get("a")

                if v0 and a:
                    # Time to stop
                    t_stop = Calculator.evaluate("v0 / a", {"v0": v0, "a": abs(a)})
                    # Distance
                    dist = Calculator.evaluate("v0 * t - 0.5 * a * t**2",
                                             {"v0": v0, "a": a, "t": t_stop})
                    params["t_stop_verified"] = t_stop
                    params["distance_verified"] = dist

            elif scenario == "rotational_kinematics":
                # Verify angular acceleration if torque and moment of inertia given
                tau = known_values.get("torque") or params.get("torque")
                I = known_values.get("I") or params.get("I")
                if tau and I:
                    alpha_correct = Calculator.evaluate("tau / I", {"tau": tau, "I": I})
                    params["alpha_verified"] = alpha_correct

            elif scenario == "mass_spring":
                # Verify angular frequency and period
                mass = known_values.get("mass") or params.get("mass")
                k = known_values.get("k") or params.get("k")
                if mass and k:
                    omega_correct = Calculator.evaluate("sqrt(k / mass)", {"k": k, "mass": mass})
                    params["omega_verified"] = omega_correct
                    period_correct = Calculator.evaluate("2 * pi / omega", {"omega": omega_correct})
                    params["period_verified"] = period_correct

            elif scenario == "collision_1d":
                # Verify final velocities using conservation of momentum and restitution
                m1 = known_values.get("m1") or params.get("m1")
                m2 = known_values.get("m2") or params.get("m2")
                v1_i = known_values.get("v1_initial") or params.get("v1_initial")
                v2_i = known_values.get("v2_initial") or params.get("v2_initial")
                e = known_values.get("restitution") or params.get("restitution", 1.0)

                if m1 and m2 and v1_i is not None and v2_i is not None:
                    # Elastic collision formulas
                    v1_f = Calculator.evaluate("(m1 - m2) * v1_i / (m1 + m2) + 2 * m2 * v2_i / (m1 + m2)",
                                             {"m1": m1, "m2": m2, "v1_i": v1_i, "v2_i": v2_i})
                    v2_f = Calculator.evaluate("2 * m1 * v1_i / (m1 + m2) + (m2 - m1) * v2_i / (m1 + m2)",
                                             {"m1": m1, "m2": m2, "v1_i": v1_i, "v2_i": v2_i})
                    params["v1_final_verified"] = v1_f
                    params["v2_final_verified"] = v2_f
                    
                    # For inelastic collisions, adjust by restitution
                    if e != 1.0:
                        v1_f = Calculator.evaluate("((m1 - e * m2) * v1_i + (1 + e) * m2 * v2_i) / (m1 + m2)",
                                                   {"m1": m1, "m2": m2, "v1_i": v1_i, "v2_i": v2_i, "e": e})
                        v2_f = Calculator.evaluate("((1 + e) * m1 * v1_i + (m2 - e * m1) * v2_i) / (m1 + m2)",
                                                   {"m1": m1, "m2": m2, "v1_i": v1_i, "v2_i": v2_i, "e": e})
                        params["v1_final_verified"] = v1_f
                        params["v2_final_verified"] = v2_f

        except Exception:
            # If verification fails, return original
            pass

        # Update parameters with verified values
        reasoning_output.parameters = params
        return reasoning_output

    def _expand_time_series(self, reasoning_output: ReasoningOutput) -> ReasoningOutput:
        """Regenerate a full 30 FPS time series from physics for ANY key-frame count.

        The reasoning model is asked for 5 key frames, but models are unreliable about
        the exact count. Instead of trusting those frames, we regenerate the series
        analytically from the physics parameters when they are present (robust to any
        key-frame count), and fall back to resampling the model's frames otherwise.
        """
        ts = reasoning_output.time_series
        if ts is None or not ts.t:
            return reasoning_output

        fps = reasoning_output.animation_spec.fps if reasoning_output.animation_spec else 30
        duration = (
            reasoning_output.animation_spec.duration_s
            if reasoning_output.animation_spec and reasoning_output.animation_spec.duration_s > 0
            else float(ts.t[-1])
        )

        # Key frames (or fewer) -> regenerate analytically from normalized params.
        if len(ts.t) <= 5:
            n_points = int(fps * duration) + 1

            # Generate full time array
            t_full = np.linspace(0, duration, n_points).tolist()

            scenario = reasoning_output.scenario
            params = self._normalize_parameters(reasoning_output.parameters)

            if scenario == "kinematics_1d":
                # Constant acceleration: x = x0 + v0*t + 0.5*a*t^2, v = v0 + a*t
                a = params.get("a", 0.0)
                v0 = params.get("v0", 0.0)
                x0 = params.get("x0", 0.0)
                x_full = [x0 + v0 * t + 0.5 * a * t * t for t in t_full]
                v_full = [v0 + a * t for t in t_full]
                a_full = [a] * n_points
                ts.t = t_full
                ts.x = x_full
                ts.v = v_full
                ts.a = a_full

            elif scenario == "inclined_plane":
                # Constant acceleration along incline: x = x0 + v0*t + 0.5*a*t^2
                # Use verified values if available, fall back to params
                a = params.get("a_verified", params.get("a", 0.0))
                v0 = params.get("initial_v", params.get("v0", 0.0))
                x0 = params.get("initial_x", params.get("x0", 0.0))
                x_full = [x0 + v0 * t + 0.5 * a * t * t for t in t_full]
                v_full = [v0 + a * t for t in t_full]
                a_full = [a] * n_points
                
                # Normal force and friction - use verified if available
                f_normal = params.get("f_normal_verified")
                f_friction = params.get("f_friction_verified")
                
                if f_normal is None or f_friction is None:
                    # Compute from params if not verified
                    mass = params.get("mass", 1.0)
                    angle_deg = params.get("angle_deg", 30.0)
                    mu_k = params.get("mu_k", 0.0)
                    g = params.get("g", 9.8)
                    import math
                    angle_rad = angle_deg * math.pi / 180
                    f_normal = f_normal if f_normal is not None else mass * g * math.cos(angle_rad)
                    f_friction = f_friction if f_friction is not None else mu_k * f_normal
                
                ts.t = t_full
                ts.x = x_full
                ts.v = v_full
                ts.a = a_full
                ts.f_normal = [f_normal] * n_points
                ts.f_friction = [f_friction] * n_points

            elif scenario == "projectile_motion":
                # Projectile: x = v0x * t, y = y0 + v0y * t - 0.5*g*t^2
                v0 = params.get("v0", 0.0)
                angle_deg = params.get("angle_deg", 45.0)
                g = params.get("g", 9.8)
                initial_height = params.get("initial_height", 0.0)
                import math
                angle_rad = angle_deg * math.pi / 180
                v0x = v0 * math.cos(angle_rad)
                v0y = v0 * math.sin(angle_rad)

                # Clamp the animation duration to the true time of flight so the ball
                # lands at y = 0 instead of falling below the ground (negative y).
                t_flight = (v0y + math.sqrt(max(v0y ** 2 + 2 * g * initial_height, 0.0))) / g if g > 0 else 0.0
                if t_flight > 0 and (duration <= 0 or duration > t_flight):
                    duration = t_flight
                    n_points = int(fps * duration) + 1
                    t_full = np.linspace(0, duration, n_points).tolist()

                x_full = [v0x * t for t in t_full]
                y_full = [initial_height + v0y * t - 0.5 * g * t * t for t in t_full]
                vx_full = [v0x] * n_points
                vy_full = [v0y - g * t for t in t_full]
                v_full = [math.sqrt(v0x**2 + (v0y - g * t)**2) for t in t_full]
                ax_full = [0.0] * n_points
                ay_full = [-g] * n_points
                a_full = [g] * n_points
                
                ts.t = t_full
                ts.x = x_full
                ts.y = y_full
                ts.vx = vx_full
                ts.vy = vy_full
                ts.v = v_full
                ts.ax = ax_full
                ts.ay = ay_full
                ts.a = a_full

            elif scenario == "atwood_machine":
                # Constant acceleration: y1 = y1_0 + v0*t + 0.5*a*t^2 (downward positive for m1)
                a = params.get("a", 0.0)
                v0 = params.get("initial_v", params.get("v0", 0.0))
                # Initial positions: m1 starts at some height, m2 at another
                # For simplicity, assume y1=0 at top, y2=string_length at top
                # Actually, we need to track both masses
                # y1 increases (down), y2 decreases (up)
                y1_0 = params.get("initial_y1", 0.0)
                y2_0 = params.get("initial_y2", 2.0)  # string length
                
                y1_full = [y1_0 + v0 * t + 0.5 * a * t * t for t in t_full]
                y2_full = [y2_0 - v0 * t - 0.5 * a * t * t for t in t_full]  # opposite direction
                v_full = [v0 + a * t for t in t_full]
                a_full = [a] * n_points
                
                # Tension is constant
                m1 = params.get("m1", 1.0)
                m2 = params.get("m2", 1.0)
                g = params.get("g", 9.8)
                tension = 2 * m1 * m2 * g / (m1 + m2) if (m1 + m2) > 0 else 0
                
                ts.t = t_full
                ts.y1 = y1_full
                ts.y2 = y2_full
                ts.v = v_full
                ts.a = a_full
                ts.tension = [tension] * n_points

            elif scenario == "rotational_kinematics":
                # Constant angular acceleration: theta = theta0 + omega0*t + 0.5*alpha*t^2
                alpha = params.get("alpha", 0.0)
                omega0 = params.get("omega0", params.get("initial_omega", 0.0))
                theta0 = params.get("theta0", params.get("initial_theta", 0.0))
                theta_full = [theta0 + omega0 * t + 0.5 * alpha * t * t for t in t_full]
                omega_full = [omega0 + alpha * t for t in t_full]
                alpha_full = [alpha] * n_points
                
                ts.t = t_full
                ts.theta = theta_full
                ts.omega = omega_full
                ts.alpha = alpha_full

            elif scenario == "mass_spring":
                # Simple harmonic motion: x = A*cos(omega*t + phi), v = -A*omega*sin(omega*t + phi)
                # We need amplitude and phase from initial conditions
                mass = params.get("mass", 1.0)
                k = params.get("k", 1.0)
                x0 = params.get("x0", params.get("initial_x", 0.1))
                v0 = params.get("v0", params.get("initial_v", 0.0))
                damping = params.get("damping", 0.0)
                g = params.get("g", 9.8)
                
                import math
                omega = math.sqrt(k / mass)
                
                if damping == 0:
                    # Undamped: x = A*cos(omega*t + phi)
                    # At t=0: x0 = A*cos(phi), v0 = -A*omega*sin(phi)
                    A = math.sqrt(x0**2 + (v0/omega)**2) if omega > 0 else abs(x0)
                    phi = math.atan2(-v0/omega, x0) if omega > 0 and A > 0 else 0
                    
                    x_eq_full = [A * math.cos(omega * t + phi) for t in t_full]
                    v_full = [-A * omega * math.sin(omega * t + phi) for t in t_full]
                    a_full = [-A * omega**2 * math.cos(omega * t + phi) for t in t_full]
                    force_full = [-k * x_eq for x_eq in x_eq_full]
                    ke_full = [0.5 * mass * v**2 for v in v_full]
                    pe_full = [0.5 * k * x_eq**2 for x_eq in x_eq_full]
                    e_total_full = [ke_full[i] + pe_full[i] for i in range(n_points)]
                else:
                    # Damped - simplified: resample key frames with numpy (no scipy dependency)
                    if len(ts.x_eq) >= 2:
                        t_old = np.asarray(ts.t, dtype=float)
                        x_eq_full = np.interp(t_full, t_old, ts.x_eq).tolist()
                        if ts.v and len(ts.v) == len(t_old):
                            v_full = np.interp(t_full, t_old, ts.v).tolist()
                        else:
                            v_full = [v0] * n_points
                        if ts.a and len(ts.a) == len(t_old):
                            a_full = np.interp(t_full, t_old, ts.a).tolist()
                        else:
                            a_full = [0.0] * n_points
                        force_full = [-k * x for x in x_eq_full]
                        ke_full = [0.5 * mass * v**2 for v in v_full]
                        pe_full = [0.5 * k * x**2 for x in x_eq_full]
                        e_total_full = [ke_full[i] + pe_full[i] for i in range(n_points)]
                    else:
                        x_eq_full = [x0] * n_points
                        v_full = [v0] * n_points
                        a_full = [0.0] * n_points
                        force_full = [-k * x0] * n_points
                        ke_full = [0.5 * mass * v0**2] * n_points
                        pe_full = [0.5 * k * x0**2] * n_points
                        e_total_full = [ke_full[0] + pe_full[0]] * n_points
                
                ts.t = t_full
                ts.x_eq = x_eq_full
                ts.v = v_full
                ts.a = a_full
                ts.force = force_full
                ts.ke = ke_full
                ts.pe = pe_full
                ts.e_total = e_total_full

            elif scenario == "collision_1d":
                # Two phases: before collision (constant velocity), collision (impulse), after collision (constant velocity)
                m1 = params.get("m1", 1.0)
                m2 = params.get("m2", 1.0)
                v1_i = params.get("v1_initial", params.get("v1_i", 0.0))
                v2_i = params.get("v2_initial", params.get("v2_i", 0.0))
                e = params.get("restitution", 1.0)
                x1_0 = params.get("initial_x1", params.get("x1_0", -5.0))
                x2_0 = params.get("initial_x2", params.get("x2_0", 5.0))
                
                # Calculate final velocities
                v1_f = ((m1 - e * m2) * v1_i + (1 + e) * m2 * v2_i) / (m1 + m2)
                v2_f = ((1 + e) * m1 * v1_i + (m2 - e * m1) * v2_i) / (m1 + m2)
                
                # Find collision time: when x1 = x2
                # x1 = x1_0 + v1_i * t, x2 = x2_0 + v2_i * t
                # Collision when x1_0 + v1_i * t = x2_0 + v2_i * t
                # t_collision = (x2_0 - x1_0) / (v1_i - v2_i)
                if abs(v1_i - v2_i) > 1e-6:
                    t_collision = (x2_0 - x1_0) / (v1_i - v2_i)
                else:
                    t_collision = duration / 2  # fallback
                
                # Clamp collision time to valid range
                t_collision = max(0, min(t_collision, duration))
                
                x1_full = []
                x2_full = []
                v1_full = []
                v2_full = []
                a1_full = []
                a2_full = []
                force_full = []
                
                for t in t_full:
                    if t < t_collision:
                        # Before collision: constant velocity
                        x1 = x1_0 + v1_i * t
                        x2 = x2_0 + v2_i * t
                        v1 = v1_i
                        v2 = v2_i
                        a1 = 0.0
                        a2 = 0.0
                        force = 0.0
                    elif t == t_collision:
                        # At collision: use average position, velocities transitioning
                        x1 = x1_0 + v1_i * t
                        x2 = x2_0 + v2_i * t
                        v1 = v1_f
                        v2 = v2_f
                        # Impulse approximation
                        a1 = (v1_f - v1_i) * 1000  # large acceleration during collision
                        a2 = (v2_f - v2_i) * 1000
                        force = m1 * abs(a1)  # approximate force
                    else:
                        # After collision: constant velocity with new values
                        dt = t - t_collision
                        x1 = (x1_0 + v1_i * t_collision) + v1_f * dt
                        x2 = (x2_0 + v2_i * t_collision) + v2_f * dt
                        v1 = v1_f
                        v2 = v2_f
                        a1 = 0.0
                        a2 = 0.0
                        force = 0.0
                    
                    x1_full.append(x1)
                    x2_full.append(x2)
                    v1_full.append(v1)
                    v2_full.append(v2)
                    a1_full.append(a1)
                    a2_full.append(a2)
                    force_full.append(force)
                
                ts.t = t_full
                ts.x1 = x1_full
                ts.x2 = x2_full
                ts.v1 = v1_full
                ts.v2 = v2_full
                ts.a1 = a1_full
                ts.a2 = a2_full
                ts.force = force_full

        else:
            # Model returned a longer/non-standard series (not 5 key frames):
            # resample whatever frames exist onto a uniform timeline at the target
            # FPS so playback is always smooth and the scrubber stays consistent.
            self._interpolate_series(ts, fps, duration)

        return reasoning_output

    def _normalize_parameters(self, params: dict) -> dict:
        """Canonicalize parameter keys so downstream code can rely on v0/angle_deg/a.

        Reasoning models are inconsistent about naming (``angle`` vs ``angle_deg`` vs
        ``theta`` vs ``diagram_angle``). Silently defaulting to 45 degrees produced
        wrong trajectories, so we normalize aliases here.
        """
        import math

        params = dict(params)

        # Angle: accept any alias, always expose as angle_deg (degrees).
        angle = None
        for key in ("angle_deg", "angle", "theta", "theta_deg", "diagram_angle", "launch_angle", "inclination"):
            val = params.get(key)
            if val is not None:
                try:
                    angle = float(val)
                except (TypeError, ValueError):
                    continue
                break
        if angle is not None:
            # Heuristic: values <= ~2*pi are assumed radians unless they look like
            # common degree markings; the reasoning model is instructed to use degrees.
            if 0 < angle <= 2 * math.pi and angle not in (
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 90, 120, 180
            ):
                angle = math.degrees(angle)
            params["angle_deg"] = float(angle)

        # Initial speed: accept any alias, always expose as v0.
        v0 = None
        for key in ("v0", "initial_v", "initial_speed", "speed"):
            val = params.get(key)
            if val is not None:
                try:
                    v0 = float(val)
                except (TypeError, ValueError):
                    continue
                break
        if v0 is not None:
            params["v0"] = float(v0)

        # Acceleration: accept aliases, expose as a.
        accel = None
        for key in ("a", "acceleration"):
            val = params.get(key)
            if val is not None:
                try:
                    accel = float(val)
                except (TypeError, ValueError):
                    continue
                break
        if accel is not None:
            params["a"] = float(accel)

        return params

    def _interpolate_series(self, ts: TimeSeries, fps: int, duration: float) -> None:
        """Resample existing key frames onto a uniform timeline at the target FPS."""
        if duration <= 0 or not ts.t or len(ts.t) < 2:
            return

        n_points = int(fps * duration) + 1
        t_target = np.linspace(0.0, duration, n_points)
        t_old = np.asarray(ts.t, dtype=float)

        ts.t = t_target.tolist()
        fields = (
            "x", "y", "z", "vx", "vy", "vz", "v", "ax", "ay", "az", "a",
            "x1", "x2", "v1", "v2", "a1", "a2",
            "theta", "omega", "alpha",
            "ke", "pe", "e_total", "x_eq",
            "f_normal", "f_friction", "tension", "force",
        )
        for field in fields:
            values = getattr(ts, field)
            if values is not None and len(values) == len(t_old):
                setattr(ts, field, np.interp(t_target, t_old, np.asarray(values, dtype=float)).tolist())

    def build_conceptual_animation(self, vision_output: VisionOutput):
        """Build animation data for conceptual MC questions that still describe concrete physics.

        A question like "a ball is projected at 2 m/s at 35 deg - which expression gives
        the vertical component?" is classified as ``conceptual_mc`` (no animation by
        default), but users still want to SEE the projectile. When the vision output
        contains a speed and an angle for a projectile-like problem, we derive a full
        projectile time series so the frontend can animate it alongside the MC answer.

        Returns (animation_spec, time_series) or (None, None) when not derivable.
        """
        import math

        knowns = self._extract_known_values(vision_output)
        text = (vision_output.problem_text or "").lower()

        v0 = (
            knowns.get("v0")
            or knowns.get("initial_speed")
            or knowns.get("initial_velocity")
            or knowns.get("speed")
        )
        angle = (
            knowns.get("angle")
            or knowns.get("theta")
            or knowns.get("diagram_angle")
            or knowns.get("launch_angle")
        )
        if v0 is None or angle is None:
            return None, None

        # Only animate when this really looks like a projectile problem.
        if not any(word in text for word in ("project", "launch", "throw", "ball", "trajectory", "horizontal")):
            return None, None

        angle = float(angle)
        angle_deg = angle if angle > 10 else math.degrees(angle)
        v0 = float(v0)
        g = 9.8
        angle_rad = math.radians(angle_deg)
        v0x = v0 * math.cos(angle_rad)
        v0y = v0 * math.sin(angle_rad)

        # Ground launch: t_flight = 2 * v0y / g. Floor it so tiny flights still render.
        t_flight = max(2 * v0y / g, 0.1) if g > 0 else 0.1
        fps = 30
        n_points = int(fps * t_flight) + 1
        t = np.linspace(0.0, t_flight, n_points)

        x = v0x * t
        y = v0y * t - 0.5 * g * t * t
        vx = np.full_like(t, v0x)
        vy = v0y - g * t
        v = np.sqrt(vx ** 2 + vy ** 2)
        ax = np.zeros_like(t)
        ay = np.full_like(t, -g)
        a = np.full_like(t, g)

        time_series = TimeSeries(
            t=t.tolist(),
            x=x.tolist(),
            y=y.tolist(),
            vx=vx.tolist(),
            vy=vy.tolist(),
            v=v.tolist(),
            ax=ax.tolist(),
            ay=ay.tolist(),
            a=a.tolist(),
        )
        animation_spec = AnimationSpec(duration_s=float(t_flight), fps=fps)
        return animation_spec, time_series

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def reasoning_solve(self, vision_output: VisionOutput) -> ReasoningOutput:
        """Call NIM reasoning model to solve the physics problem with calculator tool."""
        # Build context from vision output
        problem_context = f"""
Problem Text: {vision_output.problem_text}
Knowns: {vision_output.knowns}
Unknowns: {vision_output.unknowns}
Diagram: {vision_output.diagram_description}
Suggested Scenario: {vision_output.suggested_scenario}
"""

        # Extract known numeric values for calculator variables
        known_values = self._extract_known_values(vision_output)

        # Build system prompt with formulas reference
        system_prompt = f"{REASONING_PROMPT}\n\n--- FORMULAS REFERENCE ---\n{FORMULAS_REFERENCE}"

        max_iterations = 5  # Prevent infinite loops
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Solve this physics problem:\n{problem_context}"},
        ]

        for iteration in range(max_iterations):
            response = await self.client.chat.completions.create(
                model=self.reasoning_model,
                messages=messages,
                max_tokens=4096,
                temperature=0.1,
                tools=[CALCULATOR_TOOL_DEFINITION],
                tool_choice="auto",
            )

            message = response.choices[0].message

            # If no tool calls, check if we have valid JSON final answer
            if not message.tool_calls:
                raw_content = message.content
                if not raw_content:
                    raise ValueError("Empty response from reasoning model")

                # Try to parse as JSON
                try:
                    data = extract_json(raw_content)
                    reasoning_output = ReasoningOutput.model_validate(data)

                    # Verify and correct critical calculated values
                    reasoning_output = self._verify_and_correct(reasoning_output, vision_output, known_values)
                    # Expand time series from key frames to full 30 FPS
                    reasoning_output = self._expand_time_series(reasoning_output)
                    return reasoning_output
                except Exception:
                    # Not valid JSON - continue loop with reminder to output JSON
                    messages.append({
                        "role": "assistant",
                        "content": message.content,
                    })
                    messages.append({
                        "role": "user",
                        "content": "Please provide the final answer as valid JSON only, following the schema. No explanations or conversational text."
                    })
                    continue

            # Add assistant message with tool calls
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ],
            })

            # Execute tool calls
            import json
            for tool_call in message.tool_calls:
                if tool_call.function.name == "calculator":
                    args = json.loads(tool_call.function.arguments)
                    expression = args.get("expression", "")
                    variables = args.get("variables", {})
                    # Merge with known values from vision
                    merged_vars = {**known_values, **variables}
                    result = Calculator.evaluate(expression, merged_vars)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"result": result, "expression": expression, "variables": merged_vars}),
                    })
                else:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps({"error": f"Unknown tool: {tool_call.function.name}"}),
                    })

        # If we exit the loop without a final answer, try one more time without tools
        response = await self.client.chat.completions.create(
            model=self.reasoning_model,
            messages=messages + [{"role": "user", "content": "Provide the final JSON answer now."}],
            max_tokens=4096,
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise ValueError("Empty response from reasoning model after tool use")

        data = extract_json(raw_content)
        reasoning_output = ReasoningOutput.model_validate(data)

        # Verify and correct critical calculated values
        reasoning_output = self._verify_and_correct(reasoning_output, vision_output, known_values)
        # Expand time series from key frames to full 30 FPS
        reasoning_output = self._expand_time_series(reasoning_output)
        return reasoning_output