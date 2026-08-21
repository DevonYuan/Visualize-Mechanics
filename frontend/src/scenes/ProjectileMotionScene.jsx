import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

function ProjectileContent({ timeSeries, currentFrame, bounds }) {
  const trajectoryRef = useRef();
  const projectileRef = useRef();

  // Create trajectory line geometry
  const trajectoryPoints = useMemo(() => {
    if (!timeSeries?.x || !timeSeries?.y) return [];
    const points = [];
    const maxPoints = Math.min(timeSeries.x.length, 200);
    for (let i = 0; i < maxPoints; i++) {
      points.push(new THREE.Vector3(
        timeSeries.x[i],
        timeSeries.y[i],
        0
      ));
    }
    return points;
  }, [timeSeries]);

  // Current projectile position
  const currentPos = useMemo(() => {
    if (!timeSeries?.x || !timeSeries?.y) return new THREE.Vector3(0, 0, 0);
    const idx = Math.min(currentFrame, timeSeries.x.length - 1);
    return new THREE.Vector3(timeSeries.x[idx] || 0, timeSeries.y[idx] || 0, 0);
  }, [timeSeries, currentFrame]);

  // Current velocity for vector display
  const currentVelocity = useMemo(() => {
    if (!timeSeries?.vx || !timeSeries?.vy) return new THREE.Vector3(0, 0, 0);
    const idx = Math.min(currentFrame, timeSeries.vx.length - 1);
    return new THREE.Vector3(timeSeries.vx[idx] || 0, timeSeries.vy[idx] || 0, 0);
  }, [timeSeries, currentFrame]);

  // Trail positions (last 20 frames)
  const trailPositions = useMemo(() => {
    if (!timeSeries?.x || !timeSeries?.y) return [];
    const positions = [];
    const start = Math.max(0, currentFrame - 20);
    for (let i = start; i <= currentFrame; i++) {
      if (i < timeSeries.x.length) {
        positions.push(new THREE.Vector3(timeSeries.x[i], timeSeries.y[i], 0));
      }
    }
    return positions;
  }, [timeSeries, currentFrame]);

  // Update projectile position each frame
  useFrame(() => {
    if (projectileRef.current) {
      projectileRef.current.position.copy(currentPos);
    }
  });

  // Create trail line geometry
  const trailGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    if (trailPositions.length > 1) {
      geom.setFromPoints(trailPositions);
    }
    return geom;
  }, [trailPositions]);

  // Compute line distances for dashed line (needed for LineDashedMaterial)
  useLayoutEffect(() => {
    if (trajectoryRef.current && trajectoryPoints.length > 0) {
      trajectoryRef.current.computeLineDistances();
    }
  }, [trajectoryPoints]);

  return (
    <>
      {/* Ground plane */}
      <Grid
        args={[Math.ceil((bounds.maxX - bounds.minX) * 2), 1]}
        position={[0, -0.1, 0]}
        cellColor="#374151"
        cellThickness={1}
        sectionColor="#4b5563"
        sectionThickness={1}
        followCamera={false}
      />

      {/* Trajectory path (dotted line) */}
      <line
        ref={trajectoryRef}
        geometry={new THREE.BufferGeometry().setFromPoints(trajectoryPoints)}
        material={new THREE.LineDashedMaterial({
          color: '#3b82f6',
          dashSize: 0.3,
          gapSize: 0.15,
          linewidth: 2,
        })}
      />

      {/* Trail effect */}
      {trailPositions.length > 1 && (
        <line
          geometry={trailGeometry}
          material={new THREE.LineBasicMaterial({
            color: '#ef4444',
            linewidth: 3,
            transparent: true,
            opacity: 0.6,
          })}
        />
      )}

      {/* Projectile (ball) */}
      <group ref={projectileRef} position={currentPos}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#ef4444"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Velocity display */}
      {currentVelocity.length() > 0.1 && (
        <Html
          position={currentPos.clone().add(new THREE.Vector3(0, 0.8, 0)).toArray()}
          style={{
            color: '#22c55e',
            fontSize: '14px',
            pointerEvents: 'none',
            fontWeight: '600',
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px #000'
          }}
          center
        >
          v = ({currentVelocity.x.toFixed(1)}, {currentVelocity.y.toFixed(1)}) m/s
        </Html>
      )}

      {/* Origin marker */}
      <group position={[0, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
          <meshBasicMaterial color="#6b7280" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Axis labels */}
      <Html position={[bounds.maxX * 0.9, -0.8, 0]} style={{ color: '#9ca3af', fontSize: '14px', pointerEvents: 'none', transform: 'translateX(-50%)' }}>
        x (m)
      </Html>
      <Html position={[-0.8, bounds.maxY * 0.9, 0]} style={{ color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }}>
        y (m)
      </Html>
    </>
  );
}

// Camera controller for proper framing
function CameraController({ bounds }) {
  const { camera } = useThree();

  useFrame(() => {
    const centerX = (bounds.maxX + bounds.minX) / 2;
    const centerY = (bounds.maxY + bounds.minY) / 2;
    const maxDim = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

    // Position camera to frame the whole trajectory
    const distance = Math.max(maxDim * 1.2, 10);
    camera.position.lerp(
      new THREE.Vector3(centerX, centerY, distance),
      0.05
    );
    camera.lookAt(centerX, centerY, 0);
  });

  return null;
}

function ProjectileInner({ timeSeries, currentFrame, bounds }) {
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
        target={[bounds.minX + (bounds.maxX - bounds.minX) / 2, bounds.minY + (bounds.maxY - bounds.minY) / 2, 0]}
      />

      <CameraController bounds={bounds} />
      <ProjectileContent
        timeSeries={timeSeries}
        currentFrame={currentFrame}
        bounds={bounds}
      />
    </>
  );
}

export default function ProjectileMotionScene({ timeSeries, currentTime, duration }) {
  // Calculate current frame index
  const currentFrame = timeSeries?.t
    ? Math.min(
        timeSeries.t.findIndex(t => t >= currentTime),
        timeSeries.t.length - 1
      )
    : 0;
  const frameIndex = currentFrame >= 0 ? currentFrame : (timeSeries?.t?.length ?? 1) - 1;

  // Calculate scene bounds for camera
  const bounds = useMemo(() => {
    if (!timeSeries?.x || !timeSeries?.y) return { minX: -5, maxX: 5, minY: -2, maxY: 10 };
    const xs = timeSeries.x.filter(v => v !== undefined);
    const ys = timeSeries.y.filter(v => v !== undefined);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(...ys);
    const padding = Math.max((maxX - minX) * 0.15, 2);
    return { minX: minX - padding, maxX: maxX + padding, minY: minY - padding, maxY: maxY + padding };
  }, [timeSeries]);

  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 45 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0f172a']} />
      <ProjectileInner
        timeSeries={timeSeries}
        currentFrame={frameIndex}
        bounds={bounds}
      />
    </Canvas>
  );
}