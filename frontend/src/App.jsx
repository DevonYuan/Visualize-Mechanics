import { useState, useEffect } from 'react';
import { useProblemStore } from './store/useProblemStore';
import HomePage from './components/HomePage';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import './App.css';

function App() {
  const { uploadStatus, error, scenario, reset } = useProblemStore();
  const [screen, setScreen] = useState('home');

  // Sync screen with upload status
  useEffect(() => {
    if (uploadStatus === 'idle' && screen !== 'home') {
      setScreen('upload');
    } else if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
      setScreen('loading');
    } else if (uploadStatus === 'success') {
      setScreen('result');
    } else if (uploadStatus === 'error') {
      setScreen('loading');
    }
  }, [uploadStatus]);

  const handleGetStarted = () => {
    setScreen('upload');
  };

  const handleNewProblem = () => {
    reset();
    setScreen('upload');
  };

  return (
    <div className="app">
      {screen === 'home' && <HomePage onGetStarted={handleGetStarted} />}
      {screen === 'upload' && <UploadScreen />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'result' && <ResultScreen onNewProblem={handleNewProblem} />}
    </div>
  );
}

export default App;