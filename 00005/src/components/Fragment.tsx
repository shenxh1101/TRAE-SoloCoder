import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Fragment as FragmentType } from '../types';
import { getGeometry, getOrbitPosition } from '../utils/geometry';
import { useSceneStore } from '../store/useSceneStore';
import { useWaterDropSound } from '../hooks/useAudio';

const blurImage = (imageSrc: string, blurAmount: number = 12): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 0.25;
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imageSrc); return; }
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

interface FragmentProps {
  fragment: FragmentType;
  index: number;
}

export const Fragment = ({ fragment, index }: FragmentProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [blurredSrc, setBlurredSrc] = useState<string>('');

  const selectedId = useSceneStore((state) => state.selectedFragmentId);
  const isSelected = selectedId === fragment.id;
  const isViewerOpen = useSceneStore((state) => state.isViewerOpen);
  const lucidity = useSceneStore((state) => state.config.lucidity);
  const openViewer = useSceneStore((state) => state.openViewer);
  const selectFragment = useSceneStore((state) => state.selectFragment);
  const playSound = useWaterDropSound();

  const geometry = useMemo(
    () => getGeometry(fragment.geometryType, fragment.size),
    [fragment.geometryType, fragment.size]
  );

  useEffect(() => {
    let cancelled = false;
    blurImage(fragment.imageData, 10).then((blurred) => {
      if (!cancelled) setBlurredSrc(blurred);
    });
    return () => { cancelled = true; };
  }, [fragment.imageData]);

  const texture = useMemo(() => {
    const src = blurredSrc || fragment.imageData;
    const tex = new THREE.TextureLoader().load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 1;
    return tex;
  }, [blurredSrc, fragment.imageData]);

  useEffect(() => {
    return () => {
      texture.dispose();
      geometry.dispose();
    };
  }, [texture, geometry]);

  const orbitSpeed = useMemo(() => {
    const baseSpeed = 0.15;
    const speedMultiplier = 1 - lucidity * 0.9;
    const indexOffset = (index + 1) * 0.1;
    return baseSpeed * speedMultiplier * indexOffset;
  }, [lucidity, index]);

  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    const time = state.clock.elapsedTime * orbitSpeed;
    const position = getOrbitPosition(
      fragment.orbitRadius,
      fragment.orbitEllipticity,
      fragment.orbitTilt,
      fragment.orbitPhase,
      time
    );

    if (isSelected && isViewerOpen) {
      const targetPosition = new THREE.Vector3(0, 0, 4);
      groupRef.current.position.lerp(targetPosition, 0.06);
      meshRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.06);
      meshRef.current.rotation.y += delta * 0.2;
    } else {
      groupRef.current.position.lerp(position, 0.04);
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.06);
      meshRef.current.rotation.x += delta * fragment.rotationSpeed * 0.3;
      meshRef.current.rotation.y += delta * fragment.rotationSpeed * 0.5;
    }
  });

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    selectFragment(fragment.id);
    openViewer(fragment.id);
    playSound();
  }, [fragment.id, selectFragment, openViewer, playSound]);

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshPhysicalMaterial
          map={texture}
          transparent
          opacity={0.85}
          transmission={0.3}
          thickness={0.5}
          roughness={0.15}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          ior={1.2}
          envMapIntensity={1}
          emissive={hovered ? '#a855f7' : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>
      {hovered && (
        <pointLight
          position={[0, 0, 2]}
          color="#a855f7"
          intensity={0.5}
          distance={3}
        />
      )}
    </group>
  );
};
