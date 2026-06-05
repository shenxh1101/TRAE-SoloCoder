import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  month: string;
  total_claims: number;
  approved_claims: number;
  rejected_claims: number;
  pending_claims: number;
  total_payout: number;
  avg_payout: number;
  payout_rate: number;
  avg_processing_days: number;
  suspected_fraud_count: number;
  suspected_fraud_ratio: number;
  insurance_type_breakdown: { insurance_type: string; count: number; payout: number }[];
  closure_time_distribution: { range: string; count: number }[];
  suggestions: string[];
}

export async function generateReportPDF(data: ReportData): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('月度理赔报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告月份: ${data.month}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、核心指标概览', 14, yPosition);
  yPosition += 8;

  const summaryData = [
    ['总报案数', data.total_claims.toString(), '已赔付案件', data.approved_claims.toString()],
    ['已拒赔案件', data.rejected_claims.toString(), '待处理案件', data.pending_claims.toString()],
    ['总赔付金额', `¥${data.total_payout.toLocaleString()}`, '平均赔付金额', `¥${data.avg_payout.toLocaleString()}`],
    ['赔付率', `${data.payout_rate}%`, '平均处理天数', `${data.avg_processing_days}天`],
    ['疑似欺诈案件', data.suspected_fraud_count.toString(), '欺诈占比', `${data.suspected_fraud_ratio}%`]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['指标', '数值', '指标', '数值']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 45 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、险种理赔分布', 14, yPosition);
  yPosition += 8;

  const typeTableData = data.insurance_type_breakdown.map(item => [
    item.insurance_type,
    item.count.toString(),
    `¥${item.payout.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['险种类型', '案件数量', '赔付金额']],
    body: typeTableData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [92, 184, 92] }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('三、结案时间分布', 14, yPosition);
  yPosition += 8;

  const closureTableData = data.closure_time_distribution.map(item => [
    item.range,
    item.count.toString(),
    `${data.total_claims > 0 ? Math.round(item.count / data.total_claims * 100) : 0}%`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['处理周期', '案件数量', '占比']],
    body: closureTableData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [240, 173, 78] }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('四、智能建议', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  data.suggestions.forEach((suggestion, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(`${index + 1}. ${suggestion}`, 14, yPosition);
    yPosition += 7;
  });

  yPosition += 10;
  if (yPosition > 270) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, 285, { align: 'center' });
  doc.text('保险理赔管理系统 - 自动生成报告', pageWidth / 2, 292, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}

export default {
  generateReportPDF
};
