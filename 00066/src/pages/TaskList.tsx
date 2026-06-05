import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useTaskApi } from '../hooks/useApi';
import type { Task, TaskStatus } from '../types';

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待提交', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  geometry_check: { label: '几何校验', color: 'text-acoustic-warning', bg: 'bg-acoustic-warning/10' },
  bem_calculation: { label: 'BEM计算', color: 'text-acoustic-cyber', bg: 'bg-acoustic-cyber/10' },
  visualization: { label: '声场可视化', color: 'text-acoustic-neon', bg: 'bg-acoustic-neon/10' },
  completed: { label: '已完成', color: 'text-acoustic-success', bg: 'bg-acoustic-success/10' },
  abnormal: { label: '异常', color: 'text-acoustic-danger', bg: 'bg-acoustic-danger/10' },
};

export default function TaskList() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    tasks,
    loading,
    error,
    total,
    currentPage: apiPage,
    fetchTasks
  } = useTaskApi();

  useEffect(() => {
    fetchTasks({
      page: currentPage,
      pageSize,
      ...(statusFilter !== 'all' && { status: statusFilter })
    });
  }, [currentPage, statusFilter, fetchTasks]);

  const handleSearch = () => {
    fetchTasks({
      page: 1,
      pageSize,
      ...(statusFilter !== 'all' && { status: statusFilter })
    });
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchTasks({
      page: currentPage,
      pageSize,
      ...(statusFilter !== 'all' && { status: statusFilter })
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载任务列表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={handleRefresh} className="mt-4 btn-primary">重试</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">任务管理中心</h1>
          <p className="text-gray-400 text-sm">管理和追踪所有声场模拟任务的完整生命周期</p>
        </div>

        <a href="/tasks/new" className="btn-primary flex items-center space-x-2">
          <PlusCircle className="w-4 h-4" />
          <span>新建任务</span>
        </a>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="搜索房间名称、创建者..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TaskStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded
                       text-white text-sm focus:outline-none focus:border-acoustic-cyber"
            >
              <option value="all">全部状态</option>
              <option value="pending">待提交</option>
              <option value="geometry_check">几何校验</option>
              <option value="bem_calculation">BEM计算</option>
              <option value="visualization">声场可视化</option>
              <option value="completed">已完成</option>
              <option value="abnormal">异常</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-acoustic-cyber/20 text-acoustic-cyber' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-acoustic-cyber/20 text-acoustic-cyber' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>

            <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Eye className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">暂无任务数据</p>
            <p className="text-sm">创建您的第一个模拟任务开始使用</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-acoustic-steel/30">
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    房间信息
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    声源参数
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    进度
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    创建者
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-acoustic-steel/20">
                {tasks.map((task) => {
                  const status = statusConfig[task.status];

                  return (
                    <tr key={task.id} className="hover:bg-acoustic-midnight/20 transition-colors group">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-white">{task.roomName}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{task.currentStage}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-mono data-value">
                          <span className="text-gray-300">{task.sourceParameters.frequencyHz} Hz</span>
                          <span className="text-gray-500 mx-1">·</span>
                          <span className="text-acoustic-cyber">{task.sourceParameters.soundPowerLevelDb} dB</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            task.status === 'bem_calculation' || task.status === 'visualization' ? 'bg-current animate-pulse-slow' : 'bg-current'
                          }`}></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 max-w-[120px] h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                task.status === 'abnormal'
                                  ? 'bg-gradient-to-r from-acoustic-danger to-red-400'
                                  : task.status === 'completed'
                                  ? 'bg-gradient-to-r from-acoustic-success to-emerald-400'
                                  : 'bg-gradient-to-r from-acoustic-cyber to-acoustic-neon'
                              }`}
                              style={{ width: `${task.progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono text-gray-400 w-10 text-right">
                            {task.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-300">{task.creatorName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`/tasks/${task.id}`} className="p-1.5 hover:bg-acoustic-cyber/20 rounded transition-colors" title="查看详情">
                            <Eye className="w-4 h-4 text-acoustic-cyber" />
                          </a>
                          <button className="p-1.5 hover:bg-acoustic-warning/20 rounded transition-colors" title="编辑">
                            <Edit className="w-4 h-4 text-acoustic-warning" />
                          </button>
                          <button className="p-1.5 hover:bg-acoustic-danger/20 rounded transition-colors" title="删除">
                            <Trash2 className="w-4 h-4 text-acoustic-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => {
              const status = statusConfig[task.status];

              return (
                <a key={task.id} href={`/tasks/${task.id}`} className="glass-card p-4 card-hover-effect block">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white">{task.roomName}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.color} ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">{task.currentStage}</p>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">进度</span>
                      <span className="font-mono text-white">{task.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-acoustic-steel/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          task.status === 'abnormal' ? 'bg-acoustic-danger' : 'bg-gradient-to-r from-acoustic-cyber to-acoustic-neon'
                        }`}
                        style={{ width: `${task.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-acoustic-steel/20">
                    <span>{task.creatorName}</span>
                    <span className="font-mono">{new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-acoustic-steel/30">
          <p className="text-sm text-gray-400">
            显示 <span className="font-mono text-white">{tasks.length}</span> 条记录，
            共 <span className="font-mono text-white">{total}</span> 条
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded hover:bg-acoustic-steel/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded bg-acoustic-cyber/20 text-acoustic-cyber text-sm font-mono">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded hover:bg-acoustic-steel/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
