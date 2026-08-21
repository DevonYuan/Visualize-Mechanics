import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function MassSpringContent({ timeSeries, currentFrame, parameters, bounds }) {
  const massRef = useRef();
  const springRef = useRef();
  const velocityVectorRef = useRef();
  const supportRef = useRef();

  // Current displacement from equilibrium
  const currentX = useMemo(() => {
    if (!timeSeries?.x_eq) return parameters?.x0 || 0.1;
    const idx = Math.min(currentFrame, timeSeries.x_eq.length - 1);
    return timeSeries.x_eq[idx] ?? (parameters?.x0 || 0.1);
  }, [timeSeries, currentFrame, parameters]);

  // Current velocity
  const currentV = useMemo(() => {
    if (!timeSeries?.v) return parameters?.v0 || 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] ?? (parameters?.v0 || 0);
  }, [timeSeries, currentFrame, parameters]);

  // Current acceleration
  const currentA = useMemo(() => {
    if (!timeSeries?.a) return 0;
    const idx = Math.min(currentFrame, timeSeries.a.length - 1);
    return timeSeries.a[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Spring parameters
  const equilibriumY = bounds.equilibriumY || 3;
  const springLength = bounds.springLength || 3;
  const massY = useMemo(() => equilibriumY - springLength + currentX, [equilibriumY, springLength, currentX]);

  // Spring geometry - helical spring using points
  const springPoints = useMemo(() => {
    const points = [];
    const coils = 12;
    const radius = 0.3;
    const segmentsPerCoil = 16;
    const totalSegments = coils * segmentsPerCoil;

    for (let i = 0; i <= totalSegments; i++) {
      const t = i / totalSegments;
      const y = t * Math.max(0.1, springLength - currentX); // compressed/extended length
      const angle = t * coils * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }
    return points;
  }, [currentX, springLength]);

  // Update positions each frame
  useFrame(() => {
    if (massRef.current) {
      massRef.current.position.y = massY;
    }

    if (springRef.current) {
      springRef.current.geometry.setFromPoints(springPoints);
      springRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Velocity vector
    if (velocityVectorRef.current && Math.abs(currentV) > 0.1) {
      velocityVectorRef.current.position.y = massY;
      const scale = Math.max(Math.abs(currentV) * 0.15, 0.2);
      velocityVectorRef.current.scale.y = scale;
      velocityVectorRef.current.rotation.x = currentV >= 0 ? Math.PI : 0;
    }
  });

  // Graph helpers removed — energy graphs are not part of the core render.

  return (
    <>
      {/* Ground plane */}
      <Grid
        args={[10, 1]}
        position={[0, 0, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Ceiling support */}
      <group ref={supportRef} position={[0, equilibriumY + 0.5, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.25, 0]} scale={[1.5, 0.5, 1.5]}>
          <boxGeometry />
          <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.1} />
        </mesh>
        {/* Spring attachment point */}
        <mesh position={[0, -0.5, 0]} scale={[0.2, 0.2, 0.2]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>

      {/* Spring */}
      <line
        ref={springRef}
        geometry={new THREE.BufferGeometry().setFromPoints(springPoints)}
        material={new THREE.LineBasicMaterial({ color: '#94a3b8', linewidth: 3 })}
      />

      {/* Mass on spring */}
      <group ref={massRef} position={[0, massY, 0]} castShadow receiveShadow>
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
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
          m = {parameters?.mass?.toFixed(1) || '?'} kg
        </Html>
      </group>

      {/* Equilibrium line */}
      <mesh
        position={[0, equilibriumY - springLength, 0]}
        scale={[2, 0.02, 2]}
      >
        <boxGeometry />
        <meshBasicMaterial color="#6b7280" transparent opacity={0.5} />
      </mesh>
      <Html
        position={[-1.5, equilibriumY - springLength, 0]}
        style={{ color: '#94a3b8', fontSize: '12px', pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}
        center
      >
        Equilibrium
      </Html>

      {/* Velocity vector (vertical) */}
      {Math.abs(currentV) > 0.1 && (
        <group ref={velocityVectorRef} position={[0, massY, 1.5]}>
          <mesh
            position={[0, Math.abs(currentV) * 0.075, 0]}
            scale={[0.15, Math.abs(currentV) * 0.15, 0.15]}
            rotation={currentV >= 0 ? [Math.PI, 0, 0] : [0, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh
            position={[0, Math.abs(currentV) * 0.15 + 0.2, 0]}
            scale={0.25}
            rotation={currentV >= 0 ? [Math.PI, 0, 0] : [0, 0, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <Html
            position={[0.8, Math.abs(currentV) * 0.15 + 0.5, 1.5]}
            style={{ color: '#22c55e', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translate(-50%, -50%)' }}
            center
          >
            v = {currentV.toFixed(2)} m/s
          </Html>
        </group>
      )}
    </>
  );
}

function MassSpringScene({ timeSeries, currentTime, duration, parameters }) {
  const frame = Math.floor(currentTime * 30);

  // Calculate bounds from time series or parameters
  const bounds = useMemo(() => {
    const maxDisp = timeSeries?.x_eq ? Math.max(...timeSeries.x_eq.map(Math.abs)) : (parameters?.x0 || 0.1);
    const amplitude = Math.max(maxDisp, 0.5);
    return {
      equilibriumY: 4,
      springLength: 3,
      maxAmplitude: amplitude,
    };
  }, [timeSeries, parameters]);

  return (
    <Canvas
      camera={{ position: [0, 5, 12], fov: 45 }}
      shadows
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -7]} intensity={0.5} />

      <MassSpringContent
        timeSeries={timeSeries}
        currentFrame={frame}
        parameters={parameters}
        bounds={bounds}
      />

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

export default MassSpringScene;