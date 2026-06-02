import { useRef, useState, useCallback } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { useStore } from '../../store/useAppStore';
import type { ProcessedImage, ToneType } from '../../types';

const ALL_TONES: ToneType[] = ['original', 'retro-green', 'warm-brown', 'cyber-purple'];

const EMPTY_PROCESSED: Record<ToneType, string | null> = {
  original: null,
  'retro-green': null,
  'warm-brown': null,
  'cyber-purple': null,
};

export default function ImageUploader() {
  const setCurrentImage = useStore((s) => s.setCurrentImage);
  const settings = useStore((s) => s.settings);
  const currentImage = useStore((s) => s.currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const id = Date.now().toString(36);
      const uploadedImage: ProcessedImage = {
        id,
        originalFile: file,
        originalUrl: url,
        processedDataUrls: { ...EMPTY_PROCESSED },
        decorations: [],
        settings: {
          blockSize: settings.blockSize,
          tone: settings.tone,
          brightness: settings.brightness,
          contrast: settings.contrast,
        },
      };
      setCurrentImage(uploadedImage);
    },
    [setCurrentImage, settings],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile],
  );

  const onClickZone = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (currentImage) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative border-2 border-green-500/40 bg-black/30 p-1">
          <img
            src={currentImage.originalUrl}
            alt="已上传图片"
            className="max-h-64 max-w-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>
        <button
          onClick={() => setCurrentImage(null)}
          className="pixel-btn border-2 border-purple-500 bg-purple-500/10 px-4 py-1.5 font-vt text-sm text-purple-300 transition-all hover:bg-purple-500/20"
        >
          重新上传
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClickZone}
      className={`flex cursor-pointer flex-col items-center justify-center gap-4 border-4 border-dashed px-8 py-16 transition-all ${
        isDragOver
          ? 'border-purple-400 bg-purple-500/10'
          : 'border-purple-500/30 bg-black/20 hover:border-purple-400/60 hover:bg-purple-500/5'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />

      <div
        className={`rounded-full p-4 transition-all ${
          isDragOver
            ? 'bg-purple-500/20 text-purple-300'
            : 'bg-purple-500/10 text-purple-400'
        }`}
      >
        {isDragOver ? (
          <ImagePlus className="h-10 w-10" />
        ) : (
          <Upload className="h-10 w-10" />
        )}
      </div>

      <div className="text-center">
        <p className="font-vt text-lg text-purple-300">
          {isDragOver ? '释放以上传图片' : '拖拽图片到此处'}
        </p>
        <p className="mt-1 font-vt text-sm text-gray-500">
          或点击选择文件
        </p>
      </div>
    </div>
  );
}
