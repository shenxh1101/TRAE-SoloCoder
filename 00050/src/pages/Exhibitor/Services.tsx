import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Zap,
  Wifi,
  Sparkles,
  Shield,
  Truck,
  Clock,
  Star,
  CheckCircle,
  Send,
  User,
  Award,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useServiceStore } from '../../store/useServiceStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatCurrency } from '../../utils/pricing';
import { cn, formatDateTime, getStatusText, getStatusClass } from '../../utils/helpers';
import type { ServiceType } from '../../types';

const serviceTypes: { type: ServiceType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'construction', label: '展位搭建', icon: Wrench, color: 'from-blue-500 to-blue-600' },
  { type: 'electricity', label: '电力服务', icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { type: 'internet', label: '网络服务', icon: Wifi, color: 'from-cyan-500 to-blue-500' },
  { type: 'cleaning', label: '清洁服务', icon: Sparkles, color: 'from-green-500 to-emerald-500' },
  { type: 'security', label: '安保服务', icon: Shield, color: 'from-red-500 to-rose-500' },
  { type: 'logistics', label: '物流服务', icon: Truck, color: 'from-purple-500 to-indigo-500' },
];

export default function Services() {
  const { currentUser } = useAuthStore();
  const { getBookingsByExhibitor } = useBoothStore();
  const { getOrdersByExhibitor, getProvidersByCategory, createOrder, assignOrder } = useServiceStore();
  const { pushServiceNotification } = useNotificationStore();

  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedBooth, setSelectedBooth] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const bookings = currentUser ? getBookingsByExhibitor(currentUser.id) : [];
  const approvedBookings = bookings.filter((b) => b.status === 'approved');
  const serviceOrders = currentUser ? getOrdersByExhibitor(currentUser.id) : [];

  const recommendedProviders = useMemo(() => {
    if (!selectedType) return [];
    const providers = getProvidersByCategory(selectedType);
    const creditLevel = currentUser?.creditLevel || 1;
    const filtered = providers.filter((p) => {
      if (creditLevel >= 4) return true;
      if (creditLevel >= 3) return p.rating >= 4.5;
      return p.rating >= 4.7;
    });
    return filtered.sort((a, b) => {
      const scoreA = a.rating * 0.4 + (100 / a.responseTime) * 0.3 + (a.completedOrders / 100) * 0.3;
      const scoreB = b.rating * 0.4 + (100 / b.responseTime) * 0.3 + (b.completedOrders / 100) * 0.3;
      return scoreB - scoreA;
    });
  }, [selectedType, getProvidersByCategory, currentUser]);

  const handleSubmit = () => {
    if (!currentUser || !selectedType || !description || !scheduledTime || !selectedBooth) return;

    const newOrder = createOrder({
      exhibitorId: currentUser.id,
      serviceType: selectedType,
      description,
      scheduledTime,
      price: 0,
      exhibitorCreditLevel: currentUser.creditLevel || 1,
      boothCode: selectedBooth,
    });

    if (recommendedProviders.length > 0) {
      assignOrder(newOrder.id, recommendedProviders[0].id);
    }

    pushServiceNotification(
      currentUser.id,
      newOrder.id,
      '服务申请提交成功',
      `您的${serviceTypes.find((s) => s.type === selectedType)?.label}申请已提交，系统正在为您匹配合适的服务商。`
    );

    setShowSuccess(true);
    setSelectedType(null);
    setDescription('');
    setScheduledTime('');
    setSelectedBooth('');
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const creditLevel = currentUser?.creditLevel || 0;

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="服务申请"
        subtitle="申请各类展会服务，让您的参展更省心"
        icon={<Wrench className="w-7 h-7" />}
      />

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">您的信用等级</p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          i < creditLevel ? 'text-warning-400 fill-warning-400' : 'text-dark-500'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-warning-400 font-medium">Lv.{creditLevel}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-dark-300">
              {creditLevel >= 4 ? (
                <span className="text-success-400">您可以选择所有优质服务商</span>
              ) : creditLevel >= 3 ? (
                <span>您可以选择评分4.5以上的服务商</span>
              ) : (
                <span>提升信用等级可解锁更多优质服务商</span>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="glass-card p-6 glass-card-hover">
              <h3 className="text-lg font-semibold text-white mb-4">选择服务类型</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {serviceTypes.map((service, index) => (
                  <motion.button
                    key={service.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedType(service.type)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-4 rounded-xl border transition-all duration-300 text-left',
                      selectedType === service.type
                        ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                        : 'border-white/10 bg-white/5 hover:border-primary-500/30 hover:bg-white/10'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br', service.color)}>
                      <service.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-medium">{service.label}</p>
                    {selectedType === service.type && (
                      <div className="mt-2 flex items-center gap-1 text-primary-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>已选择</span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 glass-card-hover">
              <h3 className="text-lg font-semibold text-white mb-4">服务详情</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">选择展位</label>
                    <select
                      value={selectedBooth}
                      onChange={(e) => setSelectedBooth(e.target.value)}
                      className="input-field"
                    >
                      <option value="">请选择展位</option>
                      {approvedBookings.map((booking) => (
                        <option key={booking.id} value={booking.boothCode}>
                          {booking.hallName} - {booking.boothCode}
                        </option>
                      ))}
                      {approvedBookings.length === 0 && (
                        <option value="" disabled>暂无可用展位，请先预订</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">服务时间</label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">服务描述</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="请详细描述您的服务需求..."
                    rows={4}
                    className="input-field resize-none"
                  />
                </div>
              </div>
            </div>

            {selectedType && recommendedProviders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 glass-card-hover"
              >
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-white">推荐服务商</h3>
                  <span className="text-sm text-dark-400">按综合评分排序</span>
                </div>
                <div className="space-y-3">
                  {recommendedProviders.map((provider, index) => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        'p-4 rounded-xl border transition-all duration-300 cursor-pointer',
                        index === 0
                          ? 'border-primary-500/50 bg-primary-500/5'
                          : 'border-white/10 bg-white/5 hover:border-primary-500/30 hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl flex items-center justify-center">
                            <User className="w-6 h-6 text-primary-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold">{provider.name}</p>
                              {index === 0 && (
                                <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                                  最佳匹配
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-warning-400 fill-warning-400" />
                                <span className="text-white">{provider.rating}</span>
                              </div>
                              <div className="flex items-center gap-1 text-dark-400">
                                <Clock className="w-3 h-3" />
                                <span>{provider.responseTime}分钟响应</span>
                              </div>
                              <div className="flex items-center gap-1 text-dark-400">
                                <CheckCircle className="w-3 h-3" />
                                <span>{provider.completedOrders}单</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className={cn('status-badge', provider.status === 'available' ? 'status-approved' : 'status-pending')}>
                          {provider.status === 'available' ? '可接单' : provider.status === 'busy' ? '忙碌中' : '离线'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!selectedType || !description || !scheduledTime || !selectedBooth}
              className={cn(
                'w-full btn-primary flex items-center justify-center gap-2',
                (!selectedType || !description || !scheduledTime || !selectedBooth) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" />
              提交服务申请
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="glass-card p-6 glass-card-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">我的服务订单</h3>
                <span className="text-sm text-dark-400">{serviceOrders.length}条记录</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {serviceOrders.length === 0 ? (
                  <div className="text-center py-8 text-dark-400">
                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无服务订单</p>
                  </div>
                ) : (
                  serviceOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const service = serviceTypes.find((s) => s.type === order.serviceType);
                            const Icon = service?.icon || Wrench;
                            return (
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br', service?.color)}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                            );
                          })()}
                          <span className="text-white font-medium">
                            {serviceTypes.find((s) => s.type === order.serviceType)?.label}
                          </span>
                        </div>
                        <span className={cn('status-badge', getStatusClass(order.status))}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-dark-400">
                          <span>展位</span>
                          <span className="text-white">{order.boothCode}</span>
                        </div>
                        <div className="flex justify-between text-dark-400">
                          <span>服务商</span>
                          <span className="text-white">{order.providerName || '待分配'}</span>
                        </div>
                        <div className="flex justify-between text-dark-400">
                          <span>时间</span>
                          <span className="text-white text-xs">{formatDateTime(order.scheduledTime)}</span>
                        </div>
                        <div className="flex justify-between text-dark-400">
                          <span>费用</span>
                          <span className="text-white font-medium">{formatCurrency(order.price)}</span>
                        </div>
                        {order.progress !== undefined && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-dark-400 text-xs">进度</span>
                              <span className="text-primary-400 text-xs">{order.progress}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${order.progress}%` }}
                                transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-card p-6 flex items-center gap-4 border border-success-500/30 bg-success-500/10"
          >
            <div className="w-12 h-12 bg-success-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">申请提交成功</h4>
              <p className="text-sm text-dark-300">系统正在为您匹配合适的服务商</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
