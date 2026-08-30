import { useEffect, useState } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ status: 'starting', message: 'Starting...' });

  useEffect(() => {
    if (window.electronAPI) {
      // Get initial maximized state
      window.electronAPI.isMaximized().then(setIsMaximized);

      // Listen for backend status
      const unsubscribe = window.electronAPI.onBackendStatus((status) => {
        setBackendStatus(status);
      });

      // Listen for window maximize/unmaximize events
      const handleMaximize = () => setIsMaximized(true);
      const handleUnmaximize = () => setIsMaximized(false);
      
      window.addEventListener('maximize', handleMaximize);
      window.addEventListener('unmaximize', handleUnmaximize);

      return () => {
        unsubscribe();
        window.removeEventListener('maximize', handleMaximize);
        window.removeEventListener('unmaximize', handleUnmaximize);
      };
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  const getStatusColor = () => {
    switch (backendStatus.status) {
      case 'ready': return '#10b981'; // green
      case 'starting':
      case 'waiting': return '#f59e0b'; // amber
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="title-bar" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="title-bar-left">
        <div className="status-indicator" style={{ backgroundColor: getStatusColor() }} />
        <span className="status-text">{backendStatus.message}</span>
      </div>
      <div className="title-bar-right">
        <button className="window-btn minimize" onClick={handleMinimize} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5" width="8" height="2" fill="currentColor" rx="1"/>
          </svg>
        </button>
        <button className="window-btn maximize" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1"/>
              <rect x="5" y="5" width="2" height="2" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.5" rx="1"/>
            </svg>
          )}
        </button>
        <button className="window-btn close" onClick={handleClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}