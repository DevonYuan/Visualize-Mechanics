import ProjectileMotionScene from '../scenes/ProjectileMotionScene';
import Kinematics1DScene from '../scenes/Kinematics1DScene';
import InclinedPlaneScene from '../scenes/InclinedPlaneScene';

export default function SceneSelector({ scenario, timeSeries, currentTime, duration, parameters }) {
  switch (scenario) {
    case 'projectile_motion':
      return <ProjectileMotionScene timeSeries={timeSeries} currentTime={currentTime} duration={duration} />;
    case 'kinematics_1d':
      return <Kinematics1DScene timeSeries={timeSeries} currentTime={currentTime} duration={duration} />;
    case 'inclined_plane':
      return <InclinedPlaneScene timeSeries={timeSeries} currentTime={currentTime} duration={duration} parameters={parameters} />;
    case 'atwood_machine':
      return <UnsupportedScene scenario="Atwood Machine" />;
    case 'collision_1d':
      return <UnsupportedScene scenario="1D Collision" />;
    case 'rotational_kinematics':
      return <UnsupportedScene scenario="Rotational Kinematics" />;
    case 'mass_spring':
      return <UnsupportedScene scenario="Mass-Spring System" />;
    default:
      return <UnsupportedScene scenario={scenario} />;
  }
}

function UnsupportedScene({ scenario }) {
  return (
    <div className="unsupported-scene">
      <div className="icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3>{scenario}</h3>
      <p>This scenario is not yet implemented in the 3D viewer.</p>
      <p className="coming-soon">Coming in a future update!</p>
    </div>
  );
}