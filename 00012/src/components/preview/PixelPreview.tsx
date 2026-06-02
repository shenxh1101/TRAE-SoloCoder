import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../../store/useAppStore';
import { useImageProcessor } from '../../hooks/useImageProcessor';
import type { ToneType } from '../../types';
import { downloadDataURL } from '../../utils/imageExport';
import { Download, Loader2, AlertCircle } from 'lucide-react';

const TONE_LABELS: Record<ToneType, string> = {
  'original': '原色',
  'retro-green': '复古绿',
  'warm-brown': '暖棕',
  'cyber-purple': '赛博紫',
};

const TONES: ToneType[] = ['original', 'retro-green', 'warm-brown', 'cyber-purple'];

const EMPTY_PREVIEW: Record<ToneType, string | null> = {
  'original': null,
  'retro-green': null,
  'warm-brown': null,
  'cyber-purple': null,
};

const TONE_COLORS: Record<ToneType, string> = {
  'original': '#e5e7eb',
  'retro-green': '#4ade80',
  'warm-brown': '#d97706',
  'cyber-purple': '#c084fc',
};

export default function PixelPreview() {
  const currentImage = useStore((s) => s.currentImage);
  const settings = useStore((s) => s.settings);
  const placedDecorations = useStore((s) => s.placedDecorations);
  const { processImage } = useImageProcessor();
  const [previewData, setPreviewData] = useState<Record<ToneType, string | null>>(EMPTY_PREVIEW);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const triggerProcess = useCallback(() => {
    if (!currentImage) {
      setPreviewData(EMPTY_PREVIEW);
      setError(null);
      return;
    }

    const thisVersion = ++versionRef.current;

    setProcessing(true);
    setError(null);

    processImage(
      currentImage.originalUrl,
      settings.blockSize,
      settings.brightness,
      settings.contrast,
      placedDecorations
    ).then((results) => {
      if (versionRef.current !== thisVersion) return;
      setPreviewData(results);
      setProcessing(false);
    }).catch((err) => {
      if (versionRef.current !== thisVersion) return;
      console.error('Image processing error:', err);
      setError(err instanceof Error ? err.message : '处理失败');
      setProcessing(false);
    });
  }, [currentImage, settings.blockSize, settings.brightness, settings.contrast, placedDecorations, processImage]);

  useEffect(() => {
    const timer = setTimeout(triggerProcess, 200);
    return () => clearTimeout(timer);
  }, [triggerProcess]);

  const handleDownload = (tone: ToneType) => {
    const dataUrl = previewData[tone];
    if (!dataUrl) return;
    const baseName = currentImage?.originalFile
      ? currentImage.originalFile.name.replace(/\.[^.]+$/, '')
      : 'pixel-art';
    downloadDataURL(dataUrl, `${baseName}_${tone}.png`);
  };

  if (!currentImage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-400/50">
        <span className="font-vt text-lg">上传图片开始创作</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-400">
        <AlertCircle className="h-8 w-8" />
        <span className="font-vt text-base">{error}</span>
        <button
          onClick={triggerProcess}
          className="mt-2 border border-purple-500/40 bg-purple-500/10 px-4 py-1.5 font-vt text-sm text-purple-300 hover:bg-purple-500/20"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {TONES.map((tone) => (
        <div
          key={tone}
          className="pixel-card p-3 transition-all hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5"
                style={{ backgroundColor: TONE_COLORS[tone] }}
              />
              <span className="font-vt text-sm" style={{ color: TONE_COLORS[tone] }}>
                {TONE_LABELS[tone]}
              </span>
            </div>
            <button
              onClick={() => handleDownload(tone)}
              disabled={!previewData[tone]}
              className="border border-green-500/40 bg-green-500/5 px-1.5 py-1 text-green-400 transition-all hover:border-green-400 hover:bg-green-500/15 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="relative aspect-square w-full overflow-hidden border border-purple-500/20 bg-black/40">
            {previewData[tone] ? (
              <img
                src={previewData[tone]!}
                alt={TONE_LABELS[tone]}
                className="h-full w-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                {processing ? (
                  <Loader2 size={28} className="animate-spin text-purple-400" />
                ) : (
                  <span className="font-vt text-xs text-purple-500/40">等待处理...</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {processing && (
        <div className="col-span-2 py-2 text-center">
          <span className="font-vt text-sm text-purple-300/60 animate-pulse">
            正在像素化处理中...
          </span>
        </div>
      )}
    </div>
  );
}
