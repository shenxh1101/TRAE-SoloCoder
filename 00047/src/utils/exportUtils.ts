import * as XLSX from 'xlsx';
import type { DailyReport, TimingReport, Direction } from '../types';
import { getDirectionName } from './trafficUtils';

export function exportDailyReportToExcel(date: string, report: DailyReport): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['交通日报', date],
    [],
    ['统计指标', '数值', '单位'],
    ['总交通流量', report.totalTrafficVolume, '辆'],
    ['总事故次数', report.totalAccidents, '次'],
    ['公交准点率', report.busOnTimeRate, '%'],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, '统计摘要');

  const intersectionData = [
    ['路口ID', '路口名称', '平均延误(秒)', '事故次数', '高峰流量(辆/小时)'],
    ...report.intersections.map(intersection => [
      intersection.id,
      intersection.name,
      intersection.avgDelay,
      intersection.accidents,
      intersection.peakFlow,
    ]),
  ];

  const intersectionWs = XLSX.utils.aoa_to_sheet(intersectionData);
  intersectionWs['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, intersectionWs, '路口详情');

  XLSX.writeFile(wb, `交通日报_${date}.xlsx`);
}

export function exportTimingReportToExcel(reports: TimingReport[]): void {
  const wb = XLSX.utils.book_new();

  const directions: Direction[] = ['north', 'south', 'east', 'west'];

  const allData: unknown[][] = [
    [
      '时间',
      '路口ID',
      '路口名称',
      '北进口流量',
      '南进口流量',
      '东进口流量',
      '西进口流量',
      '预期改善率(%)',
    ],
  ];

  directions.forEach(dir => {
    const dirName = getDirectionName(dir);
    allData[0].push(
      `原${dirName}绿灯(秒)`,
      `原${dirName}黄灯(秒)`,
      `原${dirName}红灯(秒)`,
      `优化${dirName}绿灯(秒)`,
      `优化${dirName}黄灯(秒)`,
      `优化${dirName}红灯(秒)`
    );
  });

  reports.forEach(report => {
    const row: unknown[] = [
      report.timestamp.toLocaleString('zh-CN'),
      report.intersectionId,
      report.intersectionName,
      report.flowData.north,
      report.flowData.south,
      report.flowData.east,
      report.flowData.west,
      report.expectedImprovement,
    ];

    directions.forEach(dir => {
      row.push(
        report.originalTiming[dir].green,
        report.originalTiming[dir].yellow,
        report.originalTiming[dir].red,
        report.optimizedTiming[dir].green,
        report.optimizedTiming[dir].yellow,
        report.optimizedTiming[dir].red
      );
    });

    allData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(allData);

  const colWidths: { wch: number }[] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];

  directions.forEach(() => {
    colWidths.push(
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 }
    );
  });

  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, '配时方案报表');

  const fileName = `配时方案报表_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
