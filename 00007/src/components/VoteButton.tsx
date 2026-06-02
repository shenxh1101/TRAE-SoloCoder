import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { VariantType } from '../types';

interface VoteButtonProps {
  variantId: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  onVote: (variantId: string, direction: 'up' | 'down', variantType?: VariantType) => void;
}

export function VoteButton({ variantId, upvotes, downvotes, userVote, onVote }: VoteButtonProps) {
  const [animating, setAnimating] = useState<'up' | 'down' | null>(null);

  const handleVote = (direction: 'up' | 'down') => {
    setAnimating(direction);
    onVote(variantId, direction);
    setTimeout(() => setAnimating(null), 400);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote('up')}
        className={`vote-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
          animating === 'up' ? 'voted' : ''
        } ${
          userVote === 'up'
            ? 'bg-green-100 text-green-600 ring-2 ring-green-300'
            : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-500'
        }`}
      >
        <ThumbsUp className="w-4 h-4" fill={userVote === 'up' ? 'currentColor' : 'none'} />
        <span className="text-sm font-medium">{upvotes}</span>
      </button>

      <button
        onClick={() => handleVote('down')}
        className={`vote-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
          animating === 'down' ? 'voted' : ''
        } ${
          userVote === 'down'
            ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
            : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
        }`}
      >
        <ThumbsDown className="w-4 h-4" fill={userVote === 'down' ? 'currentColor' : 'none'} />
        <span className="text-sm font-medium">{downvotes}</span>
      </button>
    </div>
  );
}