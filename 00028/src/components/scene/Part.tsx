import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PartState } from '@/types/part';
import { PART_COLORS } from '@/types/part';

interface PartProps {
  part: PartState;
}

const Part = ({ part }: PartProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const color = PART_COLORS[part.type];

  useFrame((state) => {
    if (meshRef.current && !part.isBeingCarried) {
      meshRef.current.rotation.y = part.rotation[1];
    }
    if (glowRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      glowRef.current.scale.setScalar(pulse);
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 * pulse;
    }
  });

  const geometry = useMemo(() => {
    switch (part.type) {
      case 'cube':
        return <boxGeometry args={[0.3, 0.3, 0.3]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.15, 0.15, 0.35, 16]} />;
      case 'sphere':
        return <sphereGeometry args={[0.18, 16, 16]} />;
      case 'gear':
        return (
          <torusGeometry args={[0.18, 0.06, 8, 24]} />
        );
      default:
        return <boxGeometry args={[0.3, 0.3, 0.3]} />;
    }
  }, [part.type]);

  return (
    <group position={part.position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        {geometry}
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh ref={glowRef} scale={[1.1, 1.1, 1.1]}>
        {geometry}
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

export default Part;
