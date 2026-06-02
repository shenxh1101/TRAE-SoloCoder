import { create } from 'zustand';
import { MemeStyle, TextSettings, EmotionType, FaceDetection } from '../types';

interface MemeState {
  imageData: string | null;
  textSettings: TextSettings;
  selectedStyle: MemeStyle;
  isRandomMode: boolean;
  generatedTexts: string[];
  detectedFaces: FaceDetection[];
  detectedEmotion: EmotionType | null;
  isFaceDetecting: boolean;
  isGeneratingTexts: boolean;
  faceDetectionEnabled: boolean;
  setImageData: (data: string | null) => void;
  setTextSettings: (settings: Partial<TextSettings>) => void;
  setSelectedStyle: (style: MemeStyle) => void;
  setIsRandomMode: (value: boolean) => void;
  setGeneratedTexts: (texts: string[]) => void;
  setDetectedFaces: (faces: FaceDetection[]) => void;
  setDetectedEmotion: (emotion: EmotionType | null) => void;
  setIsFaceDetecting: (value: boolean) => void;
  setIsGeneratingTexts: (value: boolean) => void;
  setFaceDetectionEnabled: (value: boolean) => void;
  resetState: () => void;
  resetDetection: () => void;
}

const defaultTextSettings: TextSettings = {
  content: '',
  fontSize: 32,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 3,
  x: 50,
  y: 80,
};

export const useMemeStore = create<MemeState>((set) => ({
  imageData: null,
  textSettings: defaultTextSettings,
  selectedStyle: 'funny',
  isRandomMode: false,
  generatedTexts: [],
  detectedFaces: [],
  detectedEmotion: null,
  isFaceDetecting: false,
  isGeneratingTexts: false,
  faceDetectionEnabled: true,
  setImageData: (data) => set({ imageData: data }),
  setTextSettings: (settings) =>
    set((state) => ({
      textSettings: { ...state.textSettings, ...settings },
    })),
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  setIsRandomMode: (value) => set({ isRandomMode: value }),
  setGeneratedTexts: (texts) => set({ generatedTexts: texts }),
  setDetectedFaces: (faces) => set({ detectedFaces: faces }),
  setDetectedEmotion: (emotion) => set({ detectedEmotion: emotion }),
  setIsFaceDetecting: (value) => set({ isFaceDetecting: value }),
  setIsGeneratingTexts: (value) => set({ isGeneratingTexts: value }),
  setFaceDetectionEnabled: (value) => set({ faceDetectionEnabled: value }),
  resetState: () =>
    set({
      imageData: null,
      textSettings: defaultTextSettings,
      generatedTexts: [],
      isRandomMode: false,
      detectedFaces: [],
      detectedEmotion: null,
      isFaceDetecting: false,
      isGeneratingTexts: false,
    }),
  resetDetection: () =>
    set({
      detectedFaces: [],
      detectedEmotion: null,
      generatedTexts: [],
    }),
}));
