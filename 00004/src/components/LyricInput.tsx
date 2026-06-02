import { useState } from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import { generateSinglePoem } from '../utils/api';
import { GenerateResult } from '../types';

interface LyricInputProps {
  onGenerate: (lyrics: string) => void;
  loading: boolean;
  onLineGenerate: (result: GenerateResult, lineIndex: number) => void;
  selectedLineIndex: number | null;
  onSelectedLineChange: (index: number | null) => void;
}

const EXAMPLE_LYRICS = `Hello darkness my old friend
I've come to talk with you again
Because a vision softly creeping
Left its seeds while I was sleeping`;

export function LyricInput({ onGenerate, loading, onLineGenerate, selectedLineIndex, onSelectedLineChange }: LyricInputProps) {
  const [lyrics, setLyrics] = useState('');
  const [lineLoading, setLineLoading] = useState<number | null>(null);
  const lines = lyrics.split('\n').filter(l => l.trim());

  const handleGenerate = () => {
    if (lyrics.trim()) {
      onSelectedLineChange(null);
      onGenerate(lyrics);
    }
  };

  const handleLineClick = async (index: number) => {
    if (lineLoading !== null) return;
    
    const line = lines[index];
    if (!line) return;
    
    onSelectedLineChange(index);
    setLineLoading(index);
    
    try {
      const result = await generateSinglePoem(line);
      onLineGenerate(result, index);
    } catch (error) {
      console.error('Line generation failed:', error);
    } finally {
      setLineLoading(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 blur-3xl rounded-3xl" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Wand2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">输入歌词</h2>
                <p className="text-slate-400 text-sm">将英文歌词转化为三种风格的诗歌</p>
              </div>
            </div>
            <button
              onClick={() => setLyrics(EXAMPLE_LYRICS)}
              className="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2"
            >
              <Sparkles size={16} />
              使用示例
            </button>
          </div>

          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="在此输入英文歌词..."
            className="w-full h-40 bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
          />

          {lines.length > 0 && (
            <div className="mt-4 p-4 bg-slate-800/30 rounded-xl">
              <p className="text-slate-400 text-sm mb-2">点击某一行可单独对该行生成：</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lines.map((line, index) => (
                  <button
                    key={index}
                    onClick={() => handleLineClick(index)}
                    disabled={lineLoading !== null}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                      selectedLineIndex === index
                        ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                    } ${lineLoading === index ? 'opacity-70' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`mr-1 ${selectedLineIndex === index ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {index + 1}.
                      </span>
                      {line}
                    </span>
                    {lineLoading === index && (
                      <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    )}
                    {selectedLineIndex === index && lineLoading === null && (
                      <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded">已选中</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <span className="text-slate-500 text-sm">
              {lines.length} 行 · {lyrics.length} 字符
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading || !lyrics.trim()}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />
                  开始转换
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
