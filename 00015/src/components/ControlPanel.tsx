import { Camera, Download, Plus, Sparkles, Palette } from 'lucide-react';
import { useGlassBallStore } from '@/store/useGlassBallStore';

export function ControlPanel({ onScreenshot, onExportConfig }: { onScreenshot: () => void; onExportConfig: () => void }) {
  const { year, setYear, color, setColor, generateBall, setShowAddItemModal, isGenerated, items } = useGlassBallStore();

  const handleGenerate = () => {
    console.log('[ControlPanel] Generate clicked, year:', year, 'color:', color);
    generateBall();
  };

  const handleScreenshot = () => {
    console.log('[ControlPanel] Screenshot clicked');
    onScreenshot();
  };

  const handleExport = () => {
    console.log('[ControlPanel] Export clicked');
    onExportConfig();
  };

  const handleAddItem = () => {
    console.log('[ControlPanel] Add item clicked');
    setShowAddItemModal(true);
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 w-60 bg-[rgba(10,14,39,0.85)] backdrop-blur-xl border border-[rgba(201,169,110,0.2)] rounded-2xl p-6 flex flex-col gap-4 shadow-[0_0_40px_rgba(201,169,110,0.1)] font-sans">
      <h1 className="text-2xl font-bold text-[#c9a96e] text-center tracking-wide" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        记忆中的玻璃球
      </h1>

      {isGenerated && (
        <div className="text-xs text-white/50 text-center">
          已生成 {items.length} 个物品
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-white/70">年份</label>
        <input
          type="number"
          min={1950}
          max={2025}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-black/30 border border-[#c9a96e]/20 rounded-lg px-3 py-2 text-white focus:border-[#c9a96e]/50 outline-none w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-white/70 flex items-center gap-1.5">
          <Palette size={14} />
          球体颜色
        </label>
        <div className="relative">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 bg-black/30 border border-[#c9a96e]/20 rounded-lg cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a96e] to-[#8b6914] text-[#1a1a2e] font-semibold rounded-lg px-4 py-2.5 hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        <Sparkles size={16} />
        生成玻璃球
      </button>

      <button
        onClick={handleAddItem}
        className="w-full flex items-center justify-center gap-2 border border-[#c9a96e]/40 text-[#c9a96e] rounded-lg px-4 py-2.5 hover:bg-[#c9a96e]/10 transition-colors duration-200"
      >
        <Plus size={16} />
        添加物品
      </button>

      <button
        onClick={handleScreenshot}
        className="w-full flex items-center justify-center gap-2 text-white/60 hover:text-white/90 rounded-lg px-4 py-2 hover:bg-white/5 transition-colors duration-200"
      >
        <Camera size={16} />
        截图分享
      </button>

      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 text-white/60 hover:text-white/90 rounded-lg px-4 py-2 hover:bg-white/5 transition-colors duration-200"
      >
        <Download size={16} />
        保存配置
      </button>
    </div>
  );
}
