import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function InclinedPlaneContent({ timeSeries, currentFrame, parameters, bounds }) {
  const blockRef = useRef();
  const gravityVectorRef = useRef();

  // Plane angle in radians
  const angle = (parameters?.angle_deg || 30) * Math.PI / 180;

  // Current block position along plane
  const currentX = useMemo(() => {
    if (!timeSeries?.x) return 0;
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    return timeSeries.x[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Current velocity along plane
  const currentV = useMemo(() => {
    if (!timeSeries?.v) return 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Current acceleration along plane
  const currentA = useMemo(() => {
    if (!timeSeries?.a) return 0;
    const idx = Math.min(currentFrame, timeSeries.a.length - 1);
    return timeSeries.a[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Block position in 3D (along inclined plane)
  const blockPos = useMemo(() => {
    return new THREE.Vector3(
      currentX * Math.cos(angle),
      currentX * Math.sin(angle) + 0.5, // 0.5 = half block height
      0
    );
  }, [currentX, angle]);

  // Update block position
  useFrame(() => {
    if (blockRef.current) {
      blockRef.current.position.copy(blockPos);
      blockRef.current.rotation.z = -angle;
    }
    if (gravityVectorRef.current) {
      gravityVectorRef.current.position.copy(blockPos);
      gravityVectorRef.current.scale.y = Math.max(parameters?.mass * 9.8 * 0.02 || 0.1, 0.1);
    }
  });

  return (
    <>
      {/* Ground/floor */}
      <Grid
        args={[20, 1]}
        position={[0, -0.1, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Inclined plane */}
      <mesh
        position={[bounds.planeLength / 2 * Math.cos(angle) / 2, bounds.planeLength / 2 * Math.sin(angle) / 2, 0]}
        rotation={[0, 0, -angle]}
        scale={[bounds.planeLength, 2, 1]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial
          color="#4b5563"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Plane side walls */}
      <mesh
        position={[0, bounds.planeLength / 2 * Math.sin(angle) + 0.5, -1.1]}
        scale={[bounds.planeLength + 1, 1, 0.2]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#374151" transparent opacity={0.3} />
      </mesh>
      <mesh
        position={[0, bounds.planeLength / 2 * Math.sin(angle) + 0.5, 1.1]}
        scale={[bounds.planeLength + 1, 1, 0.2]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#374151" transparent opacity={0.3} />
      </mesh>

      {/* Block */}
      <mesh ref={blockRef} position={blockPos} rotation={[0, 0, -angle]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Force vectors */}
      {/* Gravity vector (down) */}
      <mesh ref={gravityVectorRef} position={blockPos} scale={[0.15, 1, 0.15]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh
        position={blockPos.clone().add(new THREE.Vector3(0, -parameters?.mass * 9.8 * 0.02 - 0.15, 0))}
        scale={0.3}
      >
        <coneGeometry args={[1, 1, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Weight components (mg sinθ parallel, mg cosθ perpendicular) */}
      {parameters?.mass && (
        <>
          <Html
            position={blockPos.clone().add(new THREE.Vector3(-1.5, 1.5, 0)).toArray()}
            style={{ color: '#ef4444', fontSize: '12px', pointerEvents: 'none', fontWeight: '600' }}
          >
            mg = {(parameters.mass * 9.8).toFixed(1)} N
          </Html>
        </>
      )}

      {/* Angle indicator */}
      <group position={[0, 0, 0]}>
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3 * Math.cos(angle), 3 * Math.sin(angle), 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#9ca3af', linewidth: 2 })}
        />
        <Html
          position={[1.5, 0.5, 0]}
          style={{ color: '#9ca3af', fontSize: '14px', pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}
        >
          θ = {parameters?.angle_deg}°
        </Html>
      </group>


    </>
  );
}

function InclinedPlaneInner({ timeSeries, currentFrame, parameters, bounds }) {
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
        target={[bounds.planeLength / 2 * Math.cos((parameters?.angle_deg || 30) * Math.PI / 180) / 2, bounds.planeLength / 2 * Math.sin((parameters?.angle_deg || 30) * Math.PI / 180) / 2, 0]}
      />

      <InclinedPlaneContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        parameters={parameters}
        bounds={bounds}
      />
    </>
  );
}

export default function InclinedPlaneScene({ timeSeries, currentTime, duration, parameters }) {
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  const angle = (parameters?.angle_deg || 30) * Math.PI / 180;

  // Calculate scene bounds
  const bounds = useMemo(() => {
    const planeLength = timeSeries?.x
      ? (Math.max(...timeSeries.x.filter(v => v !== undefined)) - Math.min(...timeSeries.x.filter(v => v !== undefined))) + 4
      : 10;
    return {
      planeLength,
      angle,
    };
  }, [timeSeries, angle]);

  return (
    <Canvas
      camera={{ position: [0, 5, 12], fov: 45 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0f172a']} />
      <InclinedPlaneInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        parameters={parameters}
        bounds={bounds}
      />
    </Canvas>
  );
}