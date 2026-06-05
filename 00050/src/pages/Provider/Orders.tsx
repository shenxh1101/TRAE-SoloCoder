import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Check,
  X,
  Play,
  CheckCircle,
  Star,
  Download,
  XCircle,
  MapPin,
  Calendar,
  User,
  Phone,
  Building,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useServiceStore } from '../../store/useServiceStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  formatDate,
  formatDateTime,
  getStatusText,
  getStatusClass,
  cn,
  generateId,
} from '../../utils/helpers';
import type { ServiceOrder, ServiceType } from '../../types';

const PROVIDER_ID = 'provider-1';

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待接单' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const sortOptions = [
  { value: 'time_desc', label: '时间倒序' },
  { value: 'price_high', label: '金额从高到低' },
  { value: 'price_low', label: '金额从低到高' },
];

const serviceTypeMap: Record<ServiceType, string> = {
  construction: '展位搭建',
  electricity: '电力服务',
  internet: '网络服务',
  cleaning: '清洁服务',
  security: '安保服务',
  logistics: '物流服务',
};

const exhibitorNames: Record<string, { name: string; company: string; phone: string; contact: string }> = {
  'exhibitor-1': { name: '张伟', company: '科技创新有限公司', phone: '13800138001', contact: '张经理' },
  'exhibitor-2': { name: '李明', company: '绿色能源集团', phone: '13800138002', contact: '李主管' },
  'exhibitor-3': { name: '王芳', company: '智慧城市科技', phone: '13800138003', contact: '王总监' },
};

interface OrderDetailModalProps {
  order: ServiceOrder;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onStart: () => void;
  onComplete: () => void;
  onDownloadVoucher: () => void;
}

function OrderDetailModal({
  order,
  onClose,
  onAccept,
  onReject,
  onStart,
  onComplete,
  onDownloadVoucher,
}: OrderDetailModalProps) {
  const exhibitor = exhibitorNames[order.exhibitorId] || {
    name: '未知',
    company: '未知公司',
    phone: '未知',
    contact: '未知',
  };

  const canAccept = order.status === 'assigned' || order.status === 'pending';
  const canStart = order.status === 'accepted';
  const canComplete = order.status === 'in_progress';
  const canReview = order.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">订单详情</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">订单编号</p>
              <p className="text-white font-mono text-lg">{order.id}</p>
            </div>
            <span className={cn('status-badge', getStatusClass(order.status))}>
              {getStatusText(order.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <Building className="w-4 h-4" />
                <span>服务类型</span>
              </div>
              <p className="text-white font-medium">{serviceTypeMap[order.serviceType] || order.serviceType}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                <span>订单金额</span>
              </div>
              <p className="text-primary-400 font-bold text-lg">¥{order.price.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                <span>服务地点</span>
              </div>
              <p className="text-white font-medium">展位 {order.boothCode}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span>预约时间</span>
              </div>
              <p className="text-white font-medium">{formatDateTime(order.scheduledTime)}</p>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white font-medium mb-2">服务内容</h4>
            <p className="text-dark-300">{order.description}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white font-medium mb-3">展商信息</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-dark-400" />
                <span className="text-dark-300">联系人：</span>
                <span className="text-white">{exhibitor.contact}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-dark-400" />
                <span className="text-dark-300">公司：</span>
                <span className="text-white">{exhibitor.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-dark-400" />
                <span className="text-dark-300">电话：</span>
                <span className="text-white">{exhibitor.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canAccept && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onReject}
                  className="flex-1 btn-danger"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  拒绝订单
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onAccept}
                  className="flex-1 btn-success"
                >
                  <Check className="w-4 h-4 mr-2" />
                  接受订单
                </motion.button>
              </>
            )}
            {canStart && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStart}
                className="flex-1 btn-primary"
              >
                <Play className="w-4 h-4 mr-2" />
                开始服务
              </motion.button>
            )}
            {canComplete && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onComplete}
                className="flex-1 btn-success"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                完成服务
              </motion.button>
            )}
            {canReview && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onDownloadVoucher}
                  className="flex-1 btn-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载凭证
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 btn-primary"
                >
                  <Star className="w-4 h-4 mr-2" />
                  查看评价
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Orders() {
  const {
    orders,
    getOrdersByProvider,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    completeOrder,
  } = useServiceStore();
  const { pushServiceNotification, addNotification } = useNotificationStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time_desc');
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    let result = getOrdersByProvider(PROVIDER_ID);

    const assignedOrders = orders.filter((o) => o.status === 'assigned' && o.providerId === PROVIDER_ID);
    result = [...result, ...assignedOrders];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter((o) => o.status === 'assigned' || o.status === 'pending');
      } else if (statusFilter === 'in_progress') {
        result = result.filter((o) => o.status === 'accepted' || o.status === 'in_progress');
      } else {
        result = result.filter((o) => o.status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const exhibitor = exhibitorNames[o.exhibitorId];
        return (
          o.id.toLowerCase().includes(query) ||
          exhibitor?.name.toLowerCase().includes(query) ||
          exhibitor?.company.toLowerCase().includes(query)
        );
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'time_desc') {
        return new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime();
      } else if (sortBy === 'price_high') {
        return b.price - a.price;
      } else {
        return a.price - b.price;
      }
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy, getOrdersByProvider]);

  const handleAcceptOrder = (orderId: string) => {
    setProcessingOrder(orderId);
    setTimeout(() => {
      acceptOrder(orderId);
      const ticketId = generateId();
      pushServiceNotification(PROVIDER_ID, orderId, '订单已接单', '您已成功接单，工单已生成。');
      addNotification({
        userId: PROVIDER_ID,
        type: 'service',
        title: '工单已生成',
        content: '服务工单已生成，时间已锁定，请准时到场。',
        relatedId: ticketId,
        actionUrl: '/provider/tickets',
      });
      setProcessingOrder(null);
      setSelectedOrder(null);
    }, 800);
  };

  const handleRejectOrder = (orderId: string) => {
    rejectOrder(orderId);
    pushServiceNotification(PROVIDER_ID, orderId, '订单已拒绝', '您已拒绝该订单。');
    setSelectedOrder(null);
  };

  const handleStartService = (orderId: string) => {
    updateOrderStatus(orderId, 'in_progress');
    pushServiceNotification(PROVIDER_ID, orderId, '服务已开始', '您已开始提供服务。');
    setSelectedOrder(null);
  };

  const handleCompleteOrder = (orderId: string) => {
    completeOrder(orderId);
    pushServiceNotification(PROVIDER_ID, orderId, '服务已完成', '恭喜，您已完成该订单服务。');
    setSelectedOrder(null);
  };

  const handleDownloadVoucher = () => {
    pushServiceNotification(PROVIDER_ID, selectedOrder?.id || '', '凭证已生成', '服务凭证已生成，可在通知中心查看。');
    setSelectedOrder(null);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="订单管理"
        subtitle="管理您的服务订单"
        icon={<Package className="w-7 h-7" />}
      />

      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索订单号、展商名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-dark-400" />
            <div className="flex gap-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-xl transition-all',
                    statusFilter === filter.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-dark-300 hover:bg-white/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-dark-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field w-auto"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-dark-400 font-medium">订单编号</th>
                <th className="text-left p-4 text-dark-400 font-medium">展商名称</th>
                <th className="text-left p-4 text-dark-400 font-medium">服务类型</th>
                <th className="text-left p-4 text-dark-400 font-medium">订单金额</th>
                <th className="text-left p-4 text-dark-400 font-medium">下单时间</th>
                <th className="text-left p-4 text-dark-400 font-medium">状态</th>
                <th className="text-right p-4 text-dark-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4">
                    <span className="text-white font-mono text-sm">{order.id}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-white font-medium">{exhibitorNames[order.exhibitorId]?.name || '未知'}</p>
                      <p className="text-dark-400 text-sm">{exhibitorNames[order.exhibitorId]?.company || '未知公司'}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-dark-300">{serviceTypeMap[order.serviceType]}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-primary-400 font-bold">¥{order.price.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-dark-300">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(order.scheduledTime)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn('status-badge', getStatusClass(order.status))}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AnimatePresence mode="wait">
                        {processingOrder === order.id ? (
                          <motion.div
                            key="loading"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
                          />
                        ) : (
                          <motion.button
                            key="view"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                          >
                            <Eye className="w-4 h-4 text-white" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            暂无订单数据
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onAccept={() => handleAcceptOrder(selectedOrder.id)}
            onReject={() => handleRejectOrder(selectedOrder.id)}
            onStart={() => handleStartService(selectedOrder.id)}
            onComplete={() => handleCompleteOrder(selectedOrder.id)}
            onDownloadVoucher={handleDownloadVoucher}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
