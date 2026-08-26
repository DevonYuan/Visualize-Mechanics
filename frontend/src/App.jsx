import { useState, useEffect } from 'react';
import { useProblemStore } from './store/useProblemStore';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import './App.css';

function App() {
  const { uploadStatus, error, scenario } = useProblemStore();
  const [screen, setScreen] = useState('upload');

  // Sync screen with upload status
  useEffect(() => {
    if (uploadStatus === 'idle') {
      setScreen('upload');
    } else if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
      setScreen('loading');
    } else if (uploadStatus === 'success') {
      setScreen('result');
    } else if (uploadStatus === 'error') {
      setScreen('loading');
    }
  }, [uploadStatus]);

  return (
    <div className="app">
      {screen === 'upload' && <UploadScreen />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}

export default App;