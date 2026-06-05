import { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  DollarSign,
  Users,
  Star,
  FileText,
  TrendingUp,
  TrendingDown,
  Filter,
  Loader2,
  Check,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useAppStore } from '../store';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function ReportCenter() {
  const { bookings, caregivers, packages, pets } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(monthStart);

  const monthBookings = useMemo(() => {
    return bookings.filter(b => {
      const inMonth = b.startDate >= format(monthStart, 'yyyy-MM-dd') &&
        b.startDate <= format(monthEnd, 'yyyy-MM-dd');
      const matchCaregiver = selectedCaregiver === 'all' || b.caregiverId === selectedCaregiver;
      const validStatus = ['completed', 'confirmed', 'in_progress'].includes(b.status);
      return inMonth && matchCaregiver && validStatus;
    });
  }, [bookings, monthStart, monthEnd, selectedCaregiver]);

  const revenueStats = useMemo(() => {
    const total = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const deposits = monthBookings.reduce((sum, b) => sum + b.deposit, 0);
    const completedBookings = monthBookings.filter(b => b.status === 'completed');
    const completedRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    const byPackage = packages.map(pkg => {
      const pkgBookings = monthBookings.filter(b => b.packageId === pkg.id);
      return {
        name: pkg.name,
        value: pkgBookings.reduce((sum, b) => sum + b.totalPrice, 0),
        count: pkgBookings.length,
      };
    });

    return { total, deposits, completedRevenue, count: monthBookings.length, byPackage };
  }, [monthBookings, packages]);

  const caregiverStats = useMemo(() => {
    return caregivers.map(cg => {
      const cgBookings = monthBookings.filter(b => b.caregiverId === cg.id);
      const totalRevenue = cgBookings.reduce((sum, b) => sum + b.totalPrice, 0);
      const avgRating = cgBookings.length > 0
        ? (cgBookings.reduce((sum, b) => sum + (b.reviewId ? 4.5 : 0), 0) / cgBookings.length)
        : 0;

      return {
        id: cg.id,
        name: cg.name,
        avatar: cg.avatar,
        rating: cg.rating,
        recommendationWeight: cg.recommendationWeight,
        bookingCount: cgBookings.length,
        totalRevenue,
        avgRating,
        specialties: cg.specialties,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [monthBookings, caregivers]);

  const last6MonthsData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(monthStart, 5),
      end: monthEnd,
    });

    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const mBookings = bookings.filter(b =>
        b.startDate >= format(mStart, 'yyyy-MM-dd') &&
        b.startDate <= format(mEnd, 'yyyy-MM-dd') &&
        ['completed', 'confirmed', 'in_progress'].includes(b.status)
      );

      return {
        name: format(month, 'M月', { locale: zhCN }),
        营收: mBookings.reduce((sum, b) => sum + b.totalPrice, 0),
        订单数: mBookings.length,
      };
    });
  }, [bookings, monthStart, monthEnd]);

  const exportMonthlyReport = async () => {
    setExporting(true);
    try {
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      const blob = await api.exportRevenueCSV({
        startDate: monthStartStr,
        endDate: monthEndStr,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue_report_${monthStartStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const exportCaregiverReport = async () => {
    setExporting(true);
    try {
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      const blob = await api.exportCaregiverCSV({
        startDate: monthStartStr,
        endDate: monthEndStr,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caregiver_report_${monthStartStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const COLORS = ['#FF7A45', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FFB6B9'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">报表中心</h2>
          <p className="text-neutral-500 mt-1">查看和导出各类经营数据报表</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-neutral-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field min-w-[140px]"
            />
          </div>
          <select
            value={selectedCaregiver}
            onChange={(e) => setSelectedCaregiver(e.target.value)}
            className="input-field min-w-[140px]"
          >
            <option value="all">全部护理员</option>
            {caregivers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {exportSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-bounce-soft">
          <Check size={20} />
          <span>报表导出成功！</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="flex items-center justify-between mb-3">
            <DollarSign size={24} className="text-primary-500" />
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <p className="text-sm text-neutral-600 mb-1">月度总营收</p>
          <p className="text-2xl font-bold text-primary-600">¥{revenueStats.total.toLocaleString()}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-secondary-50 to-secondary-100">
          <div className="flex items-center justify-between mb-3">
            <Calendar size={24} className="text-secondary-500" />
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <p className="text-sm text-neutral-600 mb-1">订单数量</p>
          <p className="text-2xl font-bold text-secondary-600">{revenueStats.count}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="flex items-center justify-between mb-3">
            <Users size={24} className="text-amber-500" />
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <p className="text-sm text-neutral-600 mb-1">已收定金</p>
          <p className="text-2xl font-bold text-amber-600">¥{revenueStats.deposits.toLocaleString()}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between mb-3">
            <Check size={24} className="text-green-500" />
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <p className="text-sm text-neutral-600 mb-1">已完成营收</p>
          <p className="text-2xl font-bold text-green-600">¥{revenueStats.completedRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary-500" />
            近6个月营收趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6MonthsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="营收" fill="#FF7A45" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={20} className="text-secondary-500" />
            套餐营收占比
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueStats.byPackage.filter(p => p.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {revenueStats.byPackage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '营收']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
            <Users size={20} className="text-primary-500" />
            护理员服务排名
          </h3>
          <button
            onClick={exportCaregiverReport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            导出报表
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">排名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">护理员</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">评分</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">权重</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">接单量</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">总营收</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">专长</th>
              </tr>
            </thead>
            <tbody>
              {caregiverStats.map((stat, idx) => (
                <tr key={stat.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-4 px-4">
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold',
                      idx === 0 ? 'bg-amber-100 text-amber-600' :
                        idx === 1 ? 'bg-neutral-200 text-neutral-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-600' :
                            'bg-neutral-100 text-neutral-500'
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src={stat.avatar} alt={stat.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-neutral-800">{stat.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                      <span className="font-medium text-neutral-700">{stat.rating}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="badge badge-secondary">{Math.round(stat.recommendationWeight * 100)}%</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-neutral-700">{stat.bookingCount}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-bold text-primary-500">¥{stat.totalRevenue.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {stat.specialties.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <FileText size={28} className="text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">月度营收报表</h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-xs">
            导出{format(monthStart, 'yyyy年M月', { locale: zhCN })}的完整营收数据，包含订单明细、套餐分布等
          </p>
          <button
            onClick={exportMonthlyReport}
            disabled={exporting}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            导出月度报表
          </button>
        </div>

        <div className="card p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
            <Users size={28} className="text-secondary-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">护理员服务明细</h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-xs">
            导出{format(monthStart, 'yyyy年M月', { locale: zhCN })}护理员的服务数据、评分排名、营收贡献
          </p>
          <button
            onClick={exportCaregiverReport}
            disabled={exporting}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            导出服务明细
          </button>
        </div>
      </div>
    </div>
  );
}
