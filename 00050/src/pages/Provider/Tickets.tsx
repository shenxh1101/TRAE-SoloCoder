import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  ChevronRight,
  Plus,
  Upload,
  AlertTriangle,
  CheckCircle,
  Play,
  X,
  List,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useServiceStore } from '../../store/useServiceStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  formatDateTime,
  getStatusText,
  getStatusClass,
  cn,
} from '../../utils/helpers';
import type { ServiceOrder, ServiceType } from '../../types';

const PROVIDER_ID = 'provider-1';

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const timeFilters = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' },
];

const serviceTypeMap: Record<ServiceType, string> = {
  construction: '展位搭建',
  electricity: '电力服务',
  internet: '网络服务',
  cleaning: '清洁服务',
  security: '安保服务',
  logistics: '物流服务',
};

const timelineStages = [
  { key: 'prepare', label: '准备阶段' },
  { key: 'arrive', label: '到达现场' },
  { key: 'execute', label: '执行服务' },
  { key: 'complete', label: '完成验收' },
];

interface TicketTimelineProps {
  progress: number;
}

function TicketTimeline({ progress }: TicketTimelineProps) {
  const getStageStatus = (index: number) => {
    const stageThreshold = (index + 1) * 25;
    if (progress >= stageThreshold) return 'completed';
    if (progress >= index * 25) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-between">
      {timelineStages.map((stage, index) => {
        const stageStatus = getStageStatus(index);
        return (
          <div key={stage.key} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    stageStatus === 'completed'
                      ? '#10B981'
                      : stageStatus === 'active'
                      ? '#165DFF'
                      : '#374151',
                  scale: stageStatus === 'active' ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center z-10',
                  stageStatus === 'completed' && 'bg-success-500',
                  stageStatus === 'active' && 'bg-primary-500',
                  stageStatus === 'pending' && 'bg-dark-600'
                )}
              >
                {stageStatus === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : stageStatus === 'active' ? (
                  <Play className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-dark-300 text-sm">{index + 1}</span>
                )}
              </motion.div>
              {index < timelineStages.length - 1 && (
                <div className="flex-1 h-1 mx-1 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: stageStatus === 'completed' ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-success-500"
                  />
                </div>
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-2 text-center',
                stageStatus === 'completed'
                  ? 'text-success-400'
                  : stageStatus === 'active'
                  ? 'text-primary-400'
                  : 'text-dark-400'
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface TicketDetailModalProps {
  ticket: ServiceOrder;
  onClose: () => void;
  onUpdateProgress: (progress: number, note: string) => void;
  onComplete: () => void;
  onReportIssue: () => void;
}

function TicketDetailModal({
  ticket,
  onClose,
  onUpdateProgress,
  onComplete,
  onReportIssue,
}: TicketDetailModalProps) {
  const [progress, setProgress] = useState(ticket.progress || 0);
  const [note, setNote] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const handleUpload = () => {
    const mockImage = `https://picsum.photos/200/150?random=${Date.now()}`;
    setUploadedImages([...uploadedImages, mockImage]);
  };

  const handleSubmitProgress = () => {
    onUpdateProgress(progress, note);
    setNote('');
  };

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
        className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">工单详情</h3>
            <p className="text-dark-400 text-sm mt-1">工单编号：{ticket.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span>执行时间</span>
              </div>
              <p className="text-white font-medium">{formatDateTime(ticket.scheduledTime)}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                <span>服务地点</span>
              </div>
              <p className="text-white font-medium">展位 {ticket.boothCode}</p>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-dark-300">服务进度</span>
              <span className="text-primary-400 font-bold text-lg">{progress}%</span>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="25"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white font-medium mb-4">执行进度时间线</h4>
            <TicketTimeline progress={progress} />
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white font-medium mb-3">进度备注</h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="请输入进度备注..."
              className="input-field h-24 resize-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpload}
                className="btn-secondary py-2 px-4 text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传图片
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitProgress}
                className="btn-primary py-2 px-4 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                更新进度
              </motion.button>
            </div>
            {uploadedImages.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {uploadedImages.map((img, idx) => (
                  <motion.img
                    key={idx}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={img}
                    alt={`上传图片 ${idx + 1}`}
                    className="w-20 h-16 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white font-medium mb-3">联系人信息</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-dark-400" />
                <span className="text-dark-300">联系人：</span>
                <span className="text-white">张经理</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-dark-400" />
                <span className="text-dark-300">联系电话：</span>
                <span className="text-white">13800138001</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {ticket.status !== 'completed' && ticket.status !== 'cancelled' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onReportIssue}
                  className="flex-1 btn-danger"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  异常上报
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onComplete}
                  className="flex-1 btn-success"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  完成工单
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Tickets() {
  const { orders, getOrdersByProvider, updateOrderProgress, completeOrder } = useServiceStore();
  const { pushServiceNotification } = useNotificationStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceOrder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const filteredTickets = useMemo(() => {
    let result = getOrdersByProvider(PROVIDER_ID);
    const assignedOrders = orders.filter(
      (o) => (o.status === 'accepted' || o.status === 'in_progress') && o.providerId === PROVIDER_ID
    );
    result = [...result, ...assignedOrders];

    result = result.filter((o) => o.status !== 'pending' && o.status !== 'assigned');

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter((o) => o.status === 'accepted');
      } else if (statusFilter === 'in_progress') {
        result = result.filter((o) => o.status === 'in_progress');
      } else {
        result = result.filter((o) => o.status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (o) => o.id.toLowerCase().includes(query) || o.description.toLowerCase().includes(query)
      );
    }

    return result.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }, [orders, statusFilter, searchQuery, getOrdersByProvider]);

  const getTicketStatus = (order: ServiceOrder) => {
    if (order.status === 'accepted') return 'pending';
    return order.status;
  };

  const handleUpdateProgress = (orderId: string, progress: number, note: string) => {
    updateOrderProgress(orderId, progress);
    if (progress >= 25 && progress < 50) {
      updateOrderStatus(orderId, 'in_progress');
    }
    pushServiceNotification(
      PROVIDER_ID,
      orderId,
      '进度已更新',
      `工单进度已更新为 ${progress}%${note ? '，备注：' + note : ''}`
    );
  };

  const updateOrderStatus = (orderId: string, status: ServiceOrder['status']) => {
    const { updateOrderStatus } = useServiceStore.getState();
    updateOrderStatus(orderId, status);
  };

  const handleComplete = (orderId: string) => {
    completeOrder(orderId);
    pushServiceNotification(PROVIDER_ID, orderId, '工单已完成', '恭喜，您已完成该工单服务。');
    setSelectedTicket(null);
  };

  const handleReportIssue = (orderId: string) => {
    pushServiceNotification(PROVIDER_ID, orderId, '异常已上报', '异常情况已上报，运营人员会尽快处理。');
    setSelectedTicket(null);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="工单管理"
        subtitle="管理您的服务工单进度"
        icon={<ClipboardList className="w-7 h-7" />}
        actions={
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={cn(
                'p-3 rounded-xl transition-all',
                viewMode === 'list' ? 'bg-primary-500 text-white' : 'glass-card glass-card-hover text-dark-300'
              )}
            >
              <List className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('calendar')}
              className={cn(
                'p-3 rounded-xl transition-all',
                viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'glass-card glass-card-hover text-dark-300'
              )}
            >
              <CalendarIcon className="w-5 h-5" />
            </motion.button>
          </div>
        }
      />

      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索工单编号、服务内容..."
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
            <Clock className="w-5 h-5 text-dark-400" />
            <div className="flex gap-1">
              {timeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-xl transition-all',
                    timeFilter === filter.value
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-white/5 text-dark-300 hover:bg-white/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredTickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedTicket(ticket)}
                className="glass-card glass-card-hover p-6 cursor-pointer"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-mono">{ticket.id}</span>
                      <span className={cn('status-badge', getStatusClass(getTicketStatus(ticket)))}>
                        {getStatusText(getTicketStatus(ticket))}
                      </span>
                      <span className="text-dark-400 text-sm">
                        关联订单：{ticket.id}
                      </span>
                    </div>
                    <h4 className="text-white font-medium mb-2">{ticket.description}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-dark-300">
                        <span className="text-primary-400">{serviceTypeMap[ticket.serviceType]}</span>
                      </span>
                      <span className="text-dark-400 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateTime(ticket.scheduledTime)}
                      </span>
                      <span className="text-dark-400 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        展位 {ticket.boothCode}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-dark-400 text-sm">执行进度</span>
                        <span className="text-primary-400 font-medium">{ticket.progress || 0}%</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ticket.progress || 0}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-primary-500 to-success-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-dark-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredTickets.length === 0 && (
            <div className="text-center py-16 text-dark-400">
              暂无工单数据
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="text-center py-16 text-dark-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>日历视图开发中，敬请期待</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdateProgress={(progress, note) => handleUpdateProgress(selectedTicket.id, progress, note)}
            onComplete={() => handleComplete(selectedTicket.id)}
            onReportIssue={() => handleReportIssue(selectedTicket.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
