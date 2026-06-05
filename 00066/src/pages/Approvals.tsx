import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  User,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2
} from 'lucide-react';
import { get, post } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Approval, ApprovalDecision } from '../types';

interface ApprovalStats {
  monthlyApproved: number;
  monthlyRejected: number;
  avgProcessingTimeHours: number;
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadApprovals();
    loadStats();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<Approval[]>('/approvals/pending');
      setApprovals(response.data);
      if (response.data.length > 0 && !selectedApproval) {
        setSelectedApproval(response.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取审批列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await get<ApprovalStats>('/approvals/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load approval stats:', err);
    }
  };

  const handleSubmitApproval = async (decision: ApprovalDecision) => {
    if (!selectedApproval) return;

    setSubmitting(true);
    try {
      await post(`/approvals/${selectedApproval.taskId}/level${selectedApproval.level}`, {
        decision,
        comment,
      });
      showToast(decision === 'approved' ? '审批已通过' : decision === 'rejected' ? '审批已退回' : '已升级处理', 'success');
      setComment('');
      await loadApprovals();
      await loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '提交审批失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载审批数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={loadApprovals} className="mt-4 btn-primary">重试</button>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => !a.decision);
  const completedApprovals = approvals.filter(a => a.decision);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">审批工作流</h1>
          <p className="text-gray-400 text-sm">两级电子签核：设计师验证 → 负责人确认</p>
        </div>

          <div className="flex items-center space-x-2">
            <span className="status-dot status-running"></span>
            <span className="text-sm font-mono text-gray-400">待处理: {pendingApprovals.length}项</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-acoustic-cyber" />
            待办事项
          </h3>

          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 group
                  ${selectedApproval?.id === approval.id 
                    ? 'border-acoustic-cyber bg-acoustic-cyber/5' 
                    : 'border-acoustic-steel/20 hover:border-acoustic-steel/40'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    approval.level === 1 ? 'bg-acoustic-neon/20 text-acoustic-neon' : 'bg-acoustic-data/20 text-acoustic-data'
                  }`}>
                    第{approval.level}级审批
                  </span>
                  
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>

                <p className="font-medium text-white mb-1">任务 #{approval.taskId}</p>
                <p className="text-xs text-gray-400">等待 {approval.approverName} 审批</p>
              </div>
            ))}

            {completedApprovals.length > 0 && (
              <>
                <div className="pt-4 mt-4 border-t border-acoustic-steel/30">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">已完成</p>
                </div>

                {completedApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    onClick={() => setSelectedApproval(approval)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 opacity-60 hover:opacity-100
                      ${approval.decision === 'approved' ? 'border-acoustic-success/30' : 'border-acoustic-danger/30'}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        approval.level === 1 ? 'bg-acoustic-neon/20 text-acoustic-neon' : 'bg-acoustic-data/20 text-acoustic-data'
                      }`}>
                        第{approval.level}级
                      </span>
                      
                      {approval.decision === 'approved' ? (
                        <CheckCircle2 className="w-4 h-4 text-acoustic-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-acoustic-danger" />
                      )}
                    </div>

                    <p className="font-medium text-white mb-1">任务 #{approval.taskId}</p>
                    <p className="text-xs text-gray-400">已由 {approval.approverName} 处理</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedApproval ? (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-acoustic-steel/30">
                <h3 className="text-xl font-semibold text-white">审批详情</h3>
                
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{selectedApproval.approverName}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedApproval.level === 1 ? 'bg-acoustic-neon/20 text-acoustic-neon' : 'bg-acoustic-data/20 text-acoustic-data'
                  }`}>
                    {selectedApproval.level === 1 ? '一级审批(设计师)' : '二级审批(负责人)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">任务ID</label>
                    <p className="font-mono text-white">{selectedApproval.taskId}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">关联房间</label>
                    <p className="text-white">录音棚B</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">提交时间</label>
                    <p className="font-mono text-gray-300">2024-01-19 16:35</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">当前状态</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedApproval.decision === 'approved' ? 'bg-acoustic-success/20 text-acoustic-success' :
                      selectedApproval.decision === 'rejected' ? 'bg-acoustic-danger/20 text-acoustic-danger' :
                      'bg-acoustic-warning/20 text-acoustic-warning'
                    }`}>
                      {selectedApproval.decision === 'approved' ? '已通过' :
                       selectedApproval.decision === 'rejected' ? '已退回' :
                       '待审批'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">截止时间</label>
                    <p className="font-mono text-acoustic-warning">2024-01-20 01:35 (剩余8小时)</p>
                  </div>

                  {selectedApproval.approvedAt && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">审批时间</label>
                      <p className="font-mono text-gray-300">
                        {new Date(selectedApproval.approvedAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 p-4 bg-acoustic-midnight/30 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-acoustic-cyber" />
                  任务摘要
                </h4>
                <dl className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500 text-xs">频率</dt>
                    <dd className="font-mono text-white mt-0.5">500 Hz</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">SPL均值</dt>
                    <dd className="font-mono text-acoustic-cyber mt-0.5">76.8 dBA</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">均匀度</dt>
                    <dd className="font-mono text-acoustic-success mt-0.5">89.2%</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">RT60</dt>
                    <dd className="font-mono text-white mt-0.5">0.68s</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">SWR</dt>
                    <dd className="font-mono text-acoustic-neon mt-0.5">2.1</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">预警数</dt>
                    <dd className="font-mono text-white mt-0.5">0</dd>
                  </div>
                </dl>
              </div>

              {!selectedApproval.decision && (
                <div className="space-y-4 pt-4 border-t border-acoustic-steel/30">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      审批意见
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="请输入您的审批意见或修改建议..."
                      rows={4}
                      className="input-field resize-none"
                    ></textarea>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSubmitApproval('approved')}
                      disabled={submitting}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>通过</span>
                    </button>

                    <button
                      onClick={() => handleSubmitApproval('rejected')}
                      disabled={submitting}
                      className="btn-danger flex-1 flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>退回</span>
                    </button>

                    <button
                      onClick={() => handleSubmitApproval('escalated')}
                      disabled={submitting}
                      className="btn-secondary flex items-center justify-center space-x-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>升级</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedApproval.decision && (
                <div className="pt-4 border-t border-acoustic-steel/30">
                  <div className={`p-4 rounded-lg ${
                    selectedApproval.decision === 'approved' ? 'bg-acoustic-success/10' : 'bg-acoustic-danger/10'
                  }`}>
                    <p className={`font-semibold mb-2 flex items-center ${
                      selectedApproval.decision === 'approved' ? 'text-acoustic-success' : 'text-acoustic-danger'
                    }`}>
                      {selectedApproval.decision === 'approved' ? (
                        <><CheckCircle2 className="w-5 h-5 mr-2" />审批通过</>
                      ) : (
                        <><XCircle className="w-5 h-5 mr-2" />审批退回</>
                      )}
                    </p>
                    
                    {selectedApproval.comment && (
                      <p className="text-sm text-gray-300 italic mt-2">
                        "{selectedApproval.comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">选择一个审批项目查看详情</p>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">审批统计</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-acoustic-success/10 rounded-lg">
                <p className="text-2xl font-bold data-value text-acoustic-success">{stats?.monthlyApproved || 0}</p>
                <p className="text-xs text-gray-400 mt-1">本月通过</p>
              </div>

              <div className="text-center p-4 bg-acoustic-danger/10 rounded-lg">
                <p className="text-2xl font-bold data-value text-acoustic-danger">{stats?.monthlyRejected || 0}</p>
                <p className="text-xs text-gray-400 mt-1">本月退回</p>
              </div>

              <div className="text-center p-4 bg-acoustic-warning/10 rounded-lg">
                <p className="text-2xl font-bold data-value text-acoustic-warning">{stats?.avgProcessingTimeHours || 0}h</p>
                <p className="text-xs text-gray-400 mt-1">平均耗时</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
