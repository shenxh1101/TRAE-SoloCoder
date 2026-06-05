import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  X,
  Building,
  MapPin,
  Calendar,
  CreditCard,
  Star,
  CheckSquare,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useBoothStore } from '../../store/useBoothStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { cn, formatDate, formatDateTime, getStatusText, getStatusClass } from '../../utils/helpers';
import { useState, useMemo } from 'react';
import type { BoothBooking } from '../../types';

export default function Reviews() {
  const { bookings, updateBookingStatus, lockBooth, createContract, getBoothById } = useBoothStore();
  const { users } = useAuthStore();
  const { pushBookingNotification } = useNotificationStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [viewingBooking, setViewingBooking] = useState<BoothBooking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch =
        searchQuery === '' ||
        b.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.boothCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedBookings((prev) =>
      prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const pendingIds = filteredBookings.filter((b) => b.status === 'pending').map((b) => b.id);
    setSelectedBookings(selectedBookings.length === pendingIds.length ? [] : pendingIds);
  };

  const handleApprove = (booking: BoothBooking) => {
    updateBookingStatus(booking.id, 'approved');
    lockBooth(booking.boothId);
    createContract({
      bookingId: booking.id,
      content: `展位租赁合同\n\n甲方：智慧国际会展中心\n乙方：${booking.companyName}\n\n展位：${booking.hallName} ${booking.boothCode}号展位\n租赁期限：${formatDate(booking.startDate)} 至 ${formatDate(booking.endDate)}\n金额：人民币 ${booking.totalPrice.toLocaleString()} 元整`,
      amount: booking.totalPrice,
    });
    pushBookingNotification(
      booking.exhibitorId,
      booking.id,
      '展位预订审核通过',
      `您预订的${booking.hallName}${booking.boothCode}号展位已审核通过，请及时签署电子合同。`
    );
    setSelectedBookings((prev) => prev.filter((id) => id !== booking.id));
  };

  const handleReject = (booking: BoothBooking) => {
    updateBookingStatus(booking.id, 'rejected');
    pushBookingNotification(
      booking.exhibitorId,
      booking.id,
      '展位预订审核未通过',
      `您预订的${booking.hallName}${booking.boothCode}号展位审核未通过，请重新选择展位。`
    );
    setSelectedBookings((prev) => prev.filter((id) => id !== booking.id));
  };

  const handleBatchApprove = () => {
    selectedBookings.forEach((id) => {
      const booking = bookings.find((b) => b.id === id);
      if (booking && booking.status === 'pending') handleApprove(booking);
    });
    setSelectedBookings([]);
  };

  const getExhibitor = (exhibitorId: string) => users.find((u) => u.id === exhibitorId);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已通过' },
    { key: 'rejected', label: '已拒绝' },
  ];

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="预订审核"
        subtitle="审核展商的展位预订申请，管理预订状态"
        icon={<ClipboardList className="w-7 h-7" />}
        actions={
          selectedBookings.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary-400">已选择 {selectedBookings.length} 项</span>
              <button onClick={handleBatchApprove} className="btn-success flex items-center gap-2 py-2">
                <CheckCircle className="w-4 h-4" />
                批量通过
              </button>
            </div>
          )
        }
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="glass-card p-4 glass-card-hover">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-dark-400" />
              <div className="flex gap-2">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key as typeof statusFilter)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      statusFilter === f.key
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-dark-300 hover:bg-white/10'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="搜索展商、展位..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 py-2"
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card glass-card-hover overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <button
              onClick={selectAll}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                selectedBookings.length > 0
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-dark-400 hover:bg-white/10'
              )}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            <span className="text-sm text-dark-400">全选待审核项</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-dark-400 text-sm">
                  <th className="p-4 font-medium w-16"></th>
                  <th className="p-4 font-medium">预订编号</th>
                  <th className="p-4 font-medium">展商名称</th>
                  <th className="p-4 font-medium">展位信息</th>
                  <th className="p-4 font-medium">预订金额</th>
                  <th className="p-4 font-medium">申请时间</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-dark-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无符合条件的预订记录</p>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking, index) => {
                    const exhibitor = getExhibitor(booking.exhibitorId);
                    const isSelected = selectedBookings.includes(booking.id);

                    return (
                      <motion.tr
                        key={booking.id}
                        variants={itemVariants}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'border-b border-white/5 transition-colors',
                          isSelected && 'bg-primary-500/10',
                          booking.status === 'pending' && 'hover:bg-white/5'
                        )}
                      >
                        <td className="p-4">
                          {booking.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(booking.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/20"
                            />
                          )}
                        </td>
                        <td className="p-4 font-mono text-sm text-white">{booking.id.slice(0, 12)}...</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                              <Building className="w-4 h-4 text-primary-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{booking.companyName}</p>
                              <p className="text-xs text-dark-400">{exhibitor?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-400" />
                            <span className="text-white">{booking.hallName} · {booking.boothCode}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-white">¥{booking.totalPrice.toLocaleString()}</td>
                        <td className="p-4 text-dark-300">{formatDateTime(booking.createdAt)}</td>
                        <td className="p-4">
                          <span className={cn('status-badge', getStatusClass(booking.status))}>
                            {getStatusText(booking.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(booking)}
                                  className="p-2 bg-success-500/20 text-success-400 rounded-lg hover:bg-success-500/30 transition-colors"
                                  title="通过"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(booking)}
                                  className="p-2 bg-danger-500/20 text-danger-400 rounded-lg hover:bg-danger-500/30 transition-colors"
                                  title="拒绝"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setViewingBooking(booking)}
                              className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {viewingBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">预订详情</h3>
                <button
                  onClick={() => setViewingBooking(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-dark-400 mb-1">预订编号</p>
                    <p className="font-mono text-white">{viewingBooking.id}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-dark-400 mb-1">申请时间</p>
                    <p className="text-white">{formatDateTime(viewingBooking.createdAt)}</p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Building className="w-5 h-5 text-primary-400" />
                    <h4 className="font-semibold text-white">展商信息</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">公司名称</span>
                      <span className="text-white">{viewingBooking.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">信用等级</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-4 h-4',
                              i < (getExhibitor(viewingBooking.exhibitorId)?.creditLevel || 0)
                                ? 'text-warning-400 fill-warning-400'
                                : 'text-dark-500'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">联系人</span>
                      <span className="text-white">{getExhibitor(viewingBooking.exhibitorId)?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary-400" />
                    <h4 className="font-semibold text-white">展位详情</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">展馆</span>
                      <span className="text-white">{viewingBooking.hallName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">展位号</span>
                      <span className="text-white">{viewingBooking.boothCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">面积</span>
                      <span className="text-white">{getBoothById(viewingBooking.boothId)?.area} ㎡</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-primary-400" />
                    <h4 className="font-semibold text-white">租赁期限</h4>
                  </div>
                  <p className="text-white">
                    {formatDate(viewingBooking.startDate)} 至 {formatDate(viewingBooking.endDate)}
                  </p>
                </div>

                <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-5 h-5 text-primary-400" />
                    <h4 className="font-semibold text-white">价格明细</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">展位总价</span>
                      <span className="text-white">¥{(viewingBooking.totalPrice + viewingBooking.discountApplied).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">优惠金额</span>
                      <span className="text-success-400">-¥{viewingBooking.discountApplied.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                      <span className="text-white">应付金额</span>
                      <span className="text-primary-400 text-lg">¥{viewingBooking.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {viewingBooking.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        handleApprove(viewingBooking);
                        setViewingBooking(null);
                      }}
                      className="btn-success flex-1 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      通过审核
                    </button>
                    <button
                      onClick={() => {
                        handleReject(viewingBooking);
                        setViewingBooking(null);
                      }}
                      className="btn-danger flex-1 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      拒绝申请
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
