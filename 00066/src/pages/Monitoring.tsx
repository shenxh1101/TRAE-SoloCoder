import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Gauge,
  Waves,
  Clock,
  Wifi,
  Loader2
} from 'lucide-react';
import { useMonitoring } from '../hooks/useApi';
import { useTaskApi } from '../hooks/useApi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

export default function Monitoring() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tasks, loading: tasksLoading } = useTaskApi();
  const { metrics, isConnected, error: wsError, connect, disconnect } = useMonitoring(selectedTaskId);

  const [historyData, setHistoryData] = useState<Array<{
    time: string;
    uniformity: number;
    swr: number;
    spl: number;
  }>>([]);

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      const activeTask = tasks.find(t =>
        t.status === 'bem_calculation' || t.status === 'visualization'
      ) || tasks[0];
      setSelectedTaskId(activeTask.id);
    }
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (metrics) {
      setHistoryData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          uniformity: metrics.uniformityScore,
          swr: metrics.standingWaveRatio,
          spl: metrics.maxSplDecibel,
        }];
        return newData.slice(-20);
      });
    }
  }, [metrics]);

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载任务列表...</span>
      </div>
    );
  }

  const isWarning = metrics ? metrics.standingWaveRatio > 2.5 : false;
  const isDanger = metrics ? metrics.maxSplDecibel > 85 : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">实时监控面板</h1>
          <p className="text-gray-400 text-sm">持续追踪声场均匀度、驻波比和声压级安全阈值</p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTaskId || ''}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="px-4 py-2 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-sm 
                     text-white focus:outline-none focus:border-acoustic-cyber"
          >
            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.roomName} ({task.status})
              </option>
            ))}
          </select>

          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            !isConnected ? 'bg-gray-500/20 border border-gray-500' :
            isDanger ? 'bg-acoustic-danger/20 border border-acoustic-danger' :
            isWarning ? 'bg-acoustic-warning/20 border border-acoustic-warning' :
            'bg-acoustic-success/20 border border-acoustic-success'
          }`}>
            {isConnected ? (
              <Wifi className={`w-5 h-5 ${isDanger ? 'text-acoustic-danger animate-pulse-slow' : isWarning ? 'text-acoustic-warning' : 'text-acoustic-success'}`} />
            ) : (
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            )}
            <span className={`font-mono text-sm font-semibold ${!isConnected ? 'text-gray-500' : isDanger ? 'text-acoustic-danger' : isWarning ? 'text-acoustic-warning' : 'text-acoustic-success'}`}>
              {!isConnected ? '连接中...' : isDanger ? '危险' : isWarning ? '警告' : '正常'}
            </span>
          </div>

          <div className="text-sm font-mono text-gray-400 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>实时推送</span>
          </div>
        </div>
      </div>

      {wsError && (
        <div className="glass-card p-3 border-l-4 border-l-acoustic-warning bg-acoustic-warning/10">
          <p className="text-sm text-acoustic-warning">{wsError}</p>
        </div>
      )}

      {!metrics && isConnected && (
        <div className="glass-card p-6 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-acoustic-cyber animate-pulse" />
          <p className="text-gray-400">等待数据流...</p>
        </div>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`glass-card p-6 card-hover-effect ${isDanger ? 'border-acoustic-danger/50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${isDanger ? 'bg-acoustic-danger/20' : 'bg-acoustic-cyber/10'}`}>
                  <Gauge className={`w-6 h-6 ${isDanger ? 'text-acoustic-danger' : 'text-acoustic-cyber'}`} />
                </div>
                {isDanger && (
                  <AlertTriangle className="w-5 h-5 text-acoustic-danger animate-pulse-slow" />
                )}
              </div>

              <p className="text-3xl font-bold data-value mb-1" style={{ color: isDanger ? '#FF3366' : '#00D4FF' }}>
                {metrics.uniformityScore.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400 mb-3">声场均匀度</p>

              <div className="h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    metrics.uniformityScore >= 85 ? 'bg-gradient-to-r from-acoustic-success to-emerald-400' :
                    metrics.uniformityScore >= 80 ? 'bg-gradient-to-r from-acoustic-warning to-orange-400' :
                    'bg-gradient-to-r from-acoustic-danger to-red-400'
                  }`}
                  style={{ width: `${metrics.uniformityScore}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">目标: &gt;85%</p>
            </div>

            <div className={`glass-card p-6 card-hover-effect ${isWarning ? 'border-acoustic-warning/50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${isWarning ? 'bg-acoustic-warning/20' : 'bg-acoustic-neon/10'}`}>
                  <Waves className={`w-6 h-6 ${isWarning ? 'text-acoustic-warning' : 'text-acoustic-neon'}`} />
                </div>
                {isWarning && (
                  <AlertTriangle className="w-5 h-5 text-acoustic-warning" />
                )}
              </div>

              <p className="text-3xl font-bold data-value mb-1" style={{ color: isWarning ? '#FF9800' : '#00FFCC' }}>
                {metrics.standingWaveRatio.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 mb-3">驻波比 (SWR)</p>

              <div className="relative h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
                    metrics.standingWaveRatio <= 2 ? 'bg-gradient-to-r from-acoustic-success to-emerald-400 w-1/3' :
                    metrics.standingWaveRatio <= 3 ? 'bg-gradient-to-r from-acoustic-warning to-orange-400 w-2/3' :
                    'bg-gradient-to-r from-acoustic-danger to-red-400 w-full'
                  }`}
                ></div>
                <div
                  className="absolute top-0 h-full w-0.5 bg-white"
                  style={{ left: '33.33%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">警戒线: SWR &lt; 3</p>
            </div>

            <div className={`glass-card p-6 card-hover-effect ${isDanger ? 'border-acoustic-danger/50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${isDanger ? 'bg-acoustic-danger/20' : 'bg-acoustic-data/10'}`}>
                  <TrendingUp className={`w-6 h-6 ${isDanger ? 'text-acoustic-danger' : 'text-acoustic-data'}`} />
                </div>
                {isDanger && (
                  <AlertTriangle className="w-5 h-5 text-acoustic-danger animate-pulse-slow" />
                )}
              </div>

              <p className="text-3xl font-bold data-value mb-1" style={{ color: isDanger ? '#FF3366' : '#7C3AED' }}>
                {metrics.maxSplDecibel.toFixed(1)}
              </p>
              <p className="text-sm text-gray-400 mb-3">最大声压级 (dBA)</p>

              <div className="h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    metrics.maxSplDecibel <= 80 ? 'bg-gradient-to-r from-acoustic-success to-emerald-400 w-4/5' :
                    metrics.maxSplDecibel <= 85 ? 'bg-gradient-to-r from-acoustic-warning to-orange-400 w-[85%]' :
                    'bg-gradient-to-r from-acoustic-danger to-red-400 w-full'
                  }`}
                  style={{ width: `${(metrics.maxSplDecibel / 100) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">安全阈值: &lt;85 dBA</p>
            </div>

            <div className="glass-card p-6 card-hover-effect">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-pink-500/10">
                  <Activity className="w-6 h-6 text-pink-400" />
                </div>
              </div>

              <p className="text-3xl font-bold data-value mb-1 text-pink-400">
                {metrics.avgSplDecibel.toFixed(1)}
              </p>
              <p className="text-sm text-gray-400 mb-3">平均声压级 (dBA)</p>

              <div className="h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-1000"
                  style={{ width: `${(metrics.avgSplDecibel / 100) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">参考值: 70-80 dBA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Gauge className="w-5 h-5 mr-2 text-acoustic-cyber" />
                声场均匀度趋势
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorUniformity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                  <XAxis dataKey="time" stroke="#718096" fontSize={11} />
                  <YAxis stroke="#718096" fontSize={11} domain={[60, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1B2A',
                      border: '1px solid #2D3748',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                    }}
                  />
                  <ReferenceLine y={85} stroke="#00C853" strokeDasharray="5 5" label="目标线" />
                  <Area
                    type="monotone"
                    dataKey="uniformity"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUniformity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Waves className="w-5 h-5 mr-2 text-acoustic-neon" />
                驻波比监测
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                  <XAxis dataKey="time" stroke="#718096" fontSize={11} />
                  <YAxis stroke="#718096" fontSize={11} domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1B2A',
                      border: '1px solid #2D3748',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                    }}
                  />
                  <ReferenceLine y={3} stroke="#FF9800" strokeDasharray="5 5" label="警戒线" />
                  <ReferenceLine y={5} stroke="#FF3366" strokeDasharray="5 5" label="危险线" />
                  <Line
                    type="monotone"
                    dataKey="swr"
                    stroke="#00FFCC"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-acoustic-data" />
              声压级实时追踪
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="time" stroke="#718096" fontSize={11} />
                <YAxis stroke="#718096" fontSize={11} domain={[60, 95]} unit=" dBA" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #2D3748',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                  }}
                />
                <ReferenceLine y={85} stroke="#FF3366" strokeDasharray="5 5" label={{ value: '听力安全线', fill: '#FF3366', fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="spl"
                  stroke="#7C3AED"
                  strokeWidth={3}
                  dot={{ fill: '#7C3AED', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
