import { RecordingData, RecordingFrame } from '@/types/recording';

export const formatJSON = (data: unknown, pretty = true): string => {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
};

export const downloadJSON = (data: RecordingData, filename?: string): void => {
  const blob = new Blob([formatJSON(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `recording_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const createRecordingData = (
  frames: RecordingFrame[],
  startTime: number,
  fps = 30
): RecordingData => {
  const endTime = frames.length > 0 ? frames[frames.length - 1].timestamp : startTime;

  return {
    version: '1.0.0',
    duration: endTime - startTime,
    fps,
    startTime,
    endTime,
    frames,
  };
};

export const compressRecordingData = (data: RecordingData): RecordingData => {
  if (data.frames.length <= 1) return data;

  const compressedFrames: RecordingFrame[] = [data.frames[0]];

  for (let i = 1; i < data.frames.length; i++) {
    const prev = data.frames[i - 1];
    const curr = data.frames[i];

    let hasSignificantChange = false;

    for (let j = 0; j < curr.arms.length; j++) {
      const prevArm = prev.arms[j];
      const currArm = curr.arms[j];

      if (!prevArm || !currArm) {
        hasSignificantChange = true;
        break;
      }

      for (let k = 0; k < currArm.jointAngles.length; k++) {
        if (Math.abs(currArm.jointAngles[k] - prevArm.jointAngles[k]) > 0.01) {
          hasSignificantChange = true;
          break;
        }
      }

      if (hasSignificantChange) break;
    }

    if (hasSignificantChange) {
      compressedFrames.push(curr);
    }
  }

  return {
    ...data,
    frames: compressedFrames,
  };
};

export const validateRecordingData = (data: unknown): data is RecordingData => {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as RecordingData;

  if (typeof d.version !== 'string') return false;
  if (typeof d.duration !== 'number') return false;
  if (typeof d.fps !== 'number') return false;
  if (typeof d.startTime !== 'number') return false;
  if (typeof d.endTime !== 'number') return false;
  if (!Array.isArray(d.frames)) return false;

  for (const frame of d.frames) {
    if (typeof frame.timestamp !== 'number') return false;
    if (!Array.isArray(frame.arms)) return false;
    if (!Array.isArray(frame.parts)) return false;
  }

  return true;
};

export const loadRecordingData = async (
  file: File
): Promise<RecordingData | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (validateRecordingData(data)) {
          resolve(data);
        } else {
          console.error('Invalid recording data format');
          resolve(null);
        }
      } catch (err) {
        console.error('Failed to parse recording file:', err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
};
