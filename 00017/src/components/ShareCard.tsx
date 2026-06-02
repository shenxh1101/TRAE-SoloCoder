import { useState } from 'react';
import { Download, Image, Loader2 } from 'lucide-react';
import type { Fortune, DailyInfo } from '../utils/fortuneEngine';
import { generateShareCard, downloadImage } from '../utils/cardGenerator';

interface ShareCardProps {
  fortunes: Fortune[];
  dailyInfo: DailyInfo;
  mode: 'normal' | 'reverse';
}

export default function ShareCard({ fortunes, dailyInfo, mode }: ShareCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGenerateCard = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await generateShareCard(fortunes, dailyInfo, mode);
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (previewUrl) {
      downloadImage(previewUrl, `fortune-${Date.now()}.png`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-xl font-bold text-white text-center mb-6">
          📸 生成朋友圈分享卡片
        </h3>

        {!previewUrl ? (
          <div className="text-center">
            <button
              onClick={handleGenerateCard}
              disabled={isGenerating}
              className={`
                inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold
                bg-gradient-to-r from-cyan-500 to-blue-500
                text-white shadow-lg shadow-blue-500/30
                hover:shadow-xl hover:shadow-blue-500/40
                hover:scale-105 active:scale-95
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在生成卡片...
                </>
              ) : (
                <>
                  <Image className="w-5 h-5" />
                  生成分享卡片
                </>
              )}
            </button>
            <p className="text-white/50 text-sm mt-4">
              点击生成一张精美的运势卡片，分享到朋友圈
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-yellow-400/30">
                <img
                  src={previewUrl}
                  alt="运势卡片"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">✨</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleGenerateCard}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                <Image className="w-4 h-4" />
                重新生成
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                下载图片
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
