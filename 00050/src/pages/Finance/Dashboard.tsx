import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import {
  LayoutDashboard, DollarSign, Store, Users, TrendingUp,
  FileText, Download, Plus, Calendar, Clock
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const mockHallData = [
  { name: '1号馆', booth: 1280000, service: 420000, total: 1700000 },
  { name: '2号馆', booth: 1150000, service: 380000, total: 1530000 },
  { name: '3号馆', booth: 1420000, service: 450000, total: 1870000 },
  { name: '4号馆', booth: 980000, service: 320000, total: 1300000 },
  { name: '5号馆', booth: 760000, service: 280000, total: 1040000 },
];

const mockTrendData = [
  { month: '1月', booth: 4800000, service: 1500000 },
  { month: '2月', booth: 5200000, service: 1650000 },
  { month: '3月', booth: 4600000, service: 1400000 },
  { month: '4月', booth: 5800000, service: 1850000 },
  { month: '5月', booth: 5500000, service: 1750000 },
  { month: '6月', booth: 6200000, service: 1950000 },
];

const mockTodayIncome = [
  { source: '展位预订', amount: 156800, time: '09:30' },
  { source: '服务订单', amount: 42500, time: '10:15' },
  { source: '展位预订', amount: 289000, time: '11:20' },
  { source: '服务费', amount: 18600, time: '14:05' },
  { source: '展位预订', amount: 198000, time: '15:30' },
];

const mockRecentReports = [
  { id: '1', name: '5月财务月报', type: 'monthly', date: '2026-05-31', status: 'approved' },
  { id: '2', name: 'Q1季度报表', type: 'quarterly', date: '2026-04-01', status: 'approved' },
  { id: '3', name: '4月财务月报', type: 'monthly', date: '2026-04-30', status: 'approved' },
  { id: '4', name: '2025年度报表', type: 'annual', date: '2026-01-15', status: 'approved' },
  { id: '5', name: '3月财务月报', type: 'monthly', date: '2026-03-31', status: 'approved' },
];

export default function Dashboard() {
  const { currentUser } = useAuthStore();
  const { getTotalBoothIncome, getTotalServiceIncome, getTotalIncome, getAverageUtilization, selectedMonth, selectedYear } = useFinanceStore();
  const { getUnreadCount } = useNotificationStore();

  const totalIncome = getTotalIncome(selectedMonth, selectedYear);
  const boothIncome = getTotalBoothIncome(selectedMonth, selectedYear);
  const serviceIncome = getTotalServiceIncome(selectedMonth, selectedYear);
  const avgUtilization = getAverageUtilization(selectedMonth, selectedYear);
  const unreadCount = getUnreadCount('finance-1');

  const getReportTypeText = (type: string) => {
    const map: Record<string, string> = { monthly: '月报', quarterly: '季报', annual: '年报' };
    return map[type] || type;
  };

  return (
    <div className="p-8">
      <PageHeader
        title="财务工作台"
        subtitle={`欢迎回来，${currentUser?.name || '财务专员'}，今天是 ${formatDate(new Date(), 'yyyy年MM月dd日')}`}
        icon={<LayoutDashboard className="w-7 h-7" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="本月总收入"
          value={formatCurrency(totalIncome)}
          icon={<DollarSign className="w-6 h-6" />}
          trend={{ value: 12.5, isPositive: true }}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="展位收入"
          value={formatCurrency(boothIncome)}
          icon={<Store className="w-6 h-6" />}
          trend={{ value: 8.3, isPositive: true }}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="服务费收入"
          value={formatCurrency(serviceIncome)}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 15.7, isPositive: true }}
          color="purple"
          delay={0.3}
        />
        <StatCard
          title="总利用率"
          value={`${(avgUtilization * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: 5.2, isPositive: true }}
          color="orange"
          delay={0.4}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          生成月报
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-secondary flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          查看详细收入
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          导出报表
        </motion.button>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto px-4 py-2 bg-warning-500/20 text-warning-400 rounded-xl flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-warning-400 rounded-full animate-pulse" />
            {unreadCount} 条未读通知
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-400" />
            各展馆收入对比
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockHallData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #333', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="booth" name="展位收入" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="service" name="服务费收入" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            近6个月收入趋势
          </h3>
          <ResponsiveContainer width="100%" height={300}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            今日收入明细
          </h3>
          <div className="space-y-3">
            {mockTodayIncome.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{item.source}</p>
                    <p className="text-dark-400 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
                <span className="text-success-400 font-semibold">+{formatCurrency(item.amount)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card glass-card-hover p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            最近报表记录
          </h3>
          <div className="space-y-3">
            {mockRecentReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{report.name}</p>
                    <p className="text-dark-400 text-sm">{formatDate(report.date)} · {getReportTypeText(report.type)}</p>
                  </div>
                </div>
                <span className={cn('status-badge', 'status-approved')}>已完成</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
