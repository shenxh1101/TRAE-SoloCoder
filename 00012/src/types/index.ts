export type ToneType = 'original' | 'retro-green' | 'warm-brown' | 'cyber-purple';

export interface PixelSettings {
  blockSize: number;
  tone: ToneType;
  brightness: number;
  contrast: number;
}

export interface Preset {
  id: string;
  name: string;
  settings: PixelSettings;
  createdAt: number;
}

export type DecorationType = 'glasses' | 'mustache' | 'hat' | 'earring' | 'mask';

export interface Decoration {
  id: string;
  type: DecorationType;
  name: string;
  pixels: number[][];
  colors: string[];
  defaultScale: number;
  defaultX: number;
  defaultY: number;
}

export interface PlacedDecoration {
  id: string;
  decorationId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
}

export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedDataUrls: Record<ToneType, string | null>;
  decorations: PlacedDecoration[];
  settings: PixelSettings;
}

export interface MemeCell {
  id: string;
  name: string;
  emoji: string;
  transform: {
    eyeScale: number;
    mouthCurve: number;
    browAngle: number;
    colorShift: string;
  };
}

export type ModeType = 'single' | 'batch' | 'meme';

export interface AppState {
  mode: ModeType;
  settings: PixelSettings;
  currentImage: ProcessedImage | null;
  batchImages: ProcessedImage[];
  presets: Preset[];
  decorations: PlacedDecoration[];
  selectedDecorationId: string | null;
}
