import { useState, useEffect } from 'react';
import { StarRating } from './StarRating';
import { StyleType, PoemResult } from '../types';
import { submitRating } from '../utils/api';
import { Sparkles, Check, Loader2 } from 'lucide-react';

interface StyleCardProps {
  title: string;
  style: StyleType;
  poem: PoemResult;
  original: string;
  colorClass: string;
  borderClass: string;
  glowClass: string;
  icon: React.ReactNode;
  loading?: boolean;
}

export function StyleCard({
  title,
  style,
  poem,
  original,
  colorClass,
  borderClass,
  glowClass,
  icon,
  loading = false,
}: StyleCardProps) {
  const [rating, setRating] = useState(poem.rating);
  const [submitted, setSubmitted] = useState(poem.rating > 0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(poem.rating);
    setSubmitted(poem.rating > 0);
  }, [poem]);

  const handleRating = async (newRating: number) => {
    if (submitted) return;
    setRating(newRating);
    setSubmitting(true);
    try {
      await submitRating({
        style,
        original,
        result: poem.text,
        rating: newRating,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl p-6 backdrop-blur-xl ${borderClass} ${glowClass} transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 bg-slate-900/60`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${colorClass}`}>
            {icon}
          </div>
          <h3 className={`text-xl font-bold bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}>
            {title}
          </h3>
          <Sparkles size={16} className="text-yellow-400 animate-pulse" />
          {poem.rating > 0 && (
            <span className="ml-auto text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
              已有评价 {poem.rating}★
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded animate-pulse" />
            <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded animate-pulse w-5/6" />
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 rounded-xl bg-slate-800/50 min-h-[120px]">
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed font-light">
                {poem.text}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <span className="text-slate-400 text-sm">评价此生成结果</span>
              <div className="flex items-center gap-2">
                {submitting && <Loader2 size={16} className="animate-spin text-blue-400" />}
                {submitted && !submitting && <Check size={16} className="text-green-400" />}
                <StarRating
                  value={rating}
                  onChange={handleRating}
                  disabled={submitted || submitting}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
