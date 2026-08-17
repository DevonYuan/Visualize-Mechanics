#!/usr/bin/env python3
"""
Evaluation harness for the physics problem solver pipeline.

Run with: python -m scripts.eval
"""

import asyncio
import json
import time
from pathlib import Path
from typing import Any
from dataclasses import dataclass, asdict

from app.services.pipeline import PipelineService
from app.services.image import image_to_base64
from app.schemas import VisionOutput, ReasoningOutput


@dataclass
class EvalCase:
    name: str
    image_path: str
    expected_scenario: str
    expected_params: dict[str, float]  # param_name -> expected_value (approx)


@dataclass
class EvalResult:
    name: str
    success: bool
    latency_s: float
    scenario_correct: bool
    param_accuracy: dict[str, bool]  # param_name -> within 5%
    error: str | None = None


EVAL_CASES = [
    # Add your eval cases here:
    # EvalCase("projectile_1", "eval_images/projectile_1.jpg", "projectile_motion", {"v0": 20.0, "angle_deg": 45.0}),
    # EvalCase("incline_1", "eval_images/incline_1.jpg", "inclined_plane", {"mass": 2.0, "angle_deg": 30.0}),
]


async def run_eval():
    print("=" * 60)
    print("Visualize Mechanics - Evaluation Harness")
    print("=" * 60)

    if not EVAL_CASES:
        print("No eval cases defined. Add cases to EVAL_CASES in scripts/eval.py")
        return

    pipeline = PipelineService()
    results: list[EvalResult] = []

    for case in EVAL_CASES:
        print(f"\nRunning: {case.name}...")
        start = time.time()

        try:
            # Load and encode image
            image_b64 = image_to_base64(case.image_path)

            # Run pipeline
            response = await pipeline.solve_problem(image_b64)

            latency = time.time() - start

            # Check scenario
            scenario_correct = response.scenario == case.expected_scenario

            # Check parameters (within 5%)
            param_accuracy = {}
            for param, expected in case.expected_params.items():
                actual = response.parameters.get(param)
                if actual is not None:
                    error_pct = abs(actual - expected) / abs(expected) * 100
                    param_accuracy[param] = error_pct <= 5.0
                else:
                    param_accuracy[param] = False

            result = EvalResult(
                name=case.name,
                success=True,
                latency_s=latency,
                scenario_correct=scenario_correct,
                param_accuracy=param_accuracy,
            )
            print(f"  ✓ Scenario: {response.scenario} ({'✓' if scenario_correct else '✗'})")
            print(f"  ✓ Params: {param_accuracy}")
            print(f"  ✓ Latency: {latency:.2f}s")

        except Exception as e:
            latency = time.time() - start
            result = EvalResult(
                name=case.name,
                success=False,
                latency_s=latency,
                scenario_correct=False,
                param_accuracy={},
                error=str(e),
            )
            print(f"  ✗ Error: {e}")

        results.append(result)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    total = len(results)
    scenario_correct = sum(1 for r in results if r.scenario_correct)
    param_checks = sum(sum(v for v in r.param_accuracy.values()) for r in results)
    total_params = sum(len(r.param_accuracy) for r in results)
    avg_latency = sum(r.latency_s for r in results) / total if total > 0 else 0

    print(f"Total cases: {total}")
    print(f"Scenario accuracy: {scenario_correct}/{total} ({scenario_correct/total*100:.1f}%)")
    print(f"Parameter accuracy: {param_checks}/{total_params} ({param_checks/total_params*100:.1f}%)")
    print(f"Average latency: {avg_latency:.2f}s")

    # Save results
    output = {
        "summary": {
            "total": total,
            "scenario_accuracy_pct": scenario_correct / total * 100 if total else 0,
            "param_accuracy_pct": param_checks / total_params * 100 if total_params else 0,
            "avg_latency_s": avg_latency,
        },
        "results": [asdict(r) for r in results],
    }

    with open("eval_results.json", "w") as f:
        json.dump(output, f, indent=2)

    print("\nResults saved to eval_results.json")


if __name__ == "__main__":
    asyncio.run(run_eval())