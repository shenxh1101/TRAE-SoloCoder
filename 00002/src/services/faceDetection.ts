import * as faceapi from '@vladmandic/face-api';
import { FaceDetection, EmotionType } from '../types';

let isModelLoaded = false;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export async function loadFaceModels(): Promise<boolean> {
  if (isModelLoaded) return true;

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    isModelLoaded = true;
    return true;
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    return false;
  }
}

export function isFaceModelLoaded(): boolean {
  return isModelLoaded;
}

function mapExpressionToEmotion(expressions: faceapi.FaceExpressions): EmotionType {
  const expressionMap: Array<{ key: keyof faceapi.FaceExpressions; emotion: EmotionType }> = [
    { key: 'happy', emotion: 'happy' },
    { key: 'sad', emotion: 'sad' },
    { key: 'angry', emotion: 'angry' },
    { key: 'surprised', emotion: 'surprised' },
    { key: 'disgusted', emotion: 'disgusted' },
    { key: 'fearful', emotion: 'fearful' },
    { key: 'neutral', emotion: 'neutral' },
  ];

  let maxEmotion: EmotionType = 'unknown';
  let maxConfidence = 0;

  for (const { key, emotion } of expressionMap) {
    const confidence = expressions[key] as number;
    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      maxEmotion = emotion;
    }
  }

  return maxEmotion;
}

export async function detectFaces(
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetection[]> {
  if (!isModelLoaded) {
    const loaded = await loadFaceModels();
    if (!loaded) return [];
  }

  try {
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    return detections.map((detection) => {
      const box = detection.detection.box;
      return {
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        emotion: mapExpressionToEmotion(detection.expressions),
        confidence: detection.detection.score,
      };
    });
  } catch (error) {
    console.error('Face detection failed:', error);
    return [];
  }
}

export const emotionLabels: Record<EmotionType, string> = {
  happy: '开心',
  sad: '难过',
  angry: '生气',
  surprised: '惊讶',
  disgusted: '厌恶',
  fearful: '恐惧',
  neutral: '平静',
  unknown: '未知',
};
