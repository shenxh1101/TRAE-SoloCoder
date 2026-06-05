import type { Layer } from '../../shared/types';

export const downloadFile = (data: string | Blob, filename: string, mimeType: string = 'application/octet-stream'): void => {
  let blob: Blob;

  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      const base64Data = data.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else {
      blob = new Blob([data], { type: mimeType });
    }
  } else {
    blob = data;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const base64ToImage = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
};

export const mergeCanvases = async (
  layers: Layer[],
  width: number,
  height: number,
  backgroundColor: string = '#ffffff'
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('无法获取 2D 上下文');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const visibleLayers = layers
    .filter((layer) => layer.visible)
    .sort((a, b) => a.order - b.order);

  for (const layer of visibleLayers) {
    if (!layer.imageData || layer.imageData === '') continue;

    try {
      const img = await base64ToImage(layer.imageData);
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalAlpha = 1;
    } catch (error) {
      console.error(`加载图层 ${layer.name} 失败:`, error);
    }
  }

  return canvas;
};

export const exportCanvasToPNG = (
  canvas: HTMLCanvasElement,
  filename: string = 'canvas.png'
): void => {
  const dataURL = canvas.toDataURL('image/png');
  downloadFile(dataURL, filename, 'image/png');
};

export const exportActiveLayerToPNG = (
  layers: Layer[],
  activeLayerId: string | null,
  width: number,
  height: number,
  filename?: string
): void => {
  if (!activeLayerId) {
    throw new Error('没有活动图层');
  }

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  if (!activeLayer) {
    throw new Error('未找到活动图层');
  }

  if (!activeLayer.imageData || activeLayer.imageData === '') {
    throw new Error('活动图层没有内容');
  }

  const exportName = filename || `${activeLayer.name || 'layer'}.png`;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('无法获取 2D 上下文');
  }

  const img = new Image();
  img.onload = () => {
    ctx.globalAlpha = activeLayer.opacity;
    ctx.drawImage(img, 0, 0, width, height);
    const dataURL = canvas.toDataURL('image/png');
    downloadFile(dataURL, exportName, 'image/png');
  };
  img.onerror = () => {
    throw new Error('加载图层图片失败');
  };
  img.src = activeLayer.imageData;
};

interface PSDLayerInfo {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
}

interface PSDMetadata {
  version: string;
  generator: string;
  createdAt: number;
  width: number;
  height: number;
  layerCount: number;
  backgroundColor: string;
}

interface PSDStructure {
  metadata: PSDMetadata;
  layers: PSDLayerInfo[];
  mergedImage: string;
  layerImages: Record<string, string>;
}

export const exportToPSD = async (
  layers: Layer[],
  width: number,
  height: number,
  filename: string = 'design.psd.zip',
  backgroundColor: string = '#ffffff'
): Promise<void> => {
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
  const mergedCanvas = await mergeCanvases(layers, width, height, backgroundColor);
  const mergedImage = mergedCanvas.toDataURL('image/png');

  const createZipFile = (files: Array<{ name: string; content: string; type: string }>): Blob => {
    const parts: BlobPart[] = [];
    const centralDirectory: BlobPart[] = [];
    let offset = 0;

    for (const file of files) {
      let contentBytes: Uint8Array;
      
      if (file.content.startsWith('data:')) {
        const base64Data = file.content.split(',')[1];
        const byteCharacters = atob(base64Data);
        contentBytes = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          contentBytes[i] = byteCharacters.charCodeAt(i);
        }
      } else {
        const encoder = new TextEncoder();
        contentBytes = encoder.encode(file.content);
      }

      const nameBytes = new TextEncoder().encode(file.name);
      const crc32 = 0;
      const compressedSize = contentBytes.length;
      const uncompressedSize = contentBytes.length;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(localHeader.buffer);
      
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint32(14, crc32, true);
      view.setUint32(18, compressedSize, true);
      view.setUint32(22, uncompressedSize, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      
      localHeader.set(nameBytes, 30);

      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdEntry.buffer);
      
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0, true);
      cdView.setUint16(10, 0, true);
      cdView.setUint16(12, 0, true);
      cdView.setUint32(16, crc32, true);
      cdView.setUint32(20, compressedSize, true);
      cdView.setUint32(24, uncompressedSize, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint32(42, offset, true);
      
      cdEntry.set(nameBytes, 46);

      parts.push(localHeader);
      parts.push(contentBytes);
      centralDirectory.push(cdEntry);
      
      offset += localHeader.length + contentBytes.length;
    }

    const cdLength = centralDirectory.reduce((sum, entry) => sum + (entry as Uint8Array).length, 0);
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, files.length, true);
    eocdView.setUint16(10, files.length, true);
    eocdView.setUint32(12, cdLength, true);
    eocdView.setUint32(16, offset, true);
    eocdView.setUint16(20, 0, true);

    parts.push(...centralDirectory);
    parts.push(eocd);

    return new Blob(parts, { type: 'application/zip' });
  };

  const files: Array<{ name: string; content: string; type: string }> = [];

  files.push({
    name: 'merged.png',
    content: mergedImage,
    type: 'image/png',
  });

  const psdInfo: PSDStructure = {
    metadata: {
      version: '1.0.0',
      generator: 'Canvas Collaboration Tool',
      createdAt: Date.now(),
      width,
      height,
      layerCount: layers.length,
      backgroundColor,
    },
    layers: sortedLayers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      order: layer.order,
      visible: layer.visible,
      opacity: layer.opacity,
      width,
      height,
    })),
    mergedImage: '',
    layerImages: {},
  };

  files.push({
    name: 'psd_info.json',
    content: JSON.stringify(psdInfo, null, 2),
    type: 'application/json',
  });

  for (const layer of sortedLayers) {
    if (layer.imageData && layer.imageData !== '') {
      files.push({
        name: `layers/${String(layer.order).padStart(3, '0')}_${layer.name.replace(/[^a-z0-9]/gi, '_')}.png`,
        content: layer.imageData,
        type: 'image/png',
      });
    }
  }

  const zipBlob = createZipFile(files);
  downloadFile(zipBlob, filename, 'application/zip');
};

export const exportLayersToZip = async (
  layers: Layer[],
  width: number,
  height: number,
  filename: string = 'design-layers.zip',
  backgroundColor: string = '#ffffff'
): Promise<void> => {
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
  const mergedCanvas = await mergeCanvases(layers, width, height, backgroundColor);
  const mergedImage = mergedCanvas.toDataURL('image/png');

  const createZipFile = (files: Array<{ name: string; content: string; type: string }>): Blob => {
    const parts: BlobPart[] = [];
    const centralDirectory: BlobPart[] = [];
    let offset = 0;

    for (const file of files) {
      let contentBytes: Uint8Array;
      
      if (file.content.startsWith('data:')) {
        const base64Data = file.content.split(',')[1];
        const byteCharacters = atob(base64Data);
        contentBytes = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          contentBytes[i] = byteCharacters.charCodeAt(i);
        }
      } else {
        const encoder = new TextEncoder();
        contentBytes = encoder.encode(file.content);
      }

      const nameBytes = new TextEncoder().encode(file.name);
      const crc32 = 0;
      const compressedSize = contentBytes.length;
      const uncompressedSize = contentBytes.length;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(localHeader.buffer);
      
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint32(14, crc32, true);
      view.setUint32(18, compressedSize, true);
      view.setUint32(22, uncompressedSize, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      
      localHeader.set(nameBytes, 30);

      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdEntry.buffer);
      
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0, true);
      cdView.setUint16(10, 0, true);
      cdView.setUint16(12, 0, true);
      cdView.setUint32(16, crc32, true);
      cdView.setUint32(20, compressedSize, true);
      cdView.setUint32(24, uncompressedSize, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint32(42, offset, true);
      
      cdEntry.set(nameBytes, 46);

      parts.push(localHeader);
      parts.push(contentBytes);
      centralDirectory.push(cdEntry);
      
      offset += localHeader.length + contentBytes.length;
    }

    const cdLength = centralDirectory.reduce((sum, entry) => sum + (entry as Uint8Array).length, 0);
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, files.length, true);
    eocdView.setUint16(10, files.length, true);
    eocdView.setUint32(12, cdLength, true);
    eocdView.setUint32(16, offset, true);
    eocdView.setUint16(20, 0, true);

    parts.push(...centralDirectory);
    parts.push(eocd);

    return new Blob(parts, { type: 'application/zip' });
  };

  const files: Array<{ name: string; content: string; type: string }> = [];

  files.push({
    name: 'merged.png',
    content: mergedImage,
    type: 'image/png',
  });

  const manifest = {
    version: '1.0.0',
    generator: 'Canvas Collaboration Tool',
    createdAt: Date.now(),
    width,
    height,
    backgroundColor,
    layers: sortedLayers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      order: layer.order,
      visible: layer.visible,
      opacity: layer.opacity,
      hasImage: !!layer.imageData && layer.imageData !== '',
      fileName: `layers/layer_${layer.order}_${layer.id}.png`,
    })),
  };

  files.push({
    name: 'manifest.json',
    content: JSON.stringify(manifest, null, 2),
    type: 'application/json',
  });

  for (const layer of sortedLayers) {
    if (layer.imageData && layer.imageData !== '') {
      files.push({
        name: `layers/layer_${layer.order}_${layer.id}.png`,
        content: layer.imageData,
        type: 'image/png',
      });
    }
  }

  const zipBlob = createZipFile(files);
  downloadFile(zipBlob, filename, 'application/zip');
};
