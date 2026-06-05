import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Download, BarChart2, Clock } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { cn } from '@/lib/utils';
import type { Intersection, Direction, SignalTiming, TimingReport } from '@/types';
import { mockTimingReports } from '@/data/mockData';

interface SignalTimingPanelProps {
  intersection?: Intersection;
  onTimingChange?: (intersectionId: string, timing: Record<Direction, SignalTiming>) => void;
  onApplyOptimization?: (report: TimingReport) => void;
}

const directionNames: Record<Direction, string> = {
  north: '北',
  south: '南',
  east: '东',
  west: '西',
};

const directionColors: Record<Direction, string> = {
  north: '#ef4444',
  south: '#22c55e',
  east: '#3b82f6',
  west: '#a855f7',
};

export default function SignalTimingPanel({
  intersection,
  onTimingChange,
  onApplyOptimization,
}: SignalTimingPanelProps) {
  const [isManual, setIsManual] = useState(false);
  const [timing, setTiming] = useState<Record<Direction, SignalTiming>>({
    north: { green: 30, yellow: 3, red: 67 },
    south: { green: 30, yellow: 3, red: 67 },
    east: { green: 37, yellow: 3, red: 60 },
    west: { green: 37, yellow: 3, red: 60 },
  });

  useEffect(() => {
    if (intersection) {
      const { north, south, east, west } = intersection.signalTiming;
      setTiming({ north, south, east, west });
    }
  }, [intersection]);

  const handleTimingChange = (direction: Direction, type: keyof SignalTiming, value: number) => {
    const newTiming = {
      ...timing,
      [direction]: {
        ...timing[direction],
        [type]: value,
      },
    };

    const totalCycle = Object.values(newTiming[direction]).reduce((a, b) => a + b, 0);
    Object.keys(newTiming).forEach((dir) => {
      if (dir !== direction) {
        const otherTotal = Object.values(newTiming[dir as Direction]).reduce((a, b) => a + b, 0);
        if (otherTotal !== totalCycle) {
          const diff = totalCycle - otherTotal;
          newTiming[dir as Direction] = {
            ...newTiming[dir as Direction],
            red: Math.max(0, newTiming[dir as Direction].red + diff),
          };
        }
      }
    });

    setTiming(newTiming);
  };

  const handleApply = () => {
    if (intersection) {
      onTimingChange?.(intersection.id, timing);
    }
  };

  const handleReset = () => {
    if (intersection) {
      const { north, south, east, west } = intersection.signalTiming;
      setTiming({ north, south, east, west });
    }
  };

  const flowChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13, 17, 23, 0.9)',
      borderColor: 'rgba(56, 139, 253, 0.3)',
      textStyle: { color: '#a5f3fc' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
      axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '流量(pcu/h)',
      nameTextStyle: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.3)' } },
      axisLabel: { color: 'rgba(125, 211, 252, 0.7)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(56, 139, 253, 0.1)' } },
    },
    series: [
      {
        name: '北向',
        type: 'bar',
        data: [80, 40, 180, 120, 200, 150, 90],
        itemStyle: { color: '#ef4444', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '南向',
        type: 'bar',
        data: [75, 35, 170, 115, 190, 145, 85],
        itemStyle: { color: '#22c55e', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '东向',
        type: 'bar',
        data: [90, 45, 200, 130, 220, 160, 100],
        itemStyle: { color: '#3b82f6', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '西向',
        type: 'bar',
        data: [85, 42, 190, 125, 210, 155, 95],
        itemStyle: { color: '#a855f7', borderRadius: [2, 2, 0, 0] },
      },
    ],
  };

  const renderQuadrantDiagram = () => {
    const positions = [
      { x: 50, y: 15, dir: 'north' },
      { x: 85, y: 50, dir: 'east' },
      { x: 50, y: 85, dir: 'south' },
      { x: 15, y: 50, dir: 'west' },
    ];

    return (
      <div className="relative w-full aspect-square max-w-[300px] mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(56, 139, 253, 0.3)" strokeWidth="0.5" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(56, 139, 253, 0.3)" strokeWidth="0.5" />

          <rect x="35" y="35" width="30" height="30" fill="rgba(56, 139, 253, 0.1)" stroke="rgba(56, 139, 253, 0.5)" strokeWidth="0.5" rx="2" />

          {positions.map((pos, idx) => {
            const dirTiming = timing[pos.dir as Direction];
            const total = dirTiming.green + dirTiming.yellow + dirTiming.red;
            const greenAngle = (dirTiming.green / total) * 360;
            const yellowAngle = (dirTiming.yellow / total) * 360;
            const redAngle = (dirTiming.red / total) * 360;
            const rotation = idx * 90;

            return (
              <g key={pos.dir} transform={`rotate(${rotation} 50 50)`}>
                <circle cx="50" cy="15" r="12" fill="none" stroke="rgba(56, 139, 253, 0.3)" strokeWidth="1" />
                
                <circle
                  cx="50"
                  cy="15"
                  r="10"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${(greenAngle / 360) * 2 * Math.PI * 10} ${2 * Math.PI * 10}`}
                  strokeDashoffset={0}
                  transform="rotate(-90 50 15)"
                  filter="url(#glow)"
                />
                <circle
                  cx="50"
                  cy="15"
                  r="10"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="3"
                  strokeDasharray={`${(yellowAngle / 360) * 2 * Math.PI * 10} ${2 * Math.PI * 10}`}
                  strokeDashoffset={-(greenAngle / 360) * 2 * Math.PI * 10}
                  transform="rotate(-90 50 15)"
                  filter="url(#glow)"
                />
                <circle
                  cx="50"
                  cy="15"
                  r="10"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray={`${(redAngle / 360) * 2 * Math.PI * 10} ${2 * Math.PI * 10}`}
                  strokeDashoffset={-((greenAngle + yellowAngle) / 360) * 2 * Math.PI * 10}
                  transform="rotate(-90 50 15)"
                  filter="url(#glow)"
                />

                <text
                  x="50"
                  y="17"
                  textAnchor="middle"
                  fill={directionColors[pos.dir as Direction]}
                  fontSize="6"
                  fontWeight="bold"
                >
                  {directionNames[pos.dir as Direction]}
                </text>
              </g>
            );
          })}

          <text x="50" y="52" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
            {intersection?.signalTiming.remainingTime || 0}s
          </text>
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-green-500 rounded" />
            <span className="text-cyan-400/70">绿</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-yellow-500 rounded" />
            <span className="text-cyan-400/70">黄</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-red-500 rounded" />
            <span className="text-cyan-400/70">红</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-300 font-display tracking-wide">信号配时控制</h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-cyan-500/70">
            {isManual ? '手动模式' : '自动模式'}
          </span>
          <button
            onClick={() => setIsManual(!isManual)}
            className="text-cyan-400 transition-colors"
          >
            {isManual ? (
              <ToggleRight className="w-8 h-8 text-green-400" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-cyan-500/50" />
            )}
          </button>
        </div>
      </div>

      {intersection ? (
        <>
          <div className="text-sm text-cyan-400 mb-2">
            当前路口: <span className="text-cyan-200 font-medium">{intersection.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
              <h4 className="text-sm font-medium text-cyan-300 mb-3 text-center">四象限配时图</h4>
              {renderQuadrantDiagram()}
            </div>

            <div className="space-y-3">
              {(['north', 'south', 'east', 'west'] as Direction[]).map((dir) => (
                <div key={dir} className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: directionColors[dir] }}>
                      {directionNames[dir]}向
                    </span>
                    <span className="text-xs font-mono text-cyan-500/70">
                      周期: {timing[dir].green + timing[dir].yellow + timing[dir].red}s
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(['green', 'yellow', 'red'] as const).map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-xs w-8" style={{
                          color: type === 'green' ? '#22c55e' : type === 'yellow' ? '#eab308' : '#ef4444'
                        }}>
                          {type === 'green' ? '绿' : type === 'yellow' ? '黄' : '红'}
                        </span>
                        <input
                          type="range"
                          min={type === 'yellow' ? 2 : 5}
                          max={type === 'yellow' ? 5 : 90}
                          value={timing[dir][type]}
                          onChange={(e) => handleTimingChange(dir, type, parseInt(e.target.value))}
                          disabled={!isManual}
                          className={cn(
                            "flex-1 h-1.5 rounded-full appearance-none cursor-pointer",
                            type === 'green' ? 'accent-green-500' : type === 'yellow' ? 'accent-yellow-500' : 'accent-red-500',
                            !isManual && 'opacity-50 cursor-not-allowed'
                          )}
                          style={{
                            background: `linear-gradient(to right, ${
                              type === 'green' ? '#22c55e' : type === 'yellow' ? '#eab308' : '#ef4444'
                            } 0%, ${
                              type === 'green' ? '#22c55e' : type === 'yellow' ? '#eab308' : '#ef4444'
                            } ${(timing[dir][type] / (type === 'yellow' ? 5 : 90)) * 100}%, rgba(56, 139, 253, 0.2) ${(timing[dir][type] / (type === 'yellow' ? 5 : 90)) * 100}%, rgba(56, 139, 253, 0.2) 100%)`
                          }}
                        />
                        <span className="text-xs font-mono w-8 text-cyan-300">{timing[dir][type]}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={!isManual}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded",
                "border transition-all duration-300",
                isManual
                  ? "bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30"
                  : "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 cursor-not-allowed"
              )}
            >
              <BarChart2 className="w-4 h-4" />
              应用配时
            </button>
            <button
              onClick={handleReset}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 rounded",
                "border border-cyan-500/30 bg-cyan-500/10",
                "text-cyan-300 hover:bg-cyan-500/20",
                "transition-all duration-300"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
          </div>

          <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
            <h4 className="text-sm font-medium text-cyan-300 mb-3">实时流量统计</h4>
            <div className="h-48">
              <ReactECharts option={flowChartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-cyan-300">配时优化方案预览</h4>
              <button className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                <Download className="w-3 h-3" />
                导出方案
              </button>
            </div>
            <div className="space-y-2">
              {mockTimingReports.map((report) => (
                <div
                  key={report.id}
                  className="p-3 rounded border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                  onClick={() => onApplyOptimization?.(report)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-cyan-200">{report.intersectionName}</span>
                    <span className="text-xs text-green-400">预计提升 {report.expectedImprovement}%</span>
                  </div>
                  <div className="text-xs text-cyan-500/70">
                    优化时间: {report.timestamp.toLocaleString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-cyan-500/50">
          <Clock className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">请在左侧选择一个路口查看配时信息</p>
        </div>
      )}
    </div>
  );
}
