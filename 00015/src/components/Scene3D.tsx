import { useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { GlassBall } from '@/components/GlassBall'
import * as THREE from 'three'

export interface SceneRefs {
  canvas: HTMLCanvasElement
}

interface Scene3DProps {
  onRefsReady?: (refs: SceneRefs) => void
}

function SceneRefCapture({ onRefsReady }: { onRefsReady?: (refs: SceneRefs) => void }) {
  const { gl } = useThree()

  useEffect(() => {
    if (onRefsReady) {
      onRefsReady({ canvas: gl.domElement })
    }
  }, [gl, onRefsReady])

  return null
}

export function Scene3D({ onRefsReady }: Scene3DProps) {
  const handleRefsReady = useCallback((refs: SceneRefs) => {
    if (onRefsReady) {
      onRefsReady(refs)
    }
  }, [onRefsReady])

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
      camera={{ position: [0, 0, 6], fov: 50 }}
      onCreated={({ gl: renderer }) => {
        renderer.setClearColor(new THREE.Color('#0a0e27'), 1)
      }}
    >
      <SceneRefCapture onRefsReady={handleRefsReady} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-3, -2, -3]} intensity={0.5} color="#4fc3f7" />
      <pointLight position={[3, 2, 3]} intensity={0.5} color="#ffd700" />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={12}
        enablePan={false}
      />
      <Stars radius={50} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />
      <GlassBall />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
