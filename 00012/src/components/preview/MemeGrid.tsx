import { useEffect, useState } from 'react';
import { useStore } from '../../store/useAppStore';
import { useImageProcessor } from '../../hooks/useImageProcessor';
import { memeTemplates } from '../../utils/memeGenerator';
import { createMemeZipArchive, downloadBlob } from '../../utils/zipPacker';
import { downloadDataURL } from '../../utils/imageExport';
import { Download, Package } from 'lucide-react';

export default function MemeGrid() {
  const { currentImage, settings } = useStore();
  const { processMemeImage } = useImageProcessor();
  const [memeDataUrls, setMemeDataUrls] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (!currentImage) {
      setMemeDataUrls({});
      return;
    }

    setProcessing(true);
    let cancelled = false;

    const processAll = async () => {
      const results: Record<string, string> = {};
      for (const template of memeTemplates) {
        if (cancelled) return;
        const dataUrl = await processMemeImage(
          currentImage.originalUrl,
          settings.blockSize,
          template.transform.colorShift,
          template.transform.mouthCurve,
          template.transform.browAngle,
          template.transform.eyeScale
        );
        results[template.id] = dataUrl;
      }
      if (!cancelled) {
        setMemeDataUrls(results);
        setProcessing(false);
      }
    };

    processAll();

    return () => {
      cancelled = true;
    };
  }, [currentImage, settings.blockSize, processMemeImage]);

  const handleDownloadOne = (id: string) => {
    const dataUrl = memeDataUrls[id];
    if (!dataUrl) return;
    const template = memeTemplates.find((t) => t.id === id);
    downloadDataURL(dataUrl, `meme_${template?.name ?? id}.png`);
  };

  const handleDownloadAll = async () => {
    const entries = memeTemplates
      .filter((t) => memeDataUrls[t.id])
      .map((t) => ({
        name: `meme_${t.name}`,
        dataUrl: memeDataUrls[t.id],
      }));

    if (entries.length === 0) return;

    setZipping(true);
    try {
      const blob = await createMemeZipArchive(entries);
      downloadBlob(blob, 'pixel-memes.zip');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-[#a855f7]">表情包</span>
        <button
          onClick={handleDownloadAll}
          disabled={zipping || Object.keys(memeDataUrls).length === 0}
          className="flex items-center gap-1.5 rounded border border-[#22c55e]/40 px-3 py-1.5 text-xs font-bold text-[#22c55e] transition-colors hover:bg-[#22c55e]/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Package size={14} />
          {zipping ? '打包中...' : '下载全部'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {memeTemplates.map((template) => (
          <div
            key={template.id}
            className="group relative overflow-hidden rounded-lg border border-[#a855f7]/20 bg-[#1a1a2e] p-2 transition-colors hover:border-[#a855f7]/50"
          >
            <div className="mb-1.5 flex items-center gap-1">
              <span className="text-base">{template.emoji}</span>
              <span className="text-[10px] font-bold text-[#a855f7]/80">{template.name}</span>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded border border-[#a855f7]/10 bg-[#0f0f23]">
              {memeDataUrls[template.id] ? (
                <img
                  src={memeDataUrls[template.id]}
                  alt={template.name}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {processing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
                  ) : (
                    <span className="text-[10px] text-[#a855f7]/40">无图片</span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDownloadOne(template.id)}
              disabled={!memeDataUrls[template.id]}
              className="absolute right-3 bottom-3 rounded border border-[#22c55e]/40 p-1 text-[#22c55e] opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
            >
              <Download size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
