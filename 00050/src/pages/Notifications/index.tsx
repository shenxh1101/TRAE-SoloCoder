import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Calendar,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Search,
  Check,
  Download,
  X,
  Eye,
  ExternalLink,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { cn, formatDateTime, formatDate, getStatusText, getStatusClass } from '../../utils/helpers';
import type { Notification, NotificationType } from '../../types';

const categories = [
  { type: 'all', label: '全部消息', icon: Bell },
  { type: 'booking', label: '预订通知', icon: Calendar },
  { type: 'service', label: '服务通知', icon: ClipboardList },
  { type: 'forum', label: '论坛通知', icon: MessageSquare },
  { type: 'warning', label: '预警通知', icon: AlertTriangle },
  { type: 'finance', label: '财务通知', icon: DollarSign },
] as const;

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; label: string }> = {
  booking: { icon: Calendar, color: 'text-blue-400 bg-blue-500/20', label: '预订通知' },
  service: { icon: ClipboardList, color: 'text-green-400 bg-green-500/20', label: '服务通知' },
  forum: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/20', label: '论坛通知' },
  warning: { icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/20', label: '预警通知' },
  finance: { icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/20', label: '财务通知' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const {
    getNotificationsByUser,
    getUnreadCount,
    getNotificationsByType,
    markAsRead,
    markAllAsRead,
    downloadVoucher,
  } = useNotificationStore();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => setPage(1), [activeCategory, showUnreadOnly, searchQuery]);

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    let result =
      activeCategory === 'all'
        ? getNotificationsByUser(currentUser.id)
        : getNotificationsByType(currentUser.id, activeCategory as NotificationType);
    if (showUnreadOnly) result = result.filter((n) => n.status === 'unread');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    return result;
  }, [currentUser, activeCategory, showUnreadOnly, searchQuery, getNotificationsByUser, getNotificationsByType]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  const getUnreadByType = (type: string) => {
    if (!currentUser) return 0;
    if (type === 'all') return unreadCount;
    return getNotificationsByType(currentUser.id, type as NotificationType).filter((n) => n.status === 'unread').length;
  };

  const handleViewDetail = (n: Notification) => {
    setSelected(n);
    if (n.status === 'unread') markAsRead(n.id);
  };

  return (
    <div className="min-h-screen tech-grid-bg p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          <span className="gradient-text">消息中心</span>
        </h1>
        <p className="text-dark-400 mt-1">管理您的所有通知和提醒</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:w-64 shrink-0">
          <div className="glass-card p-4 space-y-1">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              const count = getUnreadByType(cat.type);
              const active = activeCategory === cat.type;
              return (
                <motion.button
                  key={cat.type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveCategory(cat.type)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    active ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-dark-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium">{cat.label}</span>
                  {count > 0 && (
                    <span className="min-w-5 h-5 px-1.5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex-1 min-w-0">
          <div className="glass-card p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="搜索消息..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                    className={cn('w-10 h-6 rounded-full transition-all relative', showUnreadOnly ? 'bg-primary-500' : 'bg-white/10')}
                  >
                    <motion.div animate={{ x: showUnreadOnly ? 18 : 2 }} className="absolute top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                  <span className="text-sm text-dark-300 flex items-center gap-1">
                    <Filter className="w-4 h-4" />
                    仅未读
                  </span>
                </label>
                {unreadCount > 0 && (
                  <button onClick={() => currentUser && markAllAsRead(currentUser.id)} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4" />
                    全部已读
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {paginated.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card p-12 text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-dark-500" />
                  <p className="text-dark-400 text-lg">暂无消息</p>
                  <p className="text-dark-500 text-sm mt-1">您的所有通知都在这里</p>
                </motion.div>
              ) : (
                paginated.map((n, i) => {
                  const config = typeConfig[n.type];
                  const Icon = config.icon;
                  const unread = n.status === 'unread';
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn('glass-card p-4 glass-card-hover', unread && 'border-primary-500/50 bg-primary-500/5')}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', config.color)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={cn('text-white truncate', unread ? 'font-semibold' : 'font-medium')}>
                              {n.title}
                              {unread && <span className="inline-block w-2 h-2 ml-2 bg-primary-400 rounded-full align-middle" />}
                            </h3>
                            <span className="text-xs text-dark-400 shrink-0">{formatDateTime(n.createdAt)}</span>
                          </div>
                          <p className="text-dark-300 text-sm line-clamp-2 mb-3">{n.content}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('status-badge', getStatusClass(unread ? 'pending' : 'approved'))}>
                              {getStatusText(unread ? 'pending' : 'completed')}
                            </span>
                            <span className="status-badge bg-white/10 text-dark-300">{config.label}</span>
                            <div className="flex-1" />
                            {unread && (
                              <button onClick={() => markAsRead(n.id)} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 px-3 py-1 hover:bg-primary-500/10 rounded-lg transition-colors">
                                <Check className="w-4 h-4" />
                                标记已读
                              </button>
                            )}
                            {n.voucherUrl && (
                              <button onClick={() => downloadVoucher(n.id)} className="text-sm text-success-400 hover:text-success-300 flex items-center gap-1 px-3 py-1 hover:bg-success-500/10 rounded-lg transition-colors">
                                <Download className="w-4 h-4" />
                                下载凭证
                              </button>
                            )}
                            <button onClick={() => handleViewDetail(n)} className="text-sm text-white hover:text-primary-300 flex items-center gap-1 px-3 py-1 hover:bg-white/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                              查看详情
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {totalPages > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                  上一页
                </button>
                <span className="text-dark-400 px-4">第 {page} / {totalPages} 页</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                  下一页
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', typeConfig[selected.type].color)}>
                    {(() => {
                      const Icon = typeConfig[selected.type].icon;
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="status-badge bg-white/10 text-dark-300">{typeConfig[selected.type].label}</span>
                      <span className="text-sm text-dark-400">{formatDateTime(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-dark-400 mb-2">消息内容</h3>
                  <p className="text-white leading-relaxed">{selected.content}</p>
                </div>
                {selected.relatedId && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-dark-400 mb-2">相关信息</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-dark-400">关联ID：</span><span className="text-white font-mono">{selected.relatedId}</span></div>
                      <div><span className="text-dark-400">通知日期：</span><span className="text-white">{formatDate(selected.createdAt)}</span></div>
                      <div>
                        <span className="text-dark-400">通知状态：</span>
                        <span className={cn('status-badge', getStatusClass(selected.status === 'unread' ? 'pending' : 'approved'))}>
                          {getStatusText(selected.status === 'unread' ? 'pending' : 'completed')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-4 flex-wrap">
                  {selected.status === 'unread' && (
                    <button onClick={() => { markAsRead(selected.id); setSelected({ ...selected, status: 'read' }); }} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                      <Check className="w-4 h-4" /> 标记已读
                    </button>
                  )}
                  {selected.voucherUrl && (
                    <button onClick={() => downloadVoucher(selected.id)} className="btn-success text-sm py-2 px-4 flex items-center gap-2">
                      <Download className="w-4 h-4" /> 下载凭证
                    </button>
                  )}
                  {selected.actionUrl && (
                    <button onClick={() => { navigate(selected.actionUrl!); setSelected(null); }} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> 跳转到相关页面
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
