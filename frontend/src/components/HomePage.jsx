import { useState, useEffect } from 'react';

export default function HomePage({ onGetStarted }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home-page">
      <div className={`home-content ${isVisible ? 'visible' : ''}`}>
        {/* Logo / Icon */}
        <div className="home-logo" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background circle */}
            <circle cx="60" cy="60" r="56" stroke="#3b82f6" strokeWidth="3" strokeDasharray="350" strokeDashoffset="0">
              <animate attributeName="strokeDashoffset" from="350" to="0" dur="1.5s" fill="freeze" begin="0.2s" />
            </circle>
            
            {/* Physics-inspired icon: pendulum + wave */}
            <g transform="translate(60, 60)">
              {/* Pendulum rod */}
              <line x1="0" y1="-40" x2="0" y2="0" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1.2s" />
              </line>
              {/* Pendulum bob */}
              <circle cx="0" cy="0" r="12" fill="#3b82f6" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1.2s" />
                <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="15 0 0" dur="2s" repeatCount="indefinite" begin="1.7s" />
              </circle>
              
              {/* Wave path */}
              <path d="M-35 20 Q-20 10 -5 20 Q10 30 25 20 Q40 10 55 20" 
                    stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="200" strokeDashoffset="200" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1.5s" />
                <animate attributeName="strokeDashoffset" from="200" to="0" dur="1.5s" fill="freeze" begin="1.5s" />
              </path>
              
              {/* Small particles */}
              <circle cx="-30" cy="35" r="3" fill="#22d3ee" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="2s" />
                <animateTransform attributeName="transform" type="translate" values="0 0; 0 -10; 0 0" dur="1.5s" repeatCount="indefinite" begin="2s" />
              </circle>
              <circle cx="30" cy="35" r="3" fill="#22d3ee" opacity="0">
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="2.1s" />
                <animateTransform attributeName="transform" type="translate" values="0 0; 0 -10; 0 0" dur="1.5s" repeatCount="indefinite" begin="2.1s" />
              </circle>
            </g>
          </svg>
        </div>

        {/* Title */}
        <h1 className="home-title">Visualize Mechanics</h1>
        
        {/* Subtitle */}
        <p className="home-subtitle">
          Upload a physics problem photo and watch it come to life with interactive animations and step-by-step solutions.
        </p>

        {/* Features */}
        <div className="home-features">
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <span>Photo Analysis</span>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H7" />
                <path d="M18 12a6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span>Interactive Animation</span>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span>Worked Solutions</span>
          </div>
        </div>

        {/* Get Started Button */}
        <button 
          className="get-started-btn"
          onClick={onGetStarted}
          type="button"
        >
          <span className="btn-text">Get Started</span>
          <svg className="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Footer note */}
        <p className="home-footer">
          Supports: Projectile Motion, Inclined Planes, Mass-Spring Systems, Rotational Kinematics, Torque, Collisions & more
        </p>
      </div>

      {/* Background decorative elements */}
      <div className="home-bg-elements" aria-hidden="true">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
      </div>
    </div>
  );
}