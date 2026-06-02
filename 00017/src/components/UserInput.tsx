import { Sparkles, Calendar, Hash, RefreshCw } from 'lucide-react';

interface UserInputProps {
  birthMonth: number;
  setBirthMonth: (month: number) => void;
  luckyNumber: number;
  setLuckyNumber: (num: number) => void;
  mode: 'normal' | 'reverse';
  setMode: (mode: 'normal' | 'reverse') => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export default function UserInput({
  birthMonth,
  setBirthMonth,
  luckyNumber,
  setLuckyNumber,
  mode,
  setMode,
  isGenerating,
  onGenerate
}: UserInputProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            输入你的信息
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </h2>
          <p className="text-white/60 text-sm">AI 将根据你的信息生成专属运势</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              出生月份
            </label>
            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-400/30 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all appearance-none cursor-pointer"
            >
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1} className="bg-purple-900">
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <Hash className="w-4 h-4 text-yellow-400" />
              幸运数字 (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={luckyNumber}
              onChange={(e) => setLuckyNumber(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-purple-400/30 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-white/80 text-sm mb-3">
              <RefreshCw className="w-4 h-4 text-yellow-400" />
              选择模式
            </label>
            <div className="relative bg-white/10 rounded-xl p-1 border border-white/20">
              <div
                className={`absolute top-1 bottom-1 w-1/2 rounded-lg bg-gradient-to-r transition-all duration-300 ease-out ${
                  mode === 'normal'
                    ? 'left-1 from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
                    : 'left-[calc(50%-2px)] from-red-500 to-orange-500 shadow-lg shadow-red-500/30'
                }`}
              />
              <div className="relative grid grid-cols-2">
                <button
                  onClick={() => setMode('normal')}
                  className={`relative z-10 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                    mode === 'normal' ? 'text-purple-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  ✨ 正常模式
                </button>
                <button
                  onClick={() => setMode('reverse')}
                  className={`relative z-10 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                    mode === 'reverse' ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  💀 反向毒奶
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`
              w-full py-4 rounded-xl font-bold text-lg
              bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500
              text-white shadow-lg shadow-orange-500/30
              hover:shadow-xl hover:shadow-orange-500/40
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-2
            `}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在占卜中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                开始占卜
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
