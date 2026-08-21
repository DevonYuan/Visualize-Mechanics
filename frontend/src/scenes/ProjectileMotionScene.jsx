import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

function ProjectileContent({ timeSeries, currentFrame, bounds }) {
  const trajectoryRef = useRef();
  const projectileRef = useRef();

  // Auto-scale visual elements to the trajectory size so tiny problems
  // (e.g. v0=2 m/s -> a 0.38 m arc) still render clearly instead of as a blob.
  const maxDim = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) || 1;
  const ballRadius = Math.min(Math.max(maxDim * 0.03, 0.03), 0.6);
  const dashSize = ballRadius * 2.0;
  const gapSize = ballRadius;
  const labelOffset = ballRadius * 2.5;
  const trailLength = Math.max(10, Math.min(40, Math.floor(maxDim * 10)));

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

  // Trail positions (last N frames, scaled to trajectory size)
  const trailPositions = useMemo(() => {
    if (!timeSeries?.x || !timeSeries?.y) return [];
    const positions = [];
    const start = Math.max(0, currentFrame - trailLength);
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
          dashSize,
          gapSize,
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

      {/* Projectile (ball) - radius scaled to trajectory size */}
      <group ref={projectileRef} position={currentPos}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[ballRadius, 16, 16]} />
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
          position={currentPos.clone().add(new THREE.Vector3(0, labelOffset, 0)).toArray()}
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
          <cylinderGeometry args={[ballRadius * 0.5, ballRadius * 0.5, ballRadius * 0.66, 16]} />
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

// Frames the trajectory ONCE on mount, then hands the camera to OrbitControls.
// (Previously a per-frame lerp fought OrbitControls and made orbiting jittery.)
function FrameCamera({ bounds }) {
  const { camera } = useThree();
  const { minX, maxX, minY, maxY } = bounds;

  useLayoutEffect(() => {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY) || 1;
    camera.position.set(centerX, centerY, Math.max(maxDim * 1.4, 2.5));
    camera.near = 0.1;
    camera.far = Math.max(maxDim * 20, 100);
    camera.lookAt(centerX, centerY, 0);
    camera.updateProjectionMatrix();
  }, [camera, minX, maxX, minY, maxY]);

  return null;
}

function ProjectileInner({ timeSeries, currentFrame, bounds }) {
  const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
  const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;

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
        target={[centerX, centerY, 0]}
      />

      <FrameCamera bounds={bounds} />
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
    // Scale-aware padding: tiny arcs (e.g. v0=2 m/s) must not be lost in a
    // fixed 2-unit margin that made them render as a dot.
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const padding = Math.max(spanX * 0.25, spanY * 0.25, 0.5);
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