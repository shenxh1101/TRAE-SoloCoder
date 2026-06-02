import {
  Video,
  Square,
  Play,
  Pause,
  Download,
  Trash2,
  Camera,
  Crosshair,
  Settings,
} from 'lucide-react';
import { useRecording } from '@/hooks/useRecording';
import { useSceneStore } from '@/store/useSceneStore';
import { useState } from 'react';

const Toolbar = () => {
  const {
    isRecording,
    isPlaying,
    frameCount,
    duration,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    exportJSON,
    clearRecording,
    canExport,
    canPlay,
  } = useRecording();

  const cameraMode = useSceneStore((state) => state.camera.mode);
  const attachedArmId = useSceneStore((state) => state.camera.attachedArmId);
  const setCameraMode = useSceneStore((state) => state.setCameraMode);
  const arms = useSceneStore((state) => state.arms);
  const [showArmSelector, setShowArmSelector] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-industrial-border bg-industrial-panel backdrop-blur-md">
        <div className="flex items-center gap-1 pr-3 border-r border-industrial-border">
          <Camera className="w-4 h-4 text-industrial-accent" />
          <button
            onClick={() => setCameraMode('free')}
            className={`px-3 py-1 rounded text-xs font-display transition-all ${
              cameraMode === 'free'
                ? 'bg-industrial-accent text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            自由视角
          </button>
          <div className="relative">
            <button
              onClick={() => setShowArmSelector(!showArmSelector)}
              className={`px-3 py-1 rounded text-xs font-display transition-all ${
                cameraMode === 'attach'
                  ? 'bg-industrial-accent text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crosshair className="w-3 h-3 inline mr-1" />
              附着
            </button>
            {showArmSelector && (
              <div className="absolute top-full left-0 mt-1 p-2 rounded border border-industrial-border bg-industrial-panel backdrop-blur-md">
                {arms.map((arm) => (
                  <button
                    key={arm.id}
                    onClick={() => {
                      setCameraMode('attach', arm.id);
                      setShowArmSelector(false);
                    }}
                    className={`block w-full px-3 py-1 text-left text-xs rounded transition-all ${
                      attachedArmId === arm.id
                        ? 'bg-industrial-accent/20 text-industrial-accent'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {arm.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 px-3 border-r border-industrial-border">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isPlaying}
              className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="开始录制"
            >
              <Video className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="p-2 rounded text-industrial-danger animate-pulse hover:bg-industrial-danger/10 transition-all"
              title="停止录制"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {!isPlaying ? (
            <button
              onClick={startPlayback}
              disabled={!canPlay}
              className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="播放"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={stopPlayback}
              className="p-2 rounded text-industrial-accent hover:bg-industrial-accent/10 transition-all"
              title="暂停"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={exportJSON}
            disabled={!canExport}
            className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="导出JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={clearRecording}
            disabled={frameCount === 0 || isRecording || isPlaying}
            className="p-2 rounded text-gray-400 hover:text-industrial-danger hover:bg-industrial-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="清除录制"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isRecording && (
            <span className="text-industrial-danger font-mono animate-pulse">
              ● REC
            </span>
          )}
          {frameCount > 0 && (
            <span className="text-gray-400 font-mono">
              {frameCount}帧 / {formatTime(duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
