import * as THREE from 'three';
import { ArmJoint } from '@/types/arm';

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const easeInOutSine = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const degToRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

export const radToDeg = (rad: number): number => {
  return (rad * 180) / Math.PI;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export interface JointPosition {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

const RENDER_LINK_LENGTHS = [0.8, 1.0, 0.85, 0.55, 0.4];

export const computeForwardKinematics = (
  joints: ArmJoint[],
  basePosition: [number, number, number]
): JointPosition[] => {
  const positions: JointPosition[] = [];
  let currentPos = new THREE.Vector3(basePosition[0], basePosition[1] + 0.3, basePosition[2]);
  let currentRot = new THREE.Euler(0, 0, 0);

  positions.push({
    position: currentPos.clone(),
    rotation: currentRot.clone(),
  });

  for (let i = 0; i < joints.length; i++) {
    const joint = joints[i];
    const angle = joint.angle;
    const length = RENDER_LINK_LENGTHS[i] || 0.5;

    const rotMatrix = new THREE.Matrix4();
    if (i === 0) {
      rotMatrix.makeRotationY(angle);
    } else if (i === 1 || i === 2) {
      rotMatrix.makeRotationZ(angle);
    } else if (i === 3) {
      rotMatrix.makeRotationY(angle);
    } else {
      rotMatrix.makeRotationX(angle);
    }

    const dir = new THREE.Vector3(0, length, 0);
    dir.applyEuler(currentRot);

    const nextPos = currentPos.clone().add(dir);
    const nextRot = new THREE.Euler();
    nextRot.setFromRotationMatrix(
      new THREE.Matrix4().makeRotationFromEuler(currentRot).multiply(rotMatrix)
    );

    positions.push({
      position: nextPos,
      rotation: nextRot,
    });

    currentPos = nextPos;
    currentRot = nextRot;
  }

  return positions;
};

export const getEndEffectorPosition = (
  joints: ArmJoint[],
  basePosition: [number, number, number]
): THREE.Vector3 => {
  const positions = computeForwardKinematics(joints, basePosition);
  return positions[positions.length - 1].position;
};

export const generatePickAndPlaceCycle = (
  time: number,
  speed: number,
  amplitude: number,
  phase: number
): number[] => {
  const cycleTime = 4 / speed;
  const t = ((time * speed + phase) % cycleTime) / cycleTime;

  const jointAngles: number[] = [];

  const pickupSwing = easeInOutQuad(Math.min(1, t * 4)) * amplitude;
  const lift = easeInOutQuad(Math.min(1, Math.max(0, (t - 0.1) * 4))) * amplitude;
  const rotate = easeInOutQuad(Math.min(1, Math.max(0, (t - 0.25) * 4))) * amplitude;
  const place = easeInOutQuad(Math.min(1, Math.max(0, (t - 0.5) * 4))) * amplitude;
  const retract = easeInOutQuad(Math.min(1, Math.max(0, (t - 0.75) * 4))) * amplitude;

  jointAngles[0] = pickupSwing * Math.PI * 0.5;
  jointAngles[1] = (1 - lift + place * 0.5) * Math.PI * 0.4 - retract * 0.2;
  jointAngles[2] = lift * Math.PI * 0.3 - place * Math.PI * 0.2;
  jointAngles[3] = rotate * Math.PI * 0.8;
  jointAngles[4] = (lift - place) * Math.PI * 0.3;

  return jointAngles;
};
