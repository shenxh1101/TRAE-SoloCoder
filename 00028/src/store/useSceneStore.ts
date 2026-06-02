import { create } from 'zustand';
import { RoboticArmState, INITIAL_ARMS, ArmJoint } from '@/types/arm';
import { PartState, PartType, AssemblySlot, INITIAL_ASSEMBLY_SLOTS } from '@/types/part';
import { RecordingState, INITIAL_RECORDING_STATE, RecordingFrame } from '@/types/recording';

interface CameraState {
  mode: 'free' | 'attach';
  attachedArmId: string | null;
  attachOffset: [number, number, number];
}

interface SceneState {
  arms: RoboticArmState[];
  parts: PartState[];
  assemblySlots: AssemblySlot[];
  selectedPartType: PartType;
  camera: CameraState;
  recording: RecordingState;
  showCollisionAlert: boolean;
  globalTime: number;
  setArmSpeed: (armId: string, speed: number) => void;
  setArmAmplitude: (armId: string, amplitude: number) => void;
  updateArmJoints: (armId: string, joints: ArmJoint[], phase: number) => void;
  incrementCycleCount: (armId: string) => void;
  setCollision: (armId: string, collidingJoints: number[]) => void;
  clearCollision: () => void;
  updateCollisionStates: (states: { armId: string; isColliding: boolean; collidingJoints: number[] }[]) => void;
  dismissCollisionAlert: () => void;
  addPart: (part: PartState) => void;
  updatePart: (partId: string, updates: Partial<PartState>) => void;
  removePart: (partId: string) => void;
  setSelectedPartType: (type: PartType) => void;
  setAssemblySlotOccupied: (slotId: string, partId: string) => void;
  setCameraMode: (mode: 'free' | 'attach', armId?: string) => void;
  setCameraOffset: (offset: [number, number, number]) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addRecordingFrame: (frame: RecordingFrame) => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setPlaybackFrame: (index: number) => void;
  clearRecording: () => void;
  updateGlobalTime: (time: number) => void;
}

let partIdCounter = 0;

export const useSceneStore = create<SceneState>((set, get) => ({
  arms: INITIAL_ARMS,
  parts: [],
  assemblySlots: INITIAL_ASSEMBLY_SLOTS,
  selectedPartType: 'cube',
  camera: {
    mode: 'free',
    attachedArmId: null,
    attachOffset: [0.5, 0.3, 0.5],
  },
  recording: INITIAL_RECORDING_STATE,
  showCollisionAlert: false,
  globalTime: 0,

  setArmSpeed: (armId, speed) =>
    set((state) => ({
      arms: state.arms.map((arm) =>
        arm.id === armId ? { ...arm, speed: Math.max(0.1, Math.min(3, speed)) } : arm
      ),
    })),

  setArmAmplitude: (armId, amplitude) =>
    set((state) => ({
      arms: state.arms.map((arm) =>
        arm.id === armId
          ? { ...arm, amplitude: Math.max(0.1, Math.min(1, amplitude)) }
          : arm
      ),
    })),

  updateArmJoints: (armId, joints, phase) =>
    set((state) => ({
      arms: state.arms.map((arm) =>
        arm.id === armId ? { ...arm, joints, phase } : arm
      ),
    })),

  incrementCycleCount: (armId) =>
    set((state) => ({
      arms: state.arms.map((arm) =>
        arm.id === armId ? { ...arm, cycleCount: arm.cycleCount + 1 } : arm
      ),
    })),

  setCollision: (armId, collidingJoints) =>
    set((state) => ({
      arms: state.arms.map((arm) =>
        arm.id === armId
          ? { ...arm, isColliding: true, collidingJoints }
          : arm
      ),
      showCollisionAlert: true,
    })),

  clearCollision: () =>
    set((state) => ({
      arms: state.arms.map((arm) => ({
        ...arm,
        isColliding: false,
        collidingJoints: [],
      })),
      showCollisionAlert: false,
    })),

  updateCollisionStates: (states) =>
    set((state) => {
      const stateMap = new Map(states.map((s) => [s.armId, s]));
      const anyCollision = states.some((s) => s.isColliding);
      return {
        arms: state.arms.map((arm) => {
          const collisionState = stateMap.get(arm.id);
          if (collisionState) {
            return {
              ...arm,
              isColliding: collisionState.isColliding,
              collidingJoints: collisionState.collidingJoints,
            };
          }
          return {
            ...arm,
            isColliding: false,
            collidingJoints: [],
          };
        }),
        showCollisionAlert: anyCollision,
      };
    }),

  dismissCollisionAlert: () =>
    set({ showCollisionAlert: false }),

  addPart: (part) =>
    set((state) => ({
      parts: [...state.parts, { ...part, id: `part-${partIdCounter++}` }],
    })),

  updatePart: (partId, updates) =>
    set((state) => ({
      parts: state.parts.map((part) =>
        part.id === partId ? { ...part, ...updates } : part
      ),
    })),

  removePart: (partId) =>
    set((state) => ({
      parts: state.parts.filter((p) => p.id !== partId),
    })),

  setSelectedPartType: (type) => set({ selectedPartType: type }),

  setAssemblySlotOccupied: (slotId, partId) =>
    set((state) => ({
      assemblySlots: state.assemblySlots.map((slot) =>
        slot.id === slotId ? { ...slot, occupied: true, partId } : slot
      ),
    })),

  setCameraMode: (mode, armId) =>
    set((state) => ({
      camera: {
        ...state.camera,
        mode,
        attachedArmId: mode === 'attach' ? armId || null : null,
      },
    })),

  setCameraOffset: (offset) =>
    set((state) => ({
      camera: { ...state.camera, attachOffset: offset },
    })),

  startRecording: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isRecording: true,
        startTime: performance.now(),
        frames: [],
      },
    })),

  stopRecording: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isRecording: false,
      },
    })),

  addRecordingFrame: (frame) =>
    set((state) => ({
      recording: {
        ...state.recording,
        frames: [...state.recording.frames, frame],
      },
    })),

  startPlayback: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isPlaying: true,
        playFrameIndex: 0,
      },
    })),

  stopPlayback: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isPlaying: false,
      },
    })),

  setPlaybackFrame: (index) =>
    set((state) => ({
      recording: {
        ...state.recording,
        playFrameIndex: index,
      },
    })),

  clearRecording: () =>
    set((state) => ({
      recording: INITIAL_RECORDING_STATE,
    })),

  updateGlobalTime: (time) => set({ globalTime: time }),
}));
