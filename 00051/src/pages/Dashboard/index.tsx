import { useEffect, useState } from 'react';
import {
  Car,
  Fuel,
  Users,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { useDashboardStore } from '@/store/dashboardStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { useApplicationStore } from '@/store/applicationStore';
import { formatDateTime, formatRelativeTime } from '@/utils/date';
import { cn } from '@/lib/utils';

const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={cn('font-mono tabular-nums', className)}>{displayValue}</span>
  );
};

const Dashboard = () => {
  const { stats, refreshing, lastUpdated, refreshData, startAutoRefresh, stopAutoRefresh, violationRecords } =
    useDashboardStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { applications, fetchApplications } = useApplicationStore();

  useEffect(() => {
    fetchVehicles();
    fetchApplications();
    refreshData();
    startAutoRefresh();

    return () => {
      stopAutoRefresh();
    };
  }, []);

  const statCards = [
    {
      label: '空闲车辆',
      value: stats.idleCount,
      total: stats.totalVehicles,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: Car,
    },
    {
      label: '使用中',
      value: stats.inUseCount,
      total: stats.totalVehicles,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      icon: Fuel,
    },
    {
      label: '维修中',
      value: stats.maintenanceCount,
      total: stats.totalVehicles,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      icon: AlertTriangle,
    },
    {
      label: '今日用车',
      value: stats.todayUsage,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      icon: Users,
    },
    {
      label: '违规记录',
      value: stats.violationCount,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      icon: AlertTriangle,
    },
  ];

  const getCurrentUser = (vehicleId: string) => {
    const activeApp = applications.find(
      (app) =>
        app.vehicleId === vehicleId &&
        ['approved', 'in_progress'].includes(app.status)
    );
    return activeApp;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">首页看板</h1>
          <p className="text-slate-500 text-sm mt-1">实时监控车辆使用状态</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock size={16} />
            上次更新: {formatRelativeTime(lastUpdated)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={cn('mr-1', refreshing && 'animate-spin')} size={16} />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <Card
            key={card.label}
            className="overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Card.Body className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color}`}>
                  <card.icon className="text-white" size={24} />
                </div>
                {card.total !== undefined && (
                  <span className="text-xs text-slate-500">
                    {card.value}/{card.total}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  <AnimatedNumber value={card.value} />
                </p>
              </div>
              <div className={`mt-3 h-1.5 rounded-full ${card.bgColor} overflow-hidden`}>
                <div
                  className={`h-full bg-gradient-to-r ${card.color} transition-all duration-1000 ease-out`}
                  style={{
                    width: card.total
                      ? `${(card.value / card.total) * 100}%`
                      : '100%',
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>车辆实时状态</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {vehicles
                .filter((v) => v.status !== 'disabled')
                .map((vehicle, index) => {
                  const activeApp = getCurrentUser(vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      className={cn(
                        'p-4 rounded-lg border border-slate-200 transition-all duration-300',
                        refreshing && 'animate-pulse'
                      )}
                      style={{
                        animationDelay: `${index * 30}ms`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800">
                          {vehicle.plateNumber}
                        </span>
                        <StatusBadge status={vehicle.status} />
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        {vehicle.model} · {vehicle.seats}座
                      </p>
                      {activeApp && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded">
                          <User size={14} />
                          <span>{activeApp.userName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>违规记录</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {violationRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  暂无违规记录
                </div>
              ) : (
                violationRecords.map((violation) => (
                  <div
                    key={violation.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-red-100 rounded-lg">
                          <AlertTriangle className="text-red-600" size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {violation.userName} - {violation.vehiclePlate}
                          </p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {violation.type}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {violation.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(violation.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className="text-center text-xs text-slate-400">
        数据每 10 秒自动刷新 · {refreshing && <span className="text-blue-500">正在刷新...</span>}
      </div>
    </div>
  );
};

export default Dashboard;
