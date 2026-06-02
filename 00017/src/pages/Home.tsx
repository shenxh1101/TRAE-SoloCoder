import { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, Trash2, Brain } from 'lucide-react';
import StarBackground from '../components/StarBackground';
import UserInput from '../components/UserInput';
import FortuneCard from '../components/FortuneCard';
import DailyInfo from '../components/DailyInfo';
import ShareCard from '../components/ShareCard';
import Toast from '../components/Toast';
import {
  generateFortunes,
  generateDailyInfo,
  likeFortune,
  getUserPreferences,
  clearUserPreferences
} from '../utils/fortuneEngine';
import type { Fortune, DailyInfo as DailyInfoType, UserPreferences } from '../utils/fortuneEngine';

export default function Home() {
  const [birthMonth, setBirthMonth] = useState(1);
  const [luckyNumber, setLuckyNumber] = useState(7);
  const [mode, setMode] = useState<'normal' | 'reverse'>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fortunes, setFortunes] = useState<Fortune[]>([]);
  const [dailyInfo, setDailyInfo] = useState<DailyInfoType | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [likedCount, setLikedCount] = useState(0);

  const loadLikedCount = useCallback(() => {
    const prefs: UserPreferences = getUserPreferences();
    const count = Object.keys(prefs.likedKeywords).length;
    setLikedCount(count);
    return count;
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setHasGenerated(false);

    await new Promise(resolve => setTimeout(resolve, 1200));

    const newFortunes = generateFortunes(5, birthMonth, luckyNumber, mode);
    const newDailyInfo = generateDailyInfo(birthMonth, luckyNumber);

    setFortunes(newFortunes);
    setDailyInfo(newDailyInfo);
    setHasGenerated(true);
    setIsGenerating(false);
  }, [birthMonth, luckyNumber, mode]);

  const handleLike = useCallback((id: string) => {
    setFortunes(prev =>
      prev.map(f => {
        if (f.id === id && !f.isLiked) {
          const updated = likeFortune(f);
          loadLikedCount();
          return updated;
        }
        return f;
      })
    );
  }, [loadLikedCount]);

  const handleReset = useCallback(() => {
    setFortunes([]);
    setDailyInfo(null);
    setHasGenerated(false);
  }, []);

  const handleClearPrefs = useCallback(() => {
    clearUserPreferences();
    loadLikedCount();
  }, [loadLikedCount]);

  return (
    <div className="min-h-screen relative">
      <Toast />
      <StarBackground />

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                <span className="text-3xl">🔮</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 mb-4">
              AI 算命机
            </h1>
            <p className="text-white/70 text-lg max-w-lg mx-auto">
              基于神秘宇宙能量和大数据算法，为你生成专属运势
              <br />
              <span className="text-white/50 text-sm">（其实都是随机的，开心就好）</span>
            </p>
          </header>

          <UserInput
            birthMonth={birthMonth}
            setBirthMonth={setBirthMonth}
            luckyNumber={luckyNumber}
            setLuckyNumber={setLuckyNumber}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />

          {hasGenerated && dailyInfo && (
            <div className="mt-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white inline-flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  {mode === 'normal' ? '✨ 你的本周运势 ✨' : '💀 反向毒奶预测 💀'}
                </h2>
              </div>

              <div className="grid gap-4">
                {fortunes.map((fortune, index) => (
                  <FortuneCard
                    key={fortune.id}
                    fortune={fortune}
                    index={index}
                    onLike={handleLike}
                    mode={mode}
                  />
                ))}
              </div>

              <DailyInfo info={dailyInfo} />

              <ShareCard
                fortunes={fortunes}
                dailyInfo={dailyInfo}
                mode={mode}
              />

              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新占卜
                </button>
                {likedCount > 0 && (
                  <button
                    onClick={handleClearPrefs}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/60 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    清除偏好 ({likedCount}个关键词)
                  </button>
                )}
              </div>

              {likedCount > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-white/40 text-xs inline-flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    AI 已学习 {likedCount} 个偏好关键词，将影响未来运势生成
                  </p>
                </div>
              )}
            </div>
          )}

          <footer className="mt-16 text-center text-white/40 text-sm">
            <p>🔮 AI算命机 · 仅供娱乐 · 切勿当真</p>
            <p className="mt-1">点击"太准了"可以训练AI，让未来的运势更符合你的口味</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
