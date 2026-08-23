import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function MassSpringContent({ timeSeries, currentFrame, parameters, bounds }) {
  const massRef = useRef();
  const springRef = useRef();
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

  // Spring force (F = -k * x)
  const k = parameters?.k || 1;
  const currentForce = useMemo(() => -k * currentX, [k, currentX]);

  // Spring parameters
  const equilibriumY = bounds.equilibriumY || 3;
  const springLength = bounds.springLength || 3;
  const massY = useMemo(() => equilibriumY - springLength - currentX, [equilibriumY, springLength, currentX]);
  const springStartY = equilibriumY; // Start from bottom of ceiling support (equilibriumY)

  // Spring geometry - helical spring using points
  const springPoints = useMemo(() => {
    const points = [];
    const coils = 12;
    const radius = 0.3;
    const segmentsPerCoil = 16;
    const totalSegments = coils * segmentsPerCoil;

    for (let i = 0; i <= totalSegments; i++) {
      const t = i / totalSegments;
      const y = springStartY - t * Math.max(0.1, springLength - currentX); // compressed/extended length, starting from springStartY
      const angle = t * coils * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }
    return points;
  }, [currentX, springLength, springStartY]);

  // Update positions each frame
  useFrame(() => {
    if (massRef.current) {
      massRef.current.position.y = massY;
    }

    if (springRef.current) {
      springRef.current.geometry.setFromPoints(springPoints);
      springRef.current.geometry.attributes.position.needsUpdate = true;
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
        {/* Spring attachment point - positioned at the bottom of the support */}
        <mesh position={[0, -0.5, 0]} scale={[0.3, 0.1, 0.3]}>
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

  // Compute current values for overlay
  const currentX = timeSeries?.x_eq?.[Math.min(frame, (timeSeries.x_eq?.length || 1) - 1)] ?? parameters?.x0 ?? 0;
  const k = parameters?.k ?? 1;
  const currentForce = -k * currentX;

  const massValue = parameters?.mass?.toFixed(1) ?? '?';
  const kValue = parameters?.k?.toFixed(0) ?? '?';
  const gValue = parameters?.g?.toFixed(1) ?? '9.8';
  const omegaValue = parameters?.omega?.toFixed(1) ?? '?';
  const periodValue = parameters?.period?.toFixed(3) ?? '?';
  const amplitudeValue = parameters?.amplitude?.toFixed(3) ?? '?';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 5, 12], fov: 45 }}
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#0f172a']} />
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

      {/* Screen-space overlay - fixed position like TestMassSpring header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
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
        <div>m = {massValue} kg</div>
        <div>k = {kValue} N/m</div>
        <div>g = {gValue} m/s²</div>
        <div style={{ borderTop: '1px solid #374151', marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Derived</div>
          <div>ω = {omegaValue} rad/s</div>
          <div>T = {periodValue} s</div>
          <div>A = {amplitudeValue} m</div>
        </div>
        <div style={{ borderTop: '1px solid #374151', marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</div>
          <div style={{ color: '#f97316', fontWeight: '600' }}>F = {currentForce.toFixed(1)} N</div>
          <div style={{ color: '#fbbf24' }}>x = {currentX.toFixed(3)} m</div>
        </div>
      </div>
    </div>
  );
}

export default MassSpringScene;