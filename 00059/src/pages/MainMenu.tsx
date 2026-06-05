import React, { useState, useEffect } from 'react';
import { Track, Difficulty } from '../types';
import { defaultTracks } from '../data/tracks';
import { loadHighScores } from '../utils/dataManager';
import { MidiParser } from '../utils/midiParser';
import { useSettingsStore } from '../stores/settingsStore';
import { Music, Play, Settings, Award, Zap, Upload } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (track: Track, practiceMode: boolean) => void;
  onOpenSettings: () => void;
}

const difficultyColors: Record<Difficulty, string> = {
  easy: 'text-green-400',
  normal: 'text-blue-400',
  hard: 'text-orange-400',
  expert: 'text-red-400',
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  expert: '专家',
};

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenSettings }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [highScores, setHighScores] = useState<Record<string, any>>({});
  const [practiceMode, setPracticeMode] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const laneCount = useSettingsStore(state => state.laneCount);

  useEffect(() => {
    setHighScores(loadHighScores());
  }, []);

  const handleMidiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedTrack = MidiParser.parse(arrayBuffer, laneCount);
      const customTrack: Track = {
        ...parsedTrack,
        id: `custom-${Date.now()}`,
        name: file.name.replace('.mid', '').replace('.midi', ''),
      };
      setSelectedTrack(customTrack);
    } catch (err) {
      console.error('Failed to parse MIDI:', err);
      alert('无法解析 MIDI 文件，请确保文件格式正确');
    }
  };

  const filteredTracks = filterDifficulty === 'all'
    ? defaultTracks
    : defaultTracks.filter(t => t.difficulty === filterDifficulty);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Music className="w-12 h-12 text-cyan-400 animate-bounce" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              节奏大师
            </h1>
            <Zap className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">跟随节拍，挑战极限</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setPracticeMode(!practiceMode)}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              practiceMode
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Zap className="w-5 h-5" />
            练习模式
          </button>
          <button
            onClick={onOpenSettings}
            className="px-6 py-3 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            设置
          </button>
          <label className="px-6 py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-500 transition-all flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            导入 MIDI
            <input
              type="file"
              accept=".mid,.midi"
              onChange={handleMidiUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {(['all', 'easy', 'normal', 'hard', 'expert'] as const).map(diff => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filterDifficulty === diff
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {diff === 'all' ? '全部' : difficultyLabels[diff]}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredTracks.map(track => {
            const score = highScores[track.id];
            const isSelected = selectedTrack?.id === track.id;
            
            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track)}
                className={`p-6 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{track.name}</h3>
                    <p className="text-gray-400 text-sm">{track.artist}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-sm font-medium ${difficultyColors[track.difficulty]}`}>
                        {difficultyLabels[track.difficulty]}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {track.bpm} BPM
                      </span>
                      <span className="text-gray-500 text-sm">
                        {track.notes.length} 音符
                      </span>
                    </div>
                  </div>
                  
                  {score && (
                    <div className="text-right mr-6">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Award className="w-4 h-4" />
                        <span className="font-bold">{score.bestGrade}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{score.bestScore.toLocaleString()} 分</p>
                      <p className="text-gray-500 text-xs">{score.plays} 次游玩</p>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartGame(track, practiceMode);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold hover:from-cyan-400 hover:to-purple-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                  >
                    <Play className="w-5 h-5" />
                    开始
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTrack?.isCustom && (
          <div className="mt-6 p-6 rounded-xl bg-purple-500/20 border border-purple-500/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-purple-300">{selectedTrack.name}</h3>
                <p className="text-gray-400 text-sm">自定义导入曲目 · {selectedTrack.notes.length} 音符</p>
              </div>
              <button
                onClick={() => onStartGame(selectedTrack, practiceMode)}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-bold hover:from-purple-400 hover:to-pink-400 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30"
              >
                <Play className="w-5 h-5" />
                开始游戏
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
