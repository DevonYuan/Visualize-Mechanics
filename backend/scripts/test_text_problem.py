import asyncio
import base64
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput

async def test():
    nim = NIMClient()
    
    # Simulate vision output for the text problem
    vision_output = VisionOutput(
        problem_text="A wheel rotates from rest with uniform angular acceleration. After 16s, it makes 5 revolutions per second. What is the angular displacement of the wheel during this time?",
        knowns={
            'omega0': '0',
            't': '16 s',
            'omega_final': '5 rev/s'
        },
        unknowns=['angular_displacement', 'theta'],
        diagram_description="A wheel rotating with uniform angular acceleration from rest",
        suggested_scenario='rotational_kinematics',
        multiple_choice_options=["A) 20π rad", "B) 40π rad", "C) 80π rad", "D) 160π rad"]
    )
    
    # Add debugging - let's see the raw response
    import os
    os.environ['DEBUG_NIM'] = '1'
    
    reasoning_output = await nim.reasoning_solve(vision_output)
    print('Scenario:', reasoning_output.scenario)
    print('Parameters:', reasoning_output.parameters)
    print('Worked Solution:', reasoning_output.worked_solution)
    if reasoning_output.time_series:
        ts = reasoning_output.time_series
        print(f'Time series: t={len(ts.t)}, theta={len(ts.theta)}, omega={len(ts.omega)}')
        if ts.theta:
            print(f'Final theta: {ts.theta[-1]}')
    print('Animation Spec:', reasoning_output.animation_spec)

asyncio.run(test())