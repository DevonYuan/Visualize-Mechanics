import { useProblemStore } from '../store/useProblemStore';

export default function LoadingScreen() {
  const { uploadStatus, error, scenario, reset } = useProblemStore();

  const handleRetry = () => {
    reset();
  };

  const handleNewProblem = () => {
    reset();
  };

  if (uploadStatus === 'success' && scenario) {
    // Navigation handled by App.jsx
    return null;
  }

  return (
    <div className="loading-screen">
      <div className="loading-container">
        {error && uploadStatus === 'error' ? (
          <div className="error-state">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Unable to Process</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={handleRetry} className="primary-btn">
                Try Again
              </button>
              <button onClick={handleNewProblem} className="secondary-btn">
                New Problem
              </button>
            </div>
          </div>
        ) : (
          <div className="loading-state">
            <div className="spinner" />
            <h2>Processing Your Problem</h2>
            <p className="loading-text">Our AI is analyzing the physics problem and generating a 3D animation with a step-by-step solution.</p>
            <div className="loading-steps">
              <div className="step active">
                <span className="step-number">1</span>
                <span>Extracting problem from image</span>
              </div>
              <div className="step active">
                <span className="step-number">2</span>
                <span>Solving physics equations</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Generating 3D animation</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Preparing worked solution</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--space);
        }
        .loading-container {
          width: 100%;
          max-width: 420px;
          background: var(--ink);
          border: 1px solid rgba(89, 230, 196, 0.15);
          border-radius: 16px;
          padding: 3rem 2.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(89, 230, 196, 0.1);
          text-align: center;
        }
        .spinner {
          width: 56px;
          height: 56px;
          border: 3px solid rgba(89, 230, 196, 0.15);
          border-top-color: var(--trace);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.75rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h2 {
          margin: 0 0 0.75rem;
          color: var(--white);
          font-size: 1.5rem;
          font-family: var(--display);
          font-weight: 600;
        }
        .loading-text {
          margin: 0 0 2rem;
          color: var(--ink-soft);
          font-size: 0.95rem;
          line-height: 1.6;
          font-family: var(--body);
        }
        .loading-steps {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          text-align: left;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          background: rgba(89, 230, 196, 0.05);
          border: 1px solid rgba(89, 230, 196, 0.1);
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .step.active {
          background: rgba(89, 230, 196, 0.1);
          border-color: rgba(89, 230, 196, 0.3);
        }
        .step-number {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(89, 230, 196, 0.15);
          color: var(--trace);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: var(--mono);
          flex-shrink: 0;
          border: 1px solid rgba(89, 230, 196, 0.2);
        }
        .step.active .step-number {
          background: var(--trace);
          color: var(--space);
          border-color: var(--trace);
        }
        .step span:last-child {
          color: var(--white);
          font-size: 0.9rem;
          font-family: var(--body);
        }
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .error-icon {
          color: var(--red);
          margin-bottom: 1rem;
        }
        .error-state h2 {
          color: var(--red);
        }
        .error-state p {
          color: var(--ink-soft);
          margin: 0 0 1.5rem;
          text-align: center;
        }
        .error-actions {
          display: flex;
          gap: 1rem;
          width: 100%;
        }
        .primary-btn, .secondary-btn {
          flex: 1;
          padding: 0.875rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: var(--body);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .primary-btn {
          background: var(--trace);
          color: var(--space);
          border: none;
        }
        .primary-btn:hover {
          background: #4dd9b4;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(89, 230, 196, 0.3);
        }
        .secondary-btn {
          background: transparent;
          color: var(--trace);
          border: 2px solid var(--trace);
        }
        .secondary-btn:hover {
          background: rgba(89, 230, 196, 0.1);
        }
      `}</style>
    </div>
  );
}