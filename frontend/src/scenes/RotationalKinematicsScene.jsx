import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function RotationalKinematicsContent({ timeSeries, currentFrame, parameters, bounds }) {
  const rotatingObjectRef = useRef();
  const omegaVectorRef = useRef();
  const alphaVectorRef = useRef();
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

  const currentAlpha = useMemo(() => {
    if (!timeSeries?.alpha) return parameters?.alpha || 0;
    const idx = Math.min(currentFrame, timeSeries.alpha.length - 1);
    return timeSeries.alpha[idx] ?? (parameters?.alpha || 0);
  }, [timeSeries, currentFrame, parameters]);

  const currentTime = useMemo(() => {
    if (!timeSeries?.t) return 0;
    const idx = Math.min(currentFrame, timeSeries.t.length - 1);
    return timeSeries.t[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Object dimensions
  const radius = parameters?.radius || 1;
  const objectType = parameters?.object_type || 'disk'; // 'disk', 'rod', 'hoop', 'sphere'

  // Update rotation
  useFrame(() => {
    if (rotatingObjectRef.current) {
      rotatingObjectRef.current.rotation.z = currentTheta;
    }

    // Angular velocity vector (along z-axis, comes out of screen for positive)
    if (omegaVectorRef.current && Math.abs(currentOmega) > 0.1) {
      const scale = Math.max(Math.abs(currentOmega) * 0.3, 0.3);
      omegaVectorRef.current.scale.z = scale;
      // Arrow direction depends on sign of omega (right-hand rule)
      omegaVectorRef.current.rotation.x = currentOmega >= 0 ? 0 : Math.PI;
    }

    // Angular acceleration vector
    if (alphaVectorRef.current && Math.abs(currentAlpha) > 0.01) {
      const scale = Math.max(Math.abs(currentAlpha) * 0.25, 0.2);
      alphaVectorRef.current.scale.z = scale;
      alphaVectorRef.current.rotation.x = currentAlpha >= 0 ? 0 : Math.PI;
    }

    // Angle marker (shows current angle from reference)
    if (angleMarkerRef.current) {
      angleMarkerRef.current.rotation.z = currentTheta;
    }
  });

  // Create rotating object based on type
  const RotatingObject = () => {
    switch (objectType) {
      case 'rod':
        return (
          <group>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.1, 0.1, radius * 2, 16]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* End markers */}
            <mesh position={[0, 0, radius]} castShadow receiveShadow>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, 0, -radius]} castShadow receiveShadow>
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
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[radius, radius, 0.4, 32]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Radial marker to see rotation */}
            <mesh position={[radius * 0.7, 0, 0.22]} scale={0.1}>
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            {/* Center axle */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.15}>
              <cylinderGeometry args={[1, 1, 0.6, 16]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </group>
        );
    }
  };

  // Moment of inertia for display
  const momentOfInertia = useMemo(() => {
    const m = parameters?.mass || 1;
    const r = radius;
    switch (objectType) {
      case 'rod': return (1/12) * m * (2*r) * (2*r); // about center
      case 'hoop': return m * r * r;
      case 'sphere': return 0.4 * m * r * r;
      default: return 0.5 * m * r * r; // disk
    }
  }, [parameters, radius, objectType]);

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

      {/* Support stand */}
      <group>
        <mesh position={[0, -1, 0]} scale={[1, 2, 1]}>
          <boxGeometry />
          <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0]} scale={[0.15, 0.1, 0.15]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Horizontal arm holding object */}
        <mesh position={[-radius - 1.5, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.1, 0.1, radius + 1.5]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      </group>

      {/* Rotating object */}
      <group ref={rotatingObjectRef} position={[0, 0, 0]}>
        <RotatingObject />
      </group>

      {/* Angular velocity vector (pseudo-vector along axis) */}
      {Math.abs(currentOmega) > 0.1 && (
        <group ref={omegaVectorRef} position={[0, 0, 0]}>
          <mesh
            position={[0, 0, Math.sign(currentOmega) * 0.2]}
            scale={[0.12, 0.12, Math.abs(currentOmega) * 0.25]}
            rotation={currentOmega >= 0 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh
            position={[0, 0, Math.sign(currentOmega) * (Math.abs(currentOmega) * 0.25 + 0.15)]}
            scale={0.3}
            rotation={currentOmega >= 0 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}

      {/* Angular acceleration vector */}
      {Math.abs(currentAlpha) > 0.01 && (
        <group ref={alphaVectorRef} position={[0, 0, 0]}>
          <mesh
            position={[0, 0, Math.sign(currentAlpha) * 0.2]}
            scale={[0.1, 0.1, (Math.abs(currentAlpha) * 0.2)]}
            rotation={currentAlpha >= 0 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
          <mesh
            position={[0, 0, Math.sign(currentAlpha) * (Math.abs(currentAlpha) * 0.2 + 0.1)]}
            scale={0.25}
            rotation={currentAlpha >= 0 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
        </group>
      )}

      {/* Angle reference line (at theta = 0) */}
      <line
        geometry={new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(radius + 1.5, 0, 0),
        ])}
        material={new THREE.LineBasicMaterial({ color: '#6b7280', linewidth: 1, transparent: true, opacity: 0.5 })}
      />

      {/* Current angle arc indicator */}
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
        <Html
          position={[
            Math.cos(currentTheta / 2) * (radius + 1.5),
            Math.sin(currentTheta / 2) * (radius + 1.5),
            0
          ]}
          style={{ color: '#f97316', fontSize: '14px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
          center
        >
          θ = {(currentTheta * 180 / Math.PI).toFixed(1)}°
        </Html>
      </group>

      {/* Velocity/acceleration values display */}
      <group position={[radius + 3, 0, 0]}>
        <Html
          position={[0, 1.5, 0]}
          style={{ color: '#22c55e', fontSize: '16px', pointerEvents: 'none', fontWeight: '600' }}
        >
          ω = {currentOmega.toFixed(2)} rad/s
        </Html>
        <Html
          position={[0, 0.5, 0]}
          style={{ color: '#f97316', fontSize: '16px', pointerEvents: 'none', fontWeight: '600' }}
        >
          α = {currentAlpha.toFixed(2)} rad/s²
        </Html>
        <Html
          position={[0, -0.5, 0]}
          style={{ color: '#3b82f6', fontSize: '16px', pointerEvents: 'none', fontWeight: '600' }}
        >
          t = {currentTime.toFixed(2)} s
        </Html>
      </group>

      {/* Legend */}
      <Html
        position={[-4.5, -1.5, -3]}
        style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', lineHeight: '1.8' }}
      >
        <div style={{ color: '#3b82f6', fontWeight: '600' }}>Rotational Kinematics</div>
        <div>Object: {objectType} (r = {radius.toFixed(2)} m)</div>
        <div>I = {momentOfInertia.toFixed(3)} kg·m²</div>
        <div style={{ color: '#22c55e' }}>▲ ω (angular velocity) - green</div>
        <div style={{ color: '#f97316' }}>▲ α (angular accel) - orange</div>
        <div style={{ color: '#f97316' }}>⌒ θ = {(currentTheta * 180 / Math.PI).toFixed(1)}°</div>
      </Html>

      {/* Parameter info panel */}
      <Html
        position={[3.5, -1.5, -3]}
        style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', lineHeight: '1.8' }}
      >
        <div style={{ color: '#3b82f6', fontWeight: '600' }}>Parameters</div>
        <div>ω₀ = {parameters?.omega0?.toFixed(2) || '?'} rad/s</div>
        <div>α = {parameters?.alpha?.toFixed(2) || '?'} rad/s²</div>
        <div>Duration: {parameters?.t_end?.toFixed(2) || bounds.duration?.toFixed(2) || '?'} s</div>
        {parameters?.torque && <div>τ = {parameters.torque.toFixed(2)} N·m</div>}
        {parameters?.mass && <div>m = {parameters.mass.toFixed(2)} kg</div>}
      </Html>
    </>
  );
}

function RotationalKinematicsInner({ timeSeries, currentFrame, parameters, bounds }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minZoom={0.5}
        maxZoom={5}
        target={[0, 0, 0]}
      />

      <RotationalKinematicsContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        parameters={parameters}
        bounds={bounds}
      />
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

  return (
    <Canvas
      camera={{ position: [4, 3, 8], fov: 45 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0f172a']} />
      <RotationalKinematicsInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        parameters={parameters}
        bounds={bounds}
      />
    </Canvas>
  );
}