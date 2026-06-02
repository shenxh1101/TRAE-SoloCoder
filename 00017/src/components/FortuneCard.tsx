import { Heart, Sparkles, Check } from 'lucide-react';
import type { Fortune } from '../utils/fortuneEngine';
import { showToast } from './Toast';

interface FortuneCardProps {
  fortune: Fortune;
  index: number;
  onLike: (id: string) => void;
  mode: 'normal' | 'reverse';
}

export default function FortuneCard({ fortune, index, onLike, mode }: FortuneCardProps) {
  const cardGradient = mode === 'normal'
    ? 'from-purple-900/60 to-indigo-900/60 hover:from-purple-800/70 hover:to-indigo-800/70'
    : 'from-red-900/60 to-orange-900/60 hover:from-red-800/70 hover:to-orange-800/70';

  const borderColor = mode === 'normal'
    ? 'border-purple-500/30 hover:border-yellow-400/50'
    : 'border-red-500/30 hover:border-orange-400/50';

  const handleLike = () => {
    if (fortune.isLiked) return;
    onLike(fortune.id);
    showToast('关键词已记录');
  };

  return (
    <div
      className={`
        relative p-5 rounded-xl bg-gradient-to-br ${cardGradient}
        border ${borderColor}
        backdrop-blur-sm transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/20
        group overflow-hidden
      `}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-400/10 to-transparent rounded-bl-full" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-purple-900 font-bold text-sm shadow-lg">
              {index + 1}
            </span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          
          <button
            onClick={handleLike}
            disabled={fortune.isLiked}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
              transition-all duration-300 cursor-pointer
              ${fortune.isLiked
                ? 'bg-gray-600/40 text-gray-400 border border-gray-500/30 cursor-default'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-yellow-400 border border-white/20'
              }
            `}
          >
            {fortune.isLiked ? (
              <Check className="w-4 h-4" />
            ) : (
              <Heart className="w-4 h-4" />
            )}
            <span>{fortune.isLiked ? '已标记' : '太准了'}</span>
          </button>
        </div>

        <p className="text-white/90 leading-relaxed text-sm">
          {fortune.content}
        </p>

        {fortune.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {fortune.keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-yellow-300/80 border border-yellow-400/20"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
