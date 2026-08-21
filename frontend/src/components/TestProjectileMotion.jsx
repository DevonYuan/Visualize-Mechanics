import React, { useState, useEffect } from 'react';
import ProjectileMotionScene from '../scenes/ProjectileMotionScene';

export default function TestProjectileMotion() {
  const [testData, setTestData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Load the test data from JSON file
    fetch('/test_projectile_motion.json')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded test data:', data);
        console.log('Time series length:', data.time_series?.t?.length);
        console.log('Duration:', data.animation_spec?.duration_s);
        setTestData(data);
      })
      .catch(err => {
        console.error('Failed to load test data:', err);
        // Fallback data if file not found
        const v0 = 20.0;
        const angleDeg = 45.0;
        const g = 9.8;
        const angleRad = (angleDeg * Math.PI) / 180;
        const v0x = v0 * Math.cos(angleRad);
        const v0y = v0 * Math.sin(angleRad);
        const tFlight = (2 * v0 * Math.sin(angleRad)) / g;
        const range = v0x * tFlight;
        const maxHeight = (v0y * v0y) / (2 * g);

        const fallbackData = {
          scenario: 'projectile_motion',
          parameters: {
            v0: v0,
            angle_deg: angleDeg,
            g: g,
            initial_height: 0.0,
            v0x: v0x,
            v0y: v0y,
            time_of_flight: tFlight,
            range: range,
            max_height: maxHeight
          },
          animation_spec: {
            duration_s: tFlight,
            fps: 30
          },
          worked_solution: {
            steps: [
              { step: 1, description: `Identify knowns: v0 = ${v0} m/s, angle = ${angleDeg}°, g = ${g} m/s²`, equation: null },
              { step: 2, description: "Calculate velocity components", equation: "v0x = v0 * cos(angle), v0y = v0 * sin(angle)" },
              { step: 3, description: "Calculate time of flight", equation: "t_flight = 2 * v0 * sin(angle) / g" },
              { step: 4, description: "Calculate range", equation: "range = v0x * t_flight" },
              { step: 5, description: "Calculate max height", equation: "h_max = v0y² / (2 * g)" }
            ],
            final_answer: { 
              range: `${range.toFixed(1)} m`, 
              max_height: `${maxHeight.toFixed(1)} m`,
              time_of_flight: `${tFlight.toFixed(2)} s`
            }
          },
          time_series: {
            t: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight],
            x: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(t => v0x * t),
            y: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(t => v0y * t - 0.5 * g * t * t),
            vx: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(() => v0x),
            vy: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(t => v0y - g * t),
            v: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(t => Math.sqrt(v0x * v0x + Math.pow(v0y - g * t, 2))),
            ax: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(() => 0.0),
            ay: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(() => -g),
            a: [0.0, 0.0333, 0.0667, tFlight / 2, tFlight].map(() => g)
          }
        };
        console.log('Using fallback data');
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
        <h3>Test Projectile Motion</h3>
        <p>Scenario: {testData.scenario}</p>
        <p>v₀: {testData.parameters.v0} m/s</p>
        <p>Angle: {testData.parameters.angle_deg}°</p>
        <p>Time of Flight: {testData.parameters.time_of_flight.toFixed(2)}s</p>
        <p>Range: {testData.parameters.range.toFixed(1)}m</p>
        <p>Max Height: {testData.parameters.max_height.toFixed(1)}m</p>
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

      <ProjectileMotionScene 
        timeSeries={testData.time_series} 
        currentTime={currentTime} 
        duration={testData.animation_spec.duration_s} 
      />
    </div>
  );
}