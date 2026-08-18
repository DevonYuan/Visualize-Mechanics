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
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .loading-container {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 16px;
          padding: 3rem 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #e2e8f0;
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.5rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h2 {
          margin: 0 0 0.75rem;
          color: #1a1a2e;
          font-size: 1.5rem;
        }
        .loading-text {
          margin: 0 0 2rem;
          color: #718096;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .loading-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f7fafc;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        .step.active {
          background: #ebf8ff;
        }
        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #cbd5e0;
          color: #718096;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        .step.active .step-number {
          background: #4299e1;
          color: white;
        }
        .step span:last-child {
          color: #4a5568;
          font-size: 0.95rem;
        }
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .error-icon {
          color: #e53e3e;
          margin-bottom: 1rem;
        }
        .error-state h2 {
          color: #c53030;
        }
        .error-state p {
          color: #718096;
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
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .primary-btn {
          background: #4299e1;
          color: white;
          border: none;
        }
        .primary-btn:hover {
          background: #3182ce;
        }
        .secondary-btn {
          background: white;
          color: #4299e1;
          border: 2px solid #4299e1;
        }
        .secondary-btn:hover {
          background: #ebf8ff;
        }
      `}</style>
    </div>
  );
}