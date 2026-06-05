import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Eye,
  MessageSquare,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAlerts } from '../hooks/useApi';
import { useToast } from '../components/common/Toast';
import type { Alert, AlertLevel, AlertStatus } from '../types';

const levelConfig: Record<AlertLevel, { label: string; bgColor: string; textColor: string; icon: string }> = {
  red: { label: '严重', bgColor: 'bg-acoustic-danger/10', textColor: 'text-acoustic-danger', icon: '🔴' },
  orange: { label: '警告', bgColor: 'bg-acoustic-warning/10', textColor: 'text-acoustic-warning', icon: '🟠' },
  yellow: { label: '注意', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', icon: '🟡' },
};

const statusConfig: Record<AlertStatus, { label: string; color: string; dotClass: string }> = {
  pending: { label: '待处理', color: 'text-gray-400', dotClass: 'bg-gray-400 animate-pulse-slow' },
  reviewing: { label: '复核中', color: 'text-acoustic-cyber', dotClass: 'bg-acoustic-cyber animate-pulse-slow' },
  resolved: { label: '已解决', color: 'text-acoustic-success', dotClass: 'bg-acoustic-success' },
  dismissed: { label: '已忽略', color: 'text-gray-500', dotClass: 'bg-gray-500' },
};

export default function AlertCenter() {
  const [filterLevel, setFilterLevel] = useState<AlertLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const { alerts, stats, loading, error, fetchAlerts, reviewAlert } = useAlerts(0);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAlerts({
      level: filterLevel !== 'all' ? filterLevel : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    });
  }, [filterLevel, filterStatus, fetchAlerts]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesLevel = filterLevel === 'all' || alert.alertLevel === filterLevel;
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    return matchesLevel && matchesStatus;
  });

  const handleReview = async (decision: 'resolved' | 'dismissed') => {
    if (!selectedAlert) return;

    setIsReviewing(true);
    try {
      await reviewAlert(selectedAlert.id, { status: decision, comment: reviewComment });
      showToast(decision === 'resolved' ? '预警已标记为已解决' : '预警已忽略', 'success');
      setReviewComment('');
      setSelectedAlert(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '审核操作失败', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载预警数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={() => fetchAlerts()}
          className="mt-4 btn-primary"
        >
          重试
        </button>
      </div>
    );
  }

  const alertStats = {
    total: alerts.length,
    pending: alerts.filter(a => a.status === 'pending').length,
    red: alerts.filter(a => a.alertLevel === 'red' && a.status !== 'resolved').length,
    orange: alerts.filter(a => a.alertLevel === 'orange' && a.status !== 'resolved').length,
    yellow: alerts.filter(a => a.alertLevel === 'yellow' && a.status !== 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">预警中心</h1>
          <p className="text-gray-400 text-sm">管理和响应所有声场安全预警事件</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-sm font-mono">
            <span className={`px-3 py-1.5 rounded-lg ${alertStats.red > 0 ? 'bg-acoustic-danger/20 text-acoustic-danger' : 'bg-acoustic-steel/20 text-gray-500'}`}>
              🔴 {alertStats.red}
            </span>
            <span className={`px-3 py-1.5 rounded-lg ${alertStats.orange > 0 ? 'bg-acoustic-warning/20 text-acoustic-warning' : 'bg-acoustic-steel/20 text-gray-500'}`}>
              🟠 {alertStats.orange}
            </span>
            <span className={`px-3 py-1.5 rounded-lg ${alertStats.yellow > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-acoustic-steel/20 text-gray-500'}`}>
              🟡 {alertStats.yellow}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-gray-400 mb-1">总预警数</p>
          <p className="text-2xl font-bold data-value text-white">{alertStats.total}</p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-gray-400">
          <p className="text-sm text-gray-400 mb-1">待处理</p>
          <p className="text-2xl font-bold data-value text-gray-400">{alertStats.pending}</p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-acoustic-cyber">
          <p className="text-sm text-gray-400 mb-1">复核中</p>
          <p className="text-2xl font-bold data-value text-acoustic-cyber">
            {alerts.filter(a => a.status === 'reviewing').length}
          </p>
        </div>
        <div className="glass-card p-4 border-l-2 border-l-acoustic-success">
          <p className="text-sm text-gray-400 mb-1">已解决</p>
          <p className="text-2xl font-bold data-value text-acoustic-success">
            {alerts.filter(a => a.status === 'resolved').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">预警列表</h3>
            
            <div className="flex items-center space-x-3">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as AlertLevel | 'all')}
                className="px-3 py-1.5 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-xs 
                         text-white focus:outline-none focus:border-acoustic-cyber"
              >
                <option value="all">全部级别</option>
                <option value="red">🔴 严重</option>
                <option value="orange">🟠 警告</option>
                <option value="yellow">🟡 注意</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'all')}
                className="px-3 py-1.5 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-xs 
                         text-white focus:outline-none focus:border-acoustic-cyber"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="reviewing">复核中</option>
                <option value="resolved">已解决</option>
                <option value="dismissed">已忽略</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredAlerts.map((alert) => {
              const level = levelConfig[alert.alertLevel];
              const status = statusConfig[alert.status];
              
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 group
                    ${level.bgColor} border-current/20 hover:border-current/40
                    ${selectedAlert?.id === alert.id ? 'ring-2 ring-acoustic-cyber' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{level.icon}</span>
                      <span className={`font-semibold text-sm ${level.textColor}`}>
                        {level.label}: {alert.alertType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`status-dot ${status.dotClass}`}></span>
                      <span className={`text-xs ${status.color}`}>{status.label}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 mb-2">
                    <span className="font-medium">{alert.roomName}</span> · {alert.taskName}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="font-mono space-x-3">
                      <span className="text-gray-400">阈值:</span>
                      <span className={level.textColor}>{alert.thresholdValue}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400">实际:</span>
                      <span className={`font-bold ${level.textColor}`}>{alert.actualValue}</span>
                    </div>

                    <div className="flex items-center text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(alert.triggeredAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  {alert.reviewComment && (
                    <div className="mt-2 pt-2 border-t border-current/10 text-xs text-gray-400 italic">
                      💬 {alert.reviewComment}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无匹配的预警记录</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {selectedAlert ? (
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-acoustic-cyber" />
                预警详情
              </h3>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${levelConfig[selectedAlert.alertLevel].bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{levelConfig[selectedAlert.alertLevel].icon}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${levelConfig[selectedAlert.alertLevel].textColor} bg-current/20`}>
                      {levelConfig[selectedAlert.alertLevel].label}
                    </span>
                  </div>
                  <p className="font-semibold text-white">
                    {selectedAlert.alertType.replace('_', ' ').toUpperCase()}
                  </p>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                    <dt className="text-gray-400">关联任务</dt>
                    <dd className="font-medium text-white">{selectedAlert.taskName}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                    <dt className="text-gray-400">房间名称</dt>
                    <dd className="font-medium text-white">{selectedAlert.roomName}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                    <dt className="text-gray-400">阈值</dt>
                    <dd className="data-value text-white">{selectedAlert.thresholdValue}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                    <dt className="text-gray-400">实测值</dt>
                    <dd className={`data-value font-bold ${levelConfig[selectedAlert.alertLevel].textColor}`}>
                      {selectedAlert.actualValue}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                    <dt className="text-gray-400">触发时间</dt>
                    <dd className="font-mono text-gray-300">
                      {new Date(selectedAlert.triggeredAt).toLocaleString('zh-CN')}
                    </dd>
                  </div>
                  
                  {selectedAlert.reviewerName && (
                    <>
                      <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                        <dt className="text-gray-400">复核人</dt>
                        <dd className="text-acoustic-cyber">{selectedAlert.reviewerName}</dd>
                      </div>
                      <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                        <dt className="text-gray-400">响应时间</dt>
                        <dd className="data-value text-white">
                          {Math.round((selectedAlert.responseTimeSec || 0) / 60)} 分钟
                        </dd>
                      </div>
                    </>
                  )}
                </dl>

                {selectedAlert.reviewComment && (
                  <div className="p-3 bg-acoustic-midnight/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1 flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      处理意见
                    </p>
                    <p className="text-sm text-gray-300">{selectedAlert.reviewComment}</p>
                  </div>
                )}

                {selectedAlert.status === 'pending' && (
                  <div className="space-y-2 pt-4 border-t border-acoustic-steel/30">
                    <button className="btn-primary w-full text-sm">
                      开始复核
                    </button>
                    <button className="btn-secondary w-full text-sm">
                      查看任务详情
                      <ExternalLink className="w-3 h-3 ml-1 inline" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 text-sm">选择一个预警查看详情</p>
            </div>
          )}

          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              响应时效统计
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">平均响应时间</span>
                <span className="text-white">18.5 分钟</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">最快响应</span>
                <span className="text-acoustic-success">3.2 分钟</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">最慢响应</span>
                <span className="text-acoustic-danger">42.7 分钟</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">超时率</span>
                <span className="text-acoustic-warning">5.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
