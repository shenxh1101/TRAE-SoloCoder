import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BookingList() {
  const { bookings, pets, rooms, caregivers, packages, currentUser } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [caregiverFilter, setCaregiverFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const pet = pets.find(p => p.id === booking.petId);
      const matchSearch = !searchTerm ||
        pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || booking.status === statusFilter;

      const matchDate = (!dateRange.start || booking.startDate >= dateRange.start) &&
        (!dateRange.end || booking.endDate <= dateRange.end);

      const matchCaregiver = caregiverFilter === 'all' || booking.caregiverId === caregiverFilter;

      const matchPackage = packageFilter === 'all' || booking.packageId === packageFilter;

      return matchSearch && matchStatus && matchDate && matchCaregiver && matchPackage;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bookings, pets, searchTerm, statusFilter, dateRange, caregiverFilter, packageFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: '待确认', className: 'badge-warning', icon: Clock },
      confirmed: { label: '已确认', className: 'badge-info', icon: CheckCircle },
      in_progress: { label: '进行中', className: 'badge-secondary', icon: AlertCircle },
      'in-progress': { label: '进行中', className: 'badge-secondary', icon: AlertCircle },
      completed: { label: '已完成', className: 'badge-success', icon: CheckCircle },
      cancelled: { label: '已取消', className: 'badge-danger', icon: XCircle },
    };
    const badge = badges[status] || { label: status, className: 'badge-default', icon: Clock };
    const Icon = badge.icon;
    return (
      <span className={cn('badge flex items-center gap-1', badge.className)}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    today: bookings.filter(b => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return b.startDate === today;
    }).length,
    inProgress: bookings.filter(b => b.status === 'in_progress' || b.status === 'in-progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }), [bookings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">寄养订单</h2>
          <p className="text-neutral-500 mt-1">查看和管理所有寄养订单</p>
        </div>
        <Link to="/booking/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          新建预约
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">总订单数</p>
          <p className="text-2xl font-bold text-neutral-800">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">今日入住</p>
          <p className="text-2xl font-bold text-primary-500">{stats.today}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">进行中</p>
          <p className="text-2xl font-bold text-secondary-500">{stats.inProgress}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">已完成</p>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索订单号或宠物名..."
              className="input-field pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[140px]"
          >
            <option value="all">全部状态</option>
            <option value="pending">待确认</option>
            <option value="confirmed">已确认</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>

          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="input-field min-w-[140px]"
          >
            <option value="all">全部套餐</option>
            {packages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
            ))}
          </select>

          {currentUser?.role === 'admin' && (
            <select
              value={caregiverFilter}
              onChange={(e) => setCaregiverFilter(e.target.value)}
              className="input-field min-w-[140px]"
            >
              <option value="all">全部护理员</option>
              {caregivers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input-field"
            />
            <span className="text-neutral-400">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-50" />
            <p>暂无符合条件的订单</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">订单号</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">宠物</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">套餐</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">时间</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">护理员</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">金额</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">状态</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">评价</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const pet = pets.find(p => p.id === booking.petId);
                  const pkg = packages.find(p => p.id === booking.packageId);
                  const caregiver = caregivers.find(c => c.id === booking.caregiverId);
                  const room = rooms.find(r => r.id === booking.roomId);

                  return (
                    <tr key={booking.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-neutral-600">{booking.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden">
                            <img src={pet?.avatar} alt={pet?.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800">{pet?.name}</p>
                            <p className="text-xs text-neutral-500">{pet?.breed}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-neutral-800">{pkg?.name}</p>
                        <p className="text-xs text-neutral-500">{room?.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-neutral-800">{booking.startDate}</p>
                        <p className="text-xs text-neutral-500">~ {booking.endDate}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img src={caregiver?.avatar} alt={caregiver?.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-neutral-800">{caregiver?.name}</p>
                            <div className="flex items-center gap-0.5">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs text-neutral-500">{caregiver?.rating}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-primary-500">¥{booking.totalPrice}</p>
                        <p className="text-xs text-neutral-500">定金 ¥{booking.deposit}</p>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="py-4 px-4">
                        {booking.reviewId ? (
                          <span className="text-green-600 text-sm">已评价</span>
                        ) : booking.status === 'completed' ? (
                          <span className="text-amber-600 text-sm">待评价</span>
                        ) : (
                          <span className="text-neutral-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          to={`/booking/${booking.id}`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <Eye size={16} />
                          查看
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-neutral-100 text-sm text-neutral-500">
          共 {filteredBookings.length} 条记录
        </div>
      </div>
    </div>
  );
}
