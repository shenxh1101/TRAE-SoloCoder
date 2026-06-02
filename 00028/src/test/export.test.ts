import { describe, it, expect } from 'vitest';
import {
  formatJSON,
  createRecordingData,
  compressRecordingData,
  validateRecordingData,
} from '@/utils/export';
import { RecordingData, RecordingFrame } from '@/types/recording';

describe('export utilities', () => {
  const sampleFrames: RecordingFrame[] = [
    {
      timestamp: 1000,
      arms: [
        { armId: 'arm-1', jointAngles: [0, 0.5, -0.3, 0, 0.2], position: [0, 0, 0] },
      ],
      parts: [
        { partId: 'part-1', position: [1, 2, 3], rotation: [0, 0, 0] },
      ],
    },
    {
      timestamp: 1033,
      arms: [
        { armId: 'arm-1', jointAngles: [0.1, 0.6, -0.2, 0.1, 0.3], position: [0, 0, 0] },
      ],
      parts: [
        { partId: 'part-1', position: [1.1, 2.1, 3.1], rotation: [0, 0.1, 0] },
      ],
    },
    {
      timestamp: 1066,
      arms: [
        { armId: 'arm-1', jointAngles: [0.2, 0.7, -0.1, 0.2, 0.4], position: [0, 0, 0] },
      ],
      parts: [
        { partId: 'part-1', position: [1.2, 2.2, 3.2], rotation: [0, 0.2, 0] },
      ],
    },
  ];

  describe('formatJSON', () => {
    it('should format data as pretty JSON', () => {
      const result = formatJSON({ test: 123 });
      expect(result).toContain('"test"');
      expect(result).toContain('123');
      expect(result).toContain('\n');
    });

    it('should format data as compact JSON', () => {
      const result = formatJSON({ test: 123 }, false);
      expect(result).toBe('{"test":123}');
    });
  });

  describe('createRecordingData', () => {
    it('should create valid recording data', () => {
      const data = createRecordingData(sampleFrames, 1000, 30);
      expect(data.version).toBe('1.0.0');
      expect(data.fps).toBe(30);
      expect(data.startTime).toBe(1000);
      expect(data.endTime).toBe(1066);
      expect(data.duration).toBe(66);
      expect(data.frames.length).toBe(3);
    });

    it('should handle empty frames', () => {
      const data = createRecordingData([], 1000, 30);
      expect(data.duration).toBe(0);
      expect(data.endTime).toBe(1000);
      expect(data.frames.length).toBe(0);
    });

    it('should use consistent performance.now timestamps (bug fix #4)', () => {
      const startTime = performance.now();
      const frames: RecordingFrame[] = [
        {
          timestamp: startTime + 33,
          arms: [],
          parts: [],
        },
        {
          timestamp: startTime + 66,
          arms: [],
          parts: [],
        },
      ];
      const data = createRecordingData(frames, startTime, 30);
      expect(data.duration).toBeCloseTo(66, 0);
      expect(data.startTime).toBe(startTime);
    });
  });

  describe('compressRecordingData', () => {
    it('should preserve frames with significant changes', () => {
      const data = createRecordingData(sampleFrames, 1000, 30);
      const compressed = compressRecordingData(data);
      expect(compressed.frames.length).toBe(3);
    });

    it('should remove duplicate frames', () => {
      const duplicateFrames: RecordingFrame[] = [
        {
          timestamp: 1000,
          arms: [{ armId: 'arm-1', jointAngles: [0.5, 0.5, 0.5, 0.5, 0.5], position: [0, 0, 0] }],
          parts: [],
        },
        {
          timestamp: 1033,
          arms: [{ armId: 'arm-1', jointAngles: [0.5, 0.5, 0.5, 0.5, 0.5], position: [0, 0, 0] }],
          parts: [],
        },
        {
          timestamp: 1066,
          arms: [{ armId: 'arm-1', jointAngles: [0.6, 0.5, 0.5, 0.5, 0.5], position: [0, 0, 0] }],
          parts: [],
        },
      ];
      const data = createRecordingData(duplicateFrames, 1000, 30);
      const compressed = compressRecordingData(data);
      expect(compressed.frames.length).toBe(2);
    });

    it('should handle single frame', () => {
      const data = createRecordingData([sampleFrames[0]], 1000, 30);
      const compressed = compressRecordingData(data);
      expect(compressed.frames.length).toBe(1);
    });
  });

  describe('validateRecordingData', () => {
    it('should validate correct recording data', () => {
      const data = createRecordingData(sampleFrames, 1000, 30);
      expect(validateRecordingData(data)).toBe(true);
    });

    it('should reject null', () => {
      expect(validateRecordingData(null)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(validateRecordingData('string')).toBe(false);
      expect(validateRecordingData(123)).toBe(false);
    });

    it('should reject object with missing fields', () => {
      expect(validateRecordingData({ version: '1.0.0' })).toBe(false);
      expect(validateRecordingData({ version: '1.0.0', duration: 100 })).toBe(false);
    });

    it('should reject invalid frames', () => {
      const data = {
        version: '1.0.0',
        duration: 100,
        fps: 30,
        startTime: 1000,
        endTime: 1100,
        frames: [{ timestamp: 'invalid' }],
      };
      expect(validateRecordingData(data)).toBe(false);
    });
  });
});
