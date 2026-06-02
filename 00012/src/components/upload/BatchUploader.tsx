import { useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { useStore } from '../../store/useAppStore';
import type { ProcessedImage, ToneType } from '../../types';

const ALL_TONES: ToneType[] = ['original', 'retro-green', 'warm-brown', 'cyber-purple'];

const EMPTY_PROCESSED: Record<ToneType, string | null> = {
  original: null,
  'retro-green': null,
  'warm-brown': null,
  'cyber-purple': null,
};

export default function BatchUploader() {
  const batchImages = useStore((s) => s.batchImages);
  const addBatchImage = useStore((s) => s.addBatchImage);
  const removeBatchImage = useStore((s) => s.removeBatchImage);
  const settings = useStore((s) => s.settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const image: ProcessedImage = {
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
        addBatchImage(image);
      });
    },
    [addBatchImage, settings],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) handleFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFiles],
  );

  const onClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileChange}
        className="hidden"
      />

      <button
        onClick={onClickUpload}
        className="flex items-center justify-center gap-2 border-2 border-dashed border-purple-500/30 bg-black/20 px-6 py-8 text-purple-400 transition-all hover:border-purple-400/60 hover:bg-purple-500/5 hover:text-purple-300"
      >
        <Upload className="h-6 w-6" />
        <span className="font-vt text-lg">
          选择图片文件（可多选）
        </span>
      </button>

      {batchImages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-vt text-sm text-purple-300/70">
              已添加 {batchImages.length} 张图片
            </span>
            <button
              onClick={() => useStore.getState().setBatchImages([])}
              className="font-vt text-xs text-red-400/60 hover:text-red-400"
            >
              清空全部
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
            {batchImages.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-3 border border-purple-500/20 bg-black/20 px-3 py-2"
              >
                <img
                  src={img.originalUrl}
                  alt={img.originalFile.name}
                  className="h-12 w-12 border border-purple-500/20 object-cover"
                />
                <span className="flex-1 truncate font-vt text-sm text-gray-400">
                  {img.originalFile.name}
                </span>
                <button
                  onClick={() => removeBatchImage(img.id)}
                  className="text-gray-500 transition-colors hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
