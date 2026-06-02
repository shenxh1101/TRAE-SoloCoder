import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '@/store/useSceneStore';
import { getEndEffectorPosition } from '@/utils/kinematics';

const CameraController = () => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetCameraPos = useRef(new THREE.Vector3(8, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));
  const prevMode = useRef<string>('free');

  const cameraMode = useSceneStore((state) => state.camera.mode);
  const attachedArmId = useSceneStore((state) => state.camera.attachedArmId);
  const attachOffset = useSceneStore((state) => state.camera.attachOffset);
  const arms = useSceneStore((state) => state.arms);
  const isPlaying = useSceneStore((state) => state.recording.isPlaying);
  const frames = useSceneStore((state) => state.recording.frames);
  const playFrameIndex = useSceneStore((state) => state.recording.playFrameIndex);

  useEffect(() => {
    if (cameraMode === 'attach' && prevMode.current === 'free') {
      targetCameraPos.current.copy(camera.position);
      if (controlsRef.current) {
        targetLookAt.current.copy(controlsRef.current.target);
      }
    }
    if (cameraMode === 'free') {
      targetCameraPos.current.set(8, 8, 12);
      targetLookAt.current.set(0, 1, 0);
    }
    prevMode.current = cameraMode;
  }, [cameraMode, camera]);

  useFrame(() => {
    if (cameraMode === 'attach' && attachedArmId) {
      let endEffectorPos: THREE.Vector3 | null = null;

      const arm = arms.find((a) => a.id === attachedArmId);
      if (arm) {
        endEffectorPos = getEndEffectorPosition(arm.joints, arm.position);
      }

      if (endEffectorPos) {
        const offset = new THREE.Vector3(...attachOffset);
        const targetPos = endEffectorPos.clone().add(offset);
        targetCameraPos.current.lerp(targetPos, 0.1);
        targetLookAt.current.lerp(endEffectorPos, 0.1);
      }

      camera.position.lerp(targetCameraPos.current, 0.08);
      camera.lookAt(targetLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
    }

    if (isPlaying && cameraMode === 'free') {
      camera.position.lerp(targetCameraPos.current, 0.05);
      camera.lookAt(targetLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={cameraMode === 'free' && !isPlaying}
        makeDefault
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 1, 0]}
      />
    </>
  );
};

export default CameraController;
