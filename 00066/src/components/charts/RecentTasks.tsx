import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import type { Task, TaskStatus } from '../../types';

const statusConfig: Record<TaskStatus, { label: string; color: string; dotClass: string }> = {
  pending: { label: '待提交', color: 'text-gray-400', dotClass: 'status-pending' },
  geometry_check: { label: '几何校验', color: 'text-acoustic-warning', dotClass: 'status-warning' },
  bem_calculation: { label: 'BEM计算', color: 'text-acoustic-cyber', dotClass: 'status-running' },
  visualization: { label: '声场可视化', color: 'text-acoustic-neon', dotClass: 'status-running' },
  completed: { label: '已完成', color: 'text-acoustic-success', dotClass: 'status-completed' },
  abnormal: { label: '异常', color: 'text-acoustic-danger', dotClass: 'status-error' },
};

interface RecentTasksProps {
  tasks: Task[];
}

export default function RecentTasks({ tasks }: RecentTasksProps) {
  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">最近任务</h3>
        <button className="text-sm text-acoustic-cyber hover:text-acoustic-neon transition-colors flex items-center">
          查看全部
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      <div className="space-y-3">
        {recentTasks.map((task) => {
          const status = statusConfig[task.status];
          
          return (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-acoustic-midnight/30 hover:bg-acoustic-midnight/50 
                       transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`status-dot ${status.dotClass}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.roomName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {task.sourceParameters.frequencyHz}Hz · {task.sourceParameters.soundPowerLevelDb}dB
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-xs font-mono px-2 py-1 rounded ${status.color} bg-current/10`}>
                  {status.label}
                </span>
                
                <div className="w-16 h-1.5 bg-acoustic-steel/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-acoustic-cyber to-acoustic-neon rounded-full transition-all duration-500"
                    style={{ width: `${task.progressPercent}%` }}
                  ></div>
                </div>

                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-acoustic-steel/20 rounded transition-all">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          );
        })}

        {recentTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无任务数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
