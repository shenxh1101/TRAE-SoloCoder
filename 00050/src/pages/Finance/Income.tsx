import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, DollarSign, Store, Users, Filter,
  Download, Calendar, ChevronDown, Building2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate, cn, downloadFile } from '../../utils/helpers';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const timeRanges = [
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'thisQuarter', label: '本季度' },
  { key: 'thisYear', label: '本年' },
  { key: 'custom', label: '自定义' },
];

const halls = [
  { id: 'all', name: '全部展馆' },
  { id: 'hall-1', name: '1号馆·科技主题馆' },
  { id: 'hall-2', name: '2号馆·智能制造馆' },
  { id: 'hall-3', name: '3号馆·新能源馆' },
  { id: 'hall-4', name: '4号馆·智慧城市馆' },
  { id: 'hall-5', name: '5号馆·综合服务馆' },
];

const COLORS = ['#3b82f6', '#10b981'];

export default function Income() {
  const [timeRange, setTimeRange] = useState('thisMonth');
  const [selectedHall, setSelectedHall] = useState('all');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showHallDropdown, setShowHallDropdown] = useState(false);

  const { getReportsByMonth, selectedMonth, selectedYear } = useFinanceStore();

  const mockTrendData = useMemo(() => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return months.map((month) => ({
      month,
      booth: 800000 + Math.floor(Math.random() * 800000),
      service: 200000 + Math.floor(Math.random() * 300000),
    }));
  }, []);

  const currentReports = getReportsByMonth(selectedMonth, selectedYear);

  const pieData = useMemo(() => {
    const boothTotal = currentReports.reduce((sum, r) => sum + r.boothIncome, 0);
    const serviceTotal = currentReports.reduce((sum, r) => sum + r.serviceIncome, 0);
    return [
      { name: '展位收入', value: boothTotal },
      { name: '服务费收入', value: serviceTotal },
    ];
  }, [currentReports]);

  const hallDetails = useMemo(() => {
    let filtered = currentReports;
    if (selectedHall !== 'all') {
      filtered = currentReports.filter((r) => r.hallId === selectedHall);
    }
    return filtered;
  }, [currentReports, selectedHall]);

  const totalIncome = hallDetails.reduce((sum, r) => sum + r.totalIncome, 0);
  const totalBooth = hallDetails.reduce((sum, r) => sum + r.boothIncome, 0);
  const totalService = hallDetails.reduce((sum, r) => sum + r.serviceIncome, 0);

  const exportCSV = () => {
    const headers = ['展馆名称', '展位收入', '服务费收入', '总计', '利用率'];
    const rows = hallDetails.map((r) => [
      r.hallName,
      r.boothIncome,
      r.serviceIncome,
      r.totalIncome,
      `${(r.utilizationRate * 100).toFixed(1)}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    downloadFile(csvContent, `收入统计-${formatDate(new Date(), 'yyyyMMdd')}.csv`, 'text/csv');
  };

  return (
    <div className="p-8">
      <PageHeader
        title="收入统计"
        subtitle="多维度查看会展中心收入数据"
        icon={<TrendingUp className="w-7 h-7" />}
        actions={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportCSV}
            className="btn-success flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            导出CSV
          </motion.button>
        }
      />

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            className="btn-secondary flex items-center gap-2 min-w-[140px] justify-between"
          >
            <Calendar className="w-5 h-5" />
            <span>{timeRanges.find((t) => t.key === timeRange)?.label}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showTimeDropdown && 'rotate-180')} />
          </motion.button>
          {showTimeDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 w-full glass-card p-2 z-10"
            >
              {timeRanges.map((range) => (
                <button
                  key={range.key}
                  onClick={() => {
                    setTimeRange(range.key);
                    setShowTimeDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-lg transition-colors',
                    timeRange === range.key
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

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowHallDropdown(!showHallDropdown)}
            className="btn-secondary flex items-center gap-2 min-w-[180px] justify-between"
          >
            <Filter className="w-5 h-5" />
            <span className="truncate">{halls.find((h) => h.id === selectedHall)?.name}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showHallDropdown && 'rotate-180')} />
          </motion.button>
          {showHallDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 w-full glass-card p-2 z-10 max-h-60 overflow-y-auto"
            >
              {halls.map((hall) => (
                <button
                  key={hall.id}
                  onClick={() => {
                    setSelectedHall(hall.id);
                    setShowHallDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-lg transition-colors',
                    selectedHall === hall.id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-white hover:bg-white/10'
                  )}
                >
                  {hall.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="总收入"
          value={formatCurrency(totalIncome)}
          icon={<DollarSign className="w-6 h-6" />}
          trend={{ value: 12.5, isPositive: true }}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="展位收入"
          value={formatCurrency(totalBooth)}
          icon={<Store className="w-6 h-6" />}
          trend={{ value: 8.3, isPositive: true }}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="服务费收入"
          value={formatCurrency(totalService)}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 15.7, isPositive: true }}
          color="purple"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">收入构成</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #333', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-dark-300 text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">收入趋势</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #333', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="booth" name="展位收入" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="service" name="服务费收入" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card glass-card-hover p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-400" />
          各展馆收入详情
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-dark-300 font-medium">展馆名称</th>
                <th className="text-right py-3 px-4 text-dark-300 font-medium">展位收入</th>
                <th className="text-right py-3 px-4 text-dark-300 font-medium">服务费收入</th>
                <th className="text-right py-3 px-4 text-dark-300 font-medium">总计</th>
                <th className="text-right py-3 px-4 text-dark-300 font-medium">利用率</th>
                <th className="text-right py-3 px-4 text-dark-300 font-medium">同比</th>
              </tr>
            </thead>
            <tbody>
              {hallDetails.map((hall, index) => {
                const yoyGrowth = (Math.random() - 0.3) * 30;
                return (
                  <motion.tr
                    key={hall.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-white font-medium">{hall.hallName}</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 text-white">{formatCurrency(hall.boothIncome)}</td>
                    <td className="text-right py-4 px-4 text-white">{formatCurrency(hall.serviceIncome)}</td>
                    <td className="text-right py-4 px-4 text-success-400 font-semibold">{formatCurrency(hall.totalIncome)}</td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${hall.utilizationRate * 100}%` }}
                            transition={{ delay: 0.8 + index * 0.1, duration: 0.8 }}
                            className={cn(
                              'h-full rounded-full',
                              hall.utilizationRate >= 0.85 ? 'bg-success-500' :
                              hall.utilizationRate >= 0.7 ? 'bg-warning-500' : 'bg-danger-500'
                            )}
                          />
                        </div>
                        <span className="text-white">{(hall.utilizationRate * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className={cn(
                        'flex items-center justify-end gap-1',
                        yoyGrowth >= 0 ? 'text-success-400' : 'text-danger-400'
                      )}>
                        {yoyGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>{yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
