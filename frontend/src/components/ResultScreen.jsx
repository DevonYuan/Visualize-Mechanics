import { useProblemStore } from '../store/useProblemStore';
import SceneSelector from './SceneSelector';
import AnimationPlayer from './AnimationPlayer';
import WorkedSolutionDisplay from './WorkedSolutionDisplay';
import VariableOverlay from './VariableOverlay';
import ConceptualMCResult from './ConceptualMCResult';
import ParametersDisplay from './ParametersDisplay';

export default function ResultScreen({ onNewProblem }) {
  const { 
    scenario, 
    parameters, 
    animationSpec, 
    timeSeries, 
    workedSolution, 
    reset,
    currentTime,
    setCurrentTime,
    isPlaying,
    setPlayState
  } = useProblemStore();

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
    if (onNewProblem) {
      onNewProblem();
    } else {
      reset();
    }
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

  const handlePlayPause = () => setPlayState(!isPlaying);
  const handleReset = () => setCurrentTime(0);

  return (
    <div className="result-screen">
      {/* Full-screen visualization with overlay controls */}
      <div className="visualization-wrapper">
        <SceneSelector
          scenario={scenario}
          timeSeries={timeSeries}
          currentTime={currentTime}
          duration={duration}
          parameters={parameters}
        />
        
        {/* Top-left overlay: Live variables + Animation controls */}
        <div className="overlay-panel">
          <div className="overlay-header">
            <span className="overlay-title">Live Variables</span>
            <span className="overlay-time">t = {currentTime.toFixed(2)}s</span>
          </div>
          
          <VariableOverlay />
          
          <AnimationPlayer 
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            duration={duration}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
          />
        </div>

        {/* Header bar */}
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

        {/* Right sidebar: Parameters + Worked Solution */}
        <aside className="sidebar-panel">
          <ParametersDisplay />
          <WorkedSolutionDisplay />
        </aside>
      </div>

      <style jsx>{`
        .result-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          color: #1e293b;
        }
        .visualization-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .result-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 380px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #e2e8f0;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
          color: #1e293b;
        }
        .scenario-badge {
          background: #eff6ff;
          color: #3b82f6;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #bfdbfe;
        }
        .new-problem-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .new-problem-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
          border-color: #cbd5e1;
        }
        .overlay-panel {
          position: absolute;
          top: 60px;
          left: 1.5rem;
          z-index: 15;
          width: 300px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          border-bottom: none;
        }
        .overlay-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }
        .overlay-time {
          color: #94a3b8;
          font-size: 0.75rem;
          font-variant-numeric: tabular-nums;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .sidebar-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 380px;
          background: white;
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 1.5rem;
          padding-top: 80px; /* Account for header */
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
          color: #1e293b;
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
          .result-header {
            left: 0;
            right: 0;
            position: sticky;
          }
          .visualization-wrapper {
            flex-direction: column;
          }
          .overlay-panel {
            position: relative;
            top: 0;
            left: 0;
            width: 100%;
            max-height: none;
            margin: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .overlay-header {
            border-radius: 12px 12px 0 0;
          }
          .sidebar-panel {
            position: relative;
            width: 100%;
            max-height: 50vh;
            border-left: none;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5rem;
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