import JSZip from 'jszip';
import type { ToneType } from '../types';

export async function createZipArchive(
  images: { name: string; dataUrl: string; tone: ToneType }[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = images.length;

  for (let i = 0; i < images.length; i++) {
    const { name, dataUrl, tone } = images[i];
    const base64Data = dataUrl.split(',')[1];
    const fileName = `${name}_${tone}.png`;
    zip.file(fileName, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, total);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

export async function createMemeZipArchive(
  images: { name: string; dataUrl: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = images.length;

  for (let i = 0; i < images.length; i++) {
    const { name, dataUrl } = images[i];
    const base64Data = dataUrl.split(',')[1];
    const fileName = `${name}.png`;
    zip.file(fileName, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, total);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
