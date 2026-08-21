import { useProblemStore } from '../store/useProblemStore';

export default function ConceptualMCResult() {
  const { workedSolution, reset } = useProblemStore();

  const handleNewProblem = () => {
    reset();
  };

  if (!workedSolution) {
    return (
      <div className="conceptual-mc-screen">
        <div className="error-state">
          <h2>No Data Available</h2>
          <p>Please upload a physics problem first.</p>
          <button onClick={handleNewProblem} className="primary-btn">New Problem</button>
        </div>
      </div>
    );
  }

  const { steps, final_answer } = workedSolution;
  const correctOption = final_answer?.correct_option || 'Unknown';
  const explanation = final_answer?.explanation || '';

  return (
    <div className="conceptual-mc-screen">
      <header className="result-header">
        <div className="header-left">
          <h1>Visualize Mechanics</h1>
          <span className="scenario-badge">Conceptual Question</span>
        </div>
        <button onClick={handleNewProblem} className="new-problem-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          New Problem
        </button>
      </header>

      <div className="conceptual-content">
        <div className="answer-card">
          <div className="answer-header">
            <h2>Worked Solution</h2>
            <div className="correct-badge">Correct Answer: <span>{correctOption}</span></div>
          </div>

          <div className="steps">
            {steps.map((step) => (
              <div key={step.step} className="step">
                <div className="step-number">Step {step.step}</div>
                <div className="step-content">
                  <p className="step-description">{step.description}</p>
                  {step.equation && (
                    <p className="step-equation">{step.equation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="explanation">
            <h3>Explanation</h3>
            <p>{explanation}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .conceptual-mc-screen {
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
          color: #e2e8f0;
          border: 1px solid #334155;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .new-problem-btn:hover {
          background: #334155;
          border-color: #475569;
        }
        .conceptual-content {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2rem;
          overflow-y: auto;
        }
        .answer-card {
          width: 100%;
          max-width: 700px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 2rem;
          backdrop-filter: blur(8px);
        }
        .answer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #1e293b;
        }
        .answer-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .correct-badge {
          background: #064e3b;
          color: #34d399;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: 1px solid #065f46;
        }
        .correct-badge span {
          font-size: 1.25rem;
          color: #6ee7b7;
        }
        .steps {
          margin-bottom: 2rem;
        }
        .step {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 1rem;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
          border: 1px solid #1e293b;
        }
        .step-number {
          flex-shrink: 0;
          background: #1e3a5f;
          color: #3b82f6;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          border: 1px solid #3b82f6;
          min-width: 70px;
          text-align: center;
        }
        .step-content {
          flex: 1;
        }
        .step-description {
          margin: 0 0 0.5rem 0;
          line-height: 1.6;
        }
        .step-equation {
          margin: 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9rem;
          color: #93c5fd;
          background: rgba(30, 58, 95, 0.5);
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #1e3a5f;
        }
        .explanation {
          background: rgba(30, 58, 95, 0.3);
          border: 1px solid #1e3a5f;
          border-radius: 8px;
          padding: 1.5rem;
        }
        .explanation h3 {
          margin: 0 0 1rem 0;
          color: #93c5fd;
          font-size: 1.1rem;
        }
        .explanation p {
          margin: 0;
          line-height: 1.7;
          font-size: 1.05rem;
        }
      `}</style>
    </div>
  );
}