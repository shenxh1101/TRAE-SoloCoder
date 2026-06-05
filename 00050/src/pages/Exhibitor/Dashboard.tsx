import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Users,
  Target,
  Calendar,
  FileText,
  CreditCard,
  ChevronRight,
  Star,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useServiceStore } from '../../store/useServiceStore';
import { useMonitorStore } from '../../store/useMonitorStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatCurrency } from '../../utils/pricing';
import { cn, formatDate, getStatusText, getStatusClass } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { getBookingsByExhibitor } = useBoothStore();
  const { getOrdersByExhibitor } = useServiceStore();
  const { realtimeData } = useMonitorStore();
  const { getUnreadCount } = useNotificationStore();

  const bookings = currentUser ? getBookingsByExhibitor(currentUser.id) : [];
  const serviceOrders = currentUser ? getOrdersByExhibitor(currentUser.id) : [];
  const pendingServices = serviceOrders.filter(
    (o) => o.status === 'pending' || o.status === 'assigned'
  ).length;
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  const totalVisitors = realtimeData.reduce((sum, d) => sum + d.currentVisitors, 0);
  const bookingCount = bookings.filter((b) => b.status === 'approved').length;

  const quickActions = [
    { label: '立即预订展位', icon: MapPin, color: 'from-blue-500 to-blue-600', path: '/exhibitor/booking' },
    { label: '申请服务', icon: ClipboardList, color: 'from-green-500 to-green-600', path: '/exhibitor/services' },
    { label: '查看合同', icon: FileText, color: 'from-purple-500 to-purple-600', path: '/exhibitor/contracts' },
  ];

  const creditStars = Array.from({ length: 5 }, (_, i) => i < (currentUser?.creditLevel || 0));

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
        title="展商工作台"
        subtitle="管理您的展位预订、服务申请和数据分析"
        icon={<LayoutDashboard className="w-7 h-7" />}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div
          variants={itemVariants}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {currentUser?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  欢迎回来，<span className="gradient-text">{currentUser?.name}</span>
                </h2>
                <p className="text-dark-300 mt-1">{currentUser?.company}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-dark-400">信用等级：</span>
                  <div className="flex">
                    {creditStars.map((filled, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          filled ? 'text-warning-400 fill-warning-400' : 'text-dark-500'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-warning-400">Lv.{currentUser?.creditLevel}</span>
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-xl"
              >
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                <span className="text-primary-400 font-medium">{unreadCount} 条未读消息</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="已预订展位"
            value={bookingCount}
            icon={<MapPin className="w-6 h-6 text-blue-400" />}
            color="blue"
            delay={0.1}
          />
          <StatCard
            title="待处理服务"
            value={pendingServices}
            icon={<ClipboardList className="w-6 h-6 text-green-400" />}
            color="green"
            delay={0.2}
          />
          <StatCard
            title="本月客流量"
            value={totalVisitors.toLocaleString()}
            icon={<Users className="w-6 h-6 text-orange-400" />}
            color="orange"
            trend={{ value: 12.5, isPositive: true }}
            delay={0.3}
          />
          <StatCard
            title="意向客户"
            value={Math.floor(totalVisitors * 0.15)}
            icon={<Target className="w-6 h-6 text-purple-400" />}
            color="purple"
            trend={{ value: 8.3, isPositive: true }}
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 glass-card p-6 glass-card-hover"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">最近预订</h3>
              <button
                onClick={() => navigate('/exhibitor/booking')}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {bookings.slice(0, 3).length === 0 ? (
                <div className="text-center py-8 text-dark-400">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无预订记录</p>
                </div>
              ) : (
                bookings.slice(0, 3).map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => navigate('/exhibitor/booking')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{booking.hallName}</p>
                        <p className="text-sm text-dark-400">
                          展位 {booking.boothCode} · {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(booking.totalPrice)}</p>
                      <span className={cn('status-badge', getStatusClass(booking.status))}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">快捷操作</h3>
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className="w-full glass-card p-4 glass-card-hover flex items-center gap-4 text-left"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
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

        <motion.div
          variants={itemVariants}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">最近服务订单</h3>
            <button
              onClick={() => navigate('/exhibitor/services')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-dark-400 text-sm border-b border-white/10">
                  <th className="pb-3 font-medium">服务类型</th>
                  <th className="pb-3 font-medium">展位</th>
                  <th className="pb-3 font-medium">服务商</th>
                  <th className="pb-3 font-medium">费用</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 font-medium">进度</th>
                </tr>
              </thead>
              <tbody>
                {serviceOrders.slice(0, 3).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-dark-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无服务订单</p>
                    </td>
                  </tr>
                ) : (
                  serviceOrders.slice(0, 3).map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary-400" />
                          <span className="text-white">
                            {order.serviceType === 'construction' && '展位搭建'}
                            {order.serviceType === 'electricity' && '电力服务'}
                            {order.serviceType === 'internet' && '网络服务'}
                            {order.serviceType === 'cleaning' && '清洁服务'}
                            {order.serviceType === 'security' && '安保服务'}
                            {order.serviceType === 'logistics' && '物流服务'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-white">{order.boothCode}</td>
                      <td className="py-4 text-dark-300">{order.providerName || '待分配'}</td>
                      <td className="py-4 text-white font-medium">{formatCurrency(order.price)}</td>
                      <td className="py-4">
                        <span className={cn('status-badge', getStatusClass(order.status))}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="py-4 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${order.progress || 0}%` }}
                              transition={{ delay: 0.8 + index * 0.1, duration: 1 }}
                              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                            />
                          </div>
                          <span className="text-xs text-dark-400 w-10">{order.progress || 0}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary-400" />
              <h4 className="font-semibold text-white">近期展会安排</h4>
            </div>
            <div className="space-y-3">
              {realtimeData.slice(0, 3).map((data, index) => (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{data.hallName}</p>
                    <p className="text-sm text-dark-400">当前客流：{data.currentVisitors}人</p>
                  </div>
                  <span className={cn('status-badge', getStatusClass(data.warningLevel))}>
                    {getStatusText(data.warningLevel)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-warning-400" />
              <h4 className="font-semibold text-white">信用权益</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-white font-medium">优先预订特权</p>
                <p className="text-sm text-dark-400">提前7天开放展位预订通道</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-white font-medium">服务费折扣</p>
                <p className="text-sm text-dark-400">享受9折服务费用优惠</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-primary-500/20 to-transparent rounded-lg border border-primary-500/30">
                <p className="text-white font-medium">升级提示</p>
                <p className="text-sm text-primary-400">再完成2笔订单即可升级到Lv.6</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
