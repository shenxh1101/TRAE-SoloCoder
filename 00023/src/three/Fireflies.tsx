import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePagodaStore } from '@/store/usePagodaStore';

export default function Fireflies() {
  const firefliesEnabled = usePagodaStore((state) => state.config.firefliesEnabled);
  const pointsRef = useRef<THREE.Points>(null);

  const count = 100;

  const { positions, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 12;
      const height = 1 + Math.random() * 6;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      sizes[i] = 0.5 + Math.random() * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, sizes, phases };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !firefliesEnabled) return;

    const time = state.clock.elapsedTime;
    const positionAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const baseAngle = (i / count) * Math.PI * 2;
      const phase = phases[i];

      const angle = baseAngle + time * 0.3 + Math.sin(time * 0.5 + phase) * 0.5;
      const radius = 8 + Math.sin(time * 0.7 + phase * 2) * 3;
      const height = 2 + Math.sin(time * 0.8 + phase) * 1.5 + (i / count) * 3;

      positionAttribute.setX(i, Math.cos(angle) * radius);
      positionAttribute.setY(i, height);
      positionAttribute.setZ(i, Math.sin(angle) * radius);
    }

    positionAttribute.needsUpdate = true;
  });

  if (!firefliesEnabled) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffdd44"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
