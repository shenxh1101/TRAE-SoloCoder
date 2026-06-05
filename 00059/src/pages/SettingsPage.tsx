import React, { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Difficulty } from '../types';
import { ArrowLeft, Keyboard, Volume2, VolumeX, Music, Gauge, RotateCcw } from 'lucide-react';

interface SettingsPageProps {
  onBack: () => void;
}

const difficultyOptions: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy', label: '简单', color: 'bg-green-500' },
  { value: 'normal', label: '普通', color: 'bg-blue-500' },
  { value: 'hard', label: '困难', color: 'bg-orange-500' },
  { value: 'expert', label: '专家', color: 'bg-red-500' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const {
    keyMapping,
    difficulty,
    musicVolume,
    sfxVolume,
    laneCount,
    noteSpeed,
    setKeyMapping,
    resetKeyMapping,
    setDifficulty,
    setMusicVolume,
    setSfxVolume,
    setLaneCount,
    setNoteSpeed,
  } = useSettingsStore();

  const [editingLane, setEditingLane] = useState<number | null>(null);

  const handleKeyCapture = (lane: number, e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.key === 'Escape' || e.key === 'Backspace') {
      setEditingLane(null);
      return;
    }
    if (e.key.length === 1) {
      setKeyMapping(lane, e.key);
      setEditingLane(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">设置</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Keyboard className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold">键位设置</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {Array.from({ length: laneCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-400 w-16">轨道 {i + 1}</span>
                  {editingLane === i ? (
                    <input
                      type="text"
                      autoFocus
                      placeholder="按任意键"
                      className="flex-1 px-4 py-3 bg-cyan-500/20 border-2 border-cyan-400 rounded-lg text-center font-bold text-cyan-400 outline-none uppercase"
                      onKeyDown={(e) => handleKeyCapture(i, e)}
                      onBlur={() => setEditingLane(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingLane(i)}
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-center font-bold uppercase hover:bg-gray-600 transition-colors"
                    >
                      {keyMapping[i] || '未设置'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={resetKeyMapping}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              恢复默认键位
            </button>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Gauge className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold">游戏设置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">难度</label>
                <div className="flex gap-2">
                  {difficultyOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDifficulty(opt.value)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        difficulty === opt.value
                          ? `${opt.color} text-white`
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">轨道数量: {laneCount}</label>
                <input
                  type="range"
                  min="4"
                  max="6"
                  value={laneCount}
                  onChange={(e) => setLaneCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">
                  下落速度: {noteSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={noteSpeed}
                  onChange={(e) => setNoteSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Volume2 className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold">音量设置</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    音乐音量
                  </label>
                  <span className="text-gray-400">{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 flex items-center gap-2">
                    <VolumeX className="w-4 h-4" />
                    音效音量
                  </label>
                  <span className="text-gray-400">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="font-bold mb-3">操作说明</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>• 按键或点击对应轨道击打音符</li>
              <li>• Perfect: 精准命中 (+100分)</li>
              <li>• Good: 较好命中 (+50分)</li>
              <li>• Miss: 错过或过早按键 (0分, 连击中断)</li>
              <li>• 连击数越高, 分数倍率越大</li>
              <li>• 按 ESC 暂停游戏</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
