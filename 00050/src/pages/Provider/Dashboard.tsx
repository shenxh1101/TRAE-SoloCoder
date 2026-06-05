import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  DollarSign,
  ListTodo,
  Calendar,
  ArrowRight,
  Star,
  Bell,
  MapPin,
  User,
  Briefcase,
  Settings,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useServiceStore } from '../../store/useServiceStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  formatDate,
  getStatusText,
  getStatusClass,
  cn,
} from '../../utils/helpers';
import type { ServiceOrder } from '../../types';

const orderTrendData = [
  { date: '周一', orders: 4 },
  { date: '周二', orders: 6 },
  { date: '周三', orders: 3 },
  { date: '周四', orders: 8 },
  { date: '周五', orders: 5 },
  { date: '周六', orders: 7 },
  { date: '周日', orders: 4 },
];

const ratingDistribution = [
  { stars: '5星', count: 45 },
  { stars: '4星', count: 28 },
  { stars: '3星', count: 12 },
  { stars: '2星', count: 3 },
  { stars: '1星', count: 1 },
];

const todaySchedule = [
  { time: '09:00', title: '展位搭建服务', location: '1号馆 A001', status: 'locked' },
  { time: '14:00', title: '电力安装服务', location: '1号馆 A001', status: 'locked' },
  { time: '16:30', title: '网络调试', location: '3号馆 B012', status: 'pending' },
];

const PROVIDER_ID = 'provider-1';

export default function Dashboard() {
  const { orders, getOrdersByProvider, acceptOrder } = useServiceStore();
  const { getUnreadCount, pushServiceNotification } = useNotificationStore();
  const [providerOrders, setProviderOrders] = useState<ServiceOrder[]>([]);
  const [showAcceptAnimation, setShowAcceptAnimation] = useState<string | null>(null);

  useEffect(() => {
    const allOrders = getOrdersByProvider(PROVIDER_ID);
    const assignedOrders = orders.filter((o) => o.status === 'assigned' && o.providerId === PROVIDER_ID);
    setProviderOrders([...allOrders, ...assignedOrders]);
  }, [orders, getOrdersByProvider]);

  const pendingOrders = providerOrders.filter((o) => o.status === 'assigned' || o.status === 'pending');
  const inProgressOrders = providerOrders.filter((o) => o.status === 'accepted' || o.status === 'in_progress');
  const completedOrders = providerOrders.filter((o) => o.status === 'completed');
  const monthlyIncome = completedOrders.reduce((sum, o) => sum + o.price, 0);
  const unreadCount = getUnreadCount(PROVIDER_ID);

  const handleAcceptOrder = (orderId: string) => {
    setShowAcceptAnimation(orderId);
    setTimeout(() => {
      acceptOrder(orderId);
      pushServiceNotification(PROVIDER_ID, orderId, '订单已接单', '您已成功接单，请按时提供服务。');
      setShowAcceptAnimation(null);
    }, 800);
  };

  const providerInfo = {
    name: '孙经理',
    company: '专业搭建服务公司',
    serviceTypes: ['展位搭建', '物流运输'],
    rating: 4.8,
  };

  return (
    <div className="p-6">
      <PageHeader
        title="服务商工作台"
        subtitle={`欢迎回来，${providerInfo.name}`}
        icon={<LayoutDashboard className="w-7 h-7" />}
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-3 glass-card glass-card-hover"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full text-xs text-white flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 glass-card glass-card-hover"
            >
              <Settings className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{providerInfo.company}</h2>
              <p className="text-dark-300 mt-1">
                <span className="gradient-text font-medium">{providerInfo.name}</span> · 服务商
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < Math.floor(providerInfo.rating) ? 'text-warning-400 fill-warning-400' : 'text-dark-400'
                      )}
                    />
                  ))}
                  <span className="text-warning-400 ml-1 font-medium">{providerInfo.rating}</span>
                </div>
                <span className="text-dark-400">|</span>
                <span className="text-dark-300 text-sm">
                  服务类型：{providerInfo.serviceTypes.join('、')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-success-500/20 rounded-xl">
              <span className="text-success-400 text-sm font-medium">在线服务中</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="待接单"
          value={pendingOrders.length}
          icon={<Clock className="w-6 h-6 text-orange-400" />}
          color="orange"
          delay={0.2}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="进行中"
          value={inProgressOrders.length}
          icon={<ListTodo className="w-6 h-6 text-blue-400" />}
          color="blue"
          delay={0.3}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="已完成"
          value={completedOrders.length}
          icon={<CheckCircle2 className="w-6 h-6 text-green-400" />}
          color="green"
          delay={0.4}
          trend={{ value: 22, isPositive: true }}
        />
        <StatCard
          title="本月收入"
          value={`¥${monthlyIncome.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6 text-purple-400" />}
          color="purple"
          delay={0.5}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">最近7天完成订单数</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={orderTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#165DFF"
                strokeWidth={3}
                dot={{ fill: '#165DFF', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#165DFF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">服务评分分布</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ratingDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis dataKey="stars" type="category" stroke="#9CA3AF" fontSize={12} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">待处理订单</h3>
            <button className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1 transition-colors">
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingOrders.slice(0, 5).map((order, index) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{order.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-dark-400 text-sm">订单号：{order.id}</span>
                        <span className="text-dark-400 text-sm">
                          展位：{order.boothCode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-primary-400 font-bold">¥{order.price.toLocaleString()}</p>
                      <p className="text-dark-400 text-sm">{formatDate(order.scheduledTime)}</p>
                    </div>
                    <AnimatePresence mode="wait">
                      {showAcceptAnimation === order.id ? (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="w-10 h-10 border-2 border-success-500 border-t-transparent rounded-full animate-spin"
                        />
                      ) : (
                        <motion.button
                          key="button"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAcceptOrder(order.id)}
                          className="btn-success py-2 px-4 text-sm"
                        >
                          立即接单
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {pendingOrders.length === 0 && (
              <div className="text-center py-8 text-dark-400">
                暂无待处理订单
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">今日日程</h3>
            <div className="flex items-center gap-1 text-primary-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(new Date())}</span>
            </div>
          </div>
          <div className="space-y-4">
            {todaySchedule.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="relative pl-6 pb-4 border-l-2 border-primary-500/30 last:border-l-0 last:pb-0"
              >
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 border-4 border-dark-800" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary-400 font-mono font-medium">{item.time}</span>
                  <span className={cn('status-badge', getStatusClass(item.status))}>
                    {getStatusText(item.status)}
                  </span>
                </div>
                <p className="text-white font-medium">{item.title}</p>
                <div className="flex items-center gap-1 mt-1 text-dark-400 text-sm">
                  <MapPin className="w-3 h-3" />
                  <span>{item.location}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
            <h4 className="text-sm font-medium text-dark-300">快捷操作</h4>
            <div className="grid grid-cols-1 gap-2">
              <motion.button
                whileHover={{ x: 5 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span className="text-white text-sm">查看全部订单</span>
                <ArrowRight className="w-4 h-4 text-primary-400" />
              </motion.button>
              <motion.button
                whileHover={{ x: 5 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span className="text-white text-sm">查看工单</span>
                <ArrowRight className="w-4 h-4 text-primary-400" />
              </motion.button>
              <motion.button
                whileHover={{ x: 5 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span className="text-white text-sm">更新服务信息</span>
                <ArrowRight className="w-4 h-4 text-primary-400" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
