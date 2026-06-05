import * as XLSX from 'xlsx';
import type { DailyReport, BloodBag, TransfusionRequest, MatchResult } from '../types';
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS } from '../types';

export interface DailyReportData {
  date: string;
  bloodBags: BloodBag[];
  requests: TransfusionRequest[];
  inventoryOpening: Record<string, number>;
  inventoryReceived: Record<string, number>;
  inventoryIssued: Record<string, number>;
}

export function generateDailyReport(
  bloodBags: BloodBag[],
  matchResults: { matchResult: MatchResult }[],
  startDate?: Date,
  endDate?: Date
): DailyReport;

export function generateDailyReport(data: DailyReportData): DailyReport;

export function generateDailyReport(
  dataOrBloodBags: DailyReportData | BloodBag[],
  matchResults?: { matchResult: MatchResult }[],
  startDate?: Date,
  endDate?: Date
): DailyReport {
  let date: string;
  let bloodBags: BloodBag[];
  let requests: TransfusionRequest[];
  let inventoryOpening: Record<string, number>;
  let inventoryReceived: Record<string, number>;
  let inventoryIssued: Record<string, number>;

  if (Array.isArray(dataOrBloodBags)) {
    bloodBags = dataOrBloodBags;
    const reportDate = startDate || new Date();
    date = reportDate.toISOString().split('T')[0];
    
    const bloodTypes: ('A' | 'B' | 'AB' | 'O')[] = ['A', 'B', 'AB', 'O'];
    const components: ('whole_blood' | 'plasma' | 'platelet')[] = ['whole_blood', 'plasma', 'platelet'];
    
    inventoryOpening = {};
    inventoryReceived = {};
    inventoryIssued = {};
    
    bloodTypes.forEach(bt => {
      components.forEach(comp => {
        const key = `${bt}_${comp}`;
        const available = bloodBags.filter(
          b => b.bloodType === bt && b.component === comp && b.status === 'available'
        ).length;
        inventoryOpening[key] = available;
        inventoryReceived[key] = 0;
        inventoryIssued[key] = bloodBags.filter(
          b => b.bloodType === bt && b.component === comp && (b.status === 'allocated' || b.status === 'used')
        ).length;
      });
    });
    
    requests = [];
  } else {
    const data = dataOrBloodBags;
    date = data.date;
    bloodBags = data.bloodBags;
    requests = data.requests;
    inventoryOpening = data.inventoryOpening;
    inventoryReceived = data.inventoryReceived;
    inventoryIssued = data.inventoryIssued;
  }
  
  const bloodTypes: ('A' | 'B' | 'AB' | 'O')[] = ['A', 'B', 'AB', 'O'];
  const components: ('whole_blood' | 'plasma' | 'platelet')[] = ['whole_blood', 'plasma', 'platelet'];
  
  const inventory: DailyReport['inventory'] = [];
  
  bloodTypes.forEach(bloodType => {
    components.forEach(component => {
      const key = `${bloodType}_${component}`;
      const openingStock = inventoryOpening[key] || 0;
      const received = inventoryReceived[key] || 0;
      const issued = inventoryIssued[key] || 0;
      const closingStock = openingStock + received - issued;
      
      inventory.push({
        bloodType,
        component,
        openingStock,
        received,
        issued,
        closingStock
      });
    });
  });
  
  const crossMatchCount = requests.filter(r => r.crossMatchResult).length;
  const matchSuccessCount = requests.filter(r => 
    r.crossMatchResult && r.crossMatchResult.matchResult === 'compatible'
  ).length;
  const matchSuccessRate = crossMatchCount > 0 ? (matchSuccessCount / crossMatchCount) * 100 : 100;
  
  return {
    date,
    inventory,
    transfusionRequests: requests.length,
    crossMatchCount,
    matchSuccessRate,
    approvalCount: requests.filter(r => r.approvalRecords.length > 0).length,
    transportCount: requests.filter(r => r.transportTask).length,
    alerts: 0
  };
}

export function exportDailyReportToExcel(report: DailyReport): void {
  const wb = XLSX.utils.book_new();
  
  const inventoryData = report.inventory.map(item => ({
    '血型': BLOOD_TYPE_LABELS[item.bloodType],
    '成分': COMPONENT_LABELS[item.component],
    '期初库存(袋)': item.openingStock,
    '今日入库(袋)': item.received,
    '今日出库(袋)': item.issued,
    '期末库存(袋)': item.closingStock
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(wb, ws1, '库存统计');
  
  const summaryData = [
    { '指标': '日期', '数值': report.date },
    { '指标': '输血申请数', '数值': report.transfusionRequests },
    { '指标': '交叉配血数', '数值': report.crossMatchCount },
    { '指标': '配血符合率(%)', '数值': report.matchSuccessRate.toFixed(2) },
    { '指标': '审批通过数', '数值': report.approvalCount },
    { '指标': '运输任务数', '数值': report.transportCount },
    { '指标': '预警数', '数值': report.alerts }
  ];
  
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws2, '统计摘要');
  
  ws1['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  ws2['!cols'] = [{ wch: 20 }, { wch: 20 }];
  
  XLSX.writeFile(wb, `血库日报_${report.date}.xlsx`);
}

export function exportBloodBagsToExcel(bloodBags: BloodBag[]): void {
  const wb = XLSX.utils.book_new();
  
  const data = bloodBags.map(bag => ({
    '血袋编号': bag.id,
    '血型': BLOOD_TYPE_LABELS[bag.bloodType],
    '成分': COMPONENT_LABELS[bag.component],
    '容量(ml)': bag.volume,
    '采血日期': bag.collectionDate,
    '有效期至': bag.expiryDate,
    '捐赠者编号': bag.donorId,
    '状态': {
      'available': '可用',
      'allocated': '已分配',
      'used': '已使用',
      'expired': '已过期',
      'quarantine': '检疫中'
    }[bag.status],
    '存储位置': `${bag.storageLocation.row}排${bag.storageLocation.col}列${bag.storageLocation.shelf}层`
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, '血袋清单');
  XLSX.writeFile(wb, `血袋清单_${new Date().toISOString().split('T')[0]}.xlsx`);
}
