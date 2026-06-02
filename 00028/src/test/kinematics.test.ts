import { describe, it, expect } from 'vitest';
import {
  easeInOutQuad,
  easeInOutSine,
  lerp,
  degToRad,
  radToDeg,
  clamp,
  computeForwardKinematics,
  getEndEffectorPosition,
  generatePickAndPlaceCycle,
} from '@/utils/kinematics';
import { ArmJoint } from '@/types/arm';

describe('kinematics utilities', () => {
  describe('easeInOutQuad', () => {
    it('should return 0 at t=0', () => {
      expect(easeInOutQuad(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(easeInOutQuad(1)).toBe(1);
    });

    it('should return 0.5 at t=0.5', () => {
      expect(easeInOutQuad(0.5)).toBe(0.5);
    });

    it('should be symmetric', () => {
      expect(easeInOutQuad(0.2) + easeInOutQuad(0.8)).toBeCloseTo(1, 10);
    });
  });

  describe('lerp', () => {
    it('should return a at t=0', () => {
      expect(lerp(5, 10, 0)).toBe(5);
    });

    it('should return b at t=1', () => {
      expect(lerp(5, 10, 1)).toBe(10);
    });

    it('should return midpoint at t=0.5', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });

  describe('degToRad / radToDeg', () => {
    it('should convert degrees to radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should convert radians to degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180, 10);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 10);
    });

    it('should be inverse of each other', () => {
      expect(radToDeg(degToRad(45))).toBeCloseTo(45, 10);
      expect(degToRad(radToDeg(1.5))).toBeCloseTo(1.5, 10);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should clamp to min when below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp to max when above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clamp(0, -Math.PI, Math.PI)).toBe(0);
      expect(clamp(-4, -Math.PI, Math.PI)).toBeCloseTo(-Math.PI, 10);
    });
  });

  describe('computeForwardKinematics', () => {
    const defaultJoints: ArmJoint[] = [
      { angle: 0, minAngle: -Math.PI, maxAngle: Math.PI, length: 1.2 },
      { angle: 0, minAngle: -Math.PI / 2, maxAngle: Math.PI * 0.8, length: 1.2 },
      { angle: 0, minAngle: -Math.PI * 0.8, maxAngle: Math.PI / 2, length: 1.2 },
      { angle: 0, minAngle: -Math.PI, maxAngle: Math.PI, length: 1.2 },
      { angle: 0, minAngle: -Math.PI / 2, maxAngle: Math.PI / 2, length: 1.2 },
    ];

    it('should return 6 positions for 5 joints (base + 5 joint endpoints)', () => {
      const positions = computeForwardKinematics(defaultJoints, [0, 0, 0]);
      expect(positions.length).toBe(6);
    });

    it('should start at base position offset by 0.3 (base height)', () => {
      const positions = computeForwardKinematics(defaultJoints, [4, 0, 0]);
      expect(positions[0].position.x).toBeCloseTo(4, 5);
      expect(positions[0].position.y).toBeCloseTo(0.3, 5);
      expect(positions[0].position.z).toBeCloseTo(0, 5);
    });

    it('with all zero angles, all positions should extend upward', () => {
      const positions = computeForwardKinematics(defaultJoints, [0, 0, 0]);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].position.y).toBeGreaterThan(positions[i - 1].position.y);
      }
    });

    it('should produce different positions when joint 0 rotates (Y-axis rotation changes X/Z)', () => {
      const rotatedJoints: ArmJoint[] = defaultJoints.map((j, i) =>
        i === 1 ? { ...j, angle: Math.PI / 4 } : i === 0 ? { ...j, angle: Math.PI / 4 } : j
      );
      const posDefault = computeForwardKinematics(defaultJoints, [0, 0, 0]);
      const posRotated = computeForwardKinematics(rotatedJoints, [0, 0, 0]);

      const dx = Math.abs(posDefault[5].position.x - posRotated[5].position.x);
      const dy = Math.abs(posDefault[5].position.y - posRotated[5].position.y);
      const dz = Math.abs(posDefault[5].position.z - posRotated[5].position.z);
      const totalDiff = dx + dy + dz;
      expect(totalDiff).toBeGreaterThan(0.1);
    });

    it('should produce different positions when joint 1 (Z-axis) rotates', () => {
      const rotatedJoints: ArmJoint[] = defaultJoints.map((j, i) =>
        i === 1 ? { ...j, angle: Math.PI / 4 } : j
      );
      const posDefault = computeForwardKinematics(defaultJoints, [0, 0, 0]);
      const posRotated = computeForwardKinematics(rotatedJoints, [0, 0, 0]);
      expect(posDefault[5].position.x).not.toBeCloseTo(posRotated[5].position.x, 3);
    });

    it('should respect base position offset', () => {
      const pos1 = computeForwardKinematics(defaultJoints, [-4, 0, 0]);
      const pos2 = computeForwardKinematics(defaultJoints, [4, 0, 0]);
      expect(pos2[5].position.x - pos1[5].position.x).toBeCloseTo(8, 3);
    });
  });

  describe('getEndEffectorPosition', () => {
    it('should return the last position from FK', () => {
      const joints: ArmJoint[] = [
        { angle: 0, minAngle: -Math.PI, maxAngle: Math.PI, length: 1.2 },
        { angle: 0, minAngle: -Math.PI / 2, maxAngle: Math.PI * 0.8, length: 1.2 },
        { angle: 0, minAngle: -Math.PI * 0.8, maxAngle: Math.PI / 2, length: 1.2 },
        { angle: 0, minAngle: -Math.PI, maxAngle: Math.PI, length: 1.2 },
        { angle: 0, minAngle: -Math.PI / 2, maxAngle: Math.PI / 2, length: 1.2 },
      ];
      const endPos = getEndEffectorPosition(joints, [0, 0, 0]);
      expect(endPos).toBeDefined();
      expect(endPos.y).toBeGreaterThan(0);
    });
  });

  describe('generatePickAndPlaceCycle', () => {
    it('should return 5 joint angles', () => {
      const angles = generatePickAndPlaceCycle(0, 1, 0.8, 0);
      expect(angles.length).toBe(5);
    });

    it('should produce different angles at different times', () => {
      const a1 = generatePickAndPlaceCycle(0, 1, 0.8, 0);
      const a2 = generatePickAndPlaceCycle(1, 1, 0.8, 0);
      let anyDifferent = false;
      for (let i = 0; i < 5; i++) {
        if (Math.abs(a1[i] - a2[i]) > 0.01) anyDifferent = true;
      }
      expect(anyDifferent).toBe(true);
    });

    it('should respect amplitude parameter (higher amplitude = larger max angle)', () => {
      let lowMax = 0;
      let highMax = 0;
      for (let t = 0; t < 10; t += 0.1) {
        const lowAmp = generatePickAndPlaceCycle(t, 1, 0.2, 0);
        const highAmp = generatePickAndPlaceCycle(t, 1, 1.0, 0);
        lowMax = Math.max(lowMax, ...lowAmp.map(Math.abs));
        highMax = Math.max(highMax, ...highAmp.map(Math.abs));
      }
      expect(highMax).toBeGreaterThan(lowMax);
    });

    it('should respect phase offset', () => {
      const a1 = generatePickAndPlaceCycle(0, 1, 0.8, 0);
      const a2 = generatePickAndPlaceCycle(0, 1, 0.8, Math.PI);
      expect(a1[0]).not.toBeCloseTo(a2[0], 3);
    });

    it('joint angles should be within reasonable range (not NaN or Infinity)', () => {
      for (let t = 0; t < 10; t += 0.1) {
        const angles = generatePickAndPlaceCycle(t, 1, 0.8, 0);
        for (const angle of angles) {
          expect(isNaN(angle)).toBe(false);
          expect(isFinite(angle)).toBe(true);
        }
      }
    });
  });
});
