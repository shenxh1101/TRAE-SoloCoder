import { useState, useEffect } from 'react';
import { Check, X, Clock, AlertTriangle, User, ChevronDown, MessageSquare } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/date';
import { Navigate } from 'react-router-dom';
import { canApproveApplications } from '@/utils/permissions';
import { Application } from '@/types';

const Approval = () => {
  const { user } = useAuthStore();
  const {
    applications,
    loading,
    fetchApplications,
    approveApplication,
    rejectApplication,
    getPendingApprovals,
  } = useApplicationStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [pendingList, setPendingList] = useState<Application[]>([]);

  const loadPendingApprovals = async () => {
    const data = await getPendingApprovals('', '', '');
    setPendingList(data);
  };

  useEffect(() => {
    fetchApplications();
    loadPendingApprovals();
  }, []);

  if (!user || !canApproveApplications(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingApprovals = pendingList;
  const myApproved = applications.filter(
    (app) => app.approverId === user.id && app.status === 'approved'
  );
  const myRejected = applications.filter(
    (app) => app.approverId === user.id && app.status === 'rejected'
  );

  const getDisplayList = () => {
    switch (activeTab) {
      case 'pending':
        return pendingApprovals;
      case 'approved':
        return myApproved;
      case 'rejected':
        return myRejected;
      default:
        return [];
    }
  };

  const handleAction = (app: Application, type: 'approve' | 'reject') => {
    setSelectedApp(app);
    setActionType(type);
    setShowModal(true);
    setComment('');
  };

  const confirmAction = async () => {
    if (!selectedApp || !user) return;

    if (actionType === 'approve') {
      await approveApplication(selectedApp.id, user.id, comment);
    } else {
      await rejectApplication(selectedApp.id, user.id, comment);
    }

    setShowModal(false);
    setSelectedApp(null);
    loadPendingApprovals();
  };

  const tabs = [
    { key: 'pending', label: '待审批', count: pendingApprovals.length },
    { key: 'approved', label: '已批准', count: myApproved.length },
    { key: 'rejected', label: '已拒绝', count: myRejected.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">审批管理</h1>
        <p className="text-slate-500 text-sm mt-1">处理用车申请审批</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <Card.Body className="p-0">
          <div className="divide-y divide-slate-100">
            {getDisplayList().map((app) => (
              <div
                key={app.id}
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{app.userName}</p>
                        <p className="text-sm text-slate-500">{app.userDepartment}</p>
                      </div>
                      <StatusBadge status={app.status} />
                      {app.escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          <AlertTriangle size={12} />
                          已升级
                        </span>
                      )}
                    </div>

                    <div className="ml-13 pl-13">
                      <p className="text-slate-700 mb-2">
                        <span className="font-medium">事由：</span>
                        {app.purpose}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>
                          车辆：{app.vehiclePlate} ({app.vehicleModel})
                        </span>
                        <span>人数：{app.peopleCount}人</span>
                        <span>
                          时长：
                          {formatDuration(app.startTime, app.endTime)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
                        <span>开始：{formatDateTime(app.startTime)}</span>
                        <span>结束：{formatDateTime(app.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                        <Clock size={12} />
                        申请于 {formatRelativeTime(app.createdAt)}
                      </div>
                    </div>
                  </div>

                  {activeTab === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleAction(app, 'approve')}
                      >
                        <Check className="mr-1" size={16} />
                        批准
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(app, 'reject')}
                      >
                        <X className="mr-1" size={16} />
                        拒绝
                      </Button>
                    </div>
                  )}

                  {activeTab !== 'pending' && app.approvalComment && (
                    <div className="text-sm text-slate-500">
                      <MessageSquare size={14} className="inline mr-1" />
                      审批意见：{app.approvalComment}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getDisplayList().length === 0 && (
              <div className="text-center py-12 text-slate-400">
                暂无{tabs.find((t) => t.key === activeTab)?.label}申请
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={actionType === 'approve' ? '批准申请' : '拒绝申请'}
        size="md"
      >
        <div className="space-y-4">
          {selectedApp && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-800 mb-1">
                {selectedApp.userName} - {selectedApp.purpose}
              </p>
              <p className="text-sm text-slate-500">
                {selectedApp.vehiclePlate} · {selectedApp.peopleCount}人 ·
                {formatDuration(selectedApp.startTime, selectedApp.endTime)}
              </p>
            </div>
          )}

          <Textarea
            label="审批意见"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              actionType === 'approve'
                ? '请输入审批意见（可选）'
                : '请输入拒绝原因（必填）'
            }
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button
              variant={actionType === 'approve' ? 'success' : 'danger'}
              onClick={confirmAction}
              loading={loading}
              disabled={actionType === 'reject' && !comment.trim()}
            >
              {actionType === 'approve' ? '确认批准' : '确认拒绝'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Approval;
