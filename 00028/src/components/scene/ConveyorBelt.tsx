import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const ConveyorBelt = () => {
  const beltRef = useRef<THREE.Mesh>(null);
  const rollersRef = useRef<THREE.InstancedMesh>(null);

  const beltLength = 16;
  const beltWidth = 1.2;
  const rollerCount = 18;

  const rollerPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < rollerCount; i++) {
      positions.push([-8 + (i / (rollerCount - 1)) * beltLength, 0.1, 2]);
    }
    return positions;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (beltRef.current) {
      const material = beltRef.current.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.offset.x = state.clock.elapsedTime * 0.5;
      }
    }

    if (rollersRef.current) {
      for (let i = 0; i < rollerCount; i++) {
        dummy.position.set(...rollerPositions[i]);
        dummy.rotation.z = state.clock.elapsedTime * 3;
        dummy.updateMatrix();
        rollersRef.current.setMatrixAt(i, dummy.matrix);
      }
      rollersRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const beltTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a3444';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#3d4f66';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i * 32, 0, 2, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 1);
    return texture;
  }, []);

  return (
    <group>
      <mesh
        ref={beltRef}
        position={[0, 0.2, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[beltLength, beltWidth]} />
        <meshStandardMaterial
          map={beltTexture}
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>

      <instancedMesh
        ref={rollersRef}
        args={[undefined, undefined, rollerCount]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.08, 0.08, beltWidth, 16]} />
        <meshStandardMaterial color="#1a2332" metalness={0.6} roughness={0.4} />
      </instancedMesh>

      {[-8.5, 8.5].map((x, i) => (
        <mesh key={i} position={[x, 0.05, 2]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.15, beltWidth + 0.4]} />
          <meshStandardMaterial color="#1a2332" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      <mesh position={[0, -0.1, 2]} receiveShadow>
        <boxGeometry args={[beltLength, 0.1, beltWidth + 0.4]} />
        <meshStandardMaterial color="#0f1624" metalness={0.5} roughness={0.5} />
      </mesh>

      {[-8.5, 8.5].map((x, i) => (
        <mesh key={`support-${i}`} position={[x, -0.3, 2]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#1a2332" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

export default ConveyorBelt;
