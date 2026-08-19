import React, { useState, useEffect } from 'react';
import Kinematics1DScene from '../scenes/Kinematics1DScene';

export default function TestAngleRender() {
  const [testData, setTestData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Load the test data
    fetch('/test_result_with_angle.json')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded test data:', data);
        console.log('Angle from test data:', data.parameters.angle_deg);
        setTestData(data);
      })
      .catch(err => {
        console.error('Failed to load test data:', err);
        // Try with sample data if file not found
        const fallbackData = {
          scenario: 'kinematics_1d',
          parameters: {
            x0: 0.0,
            v0: 0.0,
            a: 6.0,
            t_end: 3.0,
            angle_deg: 10.0,
            a_verified: 6.0
          },
          animation_spec: {
            duration_s: 3.0,
            fps: 30
          },
          worked_solution: {
            steps: [
              { step: 1, description: "Identify knowns: d = 27.0 m, t = 3.0 s, v0 = 0.0 m/s", equation: null },
              { step: 2, description: "Calculate acceleration", equation: "a = 2 * d / t^2" },
              { step: 3, description: "Calculate final velocity", equation: "v = v0 + a * t" }
            ],
            final_answer: { acceleration: "6.0 m/s^2" }
          },
          time_series: {
            t: [0.0, 0.0333, 0.0667, 1.5, 3.0],
            x: [0.0, 0.0033, 0.0133, 6.75, 27.0],
            v: [0.0, 0.2, 0.4, 9.0, 18.0],
            a: [6.0, 6.0, 6.0, 6.0, 6.0]
          }
        };
        console.log('Using fallback data with angle:', fallbackData.parameters.angle_deg);
        setTestData(fallbackData);
      });
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && testData) {
      const duration = testData.animation_spec?.duration_s || 3.0;
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.016; // ~60fps
        });
      }, 16);
    }
    return () => clearInterval(interval);
  }, [isPlaying, testData]);

  if (!testData) {
    return <div style={{ padding: '20px', color: 'white' }}>Loading test data...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        zIndex: 10, 
        background: 'rgba(0,0,0,0.7)', 
        padding: '15px', 
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <h3>Test Angle Rendering</h3>
        <p>Scenario: {testData.scenario}</p>
        <p>Angle: {testData.parameters.angle_deg}°</p>
        <p>Expected: Track should be inclined at {testData.parameters.angle_deg}°</p>
        <p>Current Time: {currentTime.toFixed(2)}s</p>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ 
            padding: '8px 16px', 
            background: isPlaying ? '#ef4444' : '#22c55e', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button 
          onClick={() => setCurrentTime(0)}
          style={{ 
            padding: '8px 16px', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px'
          }}
        >
          Reset
        </button>
        <input
          type="range"
          min="0"
          max={testData.animation_spec?.duration_s || 3.0}
          step="0.01"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          style={{ width: '200px', marginLeft: '8px' }}
        />
      </div>
      
      <Kinematics1DScene
        timeSeries={testData.time_series}
        currentTime={currentTime}
        duration={testData.animation_spec?.duration_s || 3.0}
        parameters={testData.parameters}
      />
    </div>
  );
}