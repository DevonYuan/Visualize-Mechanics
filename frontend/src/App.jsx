import { useState, useEffect } from 'react';
import { useProblemStore } from './store/useProblemStore';
import HomePage from './components/HomePage';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import TitleBar from './components/TitleBar';
import './App.css';

function App() {
  const { uploadStatus, error, scenario, reset } = useProblemStore();
  const [screen, setScreen] = useState('home');

  // Sync screen with upload status - use functional updates to avoid stale closure
  useEffect(() => {
    console.log('[App] uploadStatus changed:', uploadStatus);
    setScreen(prevScreen => {
      if (uploadStatus === 'idle' && prevScreen !== 'home') {
        console.log('[App] Setting screen to home');
        return 'home';
      } else if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
        console.log('[App] Setting screen to loading');
        return 'loading';
      } else if (uploadStatus === 'success') {
        console.log('[App] Setting screen to result');
        return 'result';
      } else if (uploadStatus === 'error') {
        console.log('[App] Setting screen to loading (error)');
        return 'loading';
      }
      return prevScreen;
    });
  }, [uploadStatus]);

  // Track screen changes
  useEffect(() => {
    console.log('[App] screen changed to:', screen);
  }, [screen]);

  const handleGetStarted = () => {
    setScreen('upload');
  };

  const handleNewProblem = () => {
    reset();
    setScreen('upload');
  };

  return (
    <div className="app">
      <TitleBar />
      <div className="app-content">
        {screen === 'home' && <HomePage onGetStarted={handleGetStarted} />}
        {screen === 'upload' && <UploadScreen />}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'result' && <ResultScreen onNewProblem={handleNewProblem} />}
      </div>
    </div>
  );
}

export default App;