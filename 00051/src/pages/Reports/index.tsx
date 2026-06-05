import { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { useDashboardStore } from '@/store/dashboardStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { reportApi } from '@/services/api';
import { exportMonthlyCostReport, exportDepartmentRanking, exportFullReport } from '@/utils/export';
import { Navigate } from 'react-router-dom';
import { canViewReports } from '@/utils/permissions';
import { MonthlyCostData, DepartmentUsageData } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { user } = useAuthStore();
  const { fetchMonthlyCostData, fetchDepartmentUsageData, getMonthlyCostData, getDepartmentUsageData } = useDashboardStore();
  const { applications, fetchApplications } = useApplicationStore();

  const [activeTab, setActiveTab] = useState<'monthly' | 'department'>('monthly');
  const [monthlyData, setMonthlyData] = useState<MonthlyCostData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentUsageData[]>([]);

  const loadData = async () => {
    await fetchMonthlyCostData();
    await fetchDepartmentUsageData();
    await fetchApplications();
    setMonthlyData(getMonthlyCostData());
    setDepartmentData(getDepartmentUsageData());
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!user || !canViewReports(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const pieData = departmentData.map((d) => ({
    name: d.department,
    value: d.count,
  }));

  const handleExportMonthly = () => {
    exportMonthlyCostReport(monthlyData);
  };

  const handleExportDepartment = () => {
    exportDepartmentRanking(departmentData);
  };

  const handleExportFull = () => {
    exportFullReport(monthlyData, departmentData, applications);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报表中心</h1>
          <p className="text-slate-500 text-sm mt-1">查看用车统计和报表导出</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportMonthly}>
            <Download className="mr-2" size={16} />
            月度费用
          </Button>
          <Button variant="outline" onClick={handleExportDepartment}>
            <Download className="mr-2" size={16} />
            部门排行
          </Button>
          <Button onClick={handleExportFull}>
            <Download className="mr-2" size={16} />
            综合报表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">本月总费用</p>
                <p className="text-2xl font-bold text-slate-800">
                  ¥{monthlyData[monthlyData.length - 1]?.cost || 0}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">本月用车次数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {monthlyData[monthlyData.length - 1]?.count || 0}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Users className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">使用部门数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {departmentData.length}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          月度费用趋势
        </button>
        <button
          onClick={() => setActiveTab('department')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'department'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          部门使用排行
        </button>
      </div>

      {activeTab === 'monthly' ? (
        <Card>
          <Card.Header>
            <Card.Title>月度用车费用趋势</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="用车次数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="费用(元)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Header>
              <Card.Title>部门使用占比</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>部门使用排行</Card.Title>
            </Card.Header>
            <Card.Body className="p-0">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Cell header>排名</Table.Cell>
                    <Table.Cell header>部门</Table.Cell>
                    <Table.Cell header>用车次数</Table.Cell>
                    <Table.Cell header>总费用</Table.Cell>
                    <Table.Cell header>总里程</Table.Cell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {[...departmentData]
                    .sort((a, b) => b.count - a.count)
                    .map((dept, index) => (
                      <Table.Row key={dept.department}>
                        <Table.Cell>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0
                                ? 'bg-amber-100 text-amber-700'
                                : index === 1
                                ? 'bg-slate-100 text-slate-700'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="font-medium">{dept.department}</Table.Cell>
                        <Table.Cell>{dept.count}</Table.Cell>
                        <Table.Cell>¥{dept.cost}</Table.Cell>
                        <Table.Cell>{Math.round(dept.mileage)} km</Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;
