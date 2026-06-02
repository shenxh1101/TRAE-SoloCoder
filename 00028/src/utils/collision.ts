import * as THREE from 'three';
import { RoboticArmState, ArmJoint } from '@/types/arm';
import { computeForwardKinematics } from './kinematics';

export interface CollisionInfo {
  armId1: string;
  jointIndex1: number;
  armId2: string;
  jointIndex2: number;
}

export const createJointBoundingSphere = (
  center: THREE.Vector3,
  radius: number
): THREE.Sphere => {
  return new THREE.Sphere(center.clone(), radius);
};

export const createJointBoundingBox = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number
): THREE.Box3 => {
  const min = new THREE.Vector3(
    Math.min(start.x, end.x) - thickness,
    Math.min(start.y, end.y) - thickness,
    Math.min(start.z, end.z) - thickness
  );
  const max = new THREE.Vector3(
    Math.max(start.x, end.x) + thickness,
    Math.max(start.y, end.y) + thickness,
    Math.max(start.z, end.z) + thickness
  );
  return new THREE.Box3(min, max);
};

export const checkArmCollision = (
  arm1: RoboticArmState,
  arm2: RoboticArmState
): CollisionInfo[] => {
  const collisions: CollisionInfo[] = [];

  if (arm1.id === arm2.id) return collisions;

  const pos1 = computeForwardKinematics(arm1.joints, arm1.position);
  const pos2 = computeForwardKinematics(arm2.joints, arm2.position);

  const thickness = 0.25;

  for (let i = 1; i < pos1.length; i++) {
    const box1 = createJointBoundingBox(pos1[i - 1].position, pos1[i].position, thickness);

    for (let j = 1; j < pos2.length; j++) {
      const box2 = createJointBoundingBox(pos2[j - 1].position, pos2[j].position, thickness);

      if (box1.intersectsBox(box2)) {
        collisions.push({
          armId1: arm1.id,
          jointIndex1: i - 1,
          armId2: arm2.id,
          jointIndex2: j - 1,
        });
      }
    }
  }

  return collisions;
};

export const checkAllArmCollisions = (
  arms: RoboticArmState[]
): Map<string, number[]> => {
  const collisionMap = new Map<string, number[]>();

  for (let i = 0; i < arms.length; i++) {
    collisionMap.set(arms[i].id, []);
  }

  for (let i = 0; i < arms.length; i++) {
    for (let j = i + 1; j < arms.length; j++) {
      const collisions = checkArmCollision(arms[i], arms[j]);

      for (const collision of collisions) {
        const joints1 = collisionMap.get(collision.armId1) || [];
        if (!joints1.includes(collision.jointIndex1)) {
          joints1.push(collision.jointIndex1);
          collisionMap.set(collision.armId1, joints1);
        }

        const joints2 = collisionMap.get(collision.armId2) || [];
        if (!joints2.includes(collision.jointIndex2)) {
          joints2.push(collision.jointIndex2);
          collisionMap.set(collision.armId2, joints2);
        }
      }
    }
  }

  return collisionMap;
};

export const getArmBoundingBoxes = (
  arm: RoboticArmState
): THREE.Box3[] => {
  const positions = computeForwardKinematics(arm.joints, arm.position);
  const boxes: THREE.Box3[] = [];
  const thickness = 0.25;

  for (let i = 1; i < positions.length; i++) {
    boxes.push(
      createJointBoundingBox(positions[i - 1].position, positions[i].position, thickness)
    );
  }

  return boxes;
};
