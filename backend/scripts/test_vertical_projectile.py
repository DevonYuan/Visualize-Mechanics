import asyncio
import json
from app.services.nim_client import NIMClient
from app.schemas import VisionOutput

async def test_vertical_projectile():
    # Mock vision output for a VERTICAL projectile motion problem (thrown straight up)
    vision_output = VisionOutput(
        problem_text='A ball is thrown straight up into the air at 20 m/s from ground level. Find the time of flight, maximum height, and the velocity when it returns to the ground.',
        knowns={'v0': '20 m/s', 'angle': '90 deg'},
        unknowns=['time_of_flight', 'max_height', 'final_velocity'],
        diagram_description='Ball launched vertically upward from ground',
        suggested_scenario='projectile_motion',
    )

    print('Testing VERTICAL projectile_motion scenario (angle = 90 deg)')
    print('Knowns:', vision_output.knowns)

    nim_client = NIMClient()
    result = await nim_client.reasoning_solve(vision_output)

    print('\nScenario:', result.scenario)
    
    params_dict = result.parameters.model_dump() if hasattr(result.parameters, 'model_dump') else result.parameters
    print('Parameters:', json.dumps(params_dict, indent=2))
    
    if result.animation_spec:
        anim_dict = result.animation_spec.model_dump() if hasattr(result.animation_spec, 'model_dump') else result.animation_spec
        print('Animation Spec:', json.dumps(anim_dict, indent=2))
    else:
        print('Animation Spec: None')
    
    if result.time_series and result.time_series.t:
        print('Time Series lengths: t={}, x={}, y={}, vx={}, vy={}, v={}'.format(
            len(result.time_series.t), len(result.time_series.x), len(result.time_series.y),
            len(result.time_series.vx), len(result.time_series.vy), len(result.time_series.v)
        ))
        print('t range: {:.4f} to {:.4f}'.format(result.time_series.t[0], result.time_series.t[-1]))
        print('x range: {:.6f} to {:.6f}'.format(min(result.time_series.x), max(result.time_series.x)))
        print('y range: {:.6f} to {:.6f}'.format(min(result.time_series.y), max(result.time_series.y)))
        print('First 5 x:', result.time_series.x[:5])
        print('Last 5 x:', result.time_series.x[-5:])
        print('First 5 y:', result.time_series.y[:5])
        print('Last 5 y:', result.time_series.y[-5:])

asyncio.run(test_vertical_projectile())