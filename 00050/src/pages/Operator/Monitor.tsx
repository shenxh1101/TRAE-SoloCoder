import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  Pause,
  Play,
  Clock,
  AlertTriangle,
  Thermometer,
  Users,
  Map,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useMonitorStore } from '../../store/useMonitorStore';
import { useBoothStore } from '../../store/useBoothStore';
import { cn, formatDateTime, getStatusText, getStatusClass } from '../../utils/helpers';
import { useEffect, useState, useMemo } from 'react';

const COLORS = ['#165DFF', '#36D399', '#FB923C', '#818CF8', '#F472B6'];

export default function Monitor() {
  const {
    realtimeData,
    lastUpdate,
    autoRefresh,
    toggleAutoRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    getTotalVisitors,
    getWarningHalls,
  } = useMonitorStore();
  const { halls, getBoothsByHall } = useBoothStore();
  const [timeRange, setTimeRange] = useState<'1h' | '2h' | '4h'>('2h');
  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Array<{ time: string; [key: string]: number | string }>>([]);

  useEffect(() => {
    startAutoRefresh();
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    const generateHistoryData = () => {
      const points = 24;
      const data: Array<{ time: string; [key: string]: number | string }> = [];
      const now = new Date();

      for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 5 * 60 * 1000);
        const point: { time: string; [key: string]: number | string } = {
          time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        };
        realtimeData.forEach((hall) => {
          const variation = Math.floor(Math.random() * 800) - 400;
          point[hall.hallName] = Math.max(1000, hall.currentVisitors + variation);
        });
        data.push(point);
      }
      return data;
    };

    setChartData(generateHistoryData());
  }, [realtimeData]);

  const pieData = useMemo(
    () =>
      realtimeData.map((d) => ({
        name: d.hallName,
        value: Math.round(d.boothUtilization * 100),
      })),
    [realtimeData]
  );

  const totalVisitors = getTotalVisitors();
  const warningHalls = getWarningHalls();
  const avgUtilization = ((realtimeData.reduce((s, d) => s + d.boothUtilization, 0) / realtimeData.length) * 100).toFixed(1);

  const getHeatmapColor = (density: number): string => {
    if (density > 0.9) return 'rgba(239, 68, 68, 0.8)';
    if (density > 0.75) return 'rgba(251, 146, 60, 0.8)';
    if (density > 0.6) return 'rgba(250, 204, 21, 0.8)';
    if (density > 0.4) return 'rgba(54, 211, 153, 0.8)';
    return 'rgba(22, 93, 255, 0.6)';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="实时监控中心"
        subtitle="展馆人流量、展位利用率实时监控与预警"
        icon={<Activity className="w-7 h-7" />}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '1h' | '2h' | '4h')}
              className="input-field w-auto py-2 text-sm"
            >
              <option value="1h">最近1小时</option>
              <option value="2h">最近2小时</option>
              <option value="4h">最近4小时</option>
            </select>
            <button
              onClick={toggleAutoRefresh}
              className={cn(
                'btn-secondary flex items-center gap-2 py-2',
                autoRefresh && 'bg-primary-500/20 border-primary-500/30 text-primary-400'
              )}
            >
              {autoRefresh ? (
                <>
                  <Pause className="w-4 h-4" />
                  暂停刷新
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  开始刷新
                </>
              )}
            </button>
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <Clock className="w-4 h-4" />
              {formatDateTime(lastUpdate)}
              {autoRefresh && <RefreshCw className="w-4 h-4 animate-spin text-primary-400" />}
            </div>
          </div>
        }
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="当前总人流量"
            value={
              <AnimatePresence mode="wait">
                <motion.span
                  key={totalVisitors}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="inline-block"
                >
                  {totalVisitors.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            }
            icon={<Users className="w-6 h-6 text-blue-400" />}
            color="blue"
            delay={0.1}
          />
          <StatCard
            title="平均展位利用率"
            value={`${avgUtilization}%`}
            icon={<PieChart className="w-6 h-6 text-green-400" />}
            color="green"
            trend={{ value: 3.2, isPositive: true }}
            delay={0.2}
          />
          <StatCard
            title="预警展馆"
            value={warningHalls.length}
            icon={<AlertTriangle className="w-6 h-6 text-orange-400" />}
            color="orange"
            delay={0.3}
          />
          <StatCard
            title="安全状态"
            value={warningHalls.length > 0 ? '需关注' : '正常'}
            icon={<Thermometer className="w-6 h-6 text-purple-400" />}
            color="purple"
            delay={0.4}
          />
        </div>

        <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">各展馆实时监控</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-dark-400">实时数据流</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {realtimeData.map((data, index) => {
              const hall = halls.find((h) => h.id === data.hallId);
              const percent = ((data.currentVisitors / (hall?.maxCapacity || 1)) * 100).toFixed(1);
              const isWarning = data.warningLevel === 'warning' || data.warningLevel === 'danger';

              return (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    'glass-card p-4 cursor-pointer transition-all',
                    isWarning && 'border-danger-500/50 glow-effect',
                    selectedHall === data.hallId && 'ring-2 ring-primary-500/50'
                  )}
                  onClick={() => setSelectedHall(selectedHall === data.hallId ? null : data.hallId)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-medium text-white">{data.hallName}</p>
                    {isWarning && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <AlertTriangle className="w-4 h-4 text-danger-400" />
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.p
                      key={data.currentVisitors}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      className="text-3xl font-bold text-white font-display mb-2"
                    >
                      {data.currentVisitors.toLocaleString()}
                    </motion.p>
                  </AnimatePresence>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-dark-400">容量占比</span>
                      <span
                        className={cn(
                          isWarning ? 'text-danger-400 font-medium' : 'text-dark-300'
                        )}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8 }}
                        className={cn(
                          'h-full rounded-full',
                          data.warningLevel === 'danger'
                            ? 'bg-gradient-to-r from-danger-500 to-red-400'
                            : data.warningLevel === 'warning'
                            ? 'bg-gradient-to-r from-warning-500 to-orange-400'
                            : 'bg-gradient-to-r from-primary-500 to-cyan-400'
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-dark-400">展位利用率</span>
                      <span className="text-success-400">
                        {(data.boothUtilization * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className={cn('status-badge inline-block mt-1', getStatusClass(data.warningLevel))}>
                      {getStatusText(data.warningLevel)}
                    </span>
                  </div>

                  {hall && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-dark-400">安全阈值：{(hall.safetyThreshold * 100).toFixed(0)}%</p>
                      <p className="text-xs text-dark-400 mt-1">最大容量：{hall.maxCapacity.toLocaleString()}人</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">人流量趋势（最近2小时）</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#86909C" fontSize={12} />
                  <YAxis stroke="#86909C" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 26, 33, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  {realtimeData.map((hall, index) => (
                    <Line
                      key={hall.hallId}
                      type="monotone"
                      dataKey={hall.hallName}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      animationDuration={1000}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">展位利用率分布</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1000}
                    label={({ name, percent }) => `${name.split('·')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 26, 33, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${value}%`, '利用率']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Map className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">人流热力图</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(22, 93, 255, 0.6)' }} />
                <span className="text-xs text-dark-400">稀疏</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(54, 211, 153, 0.8)' }} />
                <span className="text-xs text-dark-400">正常</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 146, 60, 0.8)' }} />
                <span className="text-xs text-dark-400">较密</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
                <span className="text-xs text-dark-400">拥挤</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {halls.map((hall, hallIndex) => {
              const booths = getBoothsByHall(hall.id);
              const realtime = realtimeData.find((d) => d.hallId === hall.id);
              const baseDensity = realtime ? realtime.currentVisitors / (hall.maxCapacity || 1) : 0.5;

              return (
                <div key={hall.id} className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm font-medium text-white mb-3">{hall.name}</p>
                  <svg viewBox="0 0 200 150" className="w-full h-auto">
                    <rect x="0" y="0" width="200" height="150" fill="rgba(255,255,255,0.05)" rx="8" />
                    {booths.slice(0, 12).map((booth, i) => {
                      const row = Math.floor(i / 4);
                      const col = i % 4;
                      const density = Math.min(1, Math.max(0, baseDensity + (Math.random() - 0.5) * 0.4));
                      return (
                        <motion.rect
                          key={booth.id}
                          x={col * 45 + 15}
                          y={row * 45 + 15}
                          width={35}
                          height={35}
                          rx={4}
                          fill={getHeatmapColor(density)}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: hallIndex * 0.1 + i * 0.05 }}
                        />
                      );
                    })}
                  </svg>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
