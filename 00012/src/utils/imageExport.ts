export function canvasToDataURL(canvas: HTMLCanvasElement, type: string = 'image/png'): string {
  return canvas.toDataURL(type);
}

export function downloadDataURL(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvasToDataURL(canvas);
  downloadDataURL(dataUrl, filename);
}

export function getFileNameWithoutExtension(file: File): string {
  const name = file.name;
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
}
