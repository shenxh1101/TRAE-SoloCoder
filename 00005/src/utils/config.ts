import type { Fragment, SceneConfig } from '../types';
import { randomGeometryType, randomRange } from './geometry';

const generateId = (): string => Math.random().toString(36).substring(2, 11);
const MAX_BASE64_SIZE_MB = 8;
const PARSE_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 20000;

export interface LoadResult {
  config: SceneConfig | null;
  error?: string;
  warning?: string;
  totalSizeMB: number;
}

export const createPlaceholderGradient = (color1: string, color2: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * 400,
      Math.random() * 400,
      Math.random() * 30 + 5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

const placeholderColors = [
  ['#6366f1', '#1e1b4b'],
  ['#06b6d4', '#0c4a6e'],
  ['#a855f7', '#3b0764'],
  ['#ec4899', '#831843'],
  ['#10b981', '#064e3b'],
  ['#f59e0b', '#7c2d12'],
  ['#3b82f6', '#1e3a8a'],
  ['#ef4444', '#7f1d1d'],
];

const createFragment = (index: number): Fragment => {
  const colors = placeholderColors[index % placeholderColors.length];
  return {
    id: generateId(),
    geometryType: randomGeometryType(),
    size: randomRange(0.8, 1.5),
    orbitRadius: randomRange(3, 8),
    orbitEllipticity: randomRange(0.3, 0.7),
    orbitTilt: randomRange(-0.8, 0.8),
    orbitPhase: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(0.2, 0.8),
    imageData: createPlaceholderGradient(colors[0], colors[1]),
    imageName: `dream-${index + 1}.png`,
  };
};

export const generateDefaultConfig = (): SceneConfig => {
  const fragmentCount = Math.floor(randomRange(5, 9));
  return {
    lucidity: 0.5,
    fragmentCount,
    fragments: Array.from({ length: fragmentCount }, (_, i) => createFragment(i)),
  };
};

export const serializeConfig = (config: SceneConfig): string => {
  return JSON.stringify(config, null, 2);
};

const validateBase64Image = (base64: string): boolean => {
  if (!base64 || typeof base64 !== 'string') return false;
  if (!base64.startsWith('data:image/')) return false;
  const sizeMB = (base64.length * 0.75) / (1024 * 1024);
  return sizeMB <= MAX_BASE64_SIZE_MB;
};

const estimateConfigSize = (json: string): number => {
  return (json.length * 0.75) / (1024 * 1024);
};

export const deserializeConfig = async (json: string): Promise<LoadResult> => {
  const totalSizeMB = estimateConfigSize(json);
  let warning: string | undefined;

  if (totalSizeMB >= 30) {
    return {
      config: null,
      error: `配置文件过大 (${totalSizeMB.toFixed(1)}MB)，最大支持 30MB`,
      totalSizeMB,
    };
  }

  if (totalSizeMB > 10) {
    warning = `配置文件较大 (${totalSizeMB.toFixed(1)}MB)，加载可能需要较长时间`;
  }

  return new Promise<LoadResult>((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        config: null,
        error: '配置解析超时，请检查文件是否损坏或尝试使用更小的图片',
        totalSizeMB,
      });
    }, PARSE_TIMEOUT_MS);

    try {
      const parsed = JSON.parse(json);
      clearTimeout(timeout);

      if (!parsed.fragments || !Array.isArray(parsed.fragments)) {
        resolve({ config: null, error: '无效的配置文件：缺少 fragments 数组', totalSizeMB, warning });
        return;
      }
      if (typeof parsed.lucidity !== 'number') {
        resolve({ config: null, error: '无效的配置文件：缺少 lucidity 字段', totalSizeMB, warning });
        return;
      }

      const invalidImages: string[] = [];
      parsed.fragments.forEach((f: Fragment, i: number) => {
        if (!validateBase64Image(f.imageData)) {
          const sizeMB = (f.imageData?.length || 0) * 0.75 / (1024 * 1024);
          invalidImages.push(`碎片 ${i + 1} (${f.imageName || 'unknown'}): ${sizeMB.toFixed(1)}MB`);
          f.imageData = createPlaceholderGradient('#6366f1', '#1e1b4b');
          f.imageName = f.imageName + ' (加载失败)';
        }
      });

      if (invalidImages.length > 0) {
        warning = warning ? warning + `\n以下图片加载失败已替换为占位图：\n${invalidImages.join('\n')}` 
          : `以下图片加载失败已替换为占位图：\n${invalidImages.join('\n')}`;
      }

      resolve({ config: parsed as SceneConfig, totalSizeMB, warning });
    } catch (err) {
      clearTimeout(timeout);
      resolve({
        config: null,
        error: 'JSON 解析失败：' + (err instanceof Error ? err.message : '未知错误'),
        totalSizeMB,
      });
    }
  });
};

export const downloadConfig = (config: SceneConfig, filename: string = 'dream-config.json'): void => {
  const json = serializeConfig(config);
  const sizeMB = (json.length * 0.75) / (1024 * 1024);
  
  if (sizeMB > 20) {
    if (!confirm(`配置文件较大 (${sizeMB.toFixed(1)}MB)，可能需要较长时间保存。是否继续？`)) {
      return;
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('文件读取超时，请尝试使用较小的图片'));
    }, UPLOAD_TIMEOUT_MS);

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_BASE64_SIZE_MB) {
      clearTimeout(timeout);
      reject(new Error(`图片过大 (${sizeMB.toFixed(1)}MB)，最大支持 ${MAX_BASE64_SIZE_MB}MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      clearTimeout(timeout);
      const result = reader.result as string;
      const resultSizeMB = (result.length * 0.75) / (1024 * 1024);
      if (resultSizeMB > MAX_BASE64_SIZE_MB) {
        reject(new Error(`编码后图片过大 (${resultSizeMB.toFixed(1)}MB)，请压缩后重试`));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
};
