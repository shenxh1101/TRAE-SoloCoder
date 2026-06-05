import React, { useMemo } from 'react';
import { LayoutDashboard, FlaskConical, Play, CheckCircle, Clock, Bell, ChevronRight, AlertTriangle, Zap } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PLASMA_TYPE_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { simulations, notifications, markNotificationRead } = useSimulationStore();

  const stats = useMemo(() => {
    const total = simulations.length;
    const running = simulations.filter(s => ['PARAM_VALIDATION', 'GRID_GENERATION', 'COMPUTING', 'DATA_DIAGNOSIS'].includes(s.status)).length;
    const completed = simulations.filter(s => s.status === 'COMPLETED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const completedWithResult = simulations.filter(s => s.status === 'COMPLETED' && s.result);
    const avgConfinementTime = completedWithResult.length > 0
      ? (completedWithResult.reduce((sum, s) => sum + (s.result?.confinementTime || 0), 0) / completedWithResult.length).toFixed(4)
      : '0.0000';

    return { total, running, completionRate, avgConfinementTime };
  }, [simulations]);

  const recentSimulations = useMemo(() => {
    return [...simulations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [simulations]);

  const recentNotifications = useMemo(() => {
    return [...notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [notifications]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SIMULATION_COMPLETE':
        return <CheckCircle size={18} className="text-accent-green" />;
      case 'PERFORMANCE_ALERT':
        return <AlertTriangle size={18} className="text-accent-orange" />;
      case 'CONVERGENCE_ISSUE':
        return <AlertTriangle size={18} className="text-accent-red" />;
      case 'INSTABILITY_ALERT':
        return <Zap size={18} className="text-accent-yellow" />;
      default:
        return <Bell size={18} className="text-accent-cyan" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-3">
            <LayoutDashboard size={28} className="text-primary" />
            仪表盘
          </h1>
          <p className="text-text-secondary mt-1">等离子体模拟平台概览</p>
        </div>
        <div className="text-sm text-text-tertiary">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总任务数"
          value={stats.total}
          unit="个"
          icon={FlaskConical}
          color="primary"
          trend={{ value: 12.5, isPositive: true }}
          className="animate-delay-100"
        />
        <StatCard
          title="运行中任务"
          value={stats.running}
          unit="个"
          icon={Play}
          color="cyan"
          trend={{ value: 8.2, isPositive: true }}
          className="animate-delay-200"
        />
        <StatCard
          title="完成率"
          value={stats.completionRate}
          unit="%"
          icon={CheckCircle}
          color="green"
          trend={{ value: 5.3, isPositive: true }}
          className="animate-delay-300"
        />
        <StatCard
          title="平均约束时间"
          value={stats.avgConfinementTime}
          unit="s"
          icon={Clock}
          color="purple"
          trend={{ value: -2.1, isPositive: false }}
          className="animate-delay-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up">
          <div className="card-header">
            <h2 className="section-title flex items-center gap-2">
              <FlaskConical size={20} className="text-primary" />
              最近任务
            </h2>
            <button className="text-sm text-primary hover:text-primary-light transition-colors flex items-center gap-1">
              查看全部 <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recentSimulations.length > 0 ? (
              recentSimulations.map((sim, index) => (
                <div
                  key={sim.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl bg-background-secondary/50 border border-transparent hover:border-primary/30 hover:bg-background-secondary transition-all duration-300 group',
                    `animate-slide-up animate-delay-${(index + 1) * 100}`
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent-cyan/20 flex items-center justify-center">
                      <FlaskConical size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors">
                        {sim.name}
                      </h3>
                      <p className="text-sm text-text-tertiary">
                        {PLASMA_TYPE_LABELS[sim.plasmaType]} · {formatTime(sim.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {sim.progress > 0 && sim.progress < 100 && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-background-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary transition-all duration-500"
                            style={{ width: `${sim.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary font-mono">{sim.progress}%</span>
                      </div>
                    )}
                    <StatusBadge status={sim.status} size="md" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-tertiary">
                <FlaskConical size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无模拟任务</p>
                <p className="text-sm mt-1">点击"新建模拟"开始创建</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up animate-delay-200">
          <div className="card-header">
            <h2 className="section-title flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              系统通知
            </h2>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-accent-red/20 text-accent-red rounded-full">
                {notifications.filter(n => !n.read).length} 条未读
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-background-secondary',
                    notification.read
                      ? 'bg-background-secondary/30 border-transparent'
                      : 'bg-background-secondary border-primary/30 hover:border-primary/50'
                  )}
                  onClick={() => markNotificationRead(notification.id)}
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn(
                          'font-medium text-sm truncate',
                          notification.read ? 'text-text-secondary' : 'text-text-primary'
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-text-muted mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-tertiary">
                <Bell size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无通知</p>
                <p className="text-sm mt-1">系统运行正常</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
