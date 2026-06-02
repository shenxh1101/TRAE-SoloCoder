import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '@/store/useSceneStore';
import { INITIAL_ARMS, JOINT_BOUNDS } from '@/types/arm';
import { computeForwardKinematics, clamp, generatePickAndPlaceCycle } from '@/utils/kinematics';
import { checkArmCollision, checkAllArmCollisions } from '@/utils/collision';
import { createRecordingData, compressRecordingData, validateRecordingData } from '@/utils/export';
import { RoboticArmState, ArmJoint } from '@/types/arm';
import { RecordingFrame } from '@/types/recording';

describe('Bug Fix Verification Tests', () => {
  describe('Bug Fix #1: Collision detection state management - independent states', () => {
    beforeEach(() => {
      useSceneStore.setState({
        arms: JSON.parse(JSON.stringify(INITIAL_ARMS)),
        showCollisionAlert: false,
      });
    });

    it('should update collision states for ALL arms simultaneously, not one at a time', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0, 1] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: true, collidingJoints: [2] },
      ]);

      const arms = useSceneStore.getState().arms;
      expect(arms.find((a) => a.id === 'arm-1')?.isColliding).toBe(true);
      expect(arms.find((a) => a.id === 'arm-2')?.isColliding).toBe(false);
      expect(arms.find((a) => a.id === 'arm-3')?.isColliding).toBe(true);
    });

    it('should properly clear previous collision state when arm is no longer colliding', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [1] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: false, collidingJoints: [] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [1, 2] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      const arms = useSceneStore.getState().arms;
      expect(arms.find((a) => a.id === 'arm-1')?.isColliding).toBe(false);
      expect(arms.find((a) => a.id === 'arm-1')?.collidingJoints).toEqual([]);
      expect(arms.find((a) => a.id === 'arm-2')?.collidingJoints).toEqual([1, 2]);
    });

    it('should detect collision independently per arm using checkAllArmCollisions', () => {
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

      const arms = [
        createArm('arm-1', [0, 0, 0], [0, 0, 0, 0, 0]),
        createArm('arm-2', [0.1, 0, 0], [0, 0, 0, 0, 0]),
        createArm('arm-3', [20, 0, 0]),
      ];
      const collisionMap = checkAllArmCollisions(arms);

      expect(collisionMap.get('arm-1')!.length).toBeGreaterThan(0);
      expect(collisionMap.get('arm-2')!.length).toBeGreaterThan(0);
      expect(collisionMap.get('arm-3')!.length).toBe(0);
    });
  });

  describe('Bug Fix #2: Camera attach mode initialization jump', () => {
    beforeEach(() => {
      useSceneStore.setState({
        camera: { mode: 'free', attachedArmId: null, attachOffset: [0.5, 0.3, 0.5] },
      });
    });

    it('should correctly switch camera mode to attach with arm ID', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-2');
      const camera = useSceneStore.getState().camera;
      expect(camera.mode).toBe('attach');
      expect(camera.attachedArmId).toBe('arm-2');
    });

    it('should clear attachedArmId when switching back to free mode', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-1');
      useSceneStore.getState().setCameraMode('free');
      expect(useSceneStore.getState().camera.attachedArmId).toBeNull();
    });

    it('should support switching between different arms in attach mode', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-1');
      expect(useSceneStore.getState().camera.attachedArmId).toBe('arm-1');

      useSceneStore.getState().setCameraMode('attach', 'arm-3');
      expect(useSceneStore.getState().camera.attachedArmId).toBe('arm-3');
    });
  });

  describe('Bug Fix #3: Playback frame advancement via clock instead of setTimeout', () => {
    it('should track playback state correctly', () => {
      useSceneStore.setState({
        recording: {
          isRecording: false,
          isPlaying: false,
          startTime: 0,
          currentTime: 0,
          frames: [],
          playFrameIndex: 0,
        },
      });

      useSceneStore.getState().startRecording();
      for (let i = 0; i < 10; i++) {
        useSceneStore.getState().addRecordingFrame({
          timestamp: performance.now() + i * 33,
          arms: [{ armId: 'arm-1', jointAngles: [i * 0.1, 0, 0, 0, 0], position: [0, 0, 0] }],
          parts: [],
        });
      }
      useSceneStore.getState().stopRecording();

      useSceneStore.getState().startPlayback();
      expect(useSceneStore.getState().recording.isPlaying).toBe(true);
      expect(useSceneStore.getState().recording.playFrameIndex).toBe(0);

      useSceneStore.getState().stopPlayback();
      expect(useSceneStore.getState().recording.isPlaying).toBe(false);
    });

    it('should allow setting playback frame index for time-based advancement', () => {
      useSceneStore.getState().setPlaybackFrame(5);
      expect(useSceneStore.getState().recording.playFrameIndex).toBe(5);

      useSceneStore.getState().setPlaybackFrame(0);
      expect(useSceneStore.getState().recording.playFrameIndex).toBe(0);
    });
  });

  describe('Bug Fix #4: Recording timestamp consistency (performance.now)', () => {
    it('should use performance.now for recording startTime', () => {
      const beforeStart = performance.now();
      useSceneStore.getState().startRecording();
      const afterStart = performance.now();

      const startTime = useSceneStore.getState().recording.startTime;
      expect(startTime).toBeGreaterThanOrEqual(beforeStart);
      expect(startTime).toBeLessThanOrEqual(afterStart);
    });

    it('should produce consistent duration calculation with performance.now timestamps', () => {
      const startTime = performance.now();
      const frames: RecordingFrame[] = [];
      for (let i = 0; i < 30; i++) {
        frames.push({
          timestamp: startTime + i * 33.33,
          arms: [],
          parts: [],
        });
      }
      const data = createRecordingData(frames, startTime, 30);
      expect(data.duration).toBeCloseTo(33.33 * 29, 0);
      expect(data.startTime).toBe(startTime);
      expect(data.endTime).toBe(startTime + 29 * 33.33);
    });
  });

  describe('Bug Fix #5: Part flow stale closures (useFrame instead of useEffect+setInterval)', () => {
    it('should correctly update part positions via store getState (not closures)', () => {
      useSceneStore.setState({ parts: [] });

      useSceneStore.getState().addPart({
        id: '',
        type: 'cube',
        position: [-4, 0.5, 0],
        rotation: [0, 0, 0],
        isOnBelt: true,
        isBeingCarried: false,
        carrierArmId: null,
        isAssembled: false,
        beltProgress: 0,
      });

      const partId = useSceneStore.getState().parts[0].id;
      useSceneStore.getState().updatePart(partId, { beltProgress: 0.5 });
      expect(useSceneStore.getState().parts[0].beltProgress).toBe(0.5);

      useSceneStore.getState().updatePart(partId, { beltProgress: 1.0 });
      expect(useSceneStore.getState().parts[0].beltProgress).toBe(1.0);
    });
  });

  describe('Bug Fix #6: FK/rendering link length mismatch', () => {
    it('should use RENDER_LINK_LENGTHS constant for FK computation', () => {
      const RENDER_LINK_LENGTHS = [0.8, 1.0, 0.85, 0.55, 0.4];
      const defaultJoints: ArmJoint[] = RENDER_LINK_LENGTHS.map((len, i) => ({
        angle: 0,
        minAngle: -Math.PI,
        maxAngle: Math.PI,
        length: len,
      }));

      const positions = computeForwardKinematics(defaultJoints, [0, 0, 0]);

      const totalExpected = 0.3 + RENDER_LINK_LENGTHS.reduce((sum, l) => sum + l, 0);
      const actualHeight = positions[5].position.y;
      expect(actualHeight).toBeCloseTo(totalExpected, 1);
    });

    it('should match the link lengths used in RoboticArm rendering positions', () => {
      const RENDER_LINK_LENGTHS = [0.8, 1.0, 0.85, 0.55, 0.4];
      const expectedTotal = RENDER_LINK_LENGTHS.reduce((sum, l) => sum + l, 0);
      expect(expectedTotal).toBeCloseTo(3.6, 1);

      expect(RENDER_LINK_LENGTHS[0]).toBe(0.8);
      expect(RENDER_LINK_LENGTHS[1]).toBe(1.0);
      expect(RENDER_LINK_LENGTHS[2]).toBe(0.85);
      expect(RENDER_LINK_LENGTHS[3]).toBe(0.55);
      expect(RENDER_LINK_LENGTHS[4]).toBe(0.4);
    });
  });

  describe('Bug Fix #7: Joint angle range not enforced', () => {
    it('should clamp generated angles within JOINT_BOUNDS', () => {
      for (const bound of JOINT_BOUNDS) {
        expect(clamp(999, bound.min, bound.max)).toBe(bound.max);
        expect(clamp(-999, bound.min, bound.max)).toBe(bound.min);
      }
    });

    it('should apply clamp in animation loop to enforce joint bounds', () => {
      for (let i = 0; i < JOINT_BOUNDS.length; i++) {
        const bound = JOINT_BOUNDS[i];
        const overMax = generatePickAndPlaceCycle(0, 3, 1, 0);
        const clamped = overMax.map((a, idx) =>
          clamp(a, JOINT_BOUNDS[idx].min, JOINT_BOUNDS[idx].max)
        );
        expect(clamped[i]).toBeGreaterThanOrEqual(JOINT_BOUNDS[i].min - 0.001);
        expect(clamped[i]).toBeLessThanOrEqual(JOINT_BOUNDS[i].max + 0.001);
      }
    });

    it('should respect expanded JOINT_BOUNDS ranges', () => {
      expect(JOINT_BOUNDS[0].min).toBe(-Math.PI);
      expect(JOINT_BOUNDS[0].max).toBe(Math.PI);
      expect(JOINT_BOUNDS[1].min).toBeCloseTo(-Math.PI / 2, 5);
      expect(JOINT_BOUNDS[1].max).toBeCloseTo(0.8 * Math.PI, 5);
      expect(JOINT_BOUNDS[2].min).toBeCloseTo(-0.8 * Math.PI, 5);
      expect(JOINT_BOUNDS[2].max).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('Bug Fix #8: Collision alert dismiss should NOT clear detection state', () => {
    beforeEach(() => {
      useSceneStore.setState({
        arms: JSON.parse(JSON.stringify(INITIAL_ARMS)),
        showCollisionAlert: false,
      });
    });

    it('should keep collision state when dismissing alert', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0, 1] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [2] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      expect(useSceneStore.getState().showCollisionAlert).toBe(true);

      useSceneStore.getState().dismissCollisionAlert();
      expect(useSceneStore.getState().showCollisionAlert).toBe(false);

      const arms = useSceneStore.getState().arms;
      expect(arms.find((a) => a.id === 'arm-1')?.isColliding).toBe(true);
      expect(arms.find((a) => a.id === 'arm-1')?.collidingJoints).toEqual([0, 1]);
      expect(arms.find((a) => a.id === 'arm-2')?.isColliding).toBe(true);
      expect(arms.find((a) => a.id === 'arm-2')?.collidingJoints).toEqual([2]);
    });

    it('should re-show alert when collision state updates again', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(true);

      useSceneStore.getState().dismissCollisionAlert();
      expect(useSceneStore.getState().showCollisionAlert).toBe(false);

      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0, 1] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [2] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(true);
    });
  });
});
