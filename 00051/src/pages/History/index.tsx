import { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, Users, Car } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';
import { useApplicationStore } from '@/store/applicationStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime, formatDuration } from '@/utils/date';
import { exportApplications } from '@/utils/export';
import { canViewAllHistory } from '@/utils/permissions';
import { Application } from '@/types';

const History = () => {
  const { user } = useAuthStore();
  const { vehicles } = useVehicleStore();
  const { applications, loading, fetchApplications } = useApplicationStore();

  const [filters, setFilters] = useState({
    vehicleId: '',
    department: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const departments = Array.from(new Set(applications.map((app) => app.userDepartment)));

  const getFilteredApplications = (): Application[] => {
    return applications.filter((app) => {
      if (!canViewAllHistory(user) && app.userId !== user?.id) {
        return false;
      }

      if (filters.vehicleId && app.vehicleId !== filters.vehicleId) {
        return false;
      }

      if (filters.department && app.userDepartment !== filters.department) {
        return false;
      }

      if (filters.startDate && new Date(app.startTime) < new Date(filters.startDate)) {
        return false;
      }

      if (filters.endDate && new Date(app.endTime) > new Date(filters.endDate)) {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          app.vehiclePlate.toLowerCase().includes(searchLower) ||
          app.userName.toLowerCase().includes(searchLower) ||
          app.purpose.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  };

  const filteredApplications = getFilteredApplications();

  const handleExport = () => {
    exportApplications(filteredApplications);
  };

  const handleReset = () => {
    setFilters({
      vehicleId: '',
      department: '',
      startDate: '',
      endDate: '',
      search: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">历史记录</h1>
          <p className="text-slate-500 text-sm mt-1">查看和筛选用车历史记录</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            重置筛选
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2" size={16} />
            导出记录
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body className="pb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="搜索车牌号、申请人、事由..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              label=""
              value={filters.vehicleId}
              onChange={(e) => setFilters({ ...filters, vehicleId: e.target.value })}
              options={vehicles
                .filter((v) => v.status !== 'disabled')
                .map((v) => ({
                  label: v.plateNumber,
                  value: v.id,
                }))}
            />
            {canViewAllHistory(user) && (
              <Select
                label=""
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                options={departments.map((d) => ({ label: d, value: d }))}
              />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="开始日期"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="结束日期"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Cell header>车牌号</Table.Cell>
                <Table.Cell header>车型</Table.Cell>
                <Table.Cell header>申请人</Table.Cell>
                {canViewAllHistory(user) && (
                  <Table.Cell header>部门</Table.Cell>
                )}
                <Table.Cell header>事由</Table.Cell>
                <Table.Cell header>人数</Table.Cell>
                <Table.Cell header>时长</Table.Cell>
                <Table.Cell header>费用</Table.Cell>
                <Table.Cell header>状态</Table.Cell>
                <Table.Cell header>申请时间</Table.Cell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredApplications.map((app) => (
                <Table.Row key={app.id}>
                  <Table.Cell className="font-medium">{app.vehiclePlate}</Table.Cell>
                  <Table.Cell>{app.vehicleModel}</Table.Cell>
                  <Table.Cell>{app.userName}</Table.Cell>
                  {canViewAllHistory(user) && (
                    <Table.Cell>{app.userDepartment}</Table.Cell>
                  )}
                  <Table.Cell className="max-w-[200px] truncate" title={app.purpose}>
                    {app.purpose}
                  </Table.Cell>
                  <Table.Cell>{app.peopleCount}</Table.Cell>
                  <Table.Cell>
                    {formatDuration(app.startTime, app.endTime)}
                  </Table.Cell>
                  <Table.Cell>
                    ¥{app.actualCost || app.estimatedCost || '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={app.status} />
                  </Table.Cell>
                  <Table.Cell>{formatDateTime(app.createdAt)}</Table.Cell>
                </Table.Row>
              ))}
              {filteredApplications.length === 0 && (
                <Table.Row>
                  <Table.Cell
                    colSpan={canViewAllHistory(user) ? 10 : 9}
                    className="text-center py-12 text-slate-400"
                  >
                    暂无符合条件的记录
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Card.Body>
        <Card.Footer>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              共 {filteredApplications.length} 条记录
            </p>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default History;
