import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, FastForward, Gauge, ThermometerSun, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

interface BottomTimelineProps {}

export default function BottomTimeline() {
  const isHeatmapVisible = useAppStore((state) => state.isHeatmapVisible);
  const simulationSpeed = useAppStore((state) => state.simulationSpeed);
  const setHeatmapVisible = useAppStore((state) => state.setHeatmapVisible);
  const setSimulationSpeed = useAppStore((state) => state.setSimulationSpeed);
  const congestionPredictions = useAppStore((state) => state.congestionPredictions);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPredictionPoint, setSelectedPredictionPoint] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const timePoints = useMemo(() => Array.from({ length: 13 }, (_, i) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + i * 5);
    return date;
  }), []);

  const predictions = congestionPredictions;
  const speed = simulationSpeed;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTimeIndex((prev) => {
          const next = prev + 1;
          if (next >= timePoints.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1000 / speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, timePoints]);

  const handleSliderChange = (index: number) => {
    setCurrentTimeIndex(index);
  };

  const handleHeatmapToggle = () => {
    setHeatmapVisible(!isHeatmapVisible);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getCongestionColor = (index: number) => {
    if (index < 0.4) return 'bg-green-500';
    if (index < 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCongestionOpacity = (index: number) => {
    return 0.3 + index * 0.7;
  };

  const currentTime = timePoints[currentTimeIndex];
  const isFuture = currentTimeIndex > 0;

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div
      className={cn(
        "bg-cyber-panel border-t border-cyber-border relative overflow-hidden transition-all duration-300",
        isExpanded ? "h-48" : "h-12"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-cyber-glow/3 via-transparent to-transparent pointer-events-none" />

      <div className="flex items-center justify-between px-4 py-2 border-b border-cyber-border relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-mono">
              {formatTime(currentTime)}
            </span>
            {isFuture && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                预测
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-cyber-border" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center transition-all duration-300",
                "border",
                isPlaying
                  ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                  : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1 ml-2">
              <FastForward className="w-3 h-3 text-cyan-500/70" />
              <div className="flex gap-0.5">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSimulationSpeed(s)}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded border transition-all duration-300",
                      speed === s
                        ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-500/70 hover:bg-cyan-500/20"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-cyber-border" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleHeatmapToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-all duration-300",
                isHeatmapVisible
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-cyber-orange"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              )}
            >
              <ThermometerSun className="w-4 h-4" />
              拥堵热力图
              <div className={cn(
                "w-3 h-3 rounded-full border border-current",
                isHeatmapVisible ? "bg-current" : ""
              )} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-cyan-500/70">
            <Gauge className="w-3 h-3" />
            速度: {speed}x
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 relative z-10">
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-cyber-border" />

            <input
              type="range"
              min="0"
              max={timePoints.length - 1}
              value={currentTimeIndex}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            <div className="flex items-center justify-between relative z-10">
              {timePoints.map((time, idx) => {
                const isActive = idx === currentTimeIndex;
                const isPast = idx < currentTimeIndex;
                const avgCongestion = predictions.reduce(
                  (sum, p) => sum + p.predictions[idx]?.congestionIndex || 0,
                  0
                ) / predictions.length;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSliderChange(idx);
                      setSelectedPredictionPoint(selectedPredictionPoint === idx ? null : idx);
                    }}
                    className="flex flex-col items-center group relative"
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full transition-all duration-300 border-2",
                        isActive
                          ? "bg-cyan-400 border-cyan-300 scale-125 shadow-cyber animate-pulse"
                          : isPast
                          ? "bg-cyan-600 border-cyan-500"
                          : `${getCongestionColor(avgCongestion)} border-cyber-bg`
                      )}
                      style={{
                        opacity: isActive || isPast ? 1 : getCongestionOpacity(avgCongestion),
                      }}
                    />

                    {idx % 2 === 0 && (
                      <span className={cn(
                        "text-xs font-mono mt-2 transition-colors",
                        isActive ? "text-cyan-300" : "text-cyan-600"
                      )}>
                        {formatTime(time)}
                      </span>
                    )}

                    {idx % 2 !== 0 && <div className="h-4 mt-2" />}

                    {selectedPredictionPoint === idx && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-cyber-panel border border-cyan-500/50 rounded p-2 min-w-[200px] shadow-cyber z-30">
                        <div className="text-xs text-cyan-400 mb-2 font-medium">
                          {formatTime(time)} 拥堵预测
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {predictions.slice(0, 5).map((pred) => (
                            <div
                              key={pred.roadId}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-cyan-300 truncate w-24">
                                {pred.roadName}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      getCongestionColor(pred.predictions[idx]?.congestionIndex || 0)
                                    )}
                                    style={{
                                      width: `${((pred.predictions[idx]?.congestionIndex || 0) * 100).toFixed(0)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-cyan-400 font-mono w-8">
                                  {((pred.predictions[idx]?.congestionIndex || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyber-panel border-r border-b border-cyan-500/50 rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
              style={{
                width: `${(currentTimeIndex / (timePoints.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-cyan-500/70">畅通 {'<'}40%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-cyan-500/70">缓行 40%-70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-cyan-500/70">拥堵 {'>'}70%</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 m-1 rounded" />
    </div>
  );
}
