import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Fragment as FragmentType } from '../types';
import { getGeometry, getOrbitPosition } from '../utils/geometry';
import { useSceneStore } from '../store/useSceneStore';
import { useWaterDropSound } from '../hooks/useAudio';
import { createPlaceholderGradient } from '../utils/config';

const BLUR_TIMEOUT_MS = 10000;

const blurImage = (imageSrc: string, blurAmount: number = 10): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('图片模糊处理超时'));
    }, BLUR_TIMEOUT_MS);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const scale = 0.25;
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(imageSrc); return; }
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('图片加载失败'));
    };
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
  const [textureError, setTextureError] = useState(false);

  const selectedId = useSceneStore((state) => state.selectedFragmentId);
  const isSelected = selectedId === fragment.id;
  const isViewerOpen = useSceneStore((state) => state.isViewerOpen);
  const lucidity = useSceneStore((state) => state.config.lucidity);
  const storeVersion = useSceneStore((state) => state.version);
  const openViewer = useSceneStore((state) => state.openViewer);
  const selectFragment = useSceneStore((state) => state.selectFragment);
  const setLoadingProgress = useSceneStore((state) => state.setLoadingProgress);
  const playSound = useWaterDropSound();

  const geometry = useMemo(
    () => getGeometry(fragment.geometryType, fragment.size),
    [fragment.geometryType, fragment.size, storeVersion]
  );

  useEffect(() => {
    let cancelled = false;
    setTextureError(false);
    setBlurredSrc('');
    setLoadingProgress(fragment.id, 0);

    const sizeMB = (fragment.imageData.length * 0.75) / (1024 * 1024);
    if (sizeMB > 5) {
      console.warn(`图片较大 (${sizeMB.toFixed(1)}MB)，正在处理中...`);
    }

    blurImage(fragment.imageData, 10)
      .then((blurred) => {
        if (!cancelled) {
          setBlurredSrc(blurred);
          setLoadingProgress(fragment.id, 100);
        }
      })
      .catch((err) => {
        console.error('模糊处理失败，使用原图:', err);
        if (!cancelled) {
          setBlurredSrc(fragment.imageData);
          setLoadingProgress(fragment.id, 100);
        }
      });

    return () => { cancelled = true; };
  }, [fragment.imageData, fragment.id, setLoadingProgress, storeVersion]);

  const texture = useMemo(() => {
    const src = blurredSrc || fragment.imageData;
    const placeholderColors = ['#6366f1', '#1e1b4b'];
    const placeholder = createPlaceholderGradient(placeholderColors[0], placeholderColors[1]);
    
    let loadAttempts = 0;
    const maxAttempts = 2;
    
    const loadTexture = (imageSrc: string): THREE.Texture => {
      loadAttempts++;
      const tex = new THREE.TextureLoader().load(
        imageSrc,
        undefined,
        undefined,
        () => {
          console.error(`[纹理] 加载失败 (${fragment.imageName})，尝试${loadAttempts}/${maxAttempts}`);
          setTextureError(true);
          
          if (loadAttempts < maxAttempts) {
            const placeholderTex = new THREE.TextureLoader().load(
              placeholder,
              () => {
                console.log(`[纹理] 已替换为占位图 (${fragment.imageName})`);
                if (meshRef.current && meshRef.current.material) {
                  const materials = Array.isArray(meshRef.current.material)
                    ? meshRef.current.material
                    : [meshRef.current.material];
                  materials.forEach((mat) => {
                    if ('map' in mat) {
                      (mat as any).map = placeholderTex;
                      (mat as any).needsUpdate = true;
                    }
                  });
                }
              },
              undefined,
              (err) => {
                console.error(`[纹理] 占位图也加载失败:`, err);
              }
            );
            placeholderTex.colorSpace = THREE.SRGBColorSpace;
            placeholderTex.needsUpdate = true;
          }
        }
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 1;
      tex.needsUpdate = true;
      tex.flipY = false;
      return tex;
    };
    
    return loadTexture(src);
  }, [blurredSrc, fragment.imageData, fragment.imageName, storeVersion]);

  useEffect(() => {
    texture.needsUpdate = true;
    if (meshRef.current && meshRef.current.material) {
      const materials = Array.isArray(meshRef.current.material)
        ? meshRef.current.material
        : [meshRef.current.material];
      materials.forEach((mat) => {
        if ('needsUpdate' in mat) {
          (mat as THREE.Material).needsUpdate = true;
        }
        if ('map' in mat && (mat as any).map) {
          (mat as any).map.needsUpdate = true;
        }
      });
    }
  }, [texture, storeVersion]);

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
