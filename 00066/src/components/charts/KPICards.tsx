import { 
  ListTodo, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import type { DashboardStats } from '../../types';

interface KPICardProps {
  stats: DashboardStats;
}

export default function KPICards({ stats }: KPICardProps) {
  const cards = [
    {
      title: '今日任务',
      value: stats.totalTasksToday,
      icon: ListTodo,
      color: 'from-acoustic-cyber to-blue-500',
      bgColor: 'bg-acoustic-cyber/10',
      textColor: 'text-acoustic-cyber',
      change: '+12%',
      trend: 'up',
    },
    {
      title: '进行中',
      value: stats.activeTasks,
      icon: Activity,
      color: 'from-acoustic-neon to-green-400',
      bgColor: 'bg-acoustic-neon/10',
      textColor: 'text-acoustic-neon',
      change: '+3',
      trend: 'up',
    },
    {
      title: '待处理预警',
      value: stats.pendingAlerts,
      icon: AlertTriangle,
      color: 'from-acoustic-warning to-orange-500',
      bgColor: 'bg-acoustic-warning/10',
      textColor: 'text-acoustic-warning',
      change: '-2',
      trend: 'down',
    },
    {
      title: '完成率',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'from-acoustic-success to-emerald-400',
      bgColor: 'bg-acoustic-success/10',
      textColor: 'text-acoustic-success',
      change: '+2.3%',
      trend: 'up',
    },
    {
      title: '平均响应时间',
      value: `${Math.round(stats.avgResponseTime / 60)}分钟`,
      icon: Clock,
      color: 'from-acoustic-data to-purple-400',
      bgColor: 'bg-acoustic-data/10',
      textColor: 'text-acoustic-data',
      change: '-18秒',
      trend: 'down',
    },
    {
      title: '达标率',
      value: `${stats.complianceRate}%`,
      icon: CheckCircle2,
      color: 'from-pink-500 to-rose-400',
      bgColor: 'bg-pink-500/10',
      textColor: 'text-pink-400',
      change: '+1.5%',
      trend: 'up',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div
            key={card.title}
            className="glass-card p-4 card-hover-effect animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
              <div className={`flex items-center text-xs font-mono ${
                card.trend === 'up' ? 'text-acoustic-success' : 'text-acoustic-danger'
              }`}>
                {card.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {card.change}
              </div>
            </div>
            
            <div>
              <p className="text-2xl font-bold data-value text-white mb-1">{card.value}</p>
              <p className="text-xs text-gray-400 font-medium">{card.title}</p>
            </div>

            <div className="mt-3 h-1 bg-acoustic-steel/20 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all duration-1000`}
                style={{ width: typeof card.value === 'string' ? card.value : `${(card.value / 20) * 100}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
