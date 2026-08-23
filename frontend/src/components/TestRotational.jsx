import React, { useState, useEffect, useMemo } from 'react';
import RotationalKinematicsScene from '../scenes/RotationalKinematicsScene';

function buildTimeSeries({ omega0, alpha, theta0, t_end }) {
  const n = Math.round(t_end * 30);
  const t = [];
  const theta = [];
  const omega = [];
  const alphaArr = [];

  for (let i = 0; i <= n; i++) {
    const time = (i / n) * t_end;
    const thetaVal = theta0 + omega0 * time + 0.5 * alpha * time * time;
    const omegaVal = omega0 + alpha * time;
    t.push(time);
    theta.push(thetaVal);
    omega.push(omegaVal);
    alphaArr.push(alpha);
  }

  return { t, theta, omega, alpha: alphaArr };
}

export default function TestRotational() {
  const [testData, setTestData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Test Case: Wheel from rest, constant angular acceleration
    // omega0 = 0, alpha = 2.0 rad/s², t = 5.0 s
    // Expected: omega_final = 10 rad/s, theta = 25 rad
    const omega0 = 0.0;
    const alpha = 2.0;
    const theta0 = 0.0;
    const t_end = 5.0;

    const ts = buildTimeSeries({ omega0, alpha, theta0, t_end });

    setTestData({
      scenario: 'rotational_kinematics',
      parameters: {
        theta0,
        omega0,
        alpha,
        t_end,
        radius: 0.3,
        object_type: 'disk',
        mass: 2.0,
      },
      animation_spec: {
        duration_s: t_end,
        fps: 30,
      },
      worked_solution: {
        steps: [
          { step: 1, description: 'Identify knowns: omega0 = 0 rad/s, alpha = 2.0 rad/s², t = 5.0 s', equation: null },
          { step: 2, description: 'Calculate final angular velocity', equation: 'omega = omega0 + alpha * t' },
          { step: 3, description: 'Calculate total angle turned', equation: 'theta = theta0 + omega0 * t + 0.5 * alpha * t²' }
        ],
        final_answer: { omega: '10.0 rad/s', theta: '25.0 rad' }
      },
      time_series: {
        t: ts.t,
        theta: ts.theta,
        omega: ts.omega,
        alpha: ts.alpha,
      },
    });
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && testData) {
      const duration = testData.animation_spec?.duration_s || 5.0;
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
        <h3>Test Rotational Kinematics</h3>
        <p>Scenario: {testData.scenario}</p>
        <p>ω₀ = {testData.parameters.omega0} rad/s</p>
        <p>α = {testData.parameters.alpha} rad/s²</p>
        <p>t = {testData.parameters.t_end} s</p>
        <p>Object: {testData.parameters.object_type} (r = {testData.parameters.radius} m)</p>
        <p>Current Time: {currentTime.toFixed(2)}s</p>
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
            fontWeight: 'bold'
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
            fontWeight: 'bold'
          }}
        >
          Reset
        </button>
      </div>

      <RotationalKinematicsScene
        timeSeries={testData.time_series}
        currentTime={currentTime}
        duration={testData.animation_spec?.duration_s}
        parameters={testData.parameters}
      />
    </div>
  );
}