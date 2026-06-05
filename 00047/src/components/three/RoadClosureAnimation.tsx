import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { RoadSegment } from '../../types';

interface RoadClosureAnimationProps {
  roadSegments: RoadSegment[];
  activeClosures: { roadId: string; startTime: number; duration?: number }[];
}

interface ClosureData {
  id: string;
  roadId: string;
  road: RoadSegment;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  midPoint: [number, number, number];
  direction: [number, number, number];
  startTime: number;
  duration?: number;
}

function Barrier({
  position,
  rotation,
  isRaising,
  isLowering,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  isRaising: boolean;
  isLowering: boolean;
}) {
  const barrierRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Mesh>(null);
  const emissiveRef = useRef(0.5);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (barrierRef.current) {
      emissiveRef.current = 0.5 + Math.sin(time * 4) * 0.3;
      const barrierMesh = barrierRef.current.children[0] as THREE.Mesh;
      if (barrierMesh && barrierMesh.material) {
        const mat = barrierMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = emissiveRef.current;
      }
    }

    if (armRef.current) {
      if (isRaising) {
        armRef.current.rotation.x = Math.max(
          armRef.current.rotation.x - 0.05,
          -Math.PI / 2
        );
      } else if (isLowering) {
        armRef.current.rotation.x = Math.min(
          armRef.current.rotation.x + 0.05,
          0
        );
      }
    }
  });

  return (
    <group ref={barrierRef} position={position} rotation={rotation}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, 0.3]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF0000"
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>

      <mesh ref={armRef} position={[0, 1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 0.15, 0.15]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF4444"
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.1, 16]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function WarningLight({
  position,
}: {
  position: [number, number, number];
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const intensityRef = useRef(1);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    intensityRef.current = 0.5 + Math.sin(time * 8) * 0.5;

    if (lightRef.current) {
      lightRef.current.intensity = intensityRef.current * 3;
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = intensityRef.current * 0.6;
    }
  });

  return (
    <group position={position}>
      <pointLight
        ref={lightRef}
        color="#FF0000"
        intensity={2}
        distance={10}
        decay={2}
      />
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#FF4444"
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.8, 8]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function ClosedText({
  position,
}: {
  position: [number, number, number];
}) {
  const textRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (textRef.current) {
      textRef.current.position.y = position[1] + Math.sin(time * 2) * 0.2;
      textRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
  });

  return (
    <group ref={textRef} position={position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          fontSize={0.6}
          color="#FF0000"
          anchorX="center"
          anchorY="middle"
        >
          CLOSED
          <meshStandardMaterial
            color="#FF0000"
            emissive="#FF0000"
            emissiveIntensity={1}
          />
        </Text>
      </Float>
    </group>
  );
}

function RoadBarriers({
  startPoint,
  endPoint,
  direction,
  startTime,
}: {
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  direction: [number, number, number];
  startTime: number;
}) {
  const now = Date.now();
  const elapsed = (now - startTime) / 1000;
  const isRaising = elapsed < 2;
  const isLowering = false;

  const angle = Math.atan2(direction[2], direction[0]);
  const rotation: [number, number, number] = [0, -angle + Math.PI / 2, 0];

  const barrierPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      positions.push([
        startPoint[0] + (endPoint[0] - startPoint[0]) * t,
        0,
        startPoint[2] + (endPoint[2] - startPoint[2]) * t,
      ]);
    }
    return positions;
  }, [startPoint, endPoint]);

  return (
    <group>
      {barrierPositions.map((pos, i) => (
        <Barrier
          key={i}
          position={pos}
          rotation={rotation}
          isRaising={isRaising}
          isLowering={isLowering}
        />
      ))}
    </group>
  );
}

function ClosureEffects({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sparkles
          count={30}
          scale={[3, 3, 3]}
          size={4}
          speed={0.5}
          color="#FF6600"
          opacity={0.8}
        />
      </Float>
    </group>
  );
}

export function RoadClosureAnimation({
  roadSegments,
  activeClosures,
}: RoadClosureAnimationProps) {
  const closureData = useMemo((): ClosureData[] => {
    return activeClosures
      .map((closure) => {
        const road = roadSegments.find((r) => r.id === closure.roadId);
        if (!road) return null;

        const dx = road.end[0] - road.start[0];
        const dz = road.end[2] - road.start[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const direction: [number, number, number] = [
          dx / length,
          0,
          dz / length,
        ];

        const perpX = -direction[2];
        const perpZ = direction[0];
        const offset = 1.5;

        const startPoint: [number, number, number] = [
          road.start[0] + perpX * offset,
          0,
          road.start[2] + perpZ * offset,
        ];

        const endPoint: [number, number, number] = [
          road.start[0] - perpX * offset,
          0,
          road.start[2] - perpZ * offset,
        ];

        const midPoint: [number, number, number] = [
          (road.start[0] + road.end[0]) / 2,
          2,
          (road.start[2] + road.end[2]) / 2,
        ];

        return {
          id: `${closure.roadId}-${closure.startTime}`,
          roadId: closure.roadId,
          road,
          startPoint,
          endPoint,
          midPoint,
          direction,
          startTime: closure.startTime,
          duration: closure.duration,
        };
      })
      .filter(Boolean) as ClosureData[];
  }, [roadSegments, activeClosures]);

  return (
    <group>
      {closureData.map((closure) => (
        <group key={closure.id}>
          <RoadBarriers
            startPoint={closure.startPoint}
            endPoint={closure.endPoint}
            direction={closure.direction}
            startTime={closure.startTime}
          />

          <WarningLight
            position={[
              closure.startPoint[0],
              2,
              closure.startPoint[2],
            ]}
          />
          <WarningLight
            position={[
              closure.endPoint[0],
              2,
              closure.endPoint[2],
            ]}
          />

          <ClosedText
            position={[
              closure.midPoint[0],
              3,
              closure.midPoint[2],
            ]}
          />

          <ClosureEffects
            position={[
              closure.midPoint[0],
              1,
              closure.midPoint[2],
            ]}
          />
        </group>
      ))}
    </group>
  );
}
