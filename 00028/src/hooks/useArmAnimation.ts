import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSceneStore } from '@/store/useSceneStore';
import { generatePickAndPlaceCycle, getEndEffectorPosition, clamp } from '@/utils/kinematics';
import { ArmJoint } from '@/types/arm';

export const useArmAnimation = (armId: string) => {
  const arm = useSceneStore((state) => state.arms.find((a) => a.id === armId));
  const updateArmJoints = useSceneStore((state) => state.updateArmJoints);
  const incrementCycleCount = useSceneStore((state) => state.incrementCycleCount);
  const globalTime = useSceneStore((state) => state.globalTime);
  const isPlaying = useSceneStore((state) => state.recording.isPlaying);
  const frames = useSceneStore((state) => state.recording.frames);
  const playFrameIndex = useSceneStore((state) => state.recording.playFrameIndex);
  const setPlaybackFrame = useSceneStore((state) => state.setPlaybackFrame);

  const lastPhaseRef = useRef(0);
  const cycleDetectedRef = useRef(false);
  const lastPlaybackTime = useRef(0);

  useFrame((state) => {
    if (!arm) return;

    if (isPlaying && frames.length > 0) {
      const now = state.clock.elapsedTime;
      if (now - lastPlaybackTime.current > 1 / 30) {
        lastPlaybackTime.current = now;

        const nextIndex = Math.min(playFrameIndex + 1, frames.length - 1);
        const frame = frames[nextIndex];
        const armFrameData = frame.arms.find((a) => a.armId === armId);
        if (armFrameData) {
          const newJoints = arm.joints.map((joint, index) => ({
            ...joint,
            angle: armFrameData.jointAngles[index] ?? joint.angle,
          }));
          updateArmJoints(armId, newJoints, 0);
        }
        setPlaybackFrame(nextIndex);

        if (nextIndex >= frames.length - 1) {
          useSceneStore.getState().stopPlayback();
        }
      }
      return;
    }

    const jointAngles = generatePickAndPlaceCycle(
      globalTime,
      arm.speed,
      arm.amplitude,
      arm.phase
    );

    const newJoints: ArmJoint[] = arm.joints.map((joint, index) => ({
      ...joint,
      angle: clamp(jointAngles[index] ?? joint.angle, joint.minAngle, joint.maxAngle),
    }));

    const currentPhase = (globalTime * arm.speed + arm.phase) % (Math.PI * 2);

    if (lastPhaseRef.current > Math.PI * 1.5 && currentPhase < Math.PI * 0.5) {
      if (!cycleDetectedRef.current) {
        incrementCycleCount(armId);
        cycleDetectedRef.current = true;
      }
    } else {
      cycleDetectedRef.current = false;
    }

    lastPhaseRef.current = currentPhase;
    updateArmJoints(armId, newJoints, currentPhase);
  });

  const getEndEffectorWorldPos = () => {
    if (!arm) return null;
    return getEndEffectorPosition(arm.joints, arm.position);
  };

  return {
    arm,
    getEndEffectorWorldPos,
  };
};
