import type { Fragment, SceneConfig } from '../types';
import { randomGeometryType, randomRange } from './geometry';
import { serializeConfig } from './config';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const createLargeBase64Image = (sizeMB: number): string => {
  const targetBytes = sizeMB * 1024 * 1024;
  const pixels = Math.floor(targetBytes / 4);
  const width = Math.ceil(Math.sqrt(pixels));
  const height = Math.ceil(pixels / width);

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 4096);
  canvas.height = Math.min(height, 4096);
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `hsl(${Math.random() * 360}, 80%, 60%)`);
  gradient.addColorStop(0.5, `hsl(${Math.random() * 360}, 70%, 50%)`);
  gradient.addColorStop(1, `hsl(${Math.random() * 360}, 90%, 40%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 100 + 20,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

export const generateLargeTestConfig = (imageSizeMB: number = 3): SceneConfig => {
  console.log(`[测试] 开始生成大配置文件，目标图片大小: ${imageSizeMB}MB...`);
  const startTime = performance.now();

  const fragments: Fragment[] = [];
  for (let i = 0; i < 6; i++) {
    const imgStart = performance.now();
    const imageData = createLargeBase64Image(imageSizeMB);
    const imgTime = ((performance.now() - imgStart) / 1000).toFixed(2);
    const imgSizeMB = ((imageData.length * 0.75) / (1024 * 1024)).toFixed(2);
    console.log(`[测试] 图片 ${i + 1} 生成完成: ${imgSizeMB}MB, 耗时 ${imgTime}s`);

    fragments.push({
      id: generateId(),
      geometryType: randomGeometryType(),
      size: randomRange(0.8, 1.5),
      orbitRadius: randomRange(3, 8),
      orbitEllipticity: randomRange(0.3, 0.7),
      orbitTilt: randomRange(-0.8, 0.8),
      orbitPhase: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(0.2, 0.8),
      imageData,
      imageName: `test-large-${i + 1}.png`,
    });
  }

  const config: SceneConfig = {
    lucidity: 0.5,
    fragmentCount: fragments.length,
    fragments,
  };

  const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
  const jsonSize = ((serializeConfig(config).length * 0.75) / (1024 * 1024)).toFixed(2);
  console.log(`[测试] 大配置生成完成！总耗时: ${totalTime}s, JSON预估大小: ${jsonSize}MB`);

  return config;
};

export const downloadLargeTestConfig = (imageSizeMB: number = 3): void => {
  console.log('[测试] 生成大配置测试文件...');
  const config = generateLargeTestConfig(imageSizeMB);
  const json = serializeConfig(config);

  const sizeMB = ((json.length * 0.75) / (1024 * 1024)).toFixed(2);
  console.log(`[测试] 下载测试配置文件: ${sizeMB}MB`);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `test-large-config-${sizeMB}MB.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);

  console.log('[测试] 测试文件下载已触发！请使用"加载"按钮上传此文件进行测试。');
};

if (typeof window !== 'undefined') {
  (window as any).__testLargeConfig = downloadLargeTestConfig;
  console.log('[测试] 测试函数已挂载: window.__testLargeConfig(sizeMB)');
  console.log('[测试] 在控制台执行 __testLargeConfig(3) 生成3MB图片的测试配置');
}
