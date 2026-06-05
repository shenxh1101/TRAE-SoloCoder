import * as XLSX from 'xlsx';
import type { BloodBag, CrossMatchResult, DailyReport, BloodType, BloodComponent, TransfusionRequest } from '../types';
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS } from '../types';

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];
const COMPONENTS: BloodComponent[] = ['whole_blood', 'plasma', 'platelet'];

export function generateDailyReport(
  bloodBags: BloodBag[],
  matchResults: CrossMatchResult[],
  startDate?: Date,
  endDate?: Date,
  transfusionRequests?: TransfusionRequest[]
): DailyReport {
  const reportDate = startDate || new Date();
  const dateStr = reportDate.toISOString().split('T')[0];
  const endDateStr = endDate ? endDate.toISOString().split('T')[0] : dateStr;

  const inventoryStats: DailyReport['inventoryStats'] = {
    'A': { whole_blood: { available: 0, total: 0, used: 0, expired: 0 }, plasma: { available: 0, total: 0, used: 0, expired: 0 }, platelet: { available: 0, total: 0, used: 0, expired: 0 } },
    'B': { whole_blood: { available: 0, total: 0, used: 0, expired: 0 }, plasma: { available: 0, total: 0, used: 0, expired: 0 }, platelet: { available: 0, total: 0, used: 0, expired: 0 } },
    'AB': { whole_blood: { available: 0, total: 0, used: 0, expired: 0 }, plasma: { available: 0, total: 0, used: 0, expired: 0 }, platelet: { available: 0, total: 0, used: 0, expired: 0 } },
    'O': { whole_blood: { available: 0, total: 0, used: 0, expired: 0 }, plasma: { available: 0, total: 0, used: 0, expired: 0 }, platelet: { available: 0, total: 0, used: 0, expired: 0 } }
  };

  const inRecords: DailyReport['inRecords'] = [];
  const outRecords: DailyReport['outRecords'] = [];

  bloodBags.forEach(bag => {
    const stats = inventoryStats[bag.bloodType][bag.component];
    stats.total++;

    if (bag.status === 'available') {
      stats.available++;
    } else if (bag.status === 'used') {
      stats.used++;
    } else if (bag.status === 'expired') {
      stats.expired++;
    }

    const collectionDate = bag.collectionDate.split(' ')[0];
    if (collectionDate >= dateStr && collectionDate <= endDateStr) {
      inRecords.push({
        bloodBagId: bag.id,
        bloodType: bag.bloodType,
        component: bag.component,
        volume: bag.volume,
        date: bag.collectionDate
      });
    }

    if (bag.status === 'used' || bag.status === 'allocated') {
      const relatedRequest = transfusionRequests?.find(
        req => req.crossMatchResult && req.crossMatchResult.bloodBagId === bag.id
      );
      outRecords.push({
        bloodBagId: bag.id,
        bloodType: bag.bloodType,
        component: bag.component,
        volume: bag.volume,
        date: bag.updatedAt,
        patientName: relatedRequest?.patientId || '未知'
      });
    }
  });

  const matchStats: DailyReport['matchStats'] = {
    total: matchResults.length,
    compatible: matchResults.filter(r => r.matchResult === 'compatible').length,
    incompatible: matchResults.filter(r => r.matchResult === 'incompatible').length,
    matchRate: matchResults.length > 0 
      ? (matchResults.filter(r => r.matchResult === 'compatible').length / matchResults.length) * 100 
      : 100
  };

  return {
    reportDate: dateStr,
    inventoryStats,
    inRecords,
    outRecords,
    matchStats
  };
}

export function exportDailyReportToExcel(report: DailyReport): Buffer {
  const wb = XLSX.utils.book_new();

  const inventoryData: any[] = [];
  BLOOD_TYPES.forEach(bloodType => {
    COMPONENTS.forEach(component => {
      const stats = report.inventoryStats[bloodType][component];
      inventoryData.push({
        '血型': BLOOD_TYPE_LABELS[bloodType],
        '成分': COMPONENT_LABELS[component],
        '可用库存(袋)': stats.available,
        '总库存(袋)': stats.total,
        '已使用(袋)': stats.used,
        '已过期(袋)': stats.expired
      });
    });
  });

  const ws1 = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(wb, ws1, '库存统计');

  const inRecordsData = report.inRecords.map(record => ({
    '血袋编号': record.bloodBagId,
    '血型': BLOOD_TYPE_LABELS[record.bloodType],
    '成分': COMPONENT_LABELS[record.component],
    '容量(ml)': record.volume,
    '入库日期': record.date
  }));

  const ws2 = XLSX.utils.json_to_sheet(inRecordsData);
  XLSX.utils.book_append_sheet(wb, ws2, '入库记录');

  const outRecordsData = report.outRecords.map(record => ({
    '血袋编号': record.bloodBagId,
    '血型': BLOOD_TYPE_LABELS[record.bloodType],
    '成分': COMPONENT_LABELS[record.component],
    '容量(ml)': record.volume,
    '出库日期': record.date,
    '患者姓名': record.patientName
  }));

  const ws3 = XLSX.utils.json_to_sheet(outRecordsData);
  XLSX.utils.book_append_sheet(wb, ws3, '出库记录');

  const matchStatsData = [
    { '指标': '报表日期', '数值': report.reportDate },
    { '指标': '总配血次数', '数值': report.matchStats.total },
    { '指标': '配血成功次数', '数值': report.matchStats.compatible },
    { '指标': '配血失败次数', '数值': report.matchStats.incompatible },
    { '指标': '配血符合率(%)', '数值': report.matchStats.matchRate.toFixed(2) }
  ];

  const ws4 = XLSX.utils.json_to_sheet(matchStatsData);
  XLSX.utils.book_append_sheet(wb, ws4, '配血统计');

  ws1['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  ws2['!cols'] = [
    { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
  ];
  ws3['!cols'] = [
    { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
  ];
  ws4['!cols'] = [{ wch: 20 }, { wch: 25 }];

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer as Buffer;
}
