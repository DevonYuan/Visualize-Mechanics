import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

function TorqueContent({ timeSeries, currentTime, parameters }) {
  const wrenchRef = useRef();
  const nutRef = useRef();

  // Wrench parameters
  const length = parameters?.length || 0.4; // wrench handle length (m)

  // Ref to hold latest interpolated theta (updated via useMemo)
  const currentThetaRef = useRef(0);

  // Interpolated current theta (smooth animation between sparse keyframes)
  useMemo(() => {
    if (!timeSeries?.theta || !timeSeries?.t) {
      currentThetaRef.current = 0;
      return;
    }
    
    const t = currentTime ?? 0;
    const times = timeSeries.t;
    const thetas = timeSeries.theta;
    
    // Find the two keyframes to interpolate between
    let idx = times.findIndex(time => time >= t);
    if (idx === -1) idx = times.length - 1;
    if (idx === 0) {
      currentThetaRef.current = thetas[0] ?? 0;
      return;
    }
    
    // Linear interpolation between keyframes
    const t0 = times[idx - 1];
    const t1 = times[idx];
    const theta0 = thetas[idx - 1] ?? 0;
    const theta1 = thetas[idx] ?? 0;
    
    if (t1 === t0) {
      currentThetaRef.current = theta0;
      return;
    }
    const factor = (t - t0) / (t1 - t0);
    currentThetaRef.current = theta0 + (theta1 - theta0) * factor;
  }, [timeSeries, currentTime]);

  // Animate rotation - reads from ref for latest value
  useFrame(() => {
    if (wrenchRef.current) {
      wrenchRef.current.rotation.z = currentThetaRef.current;
    }
    if (nutRef.current) {
      nutRef.current.rotation.z = currentThetaRef.current;
    }
  });

  return (
    <>
      {/* Rotation axis indicator (subtle line through nut) */}
      <line
        geometry={new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, -0.15),
          new THREE.Vector3(0, 0, 0.15),
        ])}
        material={new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.3, linewidth: 2 })}
      />

      {/* Nut / Bolt head (fixed at center, rotates with wrench) */}
      <group ref={nutRef} position={[0, 0, 0]}>
        {/* Hex nut */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 6]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Bolt shaft through center */}
        <mesh castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 12]} />
          <meshStandardMaterial color="#374151" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Center dot */}
        <mesh position={[0, 0, 0.11]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
      </group>

      {/* Wrench handle */}
      <group ref={wrenchRef} position={[0, 0, 0]}>
        {/* Handle - long box extending to the right */}
        <mesh castShadow receiveShadow position={[length / 2, 0, 0]} scale={[length, 0.05, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.3} />
        </mesh>
        
        {/* Jaw at end (open end wrench style) */}
        <mesh castShadow receiveShadow position={[length + 0.02, 0, 0]} scale={[0.06, 0.08, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh castShadow receiveShadow position={[length + 0.02, 0.05, 0]} scale={[0.06, 0.04, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
        <mesh castShadow receiveShadow position={[length + 0.02, -0.05, 0]} scale={[0.06, 0.04, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
      </group>
    </>
  );
}

export default function TorqueScene({ timeSeries, currentTime, duration, parameters }) {
  // Set shadow map type once on mount
  useLayoutEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.__r3f) {
      const gl = canvas.__r3f.gl;
      if (gl && gl.shadowMap) {
        gl.shadowMap.type = THREE.PCFShadowMap;
      }
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1e293b' }}>
      <Canvas
        camera={{ position: [0, 0, 1.2], fov: 45 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[2, 3, 4]} intensity={1.5} castShadow />
        <directionalLight position={[-1, 2, -2]} intensity={0.6} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 0, 0]}
          minDistance={0.5}
          maxDistance={5}
        />

        <TorqueContent
          timeSeries={timeSeries}
          currentTime={currentTime}
          parameters={parameters}
        />
      </Canvas>
    </div>
  );
}
