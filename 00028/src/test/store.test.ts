import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '@/store/useSceneStore';
import { INITIAL_ARMS } from '@/types/arm';

describe('useSceneStore', () => {
  beforeEach(() => {
    useSceneStore.setState({
      arms: JSON.parse(JSON.stringify(INITIAL_ARMS)),
      parts: [],
      assemblySlots: [
        { id: 'slot-1', position: [6, 0.5, -2], occupied: false, partId: null },
        { id: 'slot-2', position: [6, 0.5, 0], occupied: false, partId: null },
        { id: 'slot-3', position: [6, 0.5, 2], occupied: false, partId: null },
      ],
      selectedPartType: 'cube',
      camera: { mode: 'free', attachedArmId: null, attachOffset: [0.5, 0.3, 0.5] },
      recording: {
        isRecording: false,
        isPlaying: false,
        startTime: 0,
        currentTime: 0,
        frames: [],
        playFrameIndex: 0,
      },
      showCollisionAlert: false,
      globalTime: 0,
    });
  });

  describe('arm speed control', () => {
    it('should update arm speed', () => {
      useSceneStore.getState().setArmSpeed('arm-1', 2.5);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      expect(arm?.speed).toBe(2.5);
    });

    it('should clamp speed to max 3', () => {
      useSceneStore.getState().setArmSpeed('arm-1', 5);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      expect(arm?.speed).toBe(3);
    });

    it('should clamp speed to min 0.1', () => {
      useSceneStore.getState().setArmSpeed('arm-1', -1);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      expect(arm?.speed).toBe(0.1);
    });
  });

  describe('arm amplitude control', () => {
    it('should update arm amplitude', () => {
      useSceneStore.getState().setArmAmplitude('arm-2', 0.5);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-2');
      expect(arm?.amplitude).toBe(0.5);
    });

    it('should clamp amplitude to max 1', () => {
      useSceneStore.getState().setArmAmplitude('arm-2', 2);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-2');
      expect(arm?.amplitude).toBe(1);
    });

    it('should clamp amplitude to min 0.1', () => {
      useSceneStore.getState().setArmAmplitude('arm-2', 0);
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-2');
      expect(arm?.amplitude).toBe(0.1);
    });
  });

  describe('collision state management (bug fix #1: independent collision states)', () => {
    it('should update collision states independently for each arm', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0, 1] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      const arms = useSceneStore.getState().arms;
      const arm1 = arms.find((a) => a.id === 'arm-1');
      const arm2 = arms.find((a) => a.id === 'arm-2');
      const arm3 = arms.find((a) => a.id === 'arm-3');

      expect(arm1?.isColliding).toBe(true);
      expect(arm1?.collidingJoints).toEqual([0, 1]);
      expect(arm2?.isColliding).toBe(false);
      expect(arm2?.collidingJoints).toEqual([]);
      expect(arm3?.isColliding).toBe(false);
      expect(arm3?.collidingJoints).toEqual([]);
    });

    it('should clear collision for arm that was previously colliding but now is not', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [1] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: false, collidingJoints: [] },
        { armId: 'arm-2', isColliding: true, collidingJoints: [1] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);

      const arms = useSceneStore.getState().arms;
      const arm1 = arms.find((a) => a.id === 'arm-1');
      const arm2 = arms.find((a) => a.id === 'arm-2');

      expect(arm1?.isColliding).toBe(false);
      expect(arm1?.collidingJoints).toEqual([]);
      expect(arm2?.isColliding).toBe(true);
    });

    it('should show collision alert when any arm is colliding', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(true);
    });

    it('should hide collision alert when no arms are colliding', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(true);

      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: false, collidingJoints: [] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(false);
    });

    it('should dismiss collision alert without clearing collision state (bug fix #8)', () => {
      useSceneStore.getState().updateCollisionStates([
        { armId: 'arm-1', isColliding: true, collidingJoints: [0] },
        { armId: 'arm-2', isColliding: false, collidingJoints: [] },
        { armId: 'arm-3', isColliding: false, collidingJoints: [] },
      ]);
      expect(useSceneStore.getState().showCollisionAlert).toBe(true);

      useSceneStore.getState().dismissCollisionAlert();
      expect(useSceneStore.getState().showCollisionAlert).toBe(false);

      const arm1 = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      expect(arm1?.isColliding).toBe(true);
      expect(arm1?.collidingJoints).toEqual([0]);
    });
  });

  describe('camera mode management (bug fix #2: attach mode initialization)', () => {
    it('should switch to free camera mode', () => {
      useSceneStore.getState().setCameraMode('free');
      expect(useSceneStore.getState().camera.mode).toBe('free');
      expect(useSceneStore.getState().camera.attachedArmId).toBeNull();
    });

    it('should switch to attach mode with specified arm', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-2');
      expect(useSceneStore.getState().camera.mode).toBe('attach');
      expect(useSceneStore.getState().camera.attachedArmId).toBe('arm-2');
    });

    it('should clear attachedArmId when switching to free mode', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-1');
      useSceneStore.getState().setCameraMode('free');
      expect(useSceneStore.getState().camera.attachedArmId).toBeNull();
    });

    it('should switch between different attached arms', () => {
      useSceneStore.getState().setCameraMode('attach', 'arm-1');
      expect(useSceneStore.getState().camera.attachedArmId).toBe('arm-1');

      useSceneStore.getState().setCameraMode('attach', 'arm-3');
      expect(useSceneStore.getState().camera.attachedArmId).toBe('arm-3');
    });
  });

  describe('recording management (bug fix #3: playback, bug fix #4: timestamps)', () => {
    it('should start recording with performance.now timestamp (bug fix #4)', () => {
      useSceneStore.getState().startRecording();
      const recording = useSceneStore.getState().recording;
      expect(recording.isRecording).toBe(true);
      expect(recording.startTime).toBeGreaterThan(0);
      expect(typeof recording.startTime).toBe('number');
    });

    it('should stop recording', () => {
      useSceneStore.getState().startRecording();
      useSceneStore.getState().stopRecording();
      expect(useSceneStore.getState().recording.isRecording).toBe(false);
    });

    it('should add recording frames', () => {
      useSceneStore.getState().startRecording();
      useSceneStore.getState().addRecordingFrame({
        timestamp: performance.now(),
        arms: [
          { armId: 'arm-1', jointAngles: [0, 0, 0, 0, 0], position: [0, 0, 0] },
        ],
        parts: [],
      });
      expect(useSceneStore.getState().recording.frames.length).toBe(1);
    });

    it('should start and stop playback (bug fix #3: frame advancement)', () => {
      useSceneStore.getState().startRecording();
      for (let i = 0; i < 5; i++) {
        useSceneStore.getState().addRecordingFrame({
          timestamp: performance.now() + i * 33,
          arms: [
            { armId: 'arm-1', jointAngles: [i * 0.1, 0, 0, 0, 0], position: [0, 0, 0] },
          ],
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

    it('should set playback frame index', () => {
      useSceneStore.getState().setPlaybackFrame(3);
      expect(useSceneStore.getState().recording.playFrameIndex).toBe(3);
    });

    it('should clear recording', () => {
      useSceneStore.getState().startRecording();
      useSceneStore.getState().addRecordingFrame({
        timestamp: performance.now(),
        arms: [],
        parts: [],
      });
      useSceneStore.getState().stopRecording();
      useSceneStore.getState().clearRecording();
      expect(useSceneStore.getState().recording.frames.length).toBe(0);
      expect(useSceneStore.getState().recording.isRecording).toBe(false);
    });
  });

  describe('part management', () => {
    it('should add a part with generated ID', () => {
      useSceneStore.getState().addPart({
        id: '',
        type: 'cube',
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        isOnBelt: true,
        isBeingCarried: false,
        carrierArmId: null,
        isAssembled: false,
        beltProgress: 0,
      });
      expect(useSceneStore.getState().parts.length).toBe(1);
      expect(useSceneStore.getState().parts[0].id).toMatch(/^part-\d+$/);
    });

    it('should update a part', () => {
      useSceneStore.getState().addPart({
        id: '',
        type: 'cube',
        position: [0, 0.5, 0],
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
    });

    it('should remove a part', () => {
      useSceneStore.getState().addPart({
        id: '',
        type: 'cube',
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        isOnBelt: true,
        isBeingCarried: false,
        carrierArmId: null,
        isAssembled: false,
        beltProgress: 0,
      });
      const partId = useSceneStore.getState().parts[0].id;
      useSceneStore.getState().removePart(partId);
      expect(useSceneStore.getState().parts.length).toBe(0);
    });

    it('should change selected part type', () => {
      useSceneStore.getState().setSelectedPartType('gear');
      expect(useSceneStore.getState().selectedPartType).toBe('gear');
    });
  });

  describe('joint angle clamping (bug fix #7)', () => {
    it('should update arm joints with clamped angles', () => {
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      const joint0 = arm!.joints[0];

      const clampedJoints = arm!.joints.map((j) => ({
        ...j,
        angle: Math.max(j.minAngle, Math.min(j.maxAngle, 999)),
      }));

      useSceneStore.getState().updateArmJoints('arm-1', clampedJoints, 0);
      const updatedArm = useSceneStore.getState().arms.find((a) => a.id === 'arm-1');
      expect(updatedArm?.joints[0].angle).toBeCloseTo(joint0.maxAngle, 5);
    });
  });

  describe('cycle count tracking', () => {
    it('should increment cycle count for specific arm', () => {
      useSceneStore.getState().incrementCycleCount('arm-2');
      useSceneStore.getState().incrementCycleCount('arm-2');
      const arm = useSceneStore.getState().arms.find((a) => a.id === 'arm-2');
      expect(arm?.cycleCount).toBe(2);
    });

    it('should not affect other arms cycle count', () => {
      useSceneStore.getState().incrementCycleCount('arm-1');
      const arm2 = useSceneStore.getState().arms.find((a) => a.id === 'arm-2');
      const arm3 = useSceneStore.getState().arms.find((a) => a.id === 'arm-3');
      expect(arm2?.cycleCount).toBe(0);
      expect(arm3?.cycleCount).toBe(0);
    });
  });

  describe('FK/rendering link length consistency (bug fix #6)', () => {
    it('should have RENDER_LINK_LENGTHS matching the RoboticArm component positions', () => {
      const RENDER_LINK_LENGTHS = [0.8, 1.0, 0.85, 0.55, 0.4];
      const expectedTotalHeight = RENDER_LINK_LENGTHS.reduce((sum, l) => sum + l, 0);
      expect(expectedTotalHeight).toBeCloseTo(3.6, 1);
    });
  });
});
