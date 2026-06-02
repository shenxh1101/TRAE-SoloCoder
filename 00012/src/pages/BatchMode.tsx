import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store/useAppStore';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { createZipArchive, downloadBlob } from '../utils/zipPacker';
import BatchUploader from '../components/upload/BatchUploader';
import PixelSlider from '../components/control/PixelSlider';
import ToneSelector from '../components/control/ToneSelector';
import BrightnessContrastSlider from '../components/control/BrightnessContrastSlider';
import type { ToneType } from '../types';
import { Package, Loader2 } from 'lucide-react';

const TONE_LABELS: Record<ToneType, string> = {
  'original': '原色',
  'retro-green': '复古绿',
  'warm-brown': '暖棕',
  'cyber-purple': '赛博紫',
};

const TONES: ToneType[] = ['original', 'retro-green', 'warm-brown', 'cyber-purple'];

export default function BatchMode() {
  const batchImages = useStore((s) => s.batchImages);
  const settings = useStore((s) => s.settings);
  const setBatchProgress = useStore((s) => s.setBatchProgress);
  const batchProgress = useStore((s) => s.batchProgress);
  const batchTotal = useStore((s) => s.batchTotal);
  const { processImage } = useImageProcessor();
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const completedRef = useRef(0);

  const handleBatchProcess = useCallback(async () => {
    const currentState = useStore.getState();
    const currentBatchImages = currentState.batchImages;
    const currentSettings = currentState.settings;

    if (!currentBatchImages || currentBatchImages.length === 0) return;

    const totalCount = currentBatchImages.length;
    setProcessing(true);
    setBatchProgress(0, totalCount);
    completedRef.current = 0;

    try {
      const processTasks = currentBatchImages.map(async (img, index) => {
        const results = await processImage(
          img.originalUrl,
          currentSettings.blockSize,
          currentSettings.brightness,
          currentSettings.contrast,
          []
        );

        completedRef.current += 1;
        setBatchProgress(completedRef.current, totalCount);

        if (index === 0 && results['original']) {
          setPreviewUrl(results['original']);
        }

        const allToneImages: { name: string; dataUrl: string; tone: ToneType }[] = [];
        const baseName = img.originalFile.name.replace(/\.[^.]+$/, '');
        for (const tone of TONES) {
          allToneImages.push({
            name: baseName,
            dataUrl: results[tone],
            tone
          });
        }
        return allToneImages;
      });

      const allResults = await Promise.all(processTasks);
      const allImages = allResults.flat();

      setProcessing(false);
      setZipping(true);

      const blob = await createZipArchive(allImages, (current, total) => {
        setBatchProgress(current, total);
      });

      downloadBlob(blob, 'pixel-avatars.zip');
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setProcessing(false);
      setZipping(false);
    }
  }, [processImage, setBatchProgress]);

  const progressPercent = batchTotal > 0 ? Math.round((batchProgress / batchTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="pixel-card p-5">
            <h3 className="font-pixel mb-4 text-sm text-purple-400">批量上传</h3>
            <BatchUploader />
          </div>

          {previewUrl && (
            <div className="pixel-card p-5">
              <h3 className="font-pixel mb-3 text-sm text-purple-400">预览样例</h3>
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="预览"
                  className="max-h-64 border-2 border-purple-500/30"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          )}

          {(processing || zipping) && (
            <div className="pixel-card p-5">
              <div className="mb-3 flex items-center gap-3">
                {processing && <Loader2 className="h-5 w-5 animate-spin text-purple-400" />}
                {zipping && <Package className="h-5 w-5 text-green-400" />}
                <span className="font-vt text-lg text-gray-300">
                  {processing ? '处理中...' : zipping ? '打包中...' : ''}
                </span>
              </div>
              <div className="h-6 border-2 border-purple-500/30 bg-black/30">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-green-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-right font-vt text-sm text-purple-300">
                {batchProgress} / {batchTotal} ({progressPercent}%)
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">参数配置</h3>
            <div className="space-y-4">
              <PixelSlider />
              <ToneSelector />
              <BrightnessContrastSlider />
            </div>
          </div>

          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">输出色调</h3>
            <div className="space-y-1.5">
              {Object.entries(TONE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 font-vt text-sm text-gray-400">
                  <div
                    className="h-3 w-3 border border-white/20"
                    style={{
                      backgroundColor: key === 'original' ? '#e5e7eb'
                        : key === 'retro-green' ? '#4ade80'
                        : key === 'warm-brown' ? '#d97706'
                        : '#c084fc'
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
            <p className="font-vt mt-3 text-xs text-purple-300/50">每种色调均会生成</p>
          </div>

          <button
            onClick={handleBatchProcess}
            disabled={!batchImages || batchImages.length === 0 || processing || zipping}
            className="pixel-btn w-full border-2 border-green-500 bg-green-500/10 px-4 py-3 font-vt text-lg text-green-400 transition-all hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ textShadow: '0 0 6px rgba(34,197,94,0.4)' }}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="h-5 w-5" />
              {processing ? '处理中...' : zipping ? '打包中...' : '批量处理并下载'}
            </div>
          </button>

          {batchImages && batchImages.length > 0 && (
            <p className="text-center font-vt text-sm text-green-400/60">
              已就绪 {batchImages.length} 张图片
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
