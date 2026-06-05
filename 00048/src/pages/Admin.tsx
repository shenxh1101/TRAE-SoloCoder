import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Map, Download, Shield, Heart, Users, Clock } from 'lucide-react';
import useAdminStore from '@/stores/adminStore';

const STAT_CARDS = [
  { key: 'totalRescues', label: '救助总数', icon: Shield, color: 'text-primary-600', bg: 'bg-primary-50' },
  { key: 'adoptionRate', label: '领养成功率', icon: Heart, color: 'text-success-500', bg: 'bg-success-50', suffix: '%' },
  { key: 'pendingTasks', label: '待处理任务', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  { key: 'activeVolunteers', label: '活跃志愿者', icon: Users, color: 'text-info-500', bg: 'bg-info-50' },
];

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-warm-200" />
        <div className="space-y-2">
          <div className="w-12 h-3 bg-warm-200 rounded" />
          <div className="w-8 h-5 bg-warm-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full flex gap-1 items-end justify-center" style={{ height: '160px' }}>
        <div className="w-5 bg-warm-200 rounded-t animate-pulse" style={{ height: '60%' }} />
        <div className="w-5 bg-warm-200 rounded-t animate-pulse" style={{ height: '40%' }} />
      </div>
      <div className="w-8 h-3 bg-warm-200 rounded animate-pulse" />
    </div>
  );
}

export default function Admin() {
  const { dashboardData, fetchDashboard, loading } = useAdminStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const data = dashboardData;
  const stats: Record<string, number> = {
    totalRescues: data?.totalRescues || 0,
    adoptionRate: data?.adoptionRate || 0,
    pendingTasks: data?.pendingTasks || 0,
    activeVolunteers: data?.activeVolunteers || 0,
  };

  const trend = data?.monthlyTrend || [];
  const maxTrend = trend.length > 0 ? Math.max(...trend.map((t) => Math.max(t.rescues, t.adoptions))) : 1;

  const hospitals = data?.hospitalAnimals || [];
  const maxHospital = hospitals.length > 0 ? Math.max(...hospitals.map((h) => h.count)) : 1;
  const cityStats = data?.cityStats || [];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-primary-500" size={28} />
          <h1 className="section-title">管理看板</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="card p-6 animate-pulse">
          <div className="w-24 h-5 bg-warm-200 rounded mb-4" />
          <div className="flex items-end gap-3 h-48">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonBar key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-primary-500" size={28} />
          <h1 className="section-title">管理看板</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/heatmap" className="btn-secondary flex items-center gap-1 text-sm">
            <Map size={16} />
            热力图
          </Link>
          <Link to="/admin/reports" className="btn-secondary flex items-center gap-1 text-sm">
            <Download size={16} />
            报表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="text-xs text-warm-400">{card.label}</div>
                  <div className={`stat-number text-xl ${card.color}`}>
                    {stats[card.key]}{card.suffix || ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-warm-800 mb-4">月度趋势</h2>
        {trend.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-warm-400 text-sm">暂无趋势数据</div>
        ) : (
          <>
            <div className="flex items-end gap-3 h-48">
              {trend.map((t) => (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end justify-center" style={{ height: '160px' }}>
                    <div
                      className="w-5 bg-primary-400 rounded-t transition-all"
                      style={{ height: `${(t.rescues / maxTrend) * 140}px` }}
                    />
                    <div
                      className="w-5 bg-success-400 rounded-t transition-all"
                      style={{ height: `${(t.adoptions / maxTrend) * 140}px` }}
                    />
                  </div>
                  <span className="text-xs text-warm-400">{t.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <span className="flex items-center gap-1 text-xs text-warm-500">
                <div className="w-3 h-3 rounded bg-primary-400" /> 救助
              </span>
              <span className="flex items-center gap-1 text-xs text-warm-500">
                <div className="w-3 h-3 rounded bg-success-400" /> 领养
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-bold text-warm-800 mb-4">医院动物数量</h2>
          {hospitals.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-warm-400 text-sm">暂无医院数据</div>
          ) : (
            <div className="space-y-3">
              {hospitals.map((h) => (
                <div key={h.hospital} className="flex items-center justify-between">
                  <span className="text-sm text-warm-700">{h.hospital}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-warm-200 rounded-full h-2">
                      <div
                        className="bg-primary-400 h-2 rounded-full"
                        style={{ width: `${(h.count / maxHospital) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-warm-800 w-8 text-right">{h.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="p-4 border-b border-warm-100">
            <h2 className="font-bold text-warm-800">城市统计</h2>
          </div>
          {cityStats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-warm-400 text-sm">暂无城市数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-warm-50">
                    <th className="text-left px-4 py-2 text-warm-500 font-medium">城市</th>
                    <th className="text-right px-4 py-2 text-warm-500 font-medium">救助</th>
                    <th className="text-right px-4 py-2 text-warm-500 font-medium">领养</th>
                    <th className="text-right px-4 py-2 text-warm-500 font-medium">成功率</th>
                  </tr>
                </thead>
                <tbody>
                  {cityStats.map((c) => (
                    <tr key={c.city} className="border-b border-warm-50">
                      <td className="px-4 py-2 text-warm-700">{c.city}</td>
                      <td className="px-4 py-2 text-right text-warm-600">{c.rescues}</td>
                      <td className="px-4 py-2 text-right text-warm-600">{c.adoptions}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`badge ${c.rate >= 70 ? 'badge-success' : c.rate >= 60 ? 'badge-pending' : 'badge-urgent'}`}>
                          {c.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
