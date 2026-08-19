import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { AxesHelper } from 'three';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function KinematicsContent({ timeSeries, currentFrame, bounds }) {
  const blockRef = useRef();

  // Current block position
  const currentPos = useMemo(() => {
    if (!timeSeries?.x) return new THREE.Vector3(0, 0.5, 0);
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    return new THREE.Vector3(timeSeries.x[idx] || 0, 0.5, 0);
  }, [timeSeries, currentFrame]);

  // Current velocity (for color and optional vector)
  const currentVelocity = useMemo(() => {
    if (!timeSeries?.v) return 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Current acceleration (for optional vector)
  const currentAccel = useMemo(() => {
    if (!timeSeries?.a) return 0;
    const idx = Math.min(currentFrame, timeSeries.a.length - 1);
    return timeSeries.a[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Update block position
  useFrame(() => {
    if (blockRef.current) {
      blockRef.current.position.copy(currentPos);
    }
  });

  return (
    <>
      {/* Ground plane */}
      <Grid
        args={[Math.ceil((bounds.maxX - bounds.minX) * 2), 1]}
        position={[0, -0.5, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Track/line for block */}
      <mesh position={[0, -0.5, 0]} scale={[bounds.maxX - bounds.minX + 4, 0.05, 1]}>
        <boxGeometry />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Block */}
      <mesh ref={blockRef} position={currentPos} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={currentVelocity >= 0 ? '#3b82f6' : '#ef4444'}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Velocity vector arrow (optional - shows direction of motion) */}
      {Math.abs(currentVelocity) > 0.1 && (
        <group position={currentPos}>
          <mesh
            position={[Math.sign(currentVelocity) * 0.75, 0.75, 0]}
            scale={[0.15, Math.abs(currentVelocity) * 0.1, 0.15]}
            rotation={currentVelocity >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh
            position={[0, Math.abs(currentVelocity) * 0.1 + 0.3, 0]}
            scale={[0.3, 0.3, 0.3]}
            rotation={currentVelocity >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}

      {/* Acceleration vector (if non-zero) */}
      {Math.abs(currentAccel) > 0.01 && (
        <group position={currentPos}>
          <mesh
            position={[Math.sign(currentAccel) * 0.75, 0, 0]}
            scale={[0.12, Math.abs(currentAccel) * 0.08, 0.12]}
            rotation={currentAccel >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
          <mesh
            position={[0, Math.abs(currentAccel) * 0.08 + 0.25, 0]}
            scale={[0.25, 0.25, 0.25]}
            rotation={currentAccel >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
        </group>
      )}

      {/* Current values display */}
      <Html
        position={currentPos.clone().add(new THREE.Vector3(0, 1.5, 0)).toArray()}
        style={{ color: '#e2e8f0', fontSize: '14px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}
        center
      >
        x = {currentPos.x.toFixed(2)} m
        <br />
        v = {currentVelocity.toFixed(2)} m/s
      </Html>
    </>
  );
}

function KinematicsInner({ timeSeries, currentFrame, bounds }) {
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
        target={[0, 1, 0]}
      />

      <KinematicsContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        bounds={bounds}
      />
    </>
  );
}

export default function Kinematics1DScene({ timeSeries, currentTime, duration }) {
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  // Calculate scene bounds
  const bounds = useMemo(() => {
    if (!timeSeries?.x) return {
      minX: -10, maxX: 10, minY: -2, maxY: 5,
    };
    const xs = timeSeries.x.filter(v => v !== undefined);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const padding = Math.max((maxX - minX) * 0.2, 2);
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: -2,
      maxY: 5,
    };
  }, [timeSeries]);

  return (
    <Canvas
      camera={{ position: [0, 6, 12], fov: 35 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0f172a']} />
      <KinematicsInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        bounds={bounds}
      />
    </Canvas>
  );
}