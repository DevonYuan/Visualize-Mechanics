import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function AtwoodMachineContent({ timeSeries, currentFrame, parameters, bounds }) {
  const pulleyRef = useRef();
  const mass1Ref = useRef();
  const mass2Ref = useRef();
  const stringRef = useRef();
  const tensionVectorRef1 = useRef();
  const tensionVectorRef2 = useRef();
  const weightVectorRef1 = useRef();
  const weightVectorRef2 = useRef();

  // Current positions
  const currentY1 = useMemo(() => {
    if (!timeSeries?.y1) return bounds.initialY1;
    const idx = Math.min(currentFrame, timeSeries.y1.length - 1);
    return timeSeries.y1[idx] ?? bounds.initialY1;
  }, [timeSeries, currentFrame, bounds.initialY1]);

  const currentY2 = useMemo(() => {
    if (!timeSeries?.y2) return bounds.initialY2;
    const idx = Math.min(currentFrame, timeSeries.y2.length - 1);
    return timeSeries.y2[idx] ?? bounds.initialY2;
  }, [timeSeries, currentFrame, bounds.initialY2]);

  const currentV = useMemo(() => {
    if (!timeSeries?.v) return 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  const currentA = useMemo(() => {
    if (!timeSeries?.a) return 0;
    const idx = Math.min(currentFrame, timeSeries.a.length - 1);
    return timeSeries.a[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  const currentTension = useMemo(() => {
    if (!timeSeries?.tension) return 0;
    const idx = Math.min(currentFrame, timeSeries.tension.length - 1);
    return timeSeries.tension[idx] ?? 0;
  }, [timeSeries, currentFrame]);

  // Pulley geometry setup
  const pulleyRadius = 0.8;
  const pulleyCenterY = bounds.pulleyHeight;
  const pulleyCenterX = 0;
  const stringLength = bounds.stringLength;

  // Mass positions (hanging on either side of pulley)
  const mass1Pos = useMemo(() => new THREE.Vector3(-pulleyRadius - 0.6, currentY1, 0), [currentY1]);
  const mass2Pos = useMemo(() => new THREE.Vector3(pulleyRadius + 0.6, currentY2, 0), [currentY2]);

  // String path (goes around pulley)
  const stringPoints = useMemo(() => {
    const points = [];
    const segments = 32;
    // Left vertical
    points.push(new THREE.Vector3(-pulleyRadius - 0.6, pulleyCenterY, 0));
    points.push(new THREE.Vector3(-pulleyRadius - 0.6, currentY1 + 0.5, 0));
    // Around pulley (half circle top)
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i / segments) * Math.PI;
      points.push(new THREE.Vector3(
        Math.cos(angle) * pulleyRadius,
        Math.sin(angle) * pulleyRadius + pulleyCenterY,
        0
      ));
    }
    // Right vertical
    points.push(new THREE.Vector3(pulleyRadius + 0.6, pulleyCenterY, 0));
    points.push(new THREE.Vector3(pulleyRadius + 0.6, currentY2 + 0.5, 0));
    return points;
  }, [currentY1, currentY2, pulleyRadius, pulleyCenterY]);

  // Update positions each frame
  useFrame(() => {
    if (mass1Ref.current) mass1Ref.current.position.copy(mass1Pos);
    if (mass2Ref.current) mass2Ref.current.position.copy(mass2Pos);
    if (stringRef.current) {
      stringRef.current.geometry.setFromPoints(stringPoints);
      stringRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Tension vectors (upward on both masses)
    const tensionScale = Math.max(currentTension * 0.03, 0.1);
    if (tensionVectorRef1.current && currentTension > 0.1) {
      tensionVectorRef1.current.position.copy(mass1Pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
      tensionVectorRef1.current.scale.y = tensionScale;
    }
    if (tensionVectorRef2.current && currentTension > 0.1) {
      tensionVectorRef2.current.position.copy(mass2Pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
      tensionVectorRef2.current.scale.y = tensionScale;
    }

    // Weight vectors (downward)
    const m1 = parameters?.m1 || 1;
    const m2 = parameters?.m2 || 1;
    const g = parameters?.g || 9.8;
    const w1Scale = Math.max(m1 * g * 0.03, 0.1);
    const w2Scale = Math.max(m2 * g * 0.03, 0.1);
    if (weightVectorRef1.current) {
      weightVectorRef1.current.position.copy(mass1Pos.clone().add(new THREE.Vector3(0, -0.5, 0)));
      weightVectorRef1.current.scale.y = w1Scale;
    }
    if (weightVectorRef2.current) {
      weightVectorRef2.current.position.copy(mass2Pos.clone().add(new THREE.Vector3(0, -0.5, 0)));
      weightVectorRef2.current.scale.y = w2Scale;
    }
  });

  return (
    <>
      {/* Ground reference */}
      <Grid
        args={[10, 1]}
        position={[0, -5, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Support structure for pulley */}
      <group>
        {/* Vertical supports */}
        <mesh position={[-3, pulleyCenterY / 2, 0]} scale={[0.3, pulleyCenterY + 2, 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[3, pulleyCenterY / 2, 0]} scale={[0.3, pulleyCenterY + 2, 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.1} />
        </mesh>
        {/* Top crossbeam */}
        <mesh position={[0, pulleyCenterY + 1.2, 0]} scale={[6.5, 0.3, 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.1} />
        </mesh>
      </group>

      {/* Pulley */}
      <group ref={pulleyRef} position={[0, pulleyCenterY, 0]}>
        <mesh castShadow receiveShadow>
          <torusGeometry args={[pulleyRadius, 0.12, 8, 32]} />
          <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[pulleyRadius * 0.8, pulleyRadius * 0.8, 0.25, 32]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Pulley axle */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.15, 0.15, 0.15]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Rotation indicator on pulley */}
        <mesh position={[pulleyRadius * 0.6, 0, 0.15]} scale={0.08}>
          <coneGeometry args={[1, 1, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* String */}
      <line
        ref={stringRef}
        geometry={new THREE.BufferGeometry().setFromPoints(stringPoints)}
        material={new THREE.LineBasicMaterial({ color: '#94a3b8', linewidth: 3 })}
      />

      {/* Mass 1 (left) - heavier mass typically goes down */}
      <group ref={mass1Ref} position={mass1Pos}>
        <mesh castShadow receiveShadow>
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

        {/* Tension vector (up) on mass 1 */}
        {currentTension > 0.1 && (
          <group ref={tensionVectorRef1} position={[0, 0.5, 0]}>
            <mesh
              position={[0, currentTension * 0.015, 0]}
              scale={[0.12, currentTension * 0.03, 0.12]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh
              position={[0, currentTension * 0.03 + 0.15, 0]}
              scale={0.25}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        )}

        {/* Weight vector (down) on mass 1 */}
        <group ref={weightVectorRef1} position={[0, -0.5, 0]}>
          <mesh
            position={[0, -w1Scale / 2 * 33, 0]}
            scale={[0.12, w1Scale, 0.12]}
            rotation={[Math.PI, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh
            position={[0, -w1Scale * 33 - 0.15, 0]}
            scale={0.25}
            rotation={[Math.PI, 0, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* Mass 2 (right) */}
      <group ref={mass2Ref} position={mass2Pos}>
        <mesh castShadow receiveShadow>
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

        {/* Tension vector (up) on mass 2 */}
        {currentTension > 0.1 && (
          <group ref={tensionVectorRef2} position={[0, 0.5, 0]}>
            <mesh
              position={[0, currentTension * 0.015, 0]}
              scale={[0.12, currentTension * 0.03, 0.12]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh
              position={[0, currentTension * 0.03 + 0.15, 0]}
              scale={0.25}
            >
              <coneGeometry args={[1, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        )}

        {/* Weight vector (down) on mass 2 */}
        <group ref={weightVectorRef2} position={[0, -0.5, 0]}>
          <mesh
            position={[0, -w2Scale / 2 * 33, 0]}
            scale={[0.12, w2Scale, 0.12]}
            rotation={[Math.PI, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh
            position={[0, -w2Scale * 33 - 0.15, 0]}
            scale={0.25}
            rotation={[Math.PI, 0, 0]}
          >
            <coneGeometry args={[1, 1, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* Acceleration direction indicator */}
      {Math.abs(currentA) > 0.01 && (
        <Html
          position={[-2.5, pulleyCenterY + 2, 0]}
          style={{ color: '#f97316', fontSize: '16px', pointerEvents: 'none', fontWeight: '700' }}
        >
          a = {currentA.toFixed(2)} m/s² {' '}
          {currentA > 0 ? '↓ m₁' : '↑ m₁'}
        </Html>
      )}

      {/* Velocity indicator */}
      {Math.abs(currentV) > 0.01 && (
        <Html
          position={[-2.5, pulleyCenterY + 3.5, 0]}
          style={{ color: '#3b82f6', fontSize: '16px', pointerEvents: 'none', fontWeight: '600' }}
        >
          v = {Math.abs(currentV).toFixed(2)} m/s
        </Html>
      )}

      {/* Tension value display */}
      {currentTension > 0.1 && (
        <Html
          position={[2.5, pulleyCenterY + 2, 0]}
          style={{ color: '#22c55e', fontSize: '16px', pointerEvents: 'none', fontWeight: '600' }}
        >
          T = {currentTension.toFixed(1)} N
        </Html>
      )}

      {/* Parameter info panel */}
      <Html
        position={[-4.5, -4, -3]}
        style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', lineHeight: '1.8', width: '200px' }}
      >
        <div style={{ color: '#3b82f6', fontWeight: '600' }}>Atwood Machine</div>
        <div>m₁ = {parameters?.m1?.toFixed(1) || '?'} kg</div>
        <div>m₂ = {parameters?.m2?.toFixed(1) || '?'} kg</div>
        <div>g = {parameters?.g?.toFixed(1) || 9.8} m/s²</div>
        <div>a = {(parameters?.m1 && parameters?.m2 ? ((parameters.m1 - parameters.m2) * (parameters.g || 9.8) / (parameters.m1 + parameters.m2)).toFixed(2) : '?')} m/s²</div>
        <div>T = {(parameters?.m1 && parameters?.m2 ? (2 * parameters.m1 * parameters.m2 * (parameters.g || 9.8) / (parameters.m1 + parameters.m2)).toFixed(1) : '?')} N</div>
      </Html>
    </>
  );
}

function AtwoodMachineInner({ timeSeries, currentFrame, parameters, bounds }) {
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
        target={[0, bounds.pulleyHeight - 2, 0]}
      />

      <AtwoodMachineContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        parameters={parameters}
        bounds={bounds}
      />
    </>
  );
}

export default function AtwoodMachineScene({ timeSeries, currentTime, duration, parameters }) {
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  // Calculate scene bounds
  const bounds = useMemo(() => {
    const pulleyHeight = 6;
    const initialY1 = parameters?.initial_y1 ?? (pulleyHeight - 4);
    const initialY2 = parameters?.initial_y2 ?? (pulleyHeight - 4);
    const stringLength = parameters?.string_length ?? 10;

    // Find max extents from time series
    let minY1 = initialY1, maxY1 = initialY1;
    let minY2 = initialY2, maxY2 = initialY2;
    if (timeSeries?.y1) {
      const y1vals = timeSeries.y1.filter(v => v !== undefined);
      if (y1vals.length) { minY1 = Math.min(...y1vals); maxY1 = Math.max(...y1vals); }
    }
    if (timeSeries?.y2) {
      const y2vals = timeSeries.y2.filter(v => v !== undefined);
      if (y2vals.length) { minY2 = Math.min(...y2vals); maxY2 = Math.max(...y2vals); }
    }

    return {
      pulleyHeight,
      initialY1,
      initialY2,
      stringLength,
      minY: Math.min(minY1, minY2) - 2,
      maxY: Math.max(maxY1, maxY2) + 2,
    };
  }, [timeSeries, parameters]);

  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 45 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0f172a']} />
      <AtwoodMachineInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        parameters={parameters}
        bounds={bounds}
      />
    </Canvas>
  );
}