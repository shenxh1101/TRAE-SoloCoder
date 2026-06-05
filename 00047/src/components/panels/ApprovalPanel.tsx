import { useState } from 'react';
import { CheckCircle, XCircle, Clock, ChevronRight, Send, AlertTriangle, ArrowRight, FileCheck, Users, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ControlPlan, ApprovalStatus, UserRole, ApprovalRecord } from '@/types';
import { mockControlPlans, mockUsers } from '@/data/mockData';
import { useAppStore } from '@/store';
import { transitionApprovalStatus, canUserPerformAction, getApprovalLevelDescription, getAvailableActions, getApprovalStatusName } from '@/utils/approvalStateMachine';
import CyberButton from '../ui/CyberButton';

interface ApprovalPanelProps {
  onApprove?: (planId: string, level: string, approver: string, comments: string) => void;
  onReject?: (planId: string, level: string, approver: string, comments: string) => void;
}

const levelIcons = [
  { icon: Users, name: '指挥中心' },
  { icon: Building, name: '交通局' },
  { icon: Building, name: '市政府' },
];

const statusColors: Record<ApprovalStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending_command: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved_command: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected_command: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending_bureau: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved_bureau: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected_bureau: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending_government: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved_government: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected_government: 'bg-red-500/20 text-red-400 border-red-500/30',
  implemented: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const statusIcons: Record<ApprovalStatus, typeof Clock> = {
  draft: FileCheck,
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  pending_command: Clock,
  approved_command: CheckCircle,
  rejected_command: XCircle,
  pending_bureau: Clock,
  approved_bureau: CheckCircle,
  rejected_bureau: XCircle,
  pending_government: Clock,
  approved_government: CheckCircle,
  rejected_government: XCircle,
  implemented: CheckCircle,
};

export default function ApprovalPanel({ onApprove, onReject }: ApprovalPanelProps) {
  const [selectedPlan, setSelectedPlan] = useState<ControlPlan | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const setControlPlans = useAppStore((state) => state.setControlPlans);
  const addApprovalRecord = useAppStore((state) => state.addApprovalRecord);
  const updatePlanStatus = useAppStore((state) => state.updatePlanStatus);
  const executePlan = useAppStore((state) => state.executePlan);
  const startRoadClosureAnimation = useAppStore((state) => state.startRoadClosureAnimation);
  const addNotification = useAppStore((state) => state.addNotification);

  const handleApprovalAction = (plan: ControlPlan, action: 'approve' | 'reject' | 'push' | 'implement' | 'submit') => {
    if (!currentUser) return;

    const newStatus = transitionApprovalStatus(plan.status as ApprovalStatus, action, currentUser.role);
    
    if (newStatus === plan.status) return;

    const levelIdx = plan.currentLevel;
    const levelNames = ['command_center', 'transport_bureau', 'city_government'] as const;
    const level = levelNames[levelIdx] || 'command_center';

    const newRecord: ApprovalRecord = {
      status: newStatus,
      level,
      approver: currentUser.name,
      approverRole: currentUser.role,
      comments: approvalComment || (action === 'approve' ? '同意' : action === 'reject' ? '驳回' : ''),
      timestamp: new Date(),
    };

    addApprovalRecord(plan.id, newRecord);
    updatePlanStatus(plan.id, newStatus);

    if (action === 'push') {
      setControlPlans(
        mockControlPlans.map((p) =>
          p.id === plan.id ? { ...p, currentLevel: Math.min(2, p.currentLevel + 1) } : p
        )
      );
    }

    if (action === 'implement' && plan.roadClosures) {
      startRoadClosureAnimation(plan.roadClosures.map((rc) => rc.roadId));
      executePlan(plan.id);
      addNotification('warning', '管控方案已实施', plan.name + ' 已开始执行');
    }

    setSelectedPlan(null);
    setShowDetailModal(false);
    setApprovalComment('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrentUserCanAct = (plan: ControlPlan) => {
    if (!currentUser) return false;
    const actions = getAvailableActions(plan.status as ApprovalStatus, currentUser.role);
    return actions.length > 0;
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-cyan-300 font-display tracking-wide">审批中心</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {levelIcons.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-1.5 p-2 rounded bg-cyber-bg/30 border border-cyber-border">
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-400">{item.name}</span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {mockControlPlans.map((plan) => {
          const StatusIcon = statusIcons[plan.status as ApprovalStatus] || Clock;
          const canAct = getCurrentUserCanAct(plan);
          const availableActions = currentUser ? getAvailableActions(plan.status as ApprovalStatus, currentUser.role) : [];
          
          return (
            <div
              key={plan.id}
              className={cn(
                "p-4 rounded border transition-all duration-300",
                "bg-cyber-bg/30",
                canAct ? "border-yellow-500/50 hover:shadow-cyber cursor-pointer" : "border-cyber-border",
                selectedPlan?.id === plan.id && "border-cyan-500/50 bg-cyan-500/10"
              )}
              onClick={() => {
                setSelectedPlan(plan);
                setShowDetailModal(true);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-white mb-1">{plan.name}</div>
                  <div className="text-xs text-cyan-500/70">
                    创建人: {plan.createdBy}
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 text-xs rounded border flex items-center gap-1",
                  statusColors[plan.status as ApprovalStatus]
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {getApprovalStatusName(plan.status as ApprovalStatus)}
                </span>
              </div>

              <p className="text-xs text-cyan-200/80 mb-3 leading-relaxed">
                {plan.description}
              </p>

              <div className="flex items-center gap-1 mb-3">
                {plan.approvalHistory.map((record, idx) => {
                  const RecIcon = statusIcons[record.status as ApprovalStatus] || Clock;
                  const isCurrentLevel = idx === plan.currentLevel;
                  return (
                    <div key={idx} className="flex items-center">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs border",
                        isCurrentLevel ? "bg-yellow-500/20 border-yellow-500/50" : statusColors[record.status as ApprovalStatus]
                      )}>
                        <RecIcon className="w-3 h-3" />
                        {getApprovalLevelDescription(idx)}
                      </div>
                      {idx < plan.approvalHistory.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-cyan-500/50 mx-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {canAct && availableActions.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-cyber-border/50">
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    待您处理
                  </span>
                  <div className="flex-1" />
                  {availableActions.includes('approve') && (
                    <CyberButton
                      size="sm"
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalAction(plan, 'approve');
                      }}
                    >
                      <CheckCircle className="w-3 h-3" />
                      批准
                    </CyberButton>
                  )}
                  {availableActions.includes('reject') && (
                    <CyberButton
                      size="sm"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalAction(plan, 'reject');
                      }}
                    >
                      <XCircle className="w-3 h-3" />
                      驳回
                    </CyberButton>
                  )}
                  {availableActions.includes('push') && (
                    <CyberButton
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalAction(plan, 'push');
                      }}
                    >
                      <ArrowRight className="w-3 h-3" />
                      提交上级
                    </CyberButton>
                  )}
                  {availableActions.includes('implement') && (
                    <CyberButton
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalAction(plan, 'implement');
                      }}
                    >
                      <Send className="w-3 h-3" />
                      执行方案
                    </CyberButton>
                  )}
                  {availableActions.includes('submit') && (
                    <CyberButton
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalAction(plan, 'submit');
                      }}
                    >
                      <Send className="w-3 h-3" />
                      提交审批
                    </CyberButton>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-cyber-panel border border-cyber-border rounded-lg shadow-cyber overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-cyber-border">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <h4 className="text-lg font-bold text-cyan-300">
                  {selectedPlan.name}
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPlan(null);
                  setApprovalComment('');
                }}
                className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
              <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
                <div className="text-xs text-cyan-500/70 mb-2">审批流程</div>
                <div className="flex items-center gap-1">
                  {selectedPlan.approvalHistory.map((record, idx) => {
                    const RecIcon = statusIcons[record.status as ApprovalStatus] || Clock;
                    const isCurrentLevel = idx === selectedPlan.currentLevel;
                    return (
                      <div key={idx} className="flex items-center flex-1">
                        <div className={cn(
                          "flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs border",
                          isCurrentLevel ? "bg-yellow-500/20 border-yellow-500/50" : statusColors[record.status as ApprovalStatus]
                        )}>
                          <RecIcon className="w-4 h-4" />
                          <div className="flex-1">
                            <div className="font-bold">{getApprovalLevelDescription(idx)}</div>
                            {record.approver && (
                              <div className="text-[10px] opacity-80">{record.approver} · {formatTime(record.timestamp)}</div>
                            )}
                            {record.comments && (
                              <div className="text-[10px] opacity-70 mt-0.5">"{record.comments}"</div>
                            )}
                          </div>
                        </div>
                        {idx < selectedPlan.approvalHistory.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-cyan-500/50 mx-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">方案类型</div>
                  <div className="text-sm text-cyan-300">
                    {selectedPlan.type === 'road_closure' ? '道路封闭' : selectedPlan.type === 'diversion' ? '交通分流' : '信号调整'}
                  </div>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">影响路段</div>
                  <div className="text-sm text-cyan-300 font-mono">
                    {selectedPlan.affectedAreas.length} 条道路
                  </div>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">开始时间</div>
                  <div className="text-sm text-cyan-300 font-mono">
                    {formatTime(selectedPlan.startTime)}
                  </div>
                </div>
                <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                  <div className="text-xs text-cyan-500/70 mb-1">结束时间</div>
                  <div className="text-sm text-cyan-300 font-mono">
                    {formatTime(selectedPlan.endTime)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                <div className="text-xs text-cyan-500/70 mb-1">方案描述</div>
                <div className="text-sm text-cyan-200">{selectedPlan.description}</div>
              </div>

              <div className="p-3 rounded border border-cyber-border bg-cyber-bg/30">
                <div className="text-xs text-cyan-500/70 mb-2">影响路段</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlan.affectedAreas.map((roadId) => (
                    <span key={roadId} className="px-2 py-0.5 text-xs rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                      {roadId}
                    </span>
                  ))}
                </div>
              </div>

              {currentUser && getCurrentUserCanAct(selectedPlan) && (
                <div className="p-4 rounded border border-yellow-500/30 bg-yellow-500/5">
                  <div className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    请填写审批意见
                  </div>
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="请输入审批意见（可选）..."
                    className="w-full px-3 py-2 rounded bg-cyber-bg border border-cyber-border text-cyan-200 text-sm placeholder-cyan-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {currentUser && getCurrentUserCanAct(selectedPlan) && (
              <div className="flex items-center justify-end gap-2 p-4 border-t border-cyber-border bg-cyber-bg/50">
                {getAvailableActions(selectedPlan.status as ApprovalStatus, currentUser.role).includes('reject') && (
                  <CyberButton
                    variant="danger"
                    onClick={() => handleApprovalAction(selectedPlan, 'reject')}
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </CyberButton>
                )}
                {getAvailableActions(selectedPlan.status as ApprovalStatus, currentUser.role).includes('approve') && (
                  <CyberButton
                    variant="success"
                    onClick={() => handleApprovalAction(selectedPlan, 'approve')}
                  >
                    <CheckCircle className="w-4 h-4" />
                    批准
                  </CyberButton>
                )}
                {getAvailableActions(selectedPlan.status as ApprovalStatus, currentUser.role).includes('push') && (
                  <CyberButton
                    variant="primary"
                    onClick={() => handleApprovalAction(selectedPlan, 'push')}
                  >
                    <ArrowRight className="w-4 h-4" />
                    提交上级
                  </CyberButton>
                )}
                {getAvailableActions(selectedPlan.status as ApprovalStatus, currentUser.role).includes('implement') && (
                  <CyberButton
                    variant="primary"
                    onClick={() => handleApprovalAction(selectedPlan, 'implement')}
                  >
                    <Send className="w-4 h-4" />
                    执行方案
                  </CyberButton>
                )}
                {getAvailableActions(selectedPlan.status as ApprovalStatus, currentUser.role).includes('submit') && (
                  <CyberButton
                    variant="primary"
                    onClick={() => handleApprovalAction(selectedPlan, 'submit')}
                  >
                    <Send className="w-4 h-4" />
                    提交审批
                  </CyberButton>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
