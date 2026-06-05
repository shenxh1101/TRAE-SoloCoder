import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Sparkles, CheckCircle2, Star, RefreshCw, Plus, Eye } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import StatusBadge from '@/components/StatusBadge';

const statCards = [
  { key: 'pendingCount', label: '待接单', icon: Clock, gradient: 'from-orange-50 to-orange-100', iconColor: 'var(--primary)' },
  { key: 'activeCount', label: '服务中', icon: Sparkles, gradient: 'from-green-50 to-green-100', iconColor: 'var(--success)' },
  { key: 'completedToday', label: '今日完成', icon: CheckCircle2, gradient: 'from-blue-50 to-blue-100', iconColor: '#4299E1' },
  { key: 'avgRating', label: '平均评分', icon: Star, gradient: 'from-yellow-50 to-yellow-100', iconColor: '#D69E2E' },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const { dashboardStats, activeOrders, fetchDashboardStats, fetchActiveOrders } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchActiveOrders()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchActiveOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatValue = (key: string) => {
    if (!dashboardStats) return '-';
    if (key === 'avgRating') return dashboardStats.avgRating.toFixed(1);
    return (dashboardStats as unknown as Record<string, unknown>)[key] as number ?? 0;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--secondary)' }}>工作台</h1>
          <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw
              size={18}
              className={`transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
            />
          </button>
        </div>
        <Link
          to="/booking"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm hover:shadow-md transition-shadow"
          style={{ background: 'var(--primary)' }}
        >
          <Plus size={18} />
          新建预约
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`bg-gradient-to-br ${card.gradient} rounded-xl p-5 border border-white shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{card.label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/60">
                  <Icon size={20} style={{ color: card.iconColor }} />
                </div>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
                {getStatValue(card.key)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--secondary)' }}>实时订单</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>实时更新</span>
          </div>
        </div>

        {activeOrders.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-secondary)' }}>
            <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无进行中的订单</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium border-b" style={{ color: 'var(--text-secondary)' }}>
                  <th className="px-6 py-3">订单号</th>
                  <th className="px-6 py-3">服务类型</th>
                  <th className="px-6 py-3">服务人员</th>
                  <th className="px-6 py-3">开始时间</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--text)' }}>{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>{order.serviceTypeName || order.serviceTypeId}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>{order.staffName || '-'}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {order.serviceStartTime ? new Date(order.serviceStartTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} pulsing={order.status === 'in_service'} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="flex items-center gap-1 text-sm font-medium hover:underline"
                        style={{ color: 'var(--primary)' }}
                      >
                        <Eye size={14} />
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
