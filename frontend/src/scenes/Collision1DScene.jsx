import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function Collision1DContent({ timeSeries, currentFrame, parameters, bounds }) {
  const block1Ref = useRef();
  const block2Ref = useRef();
  const v1VectorRef = useRef();
  const v2VectorRef = useRef();
  const forceVectorRef1 = useRef();
  const forceVectorRef2 = useRef();

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

  // Current velocities
  const currentV1 = useMemo(() => {
    if (!timeSeries?.v1) return 0;
    const idx = Math.min(currentFrame, timeSeries.v1.length - 1);
    return timeSeries.v1[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  const currentV2 = useMemo(() => {
    if (!timeSeries?.v2) return 0;
    const idx = Math.min(currentFrame, timeSeries.v2.length - 1);
    return timeSeries.v2[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Current accelerations
  const currentA1 = useMemo(() => {
    if (!timeSeries?.a1) return 0;
    const idx = Math.min(currentFrame, timeSeries.a1.length - 1);
    return timeSeries.a1[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  const currentA2 = useMemo(() => {
    if (!timeSeries?.a2) return 0;
    const idx = Math.min(currentFrame, timeSeries.a2.length - 1);
    return timeSeries.a2[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Contact force during collision
  const currentForce = useMemo(() => {
    if (!timeSeries?.force) return 0;
    const idx = Math.min(currentFrame, timeSeries.force.length - 1);
    return timeSeries.force[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Block positions in 3D (y = 0.5 for block height/2)
  const block1Pos = useMemo(() => new THREE.Vector3(currentX1, 0.5, -1), [currentX1]);
  const block2Pos = useMemo(() => new THREE.Vector3(currentX2, 0.5, 1), [currentX2]);

  // Update positions each frame
  useFrame(() => {
    if (block1Ref.current) block1Ref.current.position.copy(block1Pos);
    if (block2Ref.current) block2Ref.current.position.copy(block2Pos);

    // Velocity vector 1
    if (v1VectorRef.current && Math.abs(currentV1) > 0.1) {
      v1VectorRef.current.position.copy(block1Pos.clone().add(new THREE.Vector3(0, 1, 0)));
      const scale = Math.max(Math.abs(currentV1) * 0.15, 0.2);
      v1VectorRef.current.scale.y = scale;
      v1VectorRef.current.rotation.y = currentV1 >= 0 ? 0 : Math.PI;
    }

    // Velocity vector 2
    if (v2VectorRef.current && Math.abs(currentV2) > 0.1) {
      v2VectorRef.current.position.copy(block2Pos.clone().add(new THREE.Vector3(0, 1, 0)));
      const scale = Math.max(Math.abs(currentV2) * 0.15, 0.2);
      v2VectorRef.current.scale.y = scale;
      v2VectorRef.current.rotation.y = currentV2 >= 0 ? 0 : Math.PI;
    }

    // Force vectors during collision
    if (forceVectorRef1.current && currentForce > 0.1) {
      forceVectorRef1.current.position.copy(block1Pos);
      forceVectorRef1.current.scale.y = Math.max(currentForce * 0.01, 0.2);
      // Force on block 1 is opposite to direction of motion during collision
      forceVectorRef1.current.rotation.y = currentV1 >= 0 ? Math.PI : 0;
    }
    if (forceVectorRef2.current && currentForce > 0.1) {
      forceVectorRef2.current.position.copy(block2Pos);
      forceVectorRef2.current.scale.y = Math.max(currentForce * 0.01, 0.2);
      // Force on block 2 is opposite to direction of motion during collision
      forceVectorRef2.current.rotation.y = currentV2 >= 0 ? Math.PI : 0;
    }
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

      {/* Collision zone indicator */}
      <mesh
        position={[0, 0.02, 0]}
        scale={[2, 0.01, 4]}
        receiveShadow
      >
        <boxGeometry />
        <meshBasicMaterial color="#f97316" transparent opacity={0.3} />
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
        <Html
          position={[0, 0, 0]}
          style={{ color: '#e2e8f0', fontSize: '14px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
          center
        >
          m₁ = {parameters?.m1?.toFixed(1) || '?'} kg
        </Html>
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
        <Html
          position={[0, 0, 0]}
          style={{ color: '#e2e8f0', fontSize: '14px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
          center
        >
          m₂ = {parameters?.m2?.toFixed(1) || '?'} kg
        </Html>
      </group>

      {/* Velocity vector for block 1 */}
      {Math.abs(currentV1) > 0.1 && (
        <group ref={v1VectorRef} position={block1Pos.clone().add(new THREE.Vector3(0, 1, 0))}>
          <mesh
            position={[0, Math.abs(currentV1) * 0.075, 0]}
            scale={[0.15, Math.abs(currentV1) * 0.15, 0.15]}
            rotation={currentV1 >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh
            position={[0, Math.abs(currentV1) * 0.15 + 0.2, 0]}
            scale={0.25}
            rotation={currentV1 >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <Html
            position={[0, Math.abs(currentV1) * 0.15 + 0.5, 0]}
            style={{ color: '#22c55e', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
            center
          >
            v₁ = {currentV1.toFixed(2)} m/s
          </Html>
        </group>
      )}

      {/* Velocity vector for block 2 */}
      {Math.abs(currentV2) > 0.1 && (
        <group ref={v2VectorRef} position={block2Pos.clone().add(new THREE.Vector3(0, 1, 0))}>
          <mesh
            position={[0, Math.abs(currentV2) * 0.075, 0]}
            scale={[0.15, Math.abs(currentV2) * 0.15, 0.15]}
            rotation={currentV2 >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh
            position={[0, Math.abs(currentV2) * 0.15 + 0.2, 0]}
            scale={0.25}
            rotation={currentV2 >= 0 ? [0, 0, 0] : [0, Math.PI, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <Html
            position={[0, Math.abs(currentV2) * 0.15 + 0.5, 0]}
            style={{ color: '#22c55e', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
            center
          >
            v₂ = {currentV2.toFixed(2)} m/s
          </Html>
        </group>
      )}

      {/* Force vectors during collision (equal and opposite) */}
      {currentForce > 0.1 && (
        <>
          <group ref={forceVectorRef1} position={block1Pos}>
            <mesh
              position={[0, currentForce * 0.005, 0]}
              scale={[0.12, currentForce * 0.01, 0.12]}
              rotation={currentV1 >= 0 ? [0, Math.PI, 0] : [0, 0, 0]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <mesh
              position={[0, currentForce * 0.01 + 0.3, 0]}
              scale={0.25}
              rotation={currentV1 >= 0 ? [0, Math.PI, 0] : [0, 0, 0]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <Html
              position={[0, currentForce * 0.01 + 0.6, 0]}
              style={{ color: '#f97316', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
              center
            >
              F = {currentForce.toFixed(1)} N
            </Html>
          </group>

          <group ref={forceVectorRef2} position={block2Pos}>
            <mesh
              position={[0, currentForce * 0.005, 0]}
              scale={[0.12, currentForce * 0.01, 0.12]}
              rotation={currentV2 >= 0 ? [0, Math.PI, 0] : [0, 0, 0]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <mesh
              position={[0, currentForce * 0.01 + 0.3, 0]}
              scale={0.25}
              rotation={currentV2 >= 0 ? [0, Math.PI, 0] : [0, 0, 0]}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
          </group>
        </>
      )}

      {/* Parameter info */}
      <Html
        position={[0, 5, 0]}
        style={{ color: '#94a3b8', fontSize: '14px', pointerEvents: 'none', textAlign: 'center', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        center
      >
        m₁: {parameters?.m1?.toFixed(1) || '?'} kg | m₂: {parameters?.m2?.toFixed(1) || '?'} kg | e: {parameters?.restitution?.toFixed(2) || '?'}
      </Html>

      {/* Axis helper */}
      <group position={[-bounds.trackLength / 2 + 2, 0, 3]}>
        <mesh position={[0.5, 0, 0]} scale={[1, 0.05, 0.05]}><cylinderGeometry args={[1,1,1,8]} /><meshBasicMaterial color="#ef4444" /></mesh>
        <mesh position={[0, 0.5, 0]} scale={[0.05, 1, 0.05]}><cylinderGeometry args={[1,1,1,8]} /><meshBasicMaterial color="#22c55e" /></mesh>
        <mesh position={[0, 0, 0.5]} scale={[0.05, 0.05, 1]}><cylinderGeometry args={[1,1,1,8]} /><meshBasicMaterial color="#3b82f6" /></mesh>
      </group>
    </>
  );
}

function Collision1DScene({ timeSeries, currentTime, duration, parameters }) {
  const frame = Math.floor(currentTime * 30);

  // Calculate bounds from time series or parameters
  const bounds = useMemo(() => {
    const maxX = Math.max(
      timeSeries?.x1?.[timeSeries.x1.length - 1] || parameters?.initial_x1 || 5,
      timeSeries?.x2?.[timeSeries.x2.length - 1] || parameters?.initial_x2 || -5
    );
    const minX = Math.min(
      timeSeries?.x1?.[0] || parameters?.initial_x1 || -5,
      timeSeries?.x2?.[0] || parameters?.initial_x2 || 5
    );
    return {
      trackLength: Math.max(20, (maxX - minX) * 1.5),
      initialX1: timeSeries?.x1?.[0] ?? parameters?.initial_x1 ?? -5,
      initialX2: timeSeries?.x2?.[0] ?? parameters?.initial_x2 ?? 5,
    };
  }, [timeSeries, parameters]);

  return (
    <Canvas
      camera={{ position: [0, 8, 12], fov: 45 }}
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