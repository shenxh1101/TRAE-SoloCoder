import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  CalendarPlus,
  PawPrint,
  Bell,
  TrendingUp,
  Users,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../store';
import StatCard from '../components/StatCard';
import RoomGrid from '../components/RoomGrid';
import { api } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Dashboard() {
  const {
    dashboardStats,
    rooms,
    bookings,
    currentUser,
    reminders,
    fetchDashboardStats,
    fetchRooms,
    fetchBookings,
    checkReminders,
  } = useAppStore();

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchRooms(),
        fetchBookings(),
        checkReminders(),
      ]);
      setLastUpdate(new Date());
      setCountdown(10);
      setIsRefreshing(false);
    };

    const countdownInterval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);

    const refreshInterval = setInterval(refreshData, 10000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [fetchDashboardStats, fetchRooms, fetchBookings, checkReminders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(),
      fetchRooms(),
      fetchBookings(),
      checkReminders(),
    ]);
    setLastUpdate(new Date());
    setCountdown(10);
    setIsRefreshing(false);
  };

  const quickActions = [
    {
      label: '快速预约',
      icon: <CalendarPlus size={24} />,
      path: '/booking',
      gradient: 'bg-gradient-to-br from-primary-400 to-primary-600',
      description: '为您的宠物预约寄养服务',
    },
    {
      label: '宠物档案',
      icon: <PawPrint size={24} />,
      path: '/pets',
      gradient: 'bg-gradient-to-br from-secondary-400 to-secondary-600',
      description: '管理您的宠物健康档案',
    },
    {
      label: '我的寄养',
      icon: <Home size={24} />,
      path: '/booking',
      gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
      description: '查看当前和历史寄养记录',
    },
  ];

  const myBookings = currentUser?.role === 'user'
    ? bookings.filter(b => b.status === 'in-progress' || b.status === 'confirmed')
    : bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">
            欢迎回来，{currentUser?.name}！
          </h2>
          <p className="text-neutral-500 mt-1">
            {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin text-primary-500' : 'text-neutral-500'}
          />
          <span className="text-sm text-neutral-600">
            刷新 ({countdown}s)
          </span>
        </button>
      </div>

      {reminders.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-in-top">
          <AlertTriangle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-medium text-warning-800">待处理提醒</h4>
            <p className="text-sm text-warning-600 mt-1">
              有 {reminders.length} 个寄养订单超过24小时未更新动态，请及时处理。
            </p>
          </div>
          <Link
            to="/booking"
            className="text-sm text-warning-700 hover:text-warning-800 font-medium flex items-center gap-1"
          >
            查看 <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="今日入住率"
            value={dashboardStats.occupancyRate}
            unit="%"
            icon={<TrendingUp size={22} />}
            gradient="bg-gradient-to-br from-primary-400 to-primary-600"
            trend={{ value: 5.2, isPositive: true }}
            delay={0}
          />
          <StatCard
            title="已使用房间"
            value={dashboardStats.occupiedRooms}
            unit={`/ ${dashboardStats.totalRooms}`}
            icon={<Home size={22} />}
            gradient="bg-gradient-to-br from-secondary-400 to-secondary-600"
            delay={100}
          />
          <StatCard
            title="今日入住"
            value={dashboardStats.todayCheckIns}
            icon={<Users size={22} />}
            gradient="bg-gradient-to-br from-blue-400 to-blue-600"
            delay={200}
          />
          <StatCard
            title="今日退房"
            value={dashboardStats.todayCheckOuts}
            icon={<CalendarPlus size={22} />}
            gradient="bg-gradient-to-br from-amber-400 to-amber-600"
            delay={300}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={action.label}
            to={action.path}
            className="card group card-hover"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl ${action.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                {action.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors">
                  {action.label}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">{action.description}</p>
              </div>
              <ArrowRight
                size={20}
                className="text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
              />
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800">房间实时状态</h3>
            <p className="text-sm text-neutral-500 mt-1">
              最后更新: {formatDistanceToNow(lastUpdate, { locale: zhCN, addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Clock size={14} />
            <span>每10秒自动刷新</span>
          </div>
        </div>
        <RoomGrid rooms={rooms} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800">
              {currentUser?.role === 'admin' ? '最近寄养订单' : '我的寄养'}
            </h3>
            <Link
              to="/booking"
              className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {myBookings.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <PawPrint size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无寄养记录</p>
              </div>
            ) : (
              myBookings.slice(0, 5).map((booking) => {
                const pet = useAppStore.getState().pets.find(p => p.id === booking.petId);
                const packageInfo = useAppStore.getState().packages.find(p => p.id === booking.packageId);
                const caregiver = useAppStore.getState().caregivers.find(c => c.id === booking.caregiverId);

                const statusConfig = {
                  pending: { label: '待确认', color: 'bg-warning-100 text-warning-700' },
                  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
                  'in-progress': { label: '进行中', color: 'bg-primary-100 text-primary-700' },
                  completed: { label: '已完成', color: 'bg-secondary-100 text-secondary-700' },
                  cancelled: { label: '已取消', color: 'bg-neutral-100 text-neutral-600' },
                };

                const status = statusConfig[booking.status];

                return (
                  <Link
                    key={booking.id}
                    to={`/booking/${booking.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                      {pet && (
                        <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-800 truncate">
                          {pet?.name || '未知宠物'}
                        </span>
                        <span className={`badge ${status.color}`}>{status.label}</span>
                      </div>
                      <p className="text-sm text-neutral-500 truncate">
                        {packageInfo?.name} · {caregiver?.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {booking.startDate} ~ {booking.endDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-500">¥{booking.totalPrice}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">待处理事项</h3>
          <div className="space-y-3">
            {dashboardStats && dashboardStats.pendingReminders > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <Bell size={20} className="text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">动态更新提醒</p>
                  <p className="text-sm text-red-600">
                    {dashboardStats.pendingReminders} 个订单超过24小时未更新
                  </p>
                </div>
              </div>
            )}
            {dashboardStats && dashboardStats.todayCheckIns > 0 && (
              <div className="flex items-center gap-3 p-3 bg-secondary-50 border border-secondary-100 rounded-xl">
                <Users size={20} className="text-secondary-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-secondary-800">今日入住</p>
                  <p className="text-sm text-secondary-600">
                    {dashboardStats.todayCheckIns} 个订单今日入住
                  </p>
                </div>
              </div>
            )}
            {dashboardStats && dashboardStats.todayCheckOuts > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <CalendarPlus size={20} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">今日退房</p>
                  <p className="text-sm text-amber-600">
                    {dashboardStats.todayCheckOuts} 个订单今日退房
                  </p>
                </div>
              </div>
            )}
            {(!dashboardStats || (dashboardStats.pendingReminders === 0 && 
              dashboardStats.todayCheckIns === 0 && 
              dashboardStats.todayCheckOuts === 0)) && (
              <div className="text-center py-8 text-neutral-400">
                <Bell size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无待处理事项</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
