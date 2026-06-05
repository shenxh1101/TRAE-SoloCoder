import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticlesProps {
  count?: number;
  color?: string;
  area?: [number, number, number];
}

export const Particles: React.FC<ParticlesProps> = ({
  count = 200,
  color = '#60a5fa',
  area = [20, 8, 15]
}) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area[0];
      positions[i * 3 + 1] = Math.random() * area[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * area[2];
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = Math.random() * 0.01 + 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      
      sizes[i] = Math.random() * 0.05 + 0.02;
    }
    
    return { positions, velocities, sizes };
  }, [count, area]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(particles.sizes, 1));
    return geo;
  }, [particles]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] += particles.velocities[i * 3];
      positions[i * 3 + 1] += particles.velocities[i * 3 + 1];
      positions[i * 3 + 2] += particles.velocities[i * 3 + 2];
      
      if (positions[i * 3 + 1] > area[1]) {
        positions[i * 3 + 1] = 0;
        positions[i * 3] = (Math.random() - 0.5) * area[0];
        positions[i * 3 + 2] = (Math.random() - 0.5) * area[2];
      }
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface ColdFogProps {
  position?: [number, number, number];
}

export const ColdFog: React.FC<ColdFogProps> = ({ position = [-8, 0, -6] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 50;
  
  const particles = useMemo(() => {
    const data: { pos: [number, number, number]; speed: number; size: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        pos: [
          (Math.random() - 0.5) * 5,
          Math.random() * 3,
          (Math.random() - 0.5) * 4
        ],
        speed: Math.random() * 0.3 + 0.1,
        size: Math.random() * 0.3 + 0.2
      });
    }
    
    return data;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    groupRef.current.children.forEach((child, i) => {
      const particle = particles[i];
      const mesh = child as THREE.Mesh;
      
      mesh.position.y = particle.pos[1] + Math.sin(time * particle.speed) * 0.3;
      mesh.position.x = particle.pos[0] + Math.cos(time * particle.speed * 0.7) * 0.5;
      mesh.position.z = particle.pos[2] + Math.sin(time * particle.speed * 0.5) * 0.5;
      
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(time * particle.speed + i) * 0.1;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial
            color="#87ceeb"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

interface FloorProps {
  size?: [number, number];
}

export const Floor: React.FC<FloorProps> = ({ size = [25, 20] }) => {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      const time = state.clock.getElapsedTime();
      const mat = gridRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.sin(time * 0.5) * 0.05;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color="#0a0f1a"
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      
      <gridHelper
        ref={gridRef}
        args={[size[0], 25, '#1e3a5f', '#1e293b']}
        position={[0, 0.01, 0]}
      />
      
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] - 1, size[1] - 1]} />
        <meshBasicMaterial
          color="#0a1628"
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
};
