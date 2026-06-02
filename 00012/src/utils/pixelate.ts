export function pixelateImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  blockSize: number,
  width: number,
  height: number
): void {
  const smallWidth = Math.max(1, Math.floor(width / blockSize));
  const smallHeight = Math.max(1, Math.floor(height / blockSize));

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = smallWidth;
  tempCanvas.height = smallHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.drawImage(image as CanvasImageSource, 0, 0, smallWidth, smallHeight);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    tempCanvas,
    0, 0, smallWidth, smallHeight,
    0, 0, width, height
  );
}

export function adjustBrightnessContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightness: number,
  contrast: number
): void {
  if (brightness === 0 && contrast === 0) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const brightnessAdjust = brightness * 2.55;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128 + brightnessAdjust));
    data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128 + brightnessAdjust));
    data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128 + brightnessAdjust));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function loadImage(src: string): Promise<CanvasImageSource> {
  if (src.startsWith('blob:')) {
    return loadBlobAsImageBitmap(src);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function loadBlobAsImageBitmap(blobUrl: string): Promise<ImageBitmap> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  return bitmap;
}
