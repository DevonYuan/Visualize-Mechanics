import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function KinematicsContent({ timeSeries, currentFrame, bounds, inclineAngle = 0 }) {
  const blockRef = useRef();

  // Convert angle to radians (negative for downward slope to the right)
  const angleRad = useMemo(() => -inclineAngle * Math.PI / 180, [inclineAngle]);

  // Current block position along the incline (distance along the slope)
  const currentX = useMemo(() => {
    if (!timeSeries?.x) return 0;
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    return timeSeries.x[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Current velocity and acceleration
  const currentVelocity = useMemo(() => {
    if (!timeSeries?.v) return 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] || 0;
  }, [timeSeries, currentFrame]);

  const currentAccel = useMemo(() => {
    if (!timeSeries?.a) return 0;
    const idx = Math.min(currentFrame, timeSeries.a.length - 1);
    return timeSeries.a[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Block position in WORLD coordinates (not rotated group)
  // Track starts at x=0, y=0 (ground level), slopes downward
  // Block center is at half-block-height (0.5) above track surface
  const blockPos = useMemo(() => {
    if (inclineAngle === 0) {
      // Horizontal track: block at (x, 0.5, 0)
      return new THREE.Vector3(currentX, 0.5, 0);
    }
    // Inclined track: track surface goes through origin, slopes down
    // Track surface: y = x * tan(angleRad) where angleRad is negative
    // Block center: offset by 0.5 perpendicular to track surface
    // Perpendicular vector to track (pointing up from surface): (-sin(angleRad), cos(angleRad), 0)
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);
    const trackSurfaceY = currentX * Math.tan(angleRad);
    return new THREE.Vector3(
      currentX + perpX * 0.5,
      trackSurfaceY + perpY * 0.5,
      0
    );
  }, [currentX, angleRad, inclineAngle]);

  // Block rotation (aligns with track)
  const blockRotation = useMemo(() => {
    return inclineAngle === 0 ? 0 : angleRad;
  }, [angleRad, inclineAngle]);

  // Update block position and rotation
  useFrame(() => {
    if (blockRef.current) {
      blockRef.current.position.copy(blockPos);
      blockRef.current.rotation.z = blockRotation;
    }
  });

  // Track dimensions
  const trackLength = bounds.maxX - bounds.minX + 4;
  const trackHeight = 0.2;
  const trackZ = 1.2;

  // Track geometry in WORLD coordinates
  // Track base: rectangular box from x=minX to x=maxX, centered vertically
  // For incline: track is a rotated box positioned so its surface passes through y=0 at x=0
  const trackCenterX = (bounds.minX + bounds.maxX) / 2;
  const trackCenterY = inclineAngle === 0 ? -0.5 : trackCenterX * Math.tan(angleRad);

  return (
    <>
      {/* Horizontal floor grid (reference plane) - only show for horizontal motion */}
      {inclineAngle === 0 && (
        <Grid
          args={[Math.ceil(trackLength * 2), Math.ceil(trackLength * 2)]}
          position={[0, -0.5, 0]}
          cellColor="#2a2a2a"
          cellThickness={1}
          sectionColor="#444444"
          sectionThickness={2}
          followCamera={false}
        />
      )}

      {/* Inclined track - positioned in world coordinates */}
      <mesh
        position={[trackCenterX, trackCenterY - trackHeight / 2, 0]}
        rotation={[0, 0, angleRad]}
        scale={[trackLength, trackHeight, trackZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial color="#2d2d2d" roughness={0.6} />
      </mesh>

      {/* Track surface (slightly above base) */}
      <mesh
        position={[trackCenterX, trackCenterY - trackHeight / 2 + 0.12, 0]}
        rotation={[0, 0, angleRad]}
        scale={[trackLength, 0.04, trackZ - 0.1]}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial color="#444444" roughness={0.4} />
      </mesh>

      {/* Block */}
      <mesh ref={blockRef} position={blockPos} rotation={[0, 0, blockRotation]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={currentVelocity >= 0 ? '#3b82f6' : '#ef4444'}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Velocity vector arrow (along the incline) */}
      {Math.abs(currentVelocity) > 0.1 && (
        <group position={blockPos} rotation={[0, 0, blockRotation]}>
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
          <Html
            position={[Math.sign(currentVelocity) * 1.2, 1.2, 0]}
            style={{ color: '#22c55e', fontSize: '10px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}
            center
          >
            v
          </Html>
        </group>
      )}

      {/* Current values display */}
      <Html
        position={blockPos.clone().add(new THREE.Vector3(0, 1.8, 0)).toArray()}
        style={{ color: '#e2e8f0', fontSize: '13px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}
        center
      >
        x = {currentX.toFixed(2)} m
        <br />
        v = {currentVelocity.toFixed(2)} m/s
      </Html>
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
      const trackCenterY = trackCenterX * Math.tan(angleRad);
      const distance = Math.max(trackLength, 18);
      // Position camera to see the inclined track
      return [
        trackCenterX - distance * Math.sin(angleRad),
        trackCenterY + distance * Math.cos(angleRad) + 5,
        distance
      ];
    }
    // For horizontal (1D) movement: side view along Z-axis for 2D appearance
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    const distance = Math.max(trackLength, 15);
    return [trackCenterX, 1, distance];
  }, [inclineAngle, bounds]);

  // Camera target: look at track center on the incline
  const cameraTarget = useMemo(() => {
    if (inclineAngle !== 0) {
      const angleRad = -inclineAngle * Math.PI / 180;
      const trackCenterX = (bounds.minX + bounds.maxX) / 2;
      const trackCenterY = trackCenterX * Math.tan(angleRad);
      // Target the center of the inclined track
      return [
        trackCenterX,
        trackCenterY + 0.5,
        0
      ];
    }
    // For horizontal (1D) movement: look at track center from side
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    return [trackCenterX, 1, 0];
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