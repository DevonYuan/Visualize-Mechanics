import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function RotationalKinematicsContent({ timeSeries, currentFrame, parameters }) {
  const rotatingObjectRef = useRef();
  const angleMarkerRef = useRef();

  // Current angular values
  const currentTheta = useMemo(() => {
    if (!timeSeries?.theta) return 0;
    const idx = Math.min(currentFrame, timeSeries.theta.length - 1);
    return timeSeries.theta[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  const currentOmega = useMemo(() => {
    if (!timeSeries?.omega) return parameters?.omega0 || 0;
    const idx = Math.min(currentFrame, timeSeries.omega.length - 1);
    return timeSeries.omega[idx] ?? (parameters?.omega0 || 0);
  }, [timeSeries, currentFrame, parameters]);

  // Object dimensions
  const radius = parameters?.radius || 1;
  const objectType = parameters?.object_type || 'disk'; // 'disk', 'rod', 'hoop', 'sphere'

  // Direction-of-rotation circular arrow (static arc around the wheel face).
  // Pointed along the current spin direction: CCW (as seen from +z) when
  // omega is positive, CW when negative.
  const rotationSign = currentOmega >= 0 ? 1 : -1;
  const rotationArcGeo = useMemo(() => {
    const ringR = radius + 0.45;
    const span = 2 * Math.PI - 1.0; // leave a gap so the arrowhead reads cleanly
    const steps = 48;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a =
        rotationSign > 0
          ? 0.5 + (i / steps) * span
          : 2 * Math.PI - 0.5 - (i / steps) * span;
      pts.push(new THREE.Vector3(Math.cos(a) * ringR, Math.sin(a) * ringR, 0.25));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, rotationSign]);

  const rotationArrowEnd = useMemo(() => {
    const ringR = radius + 0.45;
    const a = rotationSign > 0 ? 2 * Math.PI - 0.5 : 0.5;
    const tx = rotationSign > 0 ? -Math.sin(a) : Math.sin(a);
    const ty = rotationSign > 0 ? Math.cos(a) : -Math.cos(a);
    return {
      x: Math.cos(a) * ringR,
      y: Math.sin(a) * ringR,
      rotZ: Math.atan2(ty, tx) - Math.PI / 2,
    };
  }, [radius, rotationSign]);

  // Update rotation each frame
  useFrame(() => {
    if (rotatingObjectRef.current) {
      rotatingObjectRef.current.rotation.z = currentTheta;
    }

    // Current angle arc
    if (angleMarkerRef.current) {
      angleMarkerRef.current.rotation.z = currentTheta;
    }
  });

  // Rotating object geometry based on type
  const RotatingObject = () => {
    switch (objectType) {
      case 'rod':
        return (
          <group>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.1, 0.1, radius * 2, 16]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* End markers to visualize rotation */}
            <mesh position={[0, 0, radius]} castShadow>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, 0, -radius]} castShadow>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
        );
      case 'hoop':
        return (
          <mesh castShadow receiveShadow>
            <torusGeometry args={[radius, 0.15, 16, 32]} />
            <meshStandardMaterial color="#f97316" roughness={0.3} metalness={0.1} />
          </mesh>
        );
      case 'sphere':
        return (
          <group>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[radius, 24, 24]} />
              <meshStandardMaterial
                color="#22c55e"
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
            {/* Rotation indicator */}
            <mesh position={[radius * 0.7, 0, 0]} scale={0.15}>
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        );
      default: // 'disk'
        return (
          <group>
            {/* Cylinder axis aligned with the rotation axis (z) so the wheel
                spins about its own axis like a flywheel */}
            <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[radius, radius, 0.4, 32]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Radial marker to visualize rotation */}
            <mesh position={[radius * 0.7, 0, 0.22]} scale={0.1}>
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        );
    }
  };

  return (
    <>
      {/* Ground plane */}
      <Grid
        args={[10, 1]}
        position={[0, -2, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Rotating object */}
      <group ref={rotatingObjectRef} position={[0, 0, 0]}>
        <RotatingObject />
      </group>

      {/* Axis of rotation (line straight through the wheel centre, along z) */}
      <line
        geometry={new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, -(radius + 1.2)),
          new THREE.Vector3(0, 0, radius + 1.2),
        ])}
        material={new THREE.LineBasicMaterial({ color: '#a1a1aa', transparent: true, opacity: 0.8 })}
      />

      {/* Direction of rotation: circular arrow around the wheel face */}
      <line geometry={rotationArcGeo}>
        <lineBasicMaterial color="#38bdf8" toneMapped={false} />
      </line>
      <group position={[rotationArrowEnd.x, rotationArrowEnd.y, 0.25]} rotation={[0, 0, rotationArrowEnd.rotZ]}>
        <mesh position={[0, -0.06, 0]}>
          <coneGeometry args={[0.12, 0.4, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Current angle arc */}
      <group ref={angleMarkerRef}>
        <line
          geometry={new THREE.BufferGeometry().setFromPoints(
            Array.from({ length: 33 }, (_, i) =>
              new THREE.Vector3(
                Math.cos((i / 32) * currentTheta) * (radius + 1),
                Math.sin((i / 32) * currentTheta) * (radius + 1),
                0
              )
            )
          )}
          material={new THREE.LineBasicMaterial({ color: '#f97316', linewidth: 3 })}
        />
      </group>
    </>
  );
}

export default function RotationalKinematicsScene({ timeSeries, currentTime, duration, parameters }) {
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  const bounds = useMemo(() => {
    const radius = parameters?.radius || 1;
    const t_end = parameters?.t_end || duration || 5;
    return {
      duration: t_end,
      radius,
    };
  }, [parameters, duration]);

  // Live values for the side overlay
  const currentTheta = timeSeries?.theta?.[Math.min(frameIndex, (timeSeries.theta?.length || 1) - 1)] ?? parameters?.theta0 ?? 0;
  const currentOmega = timeSeries?.omega?.[Math.min(frameIndex, (timeSeries.omega?.length || 1) - 1)] ?? parameters?.omega0 ?? 0;
  const currentAlpha = timeSeries?.alpha?.[Math.min(frameIndex, (timeSeries.alpha?.length || 1) - 1)] ?? parameters?.alpha ?? 0;
  const currentT = timeSeries?.t?.[Math.min(frameIndex, (timeSeries.t?.length || 1) - 1)] ?? currentTime;

  const radius = parameters?.radius || 1;
  const objectType = parameters?.object_type || 'disk';
  const mass = parameters?.mass;

  // Moment of inertia for display
  const momentOfInertia = useMemo(() => {
    const m = parameters?.mass || 1;
    switch (objectType) {
      case 'rod': return (1 / 12) * m * (2 * radius) * (2 * radius); // about center
      case 'hoop': return m * radius * radius;
      case 'sphere': return 0.4 * m * radius * radius;
      default: return 0.5 * m * radius * radius; // disk
    }
  }, [parameters, objectType, radius]);

  // Maximum angular speed reached over the animation
  const omegaMax = useMemo(() => {
    const w0 = parameters?.omega0 ?? 0;
    const a = parameters?.alpha ?? 0;
    const tEnd = bounds.duration || 0;
    return Math.abs(w0 + a * tEnd);
  }, [parameters, bounds.duration]);

  const omega0Value = (parameters?.omega0 ?? 0).toFixed(2);
  const alphaValue = (parameters?.alpha ?? 0).toFixed(2);
  const tEndValue = (bounds.duration ?? 0).toFixed(1);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [4, 3, 8], fov: 45 }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <directionalLight position={[-5, 10, -5]} intensity={0.3} />

        <RotationalKinematicsContent
          timeSeries={timeSeries}
          currentFrame={frameIndex}
          parameters={parameters}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minZoom={0.5}
          maxZoom={5}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Screen-space overlay - time series values off to the side */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        background: 'rgba(17, 24, 39, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.8',
        border: '1px solid #374151',
        minWidth: '220px',
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parameters</div>
        <div>ω₀ = {omega0Value} rad/s</div>
        <div>α = {alphaValue} rad/s²</div>
        <div>t = {tEndValue} s</div>
        {mass && <div>m = {Number(mass).toFixed(2)} kg</div>}
        <div style={{ borderTop: '1px solid #374151', marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Derived</div>
          <div>I = {momentOfInertia.toFixed(3)} kg·m²</div>
          <div>ω_max = {omegaMax.toFixed(2)} rad/s</div>
        </div>
        <div style={{ borderTop: '1px solid #374151', marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</div>
          <div style={{ color: '#fbbf24', fontWeight: '600' }}>θ = {(currentTheta * 180 / Math.PI).toFixed(1)}°</div>
          <div style={{ color: '#22c55e' }}>ω = {currentOmega.toFixed(2)} rad/s</div>
          <div style={{ color: '#f97316' }}>α = {currentAlpha.toFixed(2)} rad/s²</div>
          <div style={{ color: '#94a3b8' }}>t = {currentT.toFixed(2)} s</div>
        </div>
      </div>
    </div>
  );
}