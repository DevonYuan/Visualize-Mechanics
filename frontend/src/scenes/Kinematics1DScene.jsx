import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function KinematicsContent({ timeSeries, currentFrame, bounds, inclineAngle = 0 }) {
  const blockRef = useRef();

  // Convert angle to radians (negative for downward slope to the right)
  const angleRad = useMemo(() => -inclineAngle * Math.PI / 180, [inclineAngle]);

  // Current block position along the incline
  const currentPos = useMemo(() => {
    if (!timeSeries?.x) return new THREE.Vector3(0, 0.5, 0);
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    const x = timeSeries.x[idx] || 0;
    // Position along inclined track (in local coordinates of rotated group)
    // The group is already rotated, so we just place the block at x position along the track
    return new THREE.Vector3(
      x,
      0.5,
      0
    );
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

  // Update block position and rotation
  useFrame(() => {
    if (blockRef.current) {
      blockRef.current.position.copy(currentPos);
      blockRef.current.rotation.z = angleRad;
    }
  });

  // Track dimensions
  const trackLength = bounds.maxX - bounds.minX + 4;
  const trackHeight = 0.2;
  const trackZ = 1.2;

  // Floor grid dimensions
  const floorSize = Math.ceil(trackLength * 2);
  const floorDivisions = floorSize;

  return (
    <>
      {/* Horizontal floor grid (reference plane - always horizontal) */}
      <Grid
        args={[floorSize, floorDivisions]}
        position={[0, -0.5, 0]}
        cellColor="#2a2a2a"
        cellThickness={1}
        sectionColor="#444444"
        sectionThickness={2}
        followCamera={false}
      />

      {/* Inclined track group - rotated by angleRad */}
      <group rotation={[0, 0, angleRad]}>
        {/* Track base */}
        <mesh position={[0, -0.5, 0]} scale={[trackLength, trackHeight, trackZ]} castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#2d2d2d" roughness={0.6} />
        </mesh>

        {/* Track surface (slightly above base) */}
        <mesh position={[0, -0.38, 0]} scale={[trackLength, 0.04, trackZ - 0.1]} castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#444444" roughness={0.4} />
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

        {/* Velocity vector arrow (along the incline) */}
        {Math.abs(currentVelocity) > 0.1 && (
          <group position={currentPos}>
            <mesh
              position={[Math.sign(currentVelocity) * 0.7, 0.8, 0]}
              scale={[0.12, Math.abs(currentVelocity) * 0.12, 0.12]}
              rotation={currentVelocity >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh
              position={[0, Math.abs(currentVelocity) * 0.12 + 0.35, 0]}
              scale={[0.25, 0.25, 0.25]}
              rotation={currentVelocity >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        )}

        {/* Acceleration vector (along the incline) */}
        {Math.abs(currentAccel) > 0.01 && (
          <group position={currentPos}>
            <mesh
              position={[Math.sign(currentAccel) * 0.7, 0.1, 0]}
              scale={[0.1, Math.abs(currentAccel) * 0.1, 0.1]}
              rotation={currentAccel >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <mesh
              position={[0, Math.abs(currentAccel) * 0.1 + 0.3, 0]}
              scale={[0.2, 0.2, 0.2]}
              rotation={currentAccel >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
          </group>
        )}

        {/* Gravity component indicator (when on incline) */}
        {inclineAngle !== 0 && (
          <group position={currentPos}>
            <mesh
              position={[0, -0.7, 0]}
              scale={[0.1, 9.8 * Math.sin(Math.abs(angleRad)) * 0.08, 0.1]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#ef4444" opacity={0.7} transparent />
            </mesh>
            <mesh
              position={[0, -9.8 * Math.sin(Math.abs(angleRad)) * 0.08 - 0.25, 0]}
              scale={[0.2, 0.2, 0.2]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#ef4444" opacity={0.7} transparent />
            </mesh>
            <Html
              position={[0, -1.3, 0]}
              style={{ color: '#ef4444', fontSize: '11px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}
              center
            >
              g·sin({inclineAngle}°)
            </Html>
          </group>
        )}

        {/* Current values display */}
        <Html
          position={currentPos.clone().add(new THREE.Vector3(0, 1.6, 0)).toArray()}
          style={{ color: '#e2e8f0', fontSize: '13px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}
          center
        >
          x = {currentPos.x.toFixed(2)} m
          <br />
          v = {currentVelocity.toFixed(2)} m/s
        </Html>
      </group>
    </>
  );
}

function KinematicsInner({ timeSeries, currentFrame, bounds, inclineAngle = 0, cameraTarget = [0, 1, 0] }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 15, -5]} intensity={0.4} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minZoom={0.3}
        maxZoom={8}
        target={cameraTarget}
      />

      <KinematicsContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        bounds={bounds}
        inclineAngle={inclineAngle}
      />
    </>
  );
}

export default function Kinematics1DScene({ timeSeries, currentTime, duration, parameters = {} }) {
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  // Get incline angle from parameters (in degrees)
  const inclineAngle = parameters.angle_deg || parameters.angle || parameters.incline_angle || parameters.theta || 0;

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

  // Track length for camera calculation
  const trackLength = bounds.maxX - bounds.minX + 4;

  // Camera position: side view to see the incline slope
  const cameraPosition = useMemo(() => {
    if (inclineAngle !== 0) {
      const angleRad = -inclineAngle * Math.PI / 180;
      const trackCenterX = (bounds.minX + bounds.maxX) / 2;
      const distance = Math.max(trackLength, 18);
      // Position camera to see the inclined track
      return [
        trackCenterX * Math.cos(angleRad) - distance * Math.sin(angleRad),
        trackCenterX * Math.sin(angleRad) + distance * Math.cos(angleRad) + 5,
        distance
      ];
    }
    return [0, 6, 12];
  }, [inclineAngle, bounds]);

  // Camera target: look at track center on the incline
  const cameraTarget = useMemo(() => {
    if (inclineAngle !== 0) {
      const angleRad = -inclineAngle * Math.PI / 180;
      const trackCenterX = (bounds.minX + bounds.maxX) / 2;
      // Target the center of the inclined track
      return [
        trackCenterX * Math.cos(angleRad),
        trackCenterX * Math.sin(angleRad) + 0.5,
        0
      ];
    }
    return [0, 1, 0];
  }, [inclineAngle, bounds]);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 35 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#111827']} />
      <KinematicsInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        bounds={bounds}
        inclineAngle={inclineAngle}
        cameraTarget={cameraTarget}
      />
    </Canvas>
  );
}