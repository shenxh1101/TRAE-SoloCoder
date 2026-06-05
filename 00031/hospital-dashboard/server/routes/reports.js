import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getDb } from '../db.js';

const router = Router();

router.get('/reports/weekly', (req, res) => {
  try {
    const report = computeWeeklyReport(req.query.weekStart, req.query.weekEnd);
    res.json({ code: 200, message: 'success', data: report });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.post('/reports/weekly/generate', (req, res) => {
  try {
    const report = computeWeeklyReport(req.query.weekStart, req.query.weekEnd);
    res.json({ code: 200, message: 'success', data: report });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/reports/weekly/download', (req, res) => {
  try {
    const { weekStart, weekEnd, format = 'txt' } = req.query;
    const report = computeWeeklyReport(weekStart, weekEnd);

    switch (format.toLowerCase()) {
      case 'pdf':
        return generatePdf(report, res);
      case 'excel':
        return generateExcel(report, res);
      case 'txt':
      default:
        return generateTxt(report, res);
    }
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

function computeWeeklyReport(weekStart, weekEnd) {
  const db = getDb();

  const today = new Date();
  const wEnd = weekEnd ? new Date(weekEnd) : new Date(today);
  wEnd.setDate(wEnd.getDate() - 1);
  const wStart = weekStart ? new Date(weekStart) : new Date(wEnd);
  if (!weekStart) wStart.setDate(wStart.getDate() - 6);

  const weekStartStr = wStart.toISOString().split('T')[0];
  const weekEndStr = wEnd.toISOString().split('T')[0];

  const departments = db.prepare('SELECT * FROM departments').all();

  const regStats = db.prepare(`
    SELECT
      departmentId,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM registrations
    WHERE DATE(registerTime) >= ? AND DATE(registerTime) <= ?
    GROUP BY departmentId
  `).all(weekStartStr, weekEndStr);

  const waitStats = db.prepare(`
    SELECT
      departmentId,
      AVG(averageWaitingTime) as avgWait,
      MAX(maxWaitingTime) as maxWait
    FROM department_stats
    WHERE date >= ? AND date <= ?
    GROUP BY departmentId
  `).all(weekStartStr, weekEndStr);

  const doctorStats = db.prepare(`
    SELECT
      doctorId,
      COUNT(*) as totalPatients,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedPatients,
      AVG(CASE WHEN satisfaction IS NOT NULL THEN satisfaction END) as avgSatisfaction
    FROM registrations
    WHERE DATE(registerTime) >= ? AND DATE(registerTime) <= ?
    GROUP BY doctorId
  `).all(weekStartStr, weekEndStr);

  const totalDoctors = db.prepare('SELECT COUNT(*) as cnt FROM doctors').get().cnt;
  const totalRegistrations = regStats.reduce((s, r) => s + r.total, 0);
  const totalDays = Math.max(1, Math.round((new Date(weekEndStr) - new Date(weekStartStr)) / 86400000) + 1);
  const avgPatientsPerDoctor = totalDoctors > 0
    ? Math.round((totalRegistrations / totalDoctors / totalDays) * 10) / 10 : 0;

  const totalCompleted = regStats.reduce((s, r) => s + r.completed, 0);
  const totalCancelled = regStats.reduce((s, r) => s + r.cancelled, 0);
  const patientChurnRate = totalRegistrations > 0
    ? Math.round((totalCancelled / totalRegistrations) * 1000) / 10 : 0;

  const regByDept = {};
  for (const r of regStats) regByDept[r.departmentId] = r;
  const waitByDept = {};
  for (const w of waitStats) waitByDept[w.departmentId] = w;

  const deptDoctorMap = {};
  const allDoctors = db.prepare('SELECT id, departmentId FROM doctors').all();
  for (const doc of allDoctors) {
    if (!deptDoctorMap[doc.departmentId]) deptDoctorMap[doc.departmentId] = [];
    deptDoctorMap[doc.departmentId].push(doc.id);
  }

  const WAIT_THRESHOLD = 30;
  let deptCount = 0;

  const departmentStatsArr = departments.map(dept => {
    const reg = regByDept[dept.id] || { total: 0, completed: 0, cancelled: 0 };
    const wait = waitByDept[dept.id] || { avgWait: 0, maxWait: 0 };
    const avgWait = Math.round(wait.avgWait || 0);
    const compliance = avgWait <= WAIT_THRESHOLD ? 100 : Math.max(0, Math.round((1 - (avgWait - WAIT_THRESHOLD) / WAIT_THRESHOLD) * 100));
    const saturation = dept.dailyCapacity > 0 ? Math.round((reg.total / (dept.dailyCapacity * totalDays)) * 100) : 0;

    const deptDocIds = deptDoctorMap[dept.id] || [];
    const deptDocs = doctorStats.filter(d => deptDocIds.includes(d.doctorId));
    const avgPatPerDoc = deptDocs.length > 0
      ? Math.round((deptDocs.reduce((s, d) => s + d.totalPatients, 0) / deptDocs.length / totalDays) * 10) / 10 : 0;

    deptCount++;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      waitingTimeCompliance: compliance,
      avgPatientsPerDoctor: avgPatPerDoc,
      saturation: Math.min(saturation, 100),
    };
  });

  const waitingTimeCompliance = deptCount > 0
    ? Math.round(departmentStatsArr.reduce((s, d) => s + d.waitingTimeCompliance, 0) / deptCount * 10) / 10 : 0;

  const recommendations = generateRecommendations(departmentStatsArr, regStats, waitStats, departments);

  return {
    id: `report-${weekStartStr}`,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    generatedAt: new Date().toISOString(),
    waitingTimeCompliance,
    avgPatientsPerDoctor,
    patientChurnRate,
    departmentStats: departmentStatsArr,
    recommendations,
  };
}

function generateRecommendations(deptStats, regStats, waitStats, departments) {
  const recs = [];

  const emergency = deptStats.find(d => d.departmentName === '急诊科');
  if (emergency && emergency.waitingTimeCompliance < 70) {
    recs.push('急诊科候诊时间达标率仅' + emergency.waitingTimeCompliance + '%，建议增加高峰时段（10:00-14:00）出诊医生2-3名');
  }

  const pediatrics = deptStats.find(d => d.departmentName === '儿科');
  if (pediatrics && pediatrics.waitingTimeCompliance < 80) {
    recs.push('儿科患者流失率较高，建议优化叫号系统，增加候诊区娱乐设施');
  }

  const dermatology = deptStats.find(d => d.departmentName === '皮肤科');
  if (dermatology && dermatology.saturation < 75) {
    recs.push('皮肤科资源利用率偏低，可考虑开展皮肤美容等特色门诊增加收入');
  }

  const highLoad = deptStats.filter(d => d.saturation > 85);
  if (highLoad.length > 0) {
    recs.push(highLoad.map(d => d.departmentName).join('和') + '医生人均接诊量较高，建议合理控制每位医生单日接诊上限');
  }

  if (emergency || pediatrics) {
    recs.push('建议在急诊科和儿科引入智能预诊系统，缩短患者候诊时间');
  }

  if (recs.length === 0) {
    recs.push('本周各科室运行平稳，请继续保持当前管理水平');
  }

  return recs;
}

function generateTxt(report, res) {
  const lines = [];
  lines.push('========================================');
  lines.push('        Hospital Weekly Report');
  lines.push('========================================');
  lines.push('');
  lines.push(`Report Period: ${report.weekStart} ~ ${report.weekEnd}`);
  lines.push(`Generated At:  ${report.generatedAt}`);
  lines.push('');
  lines.push('--- Key Metrics ---');
  lines.push(`Waiting Time Compliance:  ${report.waitingTimeCompliance}%`);
  lines.push(`Avg Patients Per Doctor:  ${report.avgPatientsPerDoctor}`);
  lines.push(`Patient Churn Rate:       ${report.patientChurnRate}%`);
  lines.push('');
  lines.push('--- Department Stats ---');
  lines.push(
    'Department'.padEnd(16) +
    'Compliance'.padEnd(14) +
    'Avg/Doctor'.padEnd(14) +
    'Saturation'
  );
  lines.push('-'.repeat(56));
  for (const ds of report.departmentStats) {
    lines.push(
      ds.departmentName.padEnd(16) +
      (ds.waitingTimeCompliance + '%').padEnd(14) +
      String(ds.avgPatientsPerDoctor).padEnd(14) +
      ds.saturation + '%'
    );
  }
  lines.push('');
  lines.push('--- Recommendations ---');
  report.recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
  lines.push('');
  lines.push('========================================');

  const text = lines.join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${report.weekStart}.txt"`);
  res.send(text);
}

function generatePdf(report, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${report.weekStart}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  });

  doc.fontSize(22).text('Hospital Weekly Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Period: ${report.weekStart} ~ ${report.weekEnd}`, { align: 'center' });
  doc.text(`Generated: ${report.generatedAt}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(16).text('Key Metrics');
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`  Waiting Time Compliance:  ${report.waitingTimeCompliance}%`);
  doc.text(`  Avg Patients Per Doctor:  ${report.avgPatientsPerDoctor}`);
  doc.text(`  Patient Churn Rate:       ${report.patientChurnRate}%`);
  doc.moveDown(1.5);

  doc.fontSize(16).text('Department Statistics');
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colWidths = [140, 110, 110, 110];
  const headers = ['Department', 'Compliance', 'Avg/Doctor', 'Saturation'];
  let x = 50;

  doc.fontSize(10).font('Helvetica-Bold');
  headers.forEach((h, i) => {
    doc.text(h, x, tableTop, { width: colWidths[i], align: 'center' });
    x += colWidths[i];
  });

  doc.font('Helvetica');
  let y = tableTop + 20;

  doc.moveTo(50, y - 5).lineTo(545, y - 5).stroke();

  for (const ds of report.departmentStats) {
    x = 50;
    const row = [
      ds.departmentName,
      ds.waitingTimeCompliance + '%',
      String(ds.avgPatientsPerDoctor),
      ds.saturation + '%',
    ];
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], align: 'center' });
      x += colWidths[i];
    });
    y += 18;
  }

  doc.moveDown(2);
  y = doc.y;

  doc.fontSize(16).text('Recommendations', 50, y);
  doc.moveDown(0.5);

  report.recommendations.forEach((r, i) => {
    doc.fontSize(10).text(`${i + 1}. ${r}`, 50, doc.y, { width: 460 });
    doc.moveDown(0.3);
  });

  doc.end();
}

async function generateExcel(report, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hospital Dashboard';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.addRow({ metric: 'Report Period', value: `${report.weekStart} ~ ${report.weekEnd}` });
  summarySheet.addRow({ metric: 'Generated At', value: report.generatedAt });
  summarySheet.addRow({ metric: 'Waiting Time Compliance (%)', value: report.waitingTimeCompliance });
  summarySheet.addRow({ metric: 'Avg Patients Per Doctor', value: report.avgPatientsPerDoctor });
  summarySheet.addRow({ metric: 'Patient Churn Rate (%)', value: report.patientChurnRate });

  summarySheet.getRow(1).font = { bold: true };

  const deptSheet = workbook.addWorksheet('Department Stats');
  deptSheet.columns = [
    { header: 'Department', key: 'departmentName', width: 15 },
    { header: 'Waiting Time Compliance (%)', key: 'waitingTimeCompliance', width: 25 },
    { header: 'Avg Patients Per Doctor', key: 'avgPatientsPerDoctor', width: 22 },
    { header: 'Saturation (%)', key: 'saturation', width: 15 },
  ];

  const headerRow = deptSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const ds of report.departmentStats) {
    deptSheet.addRow(ds);
  }

  for (let i = 2; i <= deptSheet.rowCount; i++) {
    const row = deptSheet.getRow(i);
    const compliance = row.getCell(2).value;
    if (compliance < 70) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    } else if (compliance < 85) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    }
  }

  const recSheet = workbook.addWorksheet('Recommendations');
  recSheet.columns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'Recommendation', key: 'recommendation', width: 80 },
  ];
  recSheet.getRow(1).font = { bold: true };

  report.recommendations.forEach((r, i) => {
    recSheet.addRow({ index: i + 1, recommendation: r });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${report.weekStart}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

export default router;
