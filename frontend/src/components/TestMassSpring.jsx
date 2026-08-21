import React, { useState, useEffect, useMemo } from 'react';
import MassSpringScene from '../scenes/MassSpringScene';

function buildTimeSeries({ mass, k, x0, v0, duration }) {
  const omega = Math.sqrt(k / mass);
  const A = Math.sqrt(x0 * x0 + (v0 / omega) * (v0 / omega));
  const phi = omega > 0 && A > 0 ? Math.atan2(-v0 / omega, x0) : 0;
  const period = (2 * Math.PI) / omega;

  const n = Math.round(duration * 30);
  const t = [];
  const x_eq = [];
  const v = [];
  const a = [];
  const force = [];
  const ke = [];
  const pe = [];
  const e_total = [];

  for (let i = 0; i <= n; i++) {
    const time = (i / n) * duration;
    const disp = A * Math.cos(omega * time + phi);
    const vel = -A * omega * Math.sin(omega * time + phi);
    t.push(time);
    x_eq.push(disp);
    v.push(vel);
    a.push(-A * omega * omega * Math.cos(omega * time + phi));
    force.push(-k * disp);
    ke.push(0.5 * mass * vel * vel);
    pe.push(0.5 * k * disp * disp);
    e_total.push(0.5 * k * A * A);
  }

  return {
    t, x_eq, v, a, force, ke, pe, e_total,
    omega, A, period,
  };
}

export default function TestMassSpring() {
  const [testData, setTestData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Fallback / default test scenario for a mass on a spring (SHM).
    const mass = 1.0;
    const k = 4.0;
    const x0 = 0.8;
    const v0 = 0.0;
    const duration = Math.max(2 * Math.PI * Math.sqrt(mass / k), 3.0); // at least one period

    const ts = buildTimeSeries({ mass, k, x0, v0, duration });

    setTestData({
      scenario: 'mass_spring',
      parameters: {
        mass,
        k,
        x0,
        v0,
        omega: ts.omega,
        period: ts.period,
        amplitude: ts.A,
      },
      animation_spec: {
        duration_s: duration,
        fps: 30,
      },
      time_series: {
        t: ts.t,
        x_eq: ts.x_eq,
        v: ts.v,
        a: ts.a,
        force: ts.force,
        ke: ts.ke,
        pe: ts.pe,
        e_total: ts.e_total,
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
    if (!testData?.time_series) return 0;
    const idx = Math.min(
      Math.floor(currentTime * testData.animation_spec?.fps || 30),
      testData.time_series.t.length - 1
    );
    return {
      x: testData.time_series.x_eq[idx] ?? 0,
      v: testData.time_series.v[idx] ?? 0,
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
        <h3>Test Mass Spring System</h3>
        <p>Scenario: {testData.scenario}</p>
        <p>m: {testData.parameters.mass.toFixed(1)} kg</p>
        <p>k: {testData.parameters.k.toFixed(1)} N/m</p>
        <p>Period: {testData.parameters.period.toFixed(2)}s</p>
        <p>Current Time: {currentTime.toFixed(2)}s</p>
        <p>Displacement x: {displayCurrent.x.toFixed(2)} m</p>
        <p>Velocity v: {displayCurrent.v.toFixed(2)} m/s</p>
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

      <MassSpringScene
        timeSeries={testData.time_series}
        currentTime={currentTime}
        duration={testData.animation_spec.duration_s}
        parameters={testData.parameters}
      />
    </div>
  );
}