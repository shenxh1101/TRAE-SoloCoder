import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RoadSegment } from '../../types';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uIsHighIntensity;
  
  vec3 getColor(float t) {
    if (t < 0.3) return vec3(0.18, 0.58, 0.24);
    if (t < 0.5) return vec3(0.97, 0.50, 0.0);
    if (t < 0.7) return vec3(1.0, 0.42, 0.0);
    return vec3(0.84, 0.16, 0.16);
  }
  
  void main() {
    float dist = length(vUv - 0.5);
    float alpha = smoothstep(0.5, 0.1, dist) * uIntensity;
    float basePulse = 0.8 + sin(uTime * 2.0) * 0.2;
    float highIntensityPulse = 0.6 + sin(uTime * 4.0) * 0.4;
    float pulse = mix(basePulse, highIntensityPulse, uIsHighIntensity);
    vec3 color = getColor(uIntensity) * pulse;
    gl_FragColor = vec4(color, alpha * 0.6);
  }
`;

function HeatmapCell({ position, size, intensity }: {
  position: [number, number, number];
  size: number;
  intensity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const isHighIntensity = intensity >= 0.7 ? 1 : 0;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uIsHighIntensity: { value: isHighIntensity },
  }), [intensity, isHighIntensity]);

  return (
    <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

interface HeatmapLayerProps {
  roads: RoadSegment[];
}

export function HeatmapLayer({ roads }: HeatmapLayerProps) {
  const heatmapData = useMemo(() => {
    return roads.map((road) => {
      const midX = (road.start[0] + road.end[0]) / 2;
      const midZ = (road.start[2] + road.end[2]) / 2;
      const length = Math.sqrt(
        Math.pow(road.end[0] - road.start[0], 2) +
        Math.pow(road.end[2] - road.start[2], 2)
      );

      const intensity = road.heatmapIntensity ?? road.congestionIndex;

      const cells: { position: [number, number, number]; size: number; intensity: number }[] = [];
      const cellCount = Math.max(3, Math.floor(length / 10));

      for (let i = 0; i < cellCount; i++) {
        const t = (i + 0.5) / cellCount;
        const x = road.start[0] + (road.end[0] - road.start[0]) * t;
        const z = road.start[2] + (road.end[2] - road.start[2]) * t;
        
        const prevT = Math.max(0, t - 0.3);
        const nextT = Math.min(1, t + 0.3);
        const blendFactor = 1 - Math.abs(t - 0.5) * 0.4;
        const cellIntensity = intensity * blendFactor * (0.9 + Math.random() * 0.2);
        
        cells.push({
          position: [x, 0, z],
          size: 6 + road.lanes * 2,
          intensity: Math.min(1, cellIntensity),
        });
      }

      return cells;
    }).flat();
  }, [roads]);

  return (
    <group>
      {heatmapData.map((cell, i) => (
        <HeatmapCell
          key={i}
          position={cell.position}
          size={cell.size}
          intensity={cell.intensity}
        />
      ))}
    </group>
  );
}
