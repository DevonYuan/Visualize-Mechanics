import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { AxesHelper } from 'three';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function KinematicsContent({ timeSeries, currentFrame, bounds }) {
  const blockRef = useRef();
  const velocityVectorRef = useRef();
  const positionGraphRef = useRef();
  const velocityGraphRef = useRef();
  const accelGraphRef = useRef();

  // Current block position
  const currentPos = useMemo(() => {
    if (!timeSeries?.x) return new THREE.Vector3(0, 0, 0);
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    return new THREE.Vector3(timeSeries.x[idx] || 0, 0.5, 0);
  }, [timeSeries, currentFrame]);

  // Current velocity
  const currentVelocity = useMemo(() => {
    if (!timeSeries?.v) return 0;
    const idx = Math.min(currentFrame, timeSeries.v.length - 1);
    return timeSeries.v[idx] || 0;
  }, [timeSeries, currentFrame]);

  // Current acceleration
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

  // Graph line geometries
  const createGraphLine = (data, color, scaleX, scaleY, offsetX) => {
    if (!data || data.length < 2) return null;

    const points = [];
    const maxPoints = Math.min(data.length, 200);
    const tMax = timeSeries.t[timeSeries.t.length - 1] || 1;

    for (let i = 0; i < maxPoints; i++) {
      const t = timeSeries.t[i] || 0;
      const x = (t / tMax) * scaleX + offsetX;
      const y = (data[i] || 0) * scaleY;
      points.push(new THREE.Vector3(x, y, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  };

  const positionGraphGeom = useMemo(() =>
    createGraphLine(timeSeries?.x, '#3b82f6', bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX),
    [timeSeries, bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX]
  );

  const velocityGraphGeom = useMemo(() =>
    createGraphLine(timeSeries?.v, '#22c55e', bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX),
    [timeSeries, bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX]
  );

  const accelGraphGeom = useMemo(() =>
    createGraphLine(timeSeries?.a, '#ef4444', bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX),
    [timeSeries, bounds.graphWidth, bounds.graphHeight, bounds.graphOffsetX]
  );

  // Current frame indicators on graphs
  const graphCurrentX = useMemo(() => {
    const tMax = timeSeries?.t[timeSeries.t.length - 1] || 1;
    const t = timeSeries?.t[currentFrame] || 0;
    return (t / tMax) * bounds.graphWidth + bounds.graphOffsetX;
  }, [timeSeries, currentFrame, bounds.graphWidth, bounds.graphOffsetX]);

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

      {/* Velocity vector arrow */}
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

      {/* Graphs - Position vs Time */}
      <group position={[bounds.graphOffsetX, bounds.graphOffsetY + bounds.graphHeight + 1, -3]}>
        {/* Axes */}
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(bounds.graphWidth, 0, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -bounds.graphHeight/2, 0),
            new THREE.Vector3(0, bounds.graphHeight/2, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />

        {/* Graph line */}
        {positionGraphGeom && (
          <line
            geometry={positionGraphGeom}
            material={new THREE.LineBasicMaterial({ color: '#3b82f6', linewidth: 2 })}
          />
        )}

        {/* Current point on graph */}
        <mesh position={[graphCurrentX, 0, 0]} scale={0.1}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Labels */}
        <Html
          position={[bounds.graphWidth / 2, -bounds.graphHeight / 2 - 0.5, 0]}
          style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', transform: 'translateX(-50%)' }}
          center
        >
          t (s)
        </Html>
        <Html
          position={[-0.8, bounds.graphHeight / 2, 0]}
          style={{ color: '#3b82f6', fontSize: '12px', pointerEvents: 'none', fontWeight: '600' }}
        >
          x (m)
        </Html>
        <Html
          position={[bounds.graphWidth / 2, bounds.graphHeight / 2 + 0.5, 0]}
          style={{ color: '#3b82f6', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translateX(-50%)' }}
          center
        >
          Position vs Time
        </Html>
      </group>

      {/* Graphs - Velocity vs Time */}
      <group position={[bounds.graphOffsetX + bounds.graphWidth + 3, bounds.graphOffsetY + bounds.graphHeight + 1, -3]}>
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(bounds.graphWidth, 0, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -bounds.graphHeight/2, 0),
            new THREE.Vector3(0, bounds.graphHeight/2, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />

        {velocityGraphGeom && (
          <line
            geometry={velocityGraphGeom}
            material={new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 2 })}
          />
        )}

        <mesh position={[graphCurrentX, 0, 0]} scale={0.1}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>

        <Html
          position={[bounds.graphWidth / 2, -bounds.graphHeight / 2 - 0.5, 0]}
          style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', transform: 'translateX(-50%)' }}
          center
        >
          t (s)
        </Html>
        <Html
          position={[-0.8, bounds.graphHeight / 2, 0]}
          style={{ color: '#22c55e', fontSize: '12px', pointerEvents: 'none', fontWeight: '600' }}
        >
          v (m/s)
        </Html>
        <Html
          position={[bounds.graphWidth / 2, bounds.graphHeight / 2 + 0.5, 0]}
          style={{ color: '#22c55e', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translateX(-50%)' }}
          center
        >
          Velocity vs Time
        </Html>
      </group>

      {/* Graphs - Acceleration vs Time */}
      <group position={[bounds.graphOffsetX, bounds.graphOffsetY - 1, -3]}>
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(bounds.graphWidth, 0, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />
        <line
          geometry={new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -bounds.graphHeight/2, 0),
            new THREE.Vector3(0, bounds.graphHeight/2, 0),
          ])}
          material={new THREE.LineBasicMaterial({ color: '#6b7280' })}
        />

        {accelGraphGeom && (
          <line
            geometry={accelGraphGeom}
            material={new THREE.LineBasicMaterial({ color: '#ef4444', linewidth: 2 })}
          />
        )}

        <mesh position={[graphCurrentX, 0, 0]} scale={0.1}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        <Html
          position={[bounds.graphWidth / 2, -bounds.graphHeight / 2 - 0.5, 0]}
          style={{ color: '#9ca3af', fontSize: '12px', pointerEvents: 'none', transform: 'translateX(-50%)' }}
          center
        >
          t (s)
        </Html>
        <Html
          position={[-0.8, bounds.graphHeight / 2, 0]}
          style={{ color: '#ef4444', fontSize: '12px', pointerEvents: 'none', fontWeight: '600' }}
        >
          a (m/s²)
        </Html>
        <Html
          position={[bounds.graphWidth / 2, bounds.graphHeight / 2 + 0.5, 0]}
          style={{ color: '#ef4444', fontSize: '12px', pointerEvents: 'none', fontWeight: '600', transform: 'translateX(-50%)' }}
          center
        >
          Acceleration vs Time
        </Html>
      </group>

      {/* Legend */}
      <Html
        position={[bounds.graphOffsetX + bounds.graphWidth + 3, bounds.graphOffsetY + bounds.graphHeight + 3.5, -3]}
        style={{ color: '#9ca3af', fontSize: '11px', pointerEvents: 'none', lineHeight: '1.8' }}
      >
        <div style={{ color: '#3b82f6' }}>█ Position (x)</div>
        <div style={{ color: '#22c55e' }}>█ Velocity (v)</div>
        <div style={{ color: '#ef4444' }}>█ Acceleration (a)</div>
        <div style={{ color: '#f97316' }}>▲ Acceleration vector</div>
        <div style={{ color: '#22c55e' }}>▲ Velocity vector</div>
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
      graphWidth: 8, graphHeight: 4, graphOffsetX: -10, graphOffsetY: -3
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
      graphWidth: 8,
      graphHeight: 4,
      graphOffsetX: -10,
      graphOffsetY: -3,
    };
  }, [timeSeries]);

  return (
    <Canvas
      camera={{ position: [0, 8, 15], fov: 45 }}
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