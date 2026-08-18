import { useProblemStore } from '../store/useProblemStore';

export default function WorkedSolutionDisplay() {
  const { workedSolution, scenario } = useProblemStore();

  if (!workedSolution) {
    return (
      <div className="worked-solution empty">
        <p>No solution available</p>
      </div>
    );
  }

  return (
    <div className="worked-solution">
      <div className="solution-header">
        <h2>Worked Solution</h2>
        <span className="scenario-badge">{formatScenario(scenario)}</span>
      </div>

      <div className="steps">
        {workedSolution.steps.map((step) => (
          <div key={step.step} className="step">
            <div className="step-number">Step {step.step}</div>
            <div className="step-content">
              <p className="step-description">{step.description}</p>
              {step.equation && (
                <div className="step-equation">{step.equation}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {workedSolution.final_answer && Object.keys(workedSolution.final_answer).length > 0 && (
        <div className="final-answers">
          <h3>Final Answers</h3>
          <div className="answers-grid">
            {Object.entries(workedSolution.final_answer).map(([key, value]) => (
              <div key={key} className="answer-item">
                <span className="answer-label">{formatAnswerLabel(key)}</span>
                <span className="answer-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .worked-solution {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .worked-solution.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #94a3b8;
        }
        .solution-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .solution-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1e293b;
        }
        .scenario-badge {
          background: #eff6ff;
          color: #3b82f6;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .step {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
        }
        .step-number {
          flex-shrink: 0;
          width: 40px;
          height: 24px;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .step-content {
          flex: 1;
        }
        .step-description {
          margin: 0 0 0.5rem;
          color: #334155;
          line-height: 1.6;
        }
        .step-equation {
          background: #1e293b;
          color: #e2e8f0;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          overflow-x: auto;
        }
        .final-answers {
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .final-answers h3 {
          margin: 0 0 1rem;
          font-size: 1rem;
          color: #1e293b;
        }
        .answers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }
        .answer-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: #f0f9ff;
          border-radius: 8px;
          border: 1px solid #bae6fd;
        }
        .answer-label {
          font-size: 0.75rem;
          color: #0369a1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .answer-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #0c4a6e;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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

function formatAnswerLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}