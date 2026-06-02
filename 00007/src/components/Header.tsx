import { Sparkles, ChefHat } from 'lucide-react';

export function Header() {
  return (
    <header className="relative py-12 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-texture opacity-50"></div>
      
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <ChefHat className="w-12 h-12 text-primary-500 animate-float" />
            <Sparkles className="w-5 h-5 text-luxury-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          <span className="bg-gradient-to-r from-primary-500 via-luxury-500 to-exotic-500 bg-clip-text text-transparent">
            AI 菜谱变形记
          </span>
        </h1>
        
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          输入一道家常菜，让 AI 为你变出三种创意版本
          <br />
          <span className="text-sm text-gray-500">
            🥗 低卡健康 · 👑 豪华宴客 · 🌍 异国风味
          </span>
        </p>
      </div>
    </header>
  );
}