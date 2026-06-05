import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { saveHighScore, getHighScore } from '../utils/dataManager';
import { Home, RotateCcw, Trophy, Star, Target, Flame, Award } from 'lucide-react';

interface ResultPageProps {
  result: GameResult;
  onBackToMenu: () => void;
  onRetry: () => void;
}

const gradeColors: Record<string, string> = {
  S: 'from-yellow-400 to-amber-500',
  A: 'from-cyan-400 to-blue-500',
  B: 'from-green-400 to-emerald-500',
  C: 'from-gray-400 to-gray-500',
};

const gradeShadows: Record<string, string> = {
  S: 'shadow-yellow-500/50',
  A: 'shadow-cyan-500/50',
  B: 'shadow-green-500/50',
  C: 'shadow-gray-500/50',
};

export const ResultPage: React.FC<ResultPageProps> = ({ result, onBackToMenu, onRetry }) => {
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const previousBest = getHighScore(result.trackId);
    if (!previousBest || result.score > previousBest.bestScore) {
      setIsNewRecord(true);
    }
    saveHighScore(result);

    setTimeout(() => setShowContent(true), 300);

    const duration = 1500;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.floor(result.score * easeOut));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [result]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className={`relative z-10 max-w-lg w-full mx-4 transition-all duration-700 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{result.trackName}</h1>
          {isNewRecord && (
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-yellow-500/20 rounded-full text-yellow-400 animate-pulse">
              <Trophy className="w-4 h-4" />
              <span className="font-medium">新纪录！</span>
            </div>
          )}
        </div>

        <div className={`w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br ${gradeColors[result.grade]} 
          flex items-center justify-center shadow-2xl ${gradeShadows[result.grade]}
          transform ${showContent ? 'scale-100 rotate-0' : 'scale-0 rotate-180'} transition-all duration-700`}
        >
          <span className="text-6xl font-bold text-white drop-shadow-lg">{result.grade}</span>
        </div>

        <div className="text-center mb-8">
          <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {animatedScore.toLocaleString()}
          </div>
          <div className="text-gray-400">总分</div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 backdrop-blur-sm border border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">准确率</span>
              </div>
              <div className="text-2xl font-bold">{result.accuracy}%</div>
            </div>
            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">最大连击</span>
              </div>
              <div className="text-2xl font-bold">{result.maxCombo}</div>
            </div>
            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Perfect</span>
              </div>
              <div className="text-2xl font-bold">{result.perfect}</div>
            </div>
            <div className="text-center p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Good</span>
              </div>
              <div className="text-2xl font-bold">{result.good}</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">总音符数</span>
              <span className="font-medium">{result.totalNotes}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Miss</span>
              <span className="font-medium text-red-400">{result.miss}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBackToMenu}
            className="flex-1 px-6 py-4 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            返回菜单
          </button>
          <button
            onClick={onRetry}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:from-cyan-400 hover:to-purple-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
          >
            <RotateCcw className="w-5 h-5" />
            再来一次
          </button>
        </div>
      </div>
    </div>
  );
};
