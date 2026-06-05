import * as XLSX from 'xlsx';
import { Application, MonthlyCostData, DepartmentUsageData } from '../types';
import { formatDateTime } from './date';

export const exportToExcel = (
  data: Record<string, unknown[]>,
  fileName: string = 'export'
): void => {
  const wb = XLSX.utils.book_new();
  
  Object.entries(data).forEach(([sheetName, sheetData]) => {
    if (sheetData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });
  
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportMonthlyCostReport = (data: MonthlyCostData[]): void => {
  const exportData = data.map(item => ({
    '月份': item.month,
    '用车次数': item.count,
    '总费用(元)': item.cost,
    '平均每次费用(元)': item.count > 0 ? Math.round(item.cost / item.count) : 0,
  }));
  
  exportToExcel({ '月度用车费用': exportData }, '月度用车费用报表');
};

export const exportDepartmentRanking = (data: DepartmentUsageData[]): void => {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const exportData = sortedData.map((item, index) => ({
    '排名': index + 1,
    '部门': item.department,
    '用车次数': item.count,
    '总里程(km)': Math.round(item.mileage),
    '总费用(元)': item.cost,
    '平均每次费用(元)': item.count > 0 ? Math.round(item.cost / item.count) : 0,
  }));
  
  exportToExcel({ '部门使用排行': exportData }, '部门使用排行报表');
};

export const exportApplications = (applications: Application[]): void => {
  const exportData = applications.map(app => ({
    '申请编号': app.id,
    '申请人': app.userName,
    '所属部门': app.userDepartment,
    '车牌号': app.vehiclePlate,
    '车型': app.vehicleModel,
    '用车事由': app.purpose,
    '乘车人数': app.peopleCount,
    '开始时间': formatDateTime(app.startTime),
    '结束时间': formatDateTime(app.endTime),
    '状态': getStatusText(app.status),
    '预估费用(元)': app.estimatedCost || 0,
    '实际费用(元)': app.actualCost || 0,
    '申请时间': formatDateTime(app.createdAt),
    '审批时间': app.approvedAt ? formatDateTime(app.approvedAt) : '-',
    '审批意见': app.approvalComment || '-',
    '是否升级审批': app.escalated ? '是' : '否',
  }));
  
  exportToExcel({ '用车记录': exportData }, '用车历史记录');
};

export const exportFullReport = (
  monthlyData: MonthlyCostData[],
  departmentData: DepartmentUsageData[],
  applications: Application[]
): void => {
  const monthlyExport = monthlyData.map(item => ({
    '月份': item.month,
    '用车次数': item.count,
    '总费用(元)': item.cost,
  }));
  
  const departmentExport = [...departmentData]
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      '排名': index + 1,
      '部门': item.department,
      '用车次数': item.count,
      '总里程(km)': Math.round(item.mileage),
      '总费用(元)': item.cost,
    }));
  
  const applicationsExport = applications.map(app => ({
    '申请编号': app.id,
    '申请人': app.userName,
    '部门': app.userDepartment,
    '车牌号': app.vehiclePlate,
    '事由': app.purpose,
    '状态': getStatusText(app.status),
    '开始时间': formatDateTime(app.startTime),
    '结束时间': formatDateTime(app.endTime),
    '费用(元)': app.actualCost || app.estimatedCost || 0,
  }));
  
  exportToExcel(
    {
      '月度费用统计': monthlyExport,
      '部门使用排行': departmentExport,
      '用车明细': applicationsExport,
    },
    '月度综合报表'
  );
};

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝',
    in_progress: '使用中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};
