import { useState, useEffect } from 'react';
import { Wrench, Car, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime, formatRelativeTime } from '@/utils/date';
import { Navigate } from 'react-router-dom';
import { canManageMaintenance } from '@/utils/permissions';

const Maintenance = () => {
  const { user } = useAuthStore();
  const {
    maintenanceRecords,
    loading,
    fetchMaintenanceRecords,
    updateMaintenanceStatus,
  } = useApplicationStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>(
    'pending'
  );

  useEffect(() => {
    fetchMaintenanceRecords();
  }, []);

  if (!user || !canManageMaintenance(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const getFilteredRecords = () => {
    return maintenanceRecords.filter((m) => m.status === activeTab);
  };

  const handleStart = async (id: string) => {
    await updateMaintenanceStatus(id, 'in_progress');
  };

  const handleComplete = async (id: string) => {
    await updateMaintenanceStatus(id, 'completed');
  };

  const tabs = [
    { key: 'pending', label: '待处理', count: maintenanceRecords.filter((m) => m.status === 'pending').length },
    { key: 'in_progress', label: '维修中', count: maintenanceRecords.filter((m) => m.status === 'in_progress').length },
    { key: 'completed', label: '已完成', count: maintenanceRecords.filter((m) => m.status === 'completed').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">维修管理</h1>
        <p className="text-slate-500 text-sm mt-1">处理车辆维修申请</p>
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
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Cell header>车牌号</Table.Cell>
                <Table.Cell header>维修描述</Table.Cell>
                <Table.Cell header>预估费用</Table.Cell>
                <Table.Cell header>实际费用</Table.Cell>
                <Table.Cell header>申请时间</Table.Cell>
                <Table.Cell header>状态</Table.Cell>
                <Table.Cell header className="text-right">操作</Table.Cell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {getFilteredRecords().map((record) => (
                <Table.Row key={record.id}>
                  <Table.Cell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Car size={16} className="text-slate-400" />
                      {record.vehicleId}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="max-w-[300px]">
                    {record.description}
                  </Table.Cell>
                  <Table.Cell>¥{record.estimatedCost || '-'}</Table.Cell>
                  <Table.Cell>
                    {record.actualCost ? `¥${record.actualCost}` : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock size={14} />
                      {formatRelativeTime(record.createdAt)}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={record.status} />
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    {record.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStart(record.id)}
                        loading={loading}
                      >
                        <Play className="mr-1" size={14} />
                        开始维修
                      </Button>
                    )}
                    {record.status === 'in_progress' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleComplete(record.id)}
                        loading={loading}
                      >
                        <CheckCircle className="mr-1" size={14} />
                        完成维修
                      </Button>
                    )}
                    {record.status === 'completed' && record.completedAt && (
                      <span className="text-sm text-slate-400">
                        {formatDateTime(record.completedAt)}
                      </span>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
              {getFilteredRecords().length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7} className="text-center py-12 text-slate-400">
                    <Wrench size={48} className="mx-auto mb-3 opacity-50" />
                    <p>暂无{tabs.find((t) => t.key === activeTab)?.label}的维修记录</p>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Maintenance;
