import { useEffect, useRef } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { checkAllArmCollisions } from '@/utils/collision';

export const useCollisionDetection = () => {
  const arms = useSceneStore((state) => state.arms);
  const updateCollisionStates = useSceneStore((state) => state.updateCollisionStates);
  const isPlaying = useSceneStore((state) => state.recording.isPlaying);

  const lastCheckTime = useRef(0);
  const checkInterval = 1000 / 30;

  useEffect(() => {
    if (isPlaying) return;

    const checkCollisions = () => {
      const now = performance.now();
      if (now - lastCheckTime.current < checkInterval) return;
      lastCheckTime.current = now;

      const collisionMap = checkAllArmCollisions(arms);

      const collisionStates: { armId: string; isColliding: boolean; collidingJoints: number[] }[] = [];

      collisionMap.forEach((joints, armId) => {
        collisionStates.push({
          armId,
          isColliding: joints.length > 0,
          collidingJoints: joints,
        });
      });

      updateCollisionStates(collisionStates);
    };

    const interval = setInterval(checkCollisions, 33);
    return () => clearInterval(interval);
  }, [arms, updateCollisionStates, isPlaying]);

  const collidingArms = arms.filter((arm) => arm.isColliding);
  const hasCollision = collidingArms.length > 0;

  return {
    hasCollision,
    collidingArms,
  };
};
