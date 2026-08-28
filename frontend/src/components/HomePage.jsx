import { useState, useEffect, useRef, useCallback } from 'react';
import { getNIMKeyStatus, setNIMKey, deleteNIMKey, getDatabasePath } from '../api/settingsService';

export default function HomePage({ onGetStarted }) {
  const [isVisible, setIsVisible] = useState(false);
  const [comparePosition, setComparePosition] = useState(55); // percentage from left
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nimKeyStatus, setNimKeyStatus] = useState({ has_key: false, api_key: null });
  const [nimKeyInput, setNimKeyInput] = useState('');
  const [settingsError, setSettingsError] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(null);
  const [dbPath, setDbPath] = useState('');
  const compareRef = useRef(null);
  const isDraggingRef = useRef(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const modalJustOpenedRef = useRef(false);

  // Track mount/unmount
  useEffect(() => {
    console.log('[HomePage] MOUNTED');
    return () => console.log('[HomePage] UNMOUNTED');
  }, []);

  // Load NIM key status on mount
  useEffect(() => {
    loadNIMKeyStatus();
  }, []);

  const loadNIMKeyStatus = async () => {
    try {
      const status = await getNIMKeyStatus();
      setNimKeyStatus(status);
    } catch (error) {
      console.error('Failed to load NIM key status:', error);
    }
  };

  const handleSaveNIMKey = async () => {
    if (!nimKeyInput.trim()) {
      setSettingsError('API key cannot be empty');
      return;
    }

    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      await setNIMKey(nimKeyInput.trim());
      setSettingsSuccess('NIM API key saved successfully');
      setNimKeyInput('');
      await loadNIMKeyStatus();
    } catch (error) {
      setSettingsError(error.message || 'Failed to save API key');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteNIMKey = async () => {
    if (!window.confirm('Are you sure you want to delete the NIM API key?')) {
      return;
    }

    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      await deleteNIMKey();
      setSettingsSuccess('NIM API key deleted');
      await loadNIMKeyStatus();
    } catch (error) {
      setSettingsError(error.message || 'Failed to delete API key');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Track settingsOpen changes
  useEffect(() => {
    console.log('[Settings] settingsOpen changed to:', settingsOpen);
  }, [settingsOpen]);

  const openSettings = () => {
    console.log('[Settings] openSettings called, settingsOpen=', settingsOpen);
    setSettingsOpen(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    // Prevent backdrop click from closing modal immediately after opening
    // Use a longer delay (500ms) to account for any mousedown/mouseup timing issues
    modalJustOpenedRef.current = true;
    setTimeout(() => {
      modalJustOpenedRef.current = false;
    }, 500);
    // Load NIM key status and database path
    loadNIMKeyStatus();
    getDatabasePath().then(data => setDbPath(data.path)).catch(() => setDbPath('Unable to load'));
    // Focus the input after modal opens
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeSettings = () => {
    console.log('[Settings] closeSettings called, settingsOpen=', settingsOpen);
    setSettingsOpen(false);
    setNimKeyInput('');
    setSettingsError(null);
    setSettingsSuccess(null);
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && settingsOpen) {
        closeSettings();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [settingsOpen]);

  // Trap focus in modal
  useEffect(() => {
    if (settingsOpen && modalRef.current) {
      const getFocusableElements = () =>
        Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);

      const handleTab = (e) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      // Focus first element when modal opens
      setTimeout(() => {
        const focusableElements = getFocusableElements();
        focusableElements[0]?.focus();
      }, 0);

      document.addEventListener('keydown', handleTab);

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [settingsOpen]);

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
          </div>
          <div className="home-nav-right">
            <button className="home-icon-btn" aria-label="Settings" onClick={openSettings}>
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
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--red)"/>
                  </marker>
                </defs>
                <rect width="600" height="460" fill="url(#paper-grid)"/>

                {/* dotted trajectory sketch */}
                <path
                  d="M60 380 C 180 380, 220 90, 340 90 C 420 90, 460 220, 540 260"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="2.5"
                  strokeDasharray="1 9"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <circle cx="60" cy="380" r="6" fill="var(--ink)"/>
                <line x1="60" y1="380" x2="150" y2="330" stroke="var(--red)" strokeWidth="2" markerEnd="url(#arrowhead)"/>

                {/* hand-written physics annotations */}
                <text x="48" y="405" className="home-hand-label" style={{ fontSize: '20px' }}>v₀ = 20 m/s</text>
                <text x="128" y="450" className="home-hand-label" style={{ fontSize: '20px' }}>θ = 45°</text>
                <text x="360" y="120" className="home-hand-label" style={{ fontSize: '22px' }}>range = ?</text>
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
                  <text x="50" y="30">SIMULATION</text>
                  <text x="50" y="440">t = 1.24s  ▶</text>
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

            </div>
        </div>
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            // Track if mousedown happened on overlay (not modal content)
            if (e.target === e.currentTarget) {
              modalJustOpenedRef.current = true;
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalJustOpenedRef.current) {
              closeSettings();
            }
            // Reset the guard after click check
            modalJustOpenedRef.current = false;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="settings-title" className="modal-title">Settings</h2>
              <button className="modal-close" onClick={closeSettings} aria-label="Close settings">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h3 className="settings-section-title">NVIDIA NIM API Key</h3>
                <p className="settings-description">
                  Enter your NVIDIA NIM API key to enable cloud-based AI vision and reasoning models.
                  Get your key at <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer">build.nvidia.com</a>.
                </p>

                <div className="settings-status">
                  <span className={`status-indicator ${nimKeyStatus.has_key ? 'status-connected' : 'status-disconnected'}`} />
                  <span>
                    {nimKeyStatus.has_key 
                      ? `Connected (${nimKeyStatus.api_key})` 
                      : 'Not configured'}
                  </span>
                </div>

                <div className="settings-input-group">
                  <label htmlFor="nim-api-key" className="settings-label">NIM API Key</label>
                  <input
                    ref={inputRef}
                    id="nim-api-key"
                    type="password"
                    className="settings-input"
                    placeholder="nvapi-..."
                    value={nimKeyInput}
                    onChange={(e) => setNimKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !settingsLoading && handleSaveNIMKey()}
                    disabled={settingsLoading}
                    autoComplete="off"
                  />
                  <div className="settings-input-hint">
                    Key is stored locally in an encrypted SQLite database on your device.
                  </div>
                </div>

                {settingsError && (
                  <div className="settings-error" role="alert">{settingsError}</div>
                )}
                {settingsSuccess && (
                  <div className="settings-success" role="status">{settingsSuccess}</div>
                )}

                <div className="settings-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveNIMKey}
                    disabled={settingsLoading || !nimKeyInput.trim()}
                  >
                    {settingsLoading ? 'Saving...' : 'Save API Key'}
                  </button>
                  {nimKeyStatus.has_key && (
                    <button
                      className="btn btn-ghost btn-danger"
                      onClick={handleDeleteNIMKey}
                      disabled={settingsLoading}
                    >
                      Delete Key
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Database Location</h3>
                <p className="settings-description">
                  Your settings are stored in a local SQLite database at:
                </p>
                <code className="settings-db-path">{dbPath || 'Loading...'}</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}