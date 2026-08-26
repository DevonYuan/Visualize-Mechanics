import { useState, useEffect, useRef, useCallback } from 'react';

export default function HomePage({ onGetStarted }) {
  const [isVisible, setIsVisible] = useState(false);
  const [comparePosition, setComparePosition] = useState(55); // percentage from left
  const compareRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !compareRef.current) return;
    
    const rect = compareRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setComparePosition(percentage);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current || !compareRef.current) return;
    
    const touch = e.touches[0];
    const rect = compareRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setComparePosition(percentage);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div className="home-page">
      {/* Header / Nav */}
      <header className="home-header">
        <nav className="wrap home-nav" role="navigation" aria-label="Main navigation">
          <a href="#" className="home-logo" aria-label="Visualize Mechanics Home">
            <svg viewBox="0 0 26 26" fill="none" width="26" height="26" aria-hidden="true">
              <path d="M2 20 C 8 20, 8 6, 13 6 C 18 6, 18 20, 24 20" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="13" cy="6" r="2" fill="var(--red)"/>
            </svg>
            <span>Visualize Mechanics</span>
          </a>
          <div className="home-nav-links">
            <a href="#" className="active" aria-current="page">New problem</a>
            <a href="#">History</a>
            <a href="#">Scenarios</a>
          </div>
          <div className="home-nav-right">
            <div className="home-status-pill" aria-label="Connection status">
              <span className="home-status-dot" aria-hidden="true"></span>
              <span>Local model connected</span>
            </div>
            <button className="home-icon-btn" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" width="17" height="17" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Hero Section */}
      <main className="home-main" role="main">
        <div className="wrap home-hero-grid">
          {/* Left side - Content */}
          <div className="home-hero-content">
            <p className="eyebrow">High school mechanics, animated</p>
            <h1 className="home-hero-title">
              Photograph the problem.<br/>
              Watch the <em>physics</em> happen.
            </h1>
            <p className="home-hero-subtitle">
              Snap a picture of any kinematics, forces, or energy problem. Visualize Mechanics works out the equations and hands you back an interactive 3D animation with every step of the solution laid out beside it.
            </p>
            <div className="home-hero-ctas">
              <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>
                Upload a photo
              </a>
              <a href="#" className="btn btn-ghost">Take a photo</a>
            </div>
            <p className="home-hero-note">Drag the divider below → problem sheet becomes simulation</p>
          </div>

          {/* Right side - Compare Widget */}
          <div 
            className="home-compare" 
            ref={compareRef}
            role="img"
            aria-label="Interactive comparison: problem photo on left, physics simulation on right. Drag the divider to reveal the simulation."
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Paper layer (background) */}
            <div className="home-compare-layer home-compare-layer-paper" aria-hidden="true">
              <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                  <pattern id="paper-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                    <path d="M 26 0 L 0 0 0 26" fill="none" stroke="var(--paper-line)" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="600" height="460" fill="url(#paper-grid)"/>
                
                {/* Hand-drawn style physics diagram on paper */}
                <g className="paper-diagram" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  {/* Inclined plane */}
                  <path d="M80 380 L280 200 L280 380 Z" fill="rgba(20,33,61,0.03)" strokeDasharray="4,3"/>
                  <line x1="80" y1="380" x2="280" y2="200" strokeWidth="2"/>
                  <line x1="80" y1="380" x2="280" y2="380"/>
                  <line x1="280" y1="200" x2="280" y2="380"/>
                  
                  {/* Block on incline */}
                  <rect x="155" y="245" width="35" height="35" rx="3" fill="rgba(193,68,58,0.15)" stroke="var(--red)" strokeWidth="1.5"/>
                  
                  {/* Force vectors */}
                  <line x1="172.5" y1="230" x2="172.5" y2="190" stroke="var(--red)" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                  <line x1="172.5" y1="275" x2="172.5" y2="315" stroke="var(--ink)" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                  <line x1="140" y1="262.5" x2="190" y2="262.5" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowhead)"/>
                  
                  {/* Angle arc */}
                  <path d="M150 365 A 40 40 0 0 1 180 355" stroke="var(--ink-soft)" strokeWidth="1.5"/>
                  <text x="165" y="350" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)" textAnchor="middle">θ</text>
                  
                  {/* Labels */}
                  <text x="172.5" y="180" fontFamily="var(--mono)" fontSize="10" fill="var(--red)" textAnchor="middle" fontWeight="600">F₁</text>
                  <text x="172.5" y="330" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)" textAnchor="middle" fontWeight="600">mg</text>
                  <text x="195" y="260" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)" textAnchor="middle">mg·sinθ</text>
                  
                  {/* Equations on side */}
                  <g fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)" fontWeight="500">
                    <text x="340" y="120">F = mg·sinθ</text>
                    <text x="340" y="140">a = g·sinθ</text>
                    <text x="340" y="160">v² = 2as</text>
                    <text x="340" y="180">t = √(2s/a)</text>
                  </g>
                  
                  {/* Arrowhead marker */}
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L8,3 Z" fill="currentColor"/>
                    </marker>
                  </defs>
                </g>
                
                {/* Hand-written style labels */}
                <text x="40" y="40" className="home-hand-label" style={{fontSize: '14px', transform: 'rotate(-3deg)'}}>Problem</text>
                <text x="40" y="420" className="home-hand-label" style={{fontSize: '12px', transform: 'rotate(2deg)'}}>Photo</text>
              </svg>
            </div>

            {/* Simulation layer (foreground, clipped) */}
            <div className="home-compare-layer home-compare-layer-sim" style={{clipPath: `inset(0 ${100 - comparePosition}% 0 0)`}} aria-hidden="true">
              <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                  <linearGradient id="sim-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#16234a"/>
                    <stop offset="60%" stopColor="var(--space)"/>
                  </linearGradient>
                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(89,230,196,0.15)"/>
                    <stop offset="100%" stopColor="transparent"/>
                  </radialGradient>
                </defs>
                <rect width="600" height="460" fill="url(#sim-bg)"/>
                <ellipse cx="300" cy="230" rx="400" ry="200" fill="url(#glow)"/>
                
                {/* Animated simulation scene */}
                <g className="sim-scene" transform="translate(300, 300)">
                  {/* Ground plane */}
                  <line x1="-250" y1="80" x2="250" y2="80" stroke="rgba(89,230,196,0.3)" strokeWidth="2"/>
                  <line x1="-250" y1="80" x2="-100" y2="80" stroke="var(--trace)" strokeWidth="3"/>
                  
                  {/* Inclined plane in sim */}
                  <path d="M-100 80 L-20 -80 L-20 80 Z" fill="rgba(89,230,196,0.08)" stroke="var(--trace)" strokeWidth="2" strokeDasharray="8,4"/>
                  <line x1="-100" y1="80" x2="-20" y2="-80" stroke="var(--trace)" strokeWidth="3"/>
                  
                  {/* Animated block */}
                  <rect 
                    x="-70" y="-105" width="30" height="30" rx="4" 
                    fill="var(--trace)" 
                    opacity="0.9"
                    style={{
                      transform: `translateY(${Math.sin(Date.now() / 300) * 10}px)`,
                      transition: 'transform 0.1s linear'
                    }}
                  />
                  
                  {/* Trail effect */}
                  <g stroke="var(--trace)" strokeWidth="1.5" opacity="0.4">
                    <line x1="-55" y1="-80" x2="-65" y2="-70"/>
                    <line x1="-55" y1="-75" x2="-68" y2="-62"/>
                    <line x1="-55" y1="-70" x2="-72" y2="-55"/>
                  </g>
                  
                  {/* Force vectors in sim */}
                  <g stroke="var(--red)" strokeWidth="2" markerEnd="url(#sim-arrow)">
                    <line x1="-55" y1="-100" x2="-55" y2="-130"/>
                    <line x1="-55" y1="-90" x2="-55" y2="-55"/>
                  </g>
                  <g stroke="var(--trace)" strokeWidth="2" strokeDasharray="4,3" markerEnd="url(#sim-arrow)">
                    <line x1="-75" y1="-85" x2="-35" y2="-85"/>
                  </g>
                  
                  <defs>
                    <marker id="sim-arrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L8,3 Z" fill="currentColor"/>
                    </marker>
                  </defs>
                  
                  {/* Real-time values */}
                  <g fontFamily="var(--mono)" fontSize="11" fill="var(--trace)" fontWeight="500" textAnchor="end">
                    <text x="220" y="-120">v = 4.2 m/s</text>
                    <text x="220" y="-105">a = 3.4 m/s²</text>
                    <text x="220" y="-90">θ = 30°</text>
                  </g>
                </g>
                
                {/* UI overlay */}
                <g fontFamily="var(--mono)" fontSize="10" fill="rgba(89,230,196,0.7)">
                  <text x="20" y="30">SIMULATION</text>
                  <text x="20" y="440">t = 1.24s  ▶</text>
                </g>
              </svg>
            </div>

            {/* Tags */}
            <span className="home-compare-tag home-compare-tag-photo">Problem Photo</span>
            <span className="home-compare-tag home-compare-tag-sim">Physics Sim</span>

            {/* Draggable handle */}
            <div 
              className="home-compare-handle" 
              style={{left: `${comparePosition}%`}}
              role="slider"
              aria-label="Compare divider: drag to reveal simulation"
              aria-valuemin={10}
              aria-valuemax={90}
              aria-valuenow={Math.round(comparePosition)}
              tabIndex={0}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 10 : 2;
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setComparePosition(prev => Math.max(10, prev - step));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setComparePosition(prev => Math.min(90, prev + step));
                }
              }}
            >
              <div className="home-compare-grip" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5">
                  <line x1="8" y1="3" x2="8" y2="13"/>
                  <line x1="3" y1="8" x2="13" y2="8"/>
                </svg>
              </div>
            </div>

            {/* Readout */}
            <div className="home-compare-readout" aria-hidden="true">
              <div>Reveal: {Math.round(comparePosition)}%</div>
              <div style={{fontSize: '10px', opacity: 0.7}}>Drag or use ← → keys</div>
            </div>

            {/* Hand-written labels on compare widget */}
            <span className="home-hand-label" style={{top: '14px', left: '14px', fontSize: '14px', transform: 'rotate(-3deg)'}}>Problem</span>
            <span className="home-hand-label" style={{bottom: '14px', left: '14px', fontSize: '12px', transform: 'rotate(2deg)'}}>Photo</span>
          </div>
        </div>
      </main>
    </div>
  );
}