import { MemeStyle, EmotionType } from '../types';
import { textTemplates } from '../data/textTemplates';
import { presetEmojis } from '../data/presetEmojis';
import { generateMemeTexts, hasLLMApiKey } from '../services/llmService';
import { getRandomLocalQuote, getRandomHotQuote } from '../services/hotQuotes';
import { detectFaces, emotionLabels } from '../services/faceDetection';

export function generateTextsFromTemplate(style: MemeStyle, count: number = 5): string[] {
  const filtered = textTemplates.filter(t => t.style === style);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => t.content);
}

export async function generateTextsWithAI(
  style: MemeStyle,
  emotion: EmotionType,
  count: number = 5
): Promise<string[]> {
  try {
    return await generateMemeTexts(style, emotion, count);
  } catch (error) {
    console.warn('AI generation failed, using mock data:', error);
  }
  return generateTextsFromTemplate(style, count);
}

export async function analyzeImageAndGenerateTexts(
  imageData: string,
  style: MemeStyle,
  count: number = 5
): Promise<{ texts: string[]; emotion: EmotionType; hasFace: boolean }> {
  const img = new Image();
  img.src = imageData;
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const faces = await detectFaces(img);
  const hasFace = faces.length > 0;
  const emotion: EmotionType = hasFace ? faces[0].emotion : 'unknown';

  const texts = await generateTextsWithAI(style, emotion, count);

  return { texts, emotion, hasFace };
}

export function getRandomMouthWord(): string {
  return getRandomLocalQuote();
}

export async function getRandomHotQuoteAsync(): Promise<string> {
  try {
    const quote = await getRandomHotQuote();
    return quote.content;
  } catch {
    return getRandomLocalQuote();
  }
}

export function getRandomEmoji() {
  return presetEmojis[Math.floor(Math.random() * presetEmojis.length)];
}

export function getEmotionLabel(emotion: EmotionType): string {
  return emotionLabels[emotion];
}
