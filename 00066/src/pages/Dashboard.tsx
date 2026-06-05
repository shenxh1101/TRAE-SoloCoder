import { useEffect, useState } from 'react';
import { PlusCircle, Zap, FileText, Activity, Loader2 } from 'lucide-react';
import { useTaskApi, useAlerts } from '../hooks/useApi';
import { get } from '../services/api';
import type { DashboardStats } from '../types';
import KPICards from '../components/charts/KPICards';
import DashboardCharts from '../components/charts/DashboardCharts';
import RecentTasks from '../components/charts/RecentTasks';
import RecentAlerts from '../components/charts/RecentAlerts';

const quickActions = [
  {
    label: '新建模拟任务',
    icon: PlusCircle,
    path: '/tasks/new',
    color: 'from-acoustic-cyber to-acoustic-neon',
    description: '上传模型开始计算'
  },
  {
    label: '查看实时监控',
    icon: Activity,
    path: '/monitoring',
    color: 'from-acoustic-success to-emerald-400',
    description: '声场数据实时追踪'
  },
  {
    label: '生成报告',
    icon: FileText,
    path: '/reports',
    color: 'from-acoustic-data to-purple-400',
    description: '导出综合分析PDF'
  },
  {
    label: '智能推荐',
    icon: Zap,
    path: '/recommendations',
    color: 'from-acoustic-warning to-orange-400',
    description: 'AI优化材料方案'
  },
];

export default function Dashboard() {
  const { tasks, loading: taskLoading, fetchTasks } = useTaskApi();
  const { alerts, fetchAlerts } = useAlerts(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        setError(null);
        await Promise.all([
          fetchTasks({ page: 1, pageSize: 5 }),
          fetchAlerts(),
        ]);

        const statsResponse = await get<DashboardStats>('/analytics/dashboard');
        setDashboardStats(statsResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载仪表盘数据失败');
      } finally {
        setStatsLoading(false);
      }
    };

    initDashboard();
  }, [fetchTasks, fetchAlerts]);

  if (statsLoading || taskLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn-primary"
        >
          重试
        </button>
      </div>
    );
  }

  const defaultStats: DashboardStats = {
    totalTasksToday: 0,
    activeTasks: 0,
    pendingAlerts: 0,
    completionRate: 0,
    avgResponseTime: 0,
    complianceRate: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono glow-text">
            声学模拟控制台
          </h1>
          <p className="text-gray-400 text-sm">
            高精度室内声场模拟与自适应降噪决策平台 · 实时监控中
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="status-dot status-running"></span>
          <span className="text-sm font-mono text-gray-400">系统在线</span>
        </div>
      </div>

      <KPICards stats={dashboardStats || defaultStats} />

      <DashboardCharts />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTasks tasks={tasks.slice(0, 5)} />
        </div>

        <div className="space-y-6">
          <RecentAlerts alerts={alerts.slice(0, 5)} />

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">快捷操作</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <a
                    key={action.label}
                    href={action.path}
                    className="group p-4 rounded-lg bg-acoustic-midnight/30 hover:bg-gradient-to-br
                             hover:from-acoustic-cyber/10 hover:to-transparent border border-acoustic-steel/20
                             hover:border-acoustic-cyber/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color}
                                  flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white group-hover:text-acoustic-cyber transition-colors">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
