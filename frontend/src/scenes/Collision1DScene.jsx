import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function Collision1DContent({ timeSeries, currentFrame, parameters, bounds }) {
  const block1Ref = useRef();
  const block2Ref = useRef();

  // Current positions
  const currentX1 = useMemo(() => {
    if (!timeSeries?.x1) return bounds.initialX1 ?? -5;
    const idx = Math.min(currentFrame, timeSeries.x1.length - 1);
    return timeSeries.x1[idx] ?? bounds.initialX1 ?? -5;
  }, [timeSeries, currentFrame, bounds.initialX1]);

  const currentX2 = useMemo(() => {
    if (!timeSeries?.x2) return bounds.initialX2 ?? 5;
    const idx = Math.min(currentFrame, timeSeries.x2.length - 1);
    return timeSeries.x2[idx] ?? bounds.initialX2 ?? 5;
  }, [timeSeries, currentFrame, bounds.initialX2]);

  // Block positions in 3D (y = 0.5 for block height/2, z = 0 for 1D alignment)
  // Visual offset: blocks are 1 unit wide, so centers are 0.5 from edges.
  // Physics collision occurs when x1 == x2 (centers coincide), but visually
  // they should touch when right edge of block1 = left edge of block2:
  // x1 + 0.5 = x2 - 0.5 => x2 - x1 = 1. So we offset visual centers by -0.5 and +0.5.
  const block1Pos = useMemo(() => new THREE.Vector3(currentX1 - 0.5, 0.5, 0), [currentX1]);
  const block2Pos = useMemo(() => new THREE.Vector3(currentX2 + 0.5, 0.5, 0), [currentX2]);

  // Update positions each frame
  useFrame(() => {
    if (block1Ref.current) block1Ref.current.position.copy(block1Pos);
    if (block2Ref.current) block2Ref.current.position.copy(block2Pos);
  });

  return (
    <>
      {/* Ground plane */}
      <Grid
        args={[bounds.trackLength, 1]}
        position={[0, -0.5, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Track */}
      <mesh
        position={[0, -0.5, 0]}
        scale={[bounds.trackLength, 0.05, 4]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Track walls */}
      <mesh position={[-bounds.trackLength / 2, 0.5, -1]} scale={[0.1, 1, 2.2]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <mesh position={[bounds.trackLength / 2, 0.5, -1]} scale={[0.1, 1, 2.2]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <mesh position={[-bounds.trackLength / 2, 0.5, 1]} scale={[0.1, 1, 2.2]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <mesh position={[bounds.trackLength / 2, 0.5, 1]} scale={[0.1, 1, 2.2]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#4b5563" />
      </mesh>

      {/* Block 1 (left, typically moving right) */}
      <group ref={block1Ref} position={block1Pos} castShadow receiveShadow>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#3b82f6"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Block 2 (right, typically moving left or stationary) */}
      <group ref={block2Ref} position={block2Pos} castShadow receiveShadow>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#ef4444"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>
    </>
  );
}

function Collision1DScene({ timeSeries, currentTime, duration, parameters }) {
  const frame = Math.floor(currentTime * 30);

  // Calculate bounds from time series or parameters
  const bounds = useMemo(() => {
    const maxX = Math.max(
      timeSeries?.x1?.[timeSeries.x1.length - 1] || parameters?.initial_x1 || 3,
      timeSeries?.x2?.[timeSeries.x2.length - 1] || parameters?.initial_x2 || -3
    );
    const minX = Math.min(
      timeSeries?.x1?.[0] || parameters?.initial_x1 || -5,
      timeSeries?.x2?.[0] || parameters?.initial_x2 || 3
    );
    return {
      trackLength: Math.max(20, (maxX - minX) * 1.5),
      initialX1: timeSeries?.x1?.[0] ?? parameters?.initial_x1 ?? -5,
      initialX2: timeSeries?.x2?.[0] ?? parameters?.initial_x2 ?? 3,
    };
  }, [timeSeries, parameters]);

  return (
    <Canvas
      camera={{ position: [0, 10, 15], fov: 40 }}
      shadows
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -7]} intensity={0.5} />

      <Collision1DContent
        timeSeries={timeSeries}
        currentFrame={frame}
        parameters={parameters}
        bounds={bounds}
      />

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

export default Collision1DScene;