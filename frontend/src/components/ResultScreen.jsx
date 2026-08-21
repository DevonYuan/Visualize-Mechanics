import { useProblemStore } from '../store/useProblemStore';
import SceneSelector from './SceneSelector';
import AnimationPlayer from './AnimationPlayer';
import WorkedSolutionDisplay from './WorkedSolutionDisplay';
import VariableOverlay from './VariableOverlay';
import ConceptualMCResult from './ConceptualMCResult';

export default function ResultScreen() {
  const { scenario, parameters, animationSpec, timeSeries, workedSolution, reset } = useProblemStore();

  // Conceptual MC questions normally have no animation. If the backend attached
  // one (e.g. "ball projected at 2 m/s, 35 deg" -> projectile), show the full
  // result screen so the user sees the physics alongside the MC answer.
  if (scenario === 'conceptual_mc' && !timeSeries) {
    return <ConceptualMCResult />;
  }

  // Prefer the animation spec, but fall back to the actual series end so the
  // scrubber always spans the real data (models sometimes omit animation_spec).
  const duration = animationSpec?.duration_s || timeSeries?.t?.[timeSeries.t.length - 1] || 1;

  const handleNewProblem = () => {
    reset();
  };

  if (!scenario || !timeSeries) {
    return (
      <div className="result-screen">
        <div className="error-state">
          <h2>No Data Available</h2>
          <p>Please upload a physics problem first.</p>
          <button onClick={handleNewProblem} className="primary-btn">New Problem</button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-screen">
      <header className="result-header">
        <div className="header-left">
          <h1>Visualize Mechanics</h1>
          <span className="scenario-badge">{formatScenario(scenario)}</span>
        </div>
        <button onClick={handleNewProblem} className="new-problem-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          New Problem
        </button>
      </header>

      <div className="result-content">
        <div className="visualization-panel">
          <SceneSelector
            scenario={scenario}
            timeSeries={timeSeries}
            currentTime={useProblemStore.getState().currentTime}
            duration={duration}
            parameters={parameters}
          />
          <VariableOverlay />
        </div>

        <div className="details-panel">
          <AnimationPlayer />
          <WorkedSolutionDisplay />
        </div>
      </div>

      <style jsx>{`
        .result-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0f172a;
          color: #e2e8f0;
        }
        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid #1e293b;
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-left h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .scenario-badge {
          background: #1e3a5f;
          color: #3b82f6;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #3b82f6;
        }
        .new-problem-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .new-problem-btn:hover {
          background: #334155;
          color: #e2e8f0;
          border-color: #475569;
        }
        .result-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
          padding: 1.5rem;
          overflow: hidden;
        }
        .visualization-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .variable-overlay {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 5;
        }
        .details-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }
        .error-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem;
        }
        .error-state h2 {
          margin: 0 0 1rem;
          color: #e2e8f0;
        }
        .error-state p {
          color: #94a3b8;
          margin: 0 0 1.5rem;
        }
        .primary-btn {
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .primary-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 1024px) {
          .result-content {
            grid-template-columns: 1fr;
            grid-template-rows: 50vh 1fr;
          }
          .variable-overlay {
            position: static;
            margin-top: -4rem;
            margin-right: 1rem;
            margin-left: auto;
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
}

function formatScenario(scenario) {
  if (!scenario) return 'Unknown';
  return scenario
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}