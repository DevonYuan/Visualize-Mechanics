import { useState, useEffect } from 'react';
import { useProblemStore } from './store/useProblemStore';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import TestProjectileMotion from './components/TestProjectileMotion';
import './App.css';

function App() {
  const { uploadStatus, error, scenario } = useProblemStore();
  const [screen, setScreen] = useState('upload'); // 'upload', 'loading', 'result', 'test'
  const [testMode, setTestMode] = useState(false);

  // Sync screen with upload status
  useEffect(() => {
    if (uploadStatus === 'idle') {
      setScreen('upload');
    } else if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
      setScreen('loading');
    } else if (uploadStatus === 'success') {
      setScreen('result');
    } else if (uploadStatus === 'error') {
      setScreen('loading'); // Show error in loading screen
    }
  }, [uploadStatus]);

  // Handle reset from store
  useEffect(() => {
    const unsub = useProblemStore.subscribe(
      (state) => state.uploadStatus === 'idle' && screen !== 'upload',
      () => setScreen('upload')
    );
    return unsub;
  }, [screen]);

  return (
    <div className="app">
      {testMode ? (
        <TestProjectileMotion />
      ) : (
        <>
          {screen === 'upload' && <UploadScreen />}
          {screen === 'loading' && <LoadingScreen />}
          {screen === 'result' && <ResultScreen />}
        </>
      )}
      <button
        onClick={() => setTestMode(!testMode)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          background: '#374151',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 1000,
          fontSize: '12px'
        }}
      >
        {testMode ? 'Exit Test Mode' : 'Test Projectile Motion'}
      </button>
    </div>
  );
}

export default App;