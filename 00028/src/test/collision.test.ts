import { describe, it, expect } from 'vitest';
import {
  createJointBoundingBox,
  checkArmCollision,
  checkAllArmCollisions,
} from '@/utils/collision';
import { RoboticArmState } from '@/types/arm';
import * as THREE from 'three';

describe('collision detection', () => {
  describe('createJointBoundingBox', () => {
    it('should create a valid bounding box from two points', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(1, 1, 1);
      const box = createJointBoundingBox(start, end, 0.25);

      expect(box.min.x).toBeCloseTo(-0.25, 5);
      expect(box.min.y).toBeCloseTo(-0.25, 5);
      expect(box.min.z).toBeCloseTo(-0.25, 5);
      expect(box.max.x).toBeCloseTo(1.25, 5);
      expect(box.max.y).toBeCloseTo(1.25, 5);
      expect(box.max.z).toBeCloseTo(1.25, 5);
    });

    it('should expand box by thickness', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(0, 2, 0);
      const box = createJointBoundingBox(start, end, 0.3);

      expect(box.min.x).toBeCloseTo(-0.3, 5);
      expect(box.max.y).toBeCloseTo(2.3, 5);
    });
  });

  describe('checkArmCollision', () => {
    const createArm = (
      id: string,
      position: [number, number, number],
      angles: number[] = [0, 0, 0, 0, 0]
    ): RoboticArmState => ({
      id,
      name: `Arm ${id}`,
      position,
      joints: angles.map((angle) => ({
        angle,
        minAngle: -Math.PI,
        maxAngle: Math.PI,
        length: 1.2,
      })),
      speed: 1,
      amplitude: 0.8,
      cycleCount: 0,
      isColliding: false,
      collidingJoints: [],
      phase: 0,
    });

    it('should not detect collision between the same arm', () => {
      const arm = createArm('arm-1', [0, 0, 0]);
      const collisions = checkArmCollision(arm, arm);
      expect(collisions.length).toBe(0);
    });

    it('should not detect collision between far apart arms', () => {
      const arm1 = createArm('arm-1', [-10, 0, 0]);
      const arm2 = createArm('arm-2', [10, 0, 0]);
      const collisions = checkArmCollision(arm1, arm2);
      expect(collisions.length).toBe(0);
    });

    it('should detect collision when arms bend towards each other', () => {
      const arm1 = createArm('arm-1', [-0.1, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0]);
      const collisions = checkArmCollision(arm1, arm2);
      expect(collisions.length).toBeGreaterThan(0);
    });

    it('should detect collision with overlapping vertical segments', () => {
      const arm1 = createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]);
      const collisions = checkArmCollision(arm1, arm2);
      expect(collisions.length).toBeGreaterThan(0);
    });

    it('should report correct arm IDs in collision info', () => {
      const arm1 = createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]);
      const collisions = checkArmCollision(arm1, arm2);

      for (const c of collisions) {
        expect(c.armId1).toBe('arm-1');
        expect(c.armId2).toBe('arm-2');
      }
    });

    it('should report valid joint indices', () => {
      const arm1 = createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]);
      const collisions = checkArmCollision(arm1, arm2);

      for (const c of collisions) {
        expect(c.jointIndex1).toBeGreaterThanOrEqual(0);
        expect(c.jointIndex1).toBeLessThan(5);
        expect(c.jointIndex2).toBeGreaterThanOrEqual(0);
        expect(c.jointIndex2).toBeLessThan(5);
      }
    });
  });

  describe('checkAllArmCollisions', () => {
    const createArm = (
      id: string,
      position: [number, number, number],
      angles: number[] = [0, 0, 0, 0, 0]
    ): RoboticArmState => ({
      id,
      name: `Arm ${id}`,
      position,
      joints: angles.map((angle) => ({
        angle,
        minAngle: -Math.PI,
        maxAngle: Math.PI,
        length: 1.2,
      })),
      speed: 1,
      amplitude: 0.8,
      cycleCount: 0,
      isColliding: false,
      collidingJoints: [],
      phase: 0,
    });

    it('should return map with entry for each arm', () => {
      const arms = [
        createArm('arm-1', [-4, 0, 0]),
        createArm('arm-2', [0, 0, 0]),
        createArm('arm-3', [4, 0, 0]),
      ];
      const collisionMap = checkAllArmCollisions(arms);

      expect(collisionMap.has('arm-1')).toBe(true);
      expect(collisionMap.has('arm-2')).toBe(true);
      expect(collisionMap.has('arm-3')).toBe(true);
    });

    it('should return empty arrays when no collisions', () => {
      const arms = [
        createArm('arm-1', [-10, 0, 0]),
        createArm('arm-2', [0, 0, 0]),
        createArm('arm-3', [10, 0, 0]),
      ];
      const collisionMap = checkAllArmCollisions(arms);

      collisionMap.forEach((joints) => {
        expect(joints.length).toBe(0);
      });
    });

    it('should detect collisions for colliding arms only', () => {
      const arm1 = createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]);
      const arm3 = createArm('arm-3', [20, 0, 0]);
      const collisionMap = checkAllArmCollisions([arm1, arm2, arm3]);

      expect(collisionMap.get('arm-1')!.length).toBeGreaterThan(0);
      expect(collisionMap.get('arm-2')!.length).toBeGreaterThan(0);
      expect(collisionMap.get('arm-3')!.length).toBe(0);
    });

    it('should independently track each arm collision state (bug fix #1)', () => {
      const arm1 = createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]);
      const arm2 = createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]);
      const arm3 = createArm('arm-3', [20, 0, 0]);

      const collisionMap = checkAllArmCollisions([arm1, arm2, arm3]);

      const arm3Joints = collisionMap.get('arm-3')!;
      expect(arm3Joints.length).toBe(0);

      const arm1Joints = collisionMap.get('arm-1')!;
      const arm2Joints = collisionMap.get('arm-2')!;
      expect(arm1Joints.length).toBeGreaterThan(0);
      expect(arm2Joints.length).toBeGreaterThan(0);
    });
  });
});
