import React, { useState, useEffect, useMemo } from 'react';
import RotationalKinematicsScene from '../scenes/RotationalKinematicsScene';

function buildTimeSeries({ theta0, omega0, alpha, duration }) {
  const n = Math.round(duration * 30);
  const t = [];
  const theta = [];
  const omega = [];

  for (let i = 0; i <= n; i++) {
    const time = (i / n) * duration;
    t.push(time);
    theta.push(theta0 + omega0 * time + 0.5 * alpha * time * time);
    omega.push(omega0 + alpha * time);
  }

  return { t, theta, omega };
}

export default function TestRotational() {
  const [testData, setTestData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Default test scenario: wheel from rest with constant angular acceleration.
    const theta0 = 0.0;
    const omega0 = 0.0;
    const alpha = 2.0;
    const duration = 5.0;
    const radius = 0.3;
    const mass = 2.0;
    const objectType = 'disk';

    const ts = buildTimeSeries({ theta0, omega0, alpha, duration });

    setTestData({
      scenario: 'rotational_kinematics',
      parameters: {
        theta0,
        omega0,
        alpha,
        t_end: duration,
        radius,
        mass,
        object_type: objectType,
      },
      animation_spec: {
        duration_s: duration,
        fps: 30,
      },
      time_series: {
        t: ts.t,
        theta: ts.theta,
        omega: ts.omega,
        alpha: Array(ts.t.length).fill(alpha),
      },
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

  const displayCurrent = useMemo(() => {
    if (!testData?.time_series) return { theta: 0, omega: 0 };
    const idx = Math.min(
      Math.floor(currentTime * (testData.animation_spec?.fps || 30)),
      testData.time_series.t.length - 1
    );
    return {
      theta: testData.time_series.theta[idx] ?? 0,
      omega: testData.time_series.omega[idx] ?? 0,
    };
  }, [testData, currentTime]);

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
        <h3>Test Rotational Kinematics</h3>
        <p>Scenario: {testData.scenario}</p>
        <p>α: {testData.parameters.alpha.toFixed(1)} rad/s²</p>
        <p>ω₀: {testData.parameters.omega0.toFixed(1)} rad/s</p>
        <p>Object: {testData.parameters.object_type} (r = {testData.parameters.radius.toFixed(1)} m)</p>
        <p>Duration: {testData.animation_spec.duration_s.toFixed(1)}s</p>
        <p>Current Time: {currentTime.toFixed(2)}s</p>
        <p>θ: {displayCurrent.theta.toFixed(2)} rad ({(displayCurrent.theta * 180 / Math.PI).toFixed(1)}°)</p>
        <p>ω: {displayCurrent.omega.toFixed(2)} rad/s</p>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '8px 16px',
            background: isPlaying ? '#ef4444' : '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px',
            marginTop: '8px'
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => setCurrentTime(0)}
          style={{
            padding: '8px 16px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Reset
        </button>
      </div>

      <RotationalKinematicsScene
        timeSeries={testData.time_series}
        currentTime={currentTime}
        duration={testData.animation_spec.duration_s}
        parameters={testData.parameters}
      />
    </div>
  );
}