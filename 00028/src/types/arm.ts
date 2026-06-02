export interface ArmJoint {
  angle: number;
  minAngle: number;
  maxAngle: number;
  length: number;
}

export interface RoboticArmState {
  id: string;
  name: string;
  position: [number, number, number];
  joints: ArmJoint[];
  speed: number;
  amplitude: number;
  cycleCount: number;
  isColliding: boolean;
  collidingJoints: number[];
  phase: number;
}

export interface JointBounds {
  min: number;
  max: number;
  default: number;
}

export const JOINT_BOUNDS: JointBounds[] = [
  { min: -Math.PI, max: Math.PI, default: 0 },
  { min: -Math.PI / 2, max: Math.PI * 0.8, default: 0 },
  { min: -Math.PI * 0.8, max: Math.PI / 2, default: 0 },
  { min: -Math.PI, max: Math.PI, default: 0 },
  { min: -Math.PI / 2, max: Math.PI / 2, default: 0 },
];

export const INITIAL_ARMS: RoboticArmState[] = [
  {
    id: 'arm-1',
    name: '机械臂 A',
    position: [-4, 0, 0],
    joints: JOINT_BOUNDS.map((b) => ({
      angle: b.default,
      minAngle: b.min,
      maxAngle: b.max,
      length: 1.2,
    })),
    speed: 1.0,
    amplitude: 0.8,
    cycleCount: 0,
    isColliding: false,
    collidingJoints: [],
    phase: 0,
  },
  {
    id: 'arm-2',
    name: '机械臂 B',
    position: [0, 0, 0],
    joints: JOINT_BOUNDS.map((b) => ({
      angle: b.default,
      minAngle: b.min,
      maxAngle: b.max,
      length: 1.2,
    })),
    speed: 1.0,
    amplitude: 0.8,
    cycleCount: 0,
    isColliding: false,
    collidingJoints: [],
    phase: Math.PI * 0.5,
  },
  {
    id: 'arm-3',
    name: '机械臂 C',
    position: [4, 0, 0],
    joints: JOINT_BOUNDS.map((b) => ({
      angle: b.default,
      minAngle: b.min,
      maxAngle: b.max,
      length: 1.2,
    })),
    speed: 1.0,
    amplitude: 0.8,
    cycleCount: 0,
    isColliding: false,
    collidingJoints: [],
    phase: Math.PI,
  },
];
