import { useCallback, useRef } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { createRecordingData, downloadJSON, compressRecordingData } from '@/utils/export';
import { RecordingFrame } from '@/types/recording';

export const useRecording = () => {
  const recording = useSceneStore((state) => state.recording);
  const arms = useSceneStore((state) => state.arms);
  const parts = useSceneStore((state) => state.parts);
  const startRecording = useSceneStore((state) => state.startRecording);
  const stopRecording = useSceneStore((state) => state.stopRecording);
  const addRecordingFrame = useSceneStore((state) => state.addRecordingFrame);
  const startPlayback = useSceneStore((state) => state.startPlayback);
  const stopPlayback = useSceneStore((state) => state.stopPlayback);
  const clearRecording = useSceneStore((state) => state.clearRecording);
  const isPlaying = useSceneStore((state) => state.recording.isPlaying);

  const lastFrameTime = useRef(0);
  const frameInterval = 1000 / 30;

  const captureFrame = useCallback(() => {
    if (!recording.isRecording) return;

    const now = performance.now();
    if (now - lastFrameTime.current < frameInterval) return;
    lastFrameTime.current = now;

    const frame: RecordingFrame = {
      timestamp: now,
      arms: arms.map((arm) => ({
        armId: arm.id,
        jointAngles: arm.joints.map((j) => j.angle),
        position: arm.position,
      })),
      parts: parts.map((part) => ({
        partId: part.id,
        position: part.position,
        rotation: part.rotation,
      })),
    };

    addRecordingFrame(frame);
  }, [recording.isRecording, arms, parts, addRecordingFrame]);

  const handleStartRecording = useCallback(() => {
    if (isPlaying) return;
    lastFrameTime.current = performance.now();
    startRecording();
  }, [startRecording, isPlaying]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleExportJSON = useCallback(() => {
    if (recording.frames.length === 0) return;

    const data = createRecordingData(recording.frames, recording.startTime, 30);
    const compressedData = compressRecordingData(data);
    downloadJSON(compressedData, `arm_recording_${Date.now()}.json`);
  }, [recording.frames, recording.startTime]);

  const handleStartPlayback = useCallback(() => {
    if (recording.frames.length === 0) return;
    startPlayback();
  }, [recording.frames.length, startPlayback]);

  const handleStopPlayback = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const handleClearRecording = useCallback(() => {
    if (isPlaying) return;
    clearRecording();
  }, [clearRecording, isPlaying]);

  const duration = recording.frames.length > 0
    ? ((recording.frames[recording.frames.length - 1]?.timestamp || 0) - recording.startTime) / 1000
    : 0;

  return {
    isRecording: recording.isRecording,
    isPlaying,
    frameCount: recording.frames.length,
    duration,
    captureFrame,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    startPlayback: handleStartPlayback,
    stopPlayback: handleStopPlayback,
    exportJSON: handleExportJSON,
    clearRecording: handleClearRecording,
    canExport: recording.frames.length > 0,
    canPlay: recording.frames.length > 0 && !isPlaying,
  };
};
