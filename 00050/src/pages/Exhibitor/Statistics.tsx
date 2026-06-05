import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Target,
  TrendingUp,
  Calendar,
  Download,
  LineChart,
  Gauge,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useMonitorStore } from '../../store/useMonitorStore';
import { cn, formatDate } from '../../utils/helpers';

const timeRanges = [
  { label: '最近7天', value: '7d' },
  { label: '最近30天', value: '30d' },
  { label: '最近90天', value: '90d' },
];

export default function Statistics() {
  const { visitorStatistics } = useMonitorStore();

  const [timeRange, setTimeRange] = useState('7d');
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);

  const statisticsData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = visitorStatistics.find((s) => s.date === dateStr);
      data.push({
        date: dateStr,
        dateLabel: formatDate(dateStr, 'MM/dd'),
        visitors: stat?.visitorCount || Math.floor(100 + Math.random() * 250),
        intentions: stat?.intentionCount || Math.floor(15 + Math.random() * 50),
        effectScore: stat?.effectScore || Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
      });
    }
    return data;
  }, [timeRange, visitorStatistics]);

  const totalVisitors = statisticsData.reduce((sum, d) => sum + d.visitors, 0);
  const totalIntentions = statisticsData.reduce((sum, d) => sum + d.intentions, 0);
  const avgEffectScore = statisticsData.reduce((sum, d) => sum + d.effectScore, 0) / statisticsData.length;
  const conversionRate = totalVisitors > 0 ? Math.round((totalIntentions / totalVisitors) * 10000) / 100 : 0;

  const radarData = [
    { subject: '客流量', A: Math.min(100, (totalVisitors / (statisticsData.length * 300)) * 100), fullMark: 100 },
    { subject: '意向客户', A: Math.min(100, (totalIntentions / (statisticsData.length * 60)) * 100), fullMark: 100 },
    { subject: '转化率', A: conversionRate * 2, fullMark: 100 },
    { subject: '效果评分', A: avgEffectScore * 100, fullMark: 100 },
    { subject: '展位热度', A: 78, fullMark: 100 },
    { subject: '品牌曝光', A: 85, fullMark: 100 },
  ];

  const handleExport = () => {
    const csvContent = [
      ['日期', '客流量', '意向客户', '效果评分', '转化率(%)'].join(','),
      ...statisticsData.map((d) => [
        d.date,
        d.visitors,
        d.intentions,
        d.effectScore,
        Math.round((d.intentions / d.visitors) * 10000) / 100,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `参展数据_${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRangeLabel = timeRanges.find((r) => r.value === timeRange)?.label || '最近7天';

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="数据统计"
        subtitle="全面分析您的参展效果和客户数据"
        icon={<BarChart3 className="w-7 h-7" />}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                className="btn-secondary flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {selectedRangeLabel}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showRangeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-40 glass-card p-2 z-20"
                >
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => {
                        setTimeRange(range.value);
                        setShowRangeDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left rounded-lg transition-colors',
                        timeRange === range.value
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'text-white hover:bg-white/10'
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <button onClick={handleExport} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出数据
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总客流量"
            value={totalVisitors.toLocaleString()}
            icon={<Users className="w-6 h-6 text-blue-400" />}
            color="blue"
            trend={{ value: 15.3, isPositive: true }}
            delay={0.1}
          />
          <StatCard
            title="总意向客户"
            value={totalIntentions.toLocaleString()}
            icon={<Target className="w-6 h-6 text-green-400" />}
            color="green"
            trend={{ value: 8.7, isPositive: true }}
            delay={0.2}
          />
          <StatCard
            title="平均效果评分"
            value={`${Math.round(avgEffectScore * 100)}分`}
            icon={<Gauge className="w-6 h-6 text-orange-400" />}
            color="orange"
            delay={0.3}
          />
          <StatCard
            title="转化率"
            value={`${conversionRate}%`}
            icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
            color="purple"
            trend={{ value: 5.2, isPositive: true }}
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass-card p-6 glass-card-hover"
          >
            <div className="flex items-center gap-3 mb-6">
              <LineChart className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">客流量趋势</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statisticsData}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#165DFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#165DFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="dateLabel" stroke="#86909C" fontSize={12} />
                  <YAxis stroke="#86909C" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(13, 16, 22, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#165DFF"
                    strokeWidth={2}
                    fill="url(#colorVisitors)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6 glass-card-hover"
          >
            <div className="flex items-center gap-3 mb-6">
              <Gauge className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">参展效果评分</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#86909C', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#86909C', fontSize: 10 }} />
                  <Radar
                    name="评分"
                    dataKey="A"
                    stroke="#165DFF"
                    fill="#165DFF"
                    fillOpacity={0.3}
                    animationDuration={1500}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">意向客户统计</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statisticsData}>
                <defs>
                  <linearGradient id="colorIntentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="dateLabel" stroke="#86909C" fontSize={12} />
                <YAxis stroke="#86909C" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(13, 16, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar
                  dataKey="intentions"
                  name="意向客户"
                  fill="url(#colorIntentions)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">每日详细数据</h3>
            </div>
            <span className="text-sm text-dark-400">共 {statisticsData.length} 条记录</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-dark-400 text-sm border-b border-white/10">
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">客流量</th>
                  <th className="pb-3 font-medium">意向客户</th>
                  <th className="pb-3 font-medium">效果评分</th>
                  <th className="pb-3 font-medium">转化率</th>
                  <th className="pb-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {statisticsData.slice().reverse().map((data, index) => {
                  const dailyConversion = data.visitors > 0
                    ? Math.round((data.intentions / data.visitors) * 10000) / 100
                    : 0;
                  const isAboveAvg = data.visitors > totalVisitors / statisticsData.length;

                  return (
                    <motion.tr
                      key={data.date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 text-white">{data.date}</td>
                      <td className="py-4 text-white font-medium">{data.visitors.toLocaleString()}</td>
                      <td className="py-4 text-white">{data.intentions.toLocaleString()}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${data.effectScore * 100}%` }}
                              transition={{ delay: 1 + index * 0.05, duration: 1 }}
                              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                            />
                          </div>
                          <span className="text-primary-400 text-sm">{Math.round(data.effectScore * 100)}分</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          'font-medium',
                          dailyConversion >= conversionRate ? 'text-success-400' : 'text-warning-400'
                        )}>
                          {dailyConversion}%
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          'status-badge',
                          isAboveAvg ? 'status-approved' : 'status-pending'
                        )}>
                          {isAboveAvg ? '高于平均' : '低于平均'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="glass-card p-6 glass-card-hover">
            <h4 className="text-white font-semibold mb-4">热门时段分析</h4>
            <div className="space-y-3">
              {[{ time: '10:00-11:00', percent: 85 }, { time: '14:00-15:00', percent: 78 }, { time: '11:00-12:00', percent: 72 }].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-300">{item.time}</span>
                    <span className="text-white">{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 1 + i * 0.1, duration: 1 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 glass-card-hover">
            <h4 className="text-white font-semibold mb-4">客户行业分布</h4>
            <div className="space-y-3">
              {[{ industry: '科技行业', percent: 45, color: 'from-blue-500 to-blue-400' }, { industry: '制造业', percent: 30, color: 'from-green-500 to-green-400' }, { industry: '其他', percent: 25, color: 'from-purple-500 to-purple-400' }].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-300">{item.industry}</span>
                    <span className="text-white">{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 1 + i * 0.1, duration: 1 }}
                      className={cn('h-full bg-gradient-to-r rounded-full', item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 glass-card-hover">
            <h4 className="text-white font-semibold mb-4">参展效果摘要</h4>
            <div className="space-y-3">
              <div className="p-3 bg-success-500/10 rounded-lg border border-success-500/20">
                <p className="text-success-400 text-sm font-medium">✓ 客流量稳步增长</p>
                <p className="text-dark-400 text-xs mt-1">较上周增长 15.3%</p>
              </div>
              <div className="p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <p className="text-primary-400 text-sm font-medium">✓ 转化率表现优秀</p>
                <p className="text-dark-400 text-xs mt-1">高于行业平均水平 3.2%</p>
              </div>
              <div className="p-3 bg-warning-500/10 rounded-lg border border-warning-500/20">
                <p className="text-warning-400 text-sm font-medium">⚠ 下午时段可优化</p>
                <p className="text-dark-400 text-xs mt-1">建议增加互动活动吸引客流</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
