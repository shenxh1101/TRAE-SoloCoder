import * as XLSX from 'xlsx';
import type { DailyReport } from '../data/types';

export const exportDailyReport = (report: DailyReport) => {
  const shiftNames: Record<string, string> = {
    morning: '早班',
    afternoon: '中班',
    night: '夜班',
  };

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['矿山生产日报表'],
    [''],
    ['日期', report.date],
    ['班次', shiftNames[report.shift]],
    [''],
    ['汇总统计'],
    ['当日总产量（吨）', report.workFaces.reduce((sum, wf) => sum + wf.output, 0)],
    ['瓦斯超标次数', report.alerts],
    ['人员出勤率', `${((report.workerAttendance.present / report.workerAttendance.total) * 100).toFixed(1)}%`],
    ['设备开机率', `${((report.equipmentStatus.running / report.equipmentStatus.total) * 100).toFixed(1)}%`],
    [''],
  ];

  const workFaceData = [
    ['各工作面生产情况'],
    ['工作面名称', '产量（吨）', '瓦斯超标次数', '当日进尺（米）'],
    ...report.workFaces.map(wf => [wf.name, wf.output, wf.gasExceedCount, wf.progress]),
    [''],
  ];

  const attendanceData = [
    ['人员出勤情况'],
    ['总人数', '出勤人数', '缺勤人数'],
    [report.workerAttendance.total, report.workerAttendance.present, report.workerAttendance.absent],
    [''],
  ];

  const equipmentData = [
    ['设备状态统计'],
    ['设备总数', '运行中', '检修中'],
    [report.equipmentStatus.total, report.equipmentStatus.running, report.equipmentStatus.maintenance],
  ];

  const allData = [
    ...summaryData,
    ...workFaceData,
    ...attendanceData,
    ...equipmentData,
  ];

  const ws = XLSX.utils.aoa_to_sheet(allData);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '生产日报');

  const fileName = `矿山生产日报_${report.date}_${shiftNames[report.shift]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
