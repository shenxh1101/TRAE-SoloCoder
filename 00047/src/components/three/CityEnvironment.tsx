import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Building({ position, width, depth, height, heightVariation }: {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  heightVariation: number;
}) {
  const actualHeight = height + Math.random() * heightVariation;
  const neonColor = useMemo(() => {
    const colors = ['#00FFFF', '#FF00FF', '#0088FF', '#FF0088'];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const windows = useMemo(() => {
    const result: { position: [number, number, number]; lit: boolean }[] = [];
    const windowRows = Math.floor(actualHeight / 2);
    const windowCols = Math.floor(width / 1.5);
    for (let row = 1; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (Math.random() > 0.3) {
          result.push({
            position: [
              -width / 2 + 0.75 + col * 1.5,
              row * 2,
              depth / 2 + 0.01,
            ],
            lit: Math.random() > 0.4,
          });
        }
      }
    }
    return result;
  }, [actualHeight, width, depth]);

  return (
    <group position={position}>
      <mesh position={[0, actualHeight / 2, 0]}>
        <boxGeometry args={[width, actualHeight, depth]} />
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.8}
          roughness={0.2}
          emissive="#111122"
          emissiveIntensity={0.2}
        />
      </mesh>
      {windows.map((win, i) => (
        <mesh key={i} position={win.position}>
          <planeGeometry args={[0.8, 1.2]} />
          <meshBasicMaterial
            color={win.lit ? '#FFFF88' : '#222233'}
            transparent
            opacity={win.lit ? 0.9 : 0.3}
          />
        </mesh>
      ))}
      <mesh position={[0, actualHeight + 0.1, 0]}>
        <boxGeometry args={[width * 0.3, 0.2, depth * 0.3]} />
        <meshStandardMaterial
          color={neonColor}
          emissive={neonColor}
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  );
}

function StreetLight({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.intensity = 1.5 + Math.sin(time * 0.5) * 0.2;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 6, 8]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial
          color="#00FFFF"
          emissive="#00FFFF"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 6, 0]}
        color="#00FFFF"
        intensity={1.5}
        distance={15}
        decay={2}
      />
    </group>
  );
}

export function CityEnvironment() {
  const buildings = useMemo(() => {
    const result: { position: [number, number, number]; width: number; depth: number; height: number; heightVariation: number }[] = [];
    const positions = [
      [-50, 0, -50], [-50, 0, -20], [-50, 0, 20], [-50, 0, 50],
      [50, 0, -50], [50, 0, -20], [50, 0, 20], [50, 0, 50],
      [-20, 0, -50], [20, 0, -50], [-20, 0, 50], [20, 0, 50],
    ];
    positions.forEach((pos) => {
      result.push({
        position: pos as [number, number, number],
        width: 8 + Math.random() * 6,
        depth: 8 + Math.random() * 6,
        height: 8 + Math.random() * 12,
        heightVariation: 6,
      });
    });
    return result;
  }, []);

  const streetLights = useMemo(() => {
    const result: [number, number, number][] = [];
    for (let x = -45; x <= 45; x += 15) {
      for (let z = -45; z <= 45; z += 15) {
        if (Math.abs(x) > 5 || Math.abs(z) > 5) {
          result.push([x, 0, z]);
        }
      }
    }
    return result;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.9}
          roughness={0.4}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[200, 200, 50, 50]} />
        <meshStandardMaterial
          color="#111133"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
      {buildings.map((building, i) => (
        <Building key={i} {...building} />
      ))}
      {streetLights.map((pos, i) => (
        <StreetLight key={i} position={pos} />
      ))}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.5}
        azimuth={0.25}
      />
    </group>
  );
}
