import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Eye,
  Bell,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useMonitorStore } from '../../store/useMonitorStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { cn, formatDate, getStatusText, getStatusClass } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { bookings, getHallById } = useBoothStore();
  const { realtimeData, getTotalVisitors, getAverageUtilization } = useMonitorStore();
  const { getUnreadCount } = useNotificationStore();
  const [animateKey, setAnimateKey] = useState(0);

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const unreadWarnings = currentUser ? getUnreadCount(currentUser.id) : 0;
  const totalVisitors = getTotalVisitors();
  const avgUtilization = (getAverageUtilization() * 100).toFixed(1);

  useEffect(() => {
    const interval = setInterval(() => setAnimateKey((k) => k + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { label: '实时监控', icon: Activity, color: 'from-blue-500 to-cyan-600', path: '/operator/monitor' },
    { label: '审核预订', icon: ClipboardList, color: 'from-green-500 to-emerald-600', path: '/operator/reviews' },
    { label: '查看预警', icon: AlertTriangle, color: 'from-orange-500 to-red-600', path: '/operator/warnings' },
  ];

  const todoItems = [
    { id: 1, title: '审核3号馆3001展位预订', type: '审核', priority: 'high' },
    { id: 2, title: '处理1号馆人流超限预警', type: '预警', priority: 'high' },
    { id: 3, title: '巡检2号馆设备运行状态', type: '巡检', priority: 'medium' },
    { id: 4, title: '审核4号馆4001展位预订', type: '审核', priority: 'medium' },
    { id: 5, title: '确认5号馆清洁服务完成', type: '巡检', priority: 'low' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="运营工作台"
        subtitle="实时监控展馆运营状态，高效管理各类事务"
        icon={<LayoutDashboard className="w-7 h-7" />}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {currentUser?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  欢迎回来，<span className="gradient-text">{currentUser?.name}</span>
                </h2>
                <p className="text-dark-300 mt-1">智慧会展中心 · 运营管理部</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-xl">
              <Zap className="w-5 h-5 text-primary-400" />
              <span className="text-primary-400 font-medium">系统运行正常</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="今日人流量"
            value={
              <AnimatePresence mode="wait">
                <motion.span
                  key={animateKey + totalVisitors}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="inline-block"
                >
                  {totalVisitors.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            }
            icon={<Users className="w-6 h-6 text-blue-400" />}
            color="blue"
            trend={{ value: 8.2, isPositive: true }}
            delay={0.1}
          />
          <StatCard
            title="展位利用率"
            value={
              <AnimatePresence mode="wait">
                <motion.span
                  key={animateKey + avgUtilization}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="inline-block"
                >
                  {avgUtilization}%
                </motion.span>
              </AnimatePresence>
            }
            icon={<MapPin className="w-6 h-6 text-green-400" />}
            color="green"
            trend={{ value: 5.6, isPositive: true }}
            delay={0.2}
          />
          <StatCard
            title="待审核预订"
            value={pendingBookings}
            icon={<ClipboardList className="w-6 h-6 text-orange-400" />}
            color="orange"
            delay={0.3}
          />
          <StatCard
            title="未处理预警"
            value={unreadWarnings}
            icon={<Bell className="w-6 h-6 text-rose-400" />}
            color="rose"
            delay={0.4}
          />
        </div>

        <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">各展馆实时人流量</h3>
            <span className="text-sm text-dark-400">
              数据更新中 <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse ml-2" />
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {realtimeData.map((data, index) => {
              const hall = getHallById(data.hallId);
              const capacityPercent = ((data.currentVisitors / (hall?.maxCapacity || 1)) * 100).toFixed(1);
              return (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    data.warningLevel === 'danger'
                      ? 'bg-danger-500/10 border-danger-500/30'
                      : data.warningLevel === 'warning'
                      ? 'bg-warning-500/10 border-warning-500/30'
                      : data.warningLevel === 'caution'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <p className="text-sm text-dark-300 mb-1">{data.hallName}</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={data.currentVisitors}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -5, opacity: 0 }}
                      className="text-2xl font-bold text-white font-display"
                    >
                      {data.currentVisitors.toLocaleString()}
                    </motion.p>
                  </AnimatePresence>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-400">容量占比</span>
                      <span
                        className={cn(
                          data.warningLevel === 'danger'
                            ? 'text-danger-400'
                            : data.warningLevel === 'warning'
                            ? 'text-warning-400'
                            : 'text-dark-300'
                        )}
                      >
                        {capacityPercent}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${capacityPercent}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                        className={cn(
                          'h-full rounded-full',
                          data.warningLevel === 'danger'
                            ? 'bg-gradient-to-r from-danger-500 to-red-400'
                            : data.warningLevel === 'warning'
                            ? 'bg-gradient-to-r from-warning-500 to-orange-400'
                            : data.warningLevel === 'caution'
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                            : 'bg-gradient-to-r from-primary-500 to-cyan-400'
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 glass-card-hover">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">今日待办事项</h3>
              <span className="text-sm text-primary-400">{todoItems.length} 项待处理</span>
            </div>
            <div className="space-y-3">
              {todoItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      item.priority === 'high'
                        ? 'bg-danger-400'
                        : item.priority === 'medium'
                        ? 'bg-warning-400'
                        : 'bg-primary-400'
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-sm text-dark-400 mt-0.5">{item.type}</p>
                  </div>
                  <button className="btn-secondary py-2 px-4 text-sm">处理</button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">快捷操作</h3>
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className="w-full glass-card p-4 glass-card-hover flex items-center gap-4 text-left"
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br', action.color)}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{action.label}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-400" />
              </motion.button>
            ))}
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">最近预订审核记录</h3>
            <button
              onClick={() => navigate('/operator/reviews')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {bookings.slice(0, 3).map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{booking.companyName}</p>
                    <p className="text-sm text-dark-400">
                      {booking.hallName} · 展位{booking.boothCode} · {formatDate(booking.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-white">¥{booking.totalPrice.toLocaleString()}</p>
                  <span className={cn('status-badge', getStatusClass(booking.status))}>
                    {getStatusText(booking.status)}
                  </span>
                  {booking.status === 'pending' && (
                    <div className="flex gap-1">
                      <button className="p-2 bg-success-500/20 text-success-400 rounded-lg hover:bg-success-500/30 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-danger-500/20 text-danger-400 rounded-lg hover:bg-danger-500/30 transition-colors">
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
