import { useState, useMemo } from 'react';
import { Search, MapPin, Navigation, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { Intersection, Direction } from '@/types';

interface LeftPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const directionNames: Record<Direction, string> = {
  north: '北',
  south: '南',
  east: '东',
  west: '西',
};

export default function LeftPanel({
  collapsed = false,
  onToggleCollapse,
}: LeftPanelProps) {
  const intersections = useAppStore((state) => state.intersections);
  const selectedIntersection = useAppStore((state) => state.selectedIntersection);
  const setSelectedIntersection = useAppStore((state) => state.setSelectedIntersection);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntersections = useMemo(() => {
    return intersections.filter((intersection) =>
      intersection.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [intersections, searchQuery]);

  const getCongestionColor = (index: number) => {
    if (index < 0.4) return 'text-green-400';
    if (index < 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCongestionBg = (index: number) => {
    if (index < 0.4) return 'bg-green-500/20 border-green-500/30';
    if (index < 0.7) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getSignalStatus = (phase: Direction, remaining: number) => {
    const currentTiming = { green: 30, yellow: 3, red: 67 };
    if (remaining <= currentTiming.yellow) return { color: 'bg-yellow-400', text: '黄灯' };
    if (remaining <= currentTiming.green) return { color: 'bg-green-400', text: '绿灯' };
    return { color: 'bg-red-400', text: '红灯' };
  };

  const getTotalFlow = (intersection: Intersection) => {
    return intersection.trafficFlow.north + intersection.trafficFlow.south +
           intersection.trafficFlow.east + intersection.trafficFlow.west;
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-cyber-panel border-r border-cyber-border flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <MapPin className="w-5 h-5 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-cyber-panel border-r border-cyber-border flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-glow/3 via-transparent to-transparent pointer-events-none" />
      
      <div className="p-4 border-b border-cyber-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold font-display text-cyan-300 tracking-wide">路口监控列表</h2>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
          <input
            type="text"
            placeholder="搜索路口名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded",
              "bg-cyber-bg/50 border border-cyber-border",
              "text-cyan-100 placeholder-cyan-700",
              "focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30",
              "transition-all duration-300",
              "font-mono text-sm"
            )}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <span className="text-xs text-cyan-500/70">共 {filteredIntersections.length} 个路口</span>
          <span className="text-xs text-cyan-500/70">|</span>
          <span className="text-xs text-red-400">拥堵 {filteredIntersections.filter(i => i.congestionIndex >= 0.7).length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {filteredIntersections.map((intersection) => {
          const isSelected = intersection.id === selectedIntersection?.id;
          const totalFlow = getTotalFlow(intersection);
          const signalStatus = getSignalStatus(
            intersection.signalTiming.currentPhase,
            intersection.signalTiming.remainingTime
          );

          return (
            <div
              key={intersection.id}
              onClick={() => setSelectedIntersection(intersection)}
              className={cn(
                "p-3 rounded cursor-pointer relative overflow-hidden",
                "border transition-all duration-300",
                "group",
                isSelected
                  ? "bg-cyan-500/15 border-cyan-500/50 shadow-cyber"
                  : "bg-cyber-bg/30 border-cyber-border hover:border-cyan-500/40 hover:bg-cyber-glow/5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {intersection.congestionIndex >= 0.7 && (
                <div className="absolute top-2 right-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-cyan-200 flex-1 pr-4 leading-tight">
                    {intersection.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className={cn(
                    "px-2 py-1.5 rounded border",
                    getCongestionBg(intersection.congestionIndex)
                  )}>
                    <div className="text-xs text-cyan-500/70 mb-0.5">拥堵指数</div>
                    <div className={cn("text-lg font-bold font-mono", getCongestionColor(intersection.congestionIndex))}>
                      {(intersection.congestionIndex * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="px-2 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10">
                    <div className="text-xs text-cyan-500/70 mb-0.5">流量</div>
                    <div className="text-lg font-bold font-mono text-cyan-300">
                      {totalFlow}
                      <span className="text-xs text-cyan-500/70 ml-1">pcu/h</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full animate-blink",
                      signalStatus.color
                    )} />
                    <span className="text-xs text-cyan-300">
                      {directionNames[intersection.signalTiming.currentPhase]}向 {signalStatus.text}
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      {intersection.signalTiming.remainingTime}s
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIntersection(intersection);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-xs",
                      "border transition-all duration-300",
                      isSelected
                        ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    )}
                  >
                    <Navigation className="w-3 h-3" />
                    定位
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-cyber-border">
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {(['north', 'south', 'east', 'west'] as Direction[]).map((dir) => (
                      <div key={dir} className="text-xs">
                        <div className="text-cyan-600">{directionNames[dir]}</div>
                        <div className={cn(
                          "font-mono",
                          intersection.signalTiming.currentPhase === dir ? 'text-cyan-300' : 'text-cyan-600'
                        )}>
                          {intersection.trafficFlow[dir]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}

        {filteredIntersections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-cyan-500/50">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">未找到匹配的路口</p>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 m-1 rounded" />
    </div>
  );
}
