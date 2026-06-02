import { useState, useRef } from 'react';
import { Image, Download, X } from 'lucide-react';
import { RecipeVariant, VARIANT_CONFIG } from '../types';

interface ImageGeneratorProps {
  variant: RecipeVariant;
  allergens?: string[];
}

export function ImageGenerator({ variant, allergens = [] }: ImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const config = VARIANT_CONFIG[variant.type];

  const generateImage = async () => {
    setIsGenerating(true);
    setShowModal(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ingredientCount = variant.fullIngredients.length;
    const changeCount = variant.ingredientChanges.length;
    const baseHeight = 1000;
    const extraIngredientHeight = Math.max(0, ingredientCount - 10) * 20;
    const extraChangeHeight = Math.max(0, changeCount - 3) * 60;
    const allergenHeight = allergens.length > 0 ? 60 : 0;
    const height = baseHeight + extraIngredientHeight + extraChangeHeight + allergenHeight;
    const width = 800;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (variant.type === 'low-calorie') {
      gradient.addColorStop(0, '#F1F8E9');
      gradient.addColorStop(1, '#C5E1A5');
    } else if (variant.type === 'luxury') {
      gradient.addColorStop(0, '#FFFDE7');
      gradient.addColorStop(1, '#FFF59D');
    } else {
      gradient.addColorStop(0, '#E3F2FD');
      gradient.addColorStop(1, '#90CAF9');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 24);
    ctx.fill();

    ctx.font = 'bold 36px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`${config.emoji} ${variant.name}`, width / 2, 120);

    ctx.font = '18px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`原版: ${variant.originalDish}`, width / 2, 160);

    let currentY = 220;

    if (allergens.length > 0) {
      ctx.font = 'bold 20px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#d32f2f';
      ctx.textAlign = 'left';
      ctx.fillText('⚠️ 饮食限制', 80, currentY);
      currentY += 35;
      ctx.font = '16px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#c62828';
      ctx.fillText(`已避开: ${allergens.join('、')}`, 80, currentY);
      currentY += 40;
    }

    ctx.font = 'bold 24px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('📋 完整食材清单', 80, currentY);
    currentY += 40;

    ctx.font = '18px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#555';
    const ingredientsPerColumn = Math.ceil(ingredientCount / 2);
    variant.fullIngredients.forEach((ing, idx) => {
      const col = Math.floor(idx / ingredientsPerColumn);
      const row = idx % ingredientsPerColumn;
      const x = 80 + col * 320;
      const y = currentY + row * 36;
      ctx.fillText(`• ${ing}`, x, y);
    });

    currentY += Math.min(ingredientsPerColumn, ingredientCount) * 36 + 30;

    ctx.font = 'bold 24px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText('✨ 创意改动说明', 80, currentY);
    currentY += 40;

    ctx.font = '16px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#666';
    variant.ingredientChanges.forEach((change, idx) => {
      const y = currentY + idx * 70;
      if (y > height - 100) return;
      
      ctx.fillStyle = '#e53935';
      ctx.fillText(`❌ 替换: ${change.original}`, 80, y);
      ctx.fillStyle = '#43a047';
      ctx.fillText(`✅ 改为: ${change.replacement}`, 80, y + 28);
      ctx.fillStyle = '#666';
      ctx.font = '14px "Noto Sans SC", sans-serif';
      ctx.fillText(`   💡 ${change.reason}`, 80, y + 52);
      ctx.font = '16px "Noto Sans SC", sans-serif';
    });

    currentY += changeCount * 70 + 20;

    if (currentY < height - 120) {
      ctx.font = 'italic 16px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      const words = variant.description.split('');
      let line = '';
      let lineY = currentY;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 640 && i > 0) {
          ctx.fillText(line, 80, lineY);
          line = words[i];
          lineY += 24;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 80, lineY);
    }

    ctx.font = '16px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    const dateStr = new Date().toLocaleDateString('zh-CN');
    ctx.fillText(`🍳 AI 菜谱变形记 · 生成于 ${dateStr}`, width / 2, height - 50);

    const dataUrl = canvas.toDataURL('image/png');
    setImageUrl(dataUrl);
    setIsGenerating(false);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.download = `${variant.name}-菜谱.png`;
    link.href = imageUrl;
    link.click();
  };

  return (
    <>
      <button
        onClick={generateImage}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full text-sm font-medium transition-all duration-200"
      >
        <Image className="w-4 h-4" />
        <span>生成图片</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {config.emoji} {variant.name}
            </h3>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500" />
                <p className="mt-4 text-gray-500">正在生成图片...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={imageUrl || ''}
                    alt="生成的菜谱图片"
                    className="w-full h-auto"
                  />
                </div>
                <button
                  onClick={downloadImage}
                  className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>下载图片</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}