import { useState } from 'react';
import { LyricInput } from '../components/LyricInput';
import { StyleCard } from '../components/StyleCard';
import { BatchUpload } from '../components/BatchUpload';
import { GenerateResult } from '../types';
import { generatePoems } from '../utils/api';
import { Music, Mountain, Zap, Sparkles } from 'lucide-react';

export function Home() {
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [originalLyrics, setOriginalLyrics] = useState('');

  const handleGenerate = async (lyrics: string) => {
    setLoading(true);
    setOriginalLyrics(lyrics);
    try {
      const data = await generatePoems(lyrics);
      setResult(data);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineGenerate = (lineResult: GenerateResult, lineIndex: number) => {
    setResult(lineResult);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 py-12 px-4">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50 mb-6">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-slate-300 text-sm">AI 驱动的创意转换引擎</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            歌词诗化器
          </h1>
          
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            将英文歌词转化为三种独特风格的诗歌，感受文字的魔力
          </p>

          <div className="flex justify-center gap-4 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm">规则引擎运行中</span>
            </div>
          </div>
        </header>

        <LyricInput
          onGenerate={handleGenerate}
          loading={loading}
          onLineGenerate={handleLineGenerate}
          selectedLineIndex={selectedLineIndex}
          onSelectedLineChange={setSelectedLineIndex}
        />

        {result && (
          <div className="w-full max-w-6xl mx-auto mb-16">
            {selectedLineIndex !== null && (
              <div className="text-center mb-8">
                <span className="inline-block px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm border border-cyan-500/30">
                  针对第 {selectedLineIndex + 1} 行单独生成
                </span>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <StyleCard
                title="民谣风"
                style="folk"
                poem={result.folk}
                original={result.original}
                colorClass="from-amber-400 to-orange-500"
                borderClass="border border-amber-500/30"
                glowClass="shadow-lg shadow-amber-500/10"
                icon={<Music size={24} className="text-amber-400" />}
                loading={loading}
              />

              <StyleCard
                title="古风"
                style="ancient"
                poem={result.ancient}
                original={result.original}
                colorClass="from-emerald-400 to-teal-500"
                borderClass="border border-emerald-500/30"
                glowClass="shadow-lg shadow-emerald-500/10"
                icon={<Mountain size={24} className="text-emerald-400" />}
                loading={loading}
              />

              <StyleCard
                title="赛博朋克"
                style="cyberpunk"
                poem={result.cyberpunk}
                original={result.original}
                colorClass="from-cyan-400 to-blue-500"
                borderClass="border border-cyan-500/30"
                glowClass="shadow-lg shadow-cyan-500/10"
                icon={<Zap size={24} className="text-cyan-400" />}
                loading={loading}
              />
            </div>

            <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <p className="text-slate-400 text-sm text-center">
                <span className="text-slate-500">原文：</span>
                <span className="text-slate-300">{result.original}</span>
              </p>
            </div>
          </div>
        )}

        <BatchUpload />

        <footer className="mt-20 text-center text-slate-500 text-sm">
          <p>使用本地规则库作为降级方案，确保服务始终可用</p>
        </footer>
      </div>
    </div>
  );
}
