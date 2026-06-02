export type MemeStyle = 'sarcastic' | 'office' | 'funny';

export type EmotionType = 
  | 'happy' 
  | 'sad' 
  | 'angry' 
  | 'surprised' 
  | 'disgusted' 
  | 'fearful' 
  | 'neutral'
  | 'unknown';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetection {
  box: FaceBox;
  emotion: EmotionType;
  confidence: number;
}

export interface TextSettings {
  content: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  x: number;
  y: number;
}

export interface Meme {
  id?: number;
  imageData: string;
  textSettings: TextSettings;
  style: MemeStyle;
  createdAt?: Date;
}

export interface PresetEmoji {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

export interface TextTemplate {
  id: string;
  content: string;
  style: MemeStyle;
  tags: string[];
}

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export interface HotQuote {
  id: string;
  content: string;
  author?: string;
  source?: string;
}
