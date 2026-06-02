export interface RecordingFrame {
  timestamp: number;
  arms: {
    armId: string;
    jointAngles: number[];
    position: [number, number, number];
  }[];
  parts: {
    partId: string;
    position: [number, number, number];
    rotation: [number, number, number];
  }[];
}

export interface RecordingData {
  version: string;
  duration: number;
  fps: number;
  startTime: number;
  endTime: number;
  frames: RecordingFrame[];
}

export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  startTime: number;
  currentTime: number;
  frames: RecordingFrame[];
  playFrameIndex: number;
}

export const INITIAL_RECORDING_STATE: RecordingState = {
  isRecording: false,
  isPlaying: false,
  startTime: 0,
  currentTime: 0,
  frames: [],
  playFrameIndex: 0,
};
