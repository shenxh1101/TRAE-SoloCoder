import { Request, Response } from 'express';
import db from '../db';
import { checkDataScope } from '../middleware/auth';
import { ApiResponse } from '../types';
import { generateReportPDF } from '../utils/pdfGenerator';

interface MonthlyReportData {
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
  payout_rate_trend: { month: string; rate: number }[];
  closure_time_distribution: { range: string; count: number }[];
  branch_performance: { branch: string; total: number; approved: number; payout: number }[];
}

export function generateMonthlyReport(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const month = req.params.month || new Date().toISOString().slice(0, 7);

    const startDate = `${month}-01`;
    const endDate = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).toISOString().slice(0, 10);

    let whereClauses: string[] = ['report_date >= ? AND report_date <= ?'];
    let params: any[] = [startDate, endDate];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const whereSql = whereClauses.join(' AND ');

    const totalSql = `SELECT COUNT(*) as total FROM claims WHERE ${whereSql}`;
    const totalResult = db.prepare(totalSql).get(...params) as { total: number };
    const total_claims = totalResult.total;

    const approvedSql = `SELECT COUNT(*) as approved, COALESCE(SUM(approved_amount), 0) as total_payout FROM claims WHERE ${whereSql} AND status = 'approved'`;
    const approvedResult = db.prepare(approvedSql).get(...params) as { approved: number; total_payout: number };
    const approved_claims = approvedResult.approved;
    const total_payout = approvedResult.total_payout;

    const rejectedSql = `SELECT COUNT(*) as rejected FROM claims WHERE ${whereSql} AND status = 'rejected'`;
    const rejectedResult = db.prepare(rejectedSql).get(...params) as { rejected: number };
    const rejected_claims = rejectedResult.rejected;

    const pendingSql = `SELECT COUNT(*) as pending FROM claims WHERE ${whereSql} AND status IN ('pending', 'assessing')`;
    const pendingResult = db.prepare(pendingSql).get(...params) as { pending: number };
    const pending_claims = pendingResult.pending;

    const avgPayout = approved_claims > 0 ? total_payout / approved_claims : 0;
    const payout_rate = total_claims > 0 ? Math.round(approved_claims / total_claims * 10000) / 100 : 0;

    const closedSql = `SELECT report_date, close_date FROM claims WHERE ${whereSql} AND status IN ('approved', 'rejected', 'closed') AND close_date IS NOT NULL`;
    const closedClaims = db.prepare(closedSql).all(...params) as { report_date: string; close_date: string }[];
    
    let totalProcessingDays = 0;
    closedClaims.forEach(claim => {
      const start = new Date(claim.report_date);
      const end = new Date(claim.close_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalProcessingDays += diff;
    });
    const avg_processing_days = closedClaims.length > 0 ? Math.round(totalProcessingDays / closedClaims.length * 100) / 100 : 0;

    const fraudSql = `SELECT COUNT(*) as fraud_count FROM claims WHERE ${whereSql} AND reject_reason LIKE '%欺诈%'`;
    const fraudResult = db.prepare(fraudSql).get(...params) as { fraud_count: number };
    const suspected_fraud_count = fraudResult.fraud_count;
    const suspected_fraud_ratio = total_claims > 0 ? Math.round(suspected_fraud_count / total_claims * 10000) / 100 : 0;

    const typeBreakdownSql = `
      SELECT 
        insurance_type, 
        COUNT(*) as count, 
        COALESCE(SUM(approved_amount), 0) as payout 
      FROM claims 
      WHERE ${whereSql} 
      GROUP BY insurance_type 
      ORDER BY count DESC
    `;
    const insurance_type_breakdown = db.prepare(typeBreakdownSql).all(...params) as { insurance_type: string; count: number; payout: number }[];

    const trendSql = `
      SELECT 
        strftime('%Y-%m', report_date) as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM claims
      WHERE report_date >= date(?, '-5 months') AND report_date <= ?
      ${dataScope.region ? 'AND region = ?' : ''}
      ${dataScope.branch ? 'AND branch = ?' : ''}
      GROUP BY strftime('%Y-%m', report_date)
      ORDER BY month ASC
    `;
    const trendParams = [startDate, endDate];
    if (dataScope.region) trendParams.push(dataScope.region);
    if (dataScope.branch) trendParams.push(dataScope.branch);
    const trendResults = db.prepare(trendSql).all(...trendParams) as { month: string; total: number; approved: number }[];
    const payout_rate_trend = trendResults.map(r => ({
      month: r.month,
      rate: r.total > 0 ? Math.round(r.approved / r.total * 10000) / 100 : 0
    }));

    const closureDistribution = [
      { range: '0-3天', min: 0, max: 3, count: 0 },
      { range: '4-7天', min: 4, max: 7, count: 0 },
      { range: '8-15天', min: 8, max: 15, count: 0 },
      { range: '16-30天', min: 16, max: 30, count: 0 },
      { range: '30天以上', min: 31, max: 9999, count: 0 }
    ];
    closedClaims.forEach(claim => {
      const start = new Date(claim.report_date);
      const end = new Date(claim.close_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = closureDistribution.find(d => days >= d.min && days <= d.max);
      if (bucket) bucket.count++;
    });
    const closure_time_distribution = closureDistribution.map(d => ({ range: d.range, count: d.count }));

    const branchSql = `
      SELECT 
        branch,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        COALESCE(SUM(approved_amount), 0) as payout
      FROM claims
      WHERE ${whereSql}
      GROUP BY branch
      ORDER BY total DESC
    `;
    const branch_performance = db.prepare(branchSql).all(...params) as { branch: string; total: number; approved: number; payout: number }[];

    const report: MonthlyReportData = {
      month,
      total_claims,
      approved_claims,
      rejected_claims,
      pending_claims,
      total_payout,
      avg_payout: Math.round(avgPayout * 100) / 100,
      payout_rate,
      avg_processing_days,
      suspected_fraud_count,
      suspected_fraud_ratio,
      insurance_type_breakdown,
      payout_rate_trend,
      closure_time_distribution,
      branch_performance
    };

    res.json({
      success: true,
      data: report,
      message: 'Monthly report generated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Generate monthly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getMonthlyReports(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        strftime('%Y-%m', report_date) as month,
        COUNT(*) as total_claims,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_claims,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_claims,
        COALESCE(SUM(approved_amount), 0) as total_payout
      FROM claims
      ${whereSql}
      GROUP BY strftime('%Y-%m', report_date)
      ORDER BY month DESC
      LIMIT 12
    `;

    const reports = db.prepare(sql).all(...params) as {
      month: string;
      total_claims: number;
      approved_claims: number;
      rejected_claims: number;
      total_payout: number;
    }[];

    res.json({
      success: true,
      data: reports,
      message: 'Monthly reports retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get monthly reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function generateSuggestions(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const month = req.params.month || new Date().toISOString().slice(0, 7);

    const startDate = `${month}-01`;
    const endDate = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).toISOString().slice(0, 10);

    let whereClauses: string[] = ['report_date >= ? AND report_date <= ?'];
    let params: any[] = [startDate, endDate];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const whereSql = whereClauses.join(' AND ');

    const statsSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(approved_amount), 0) as total_payout
      FROM claims
      WHERE ${whereSql}
    `;
    const stats = db.prepare(statsSql).get(...params) as { total: number; approved: number; rejected: number; total_payout: number };

    const suggestions: string[] = [];

    const payoutRate = stats.total > 0 ? stats.approved / stats.total : 0;
    if (payoutRate > 0.8) {
      suggestions.push('赔付率较高，建议加强理赔审核流程，控制赔付风险');
    } else if (payoutRate < 0.4) {
      suggestions.push('赔付率偏低，建议检查审核标准是否过于严格，优化客户体验');
    }

    const avgProcessingSql = `
      SELECT report_date, close_date 
      FROM claims 
      WHERE ${whereSql} AND status IN ('approved', 'rejected', 'closed') AND close_date IS NOT NULL
    `;
    const closedClaims = db.prepare(avgProcessingSql).all(...params) as { report_date: string; close_date: string }[];
    let totalDays = 0;
    closedClaims.forEach(c => {
      totalDays += Math.ceil((new Date(c.close_date).getTime() - new Date(c.report_date).getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgDays = closedClaims.length > 0 ? totalDays / closedClaims.length : 0;

    if (avgDays > 10) {
      suggestions.push('平均理赔周期较长，建议优化理赔流程，提高处理效率');
    }

    const fraudSql = `SELECT COUNT(*) as fraud_count FROM claims WHERE ${whereSql} AND reject_reason LIKE '%欺诈%'`;
    const fraudResult = db.prepare(fraudSql).get(...params) as { fraud_count: number };
    const fraudRatio = stats.total > 0 ? fraudResult.fraud_count / stats.total : 0;

    if (fraudRatio > 0.1) {
      suggestions.push('疑似欺诈案件比例较高，建议加强反欺诈调查力度');
    }

    const typeSql = `
      SELECT insurance_type, COUNT(*) as count 
      FROM claims 
      WHERE ${whereSql} 
      GROUP BY insurance_type 
      ORDER BY count DESC 
      LIMIT 3
    `;
    const topTypes = db.prepare(typeSql).all(...params) as { insurance_type: string; count: number }[];
    if (topTypes.length > 0) {
      suggestions.push(`本月主要理赔类型为 ${topTypes.map(t => t.insurance_type).join('、')}，建议重点关注相关风险`);
    }

    if (suggestions.length === 0) {
      suggestions.push('本月各项指标正常，请继续保持良好的理赔管理');
    }

    res.json({
      success: true,
      data: {
        month,
        suggestions,
        metrics: {
          payout_rate: Math.round(payoutRate * 10000) / 100,
          avg_processing_days: Math.round(avgDays * 100) / 100,
          fraud_ratio: Math.round(fraudRatio * 10000) / 100
        }
      },
      message: 'Suggestions generated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Generate suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export async function exportReportPDF(req: Request, res: Response): Promise<void> {
  try {
    const dataScope = checkDataScope(req);
    const month = req.params.month || new Date().toISOString().slice(0, 7);

    const startDate = `${month}-01`;
    const endDate = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).toISOString().slice(0, 10);

    let whereClauses: string[] = ['report_date >= ? AND report_date <= ?'];
    let params: any[] = [startDate, endDate];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const whereSql = whereClauses.join(' AND ');

    const totalSql = `SELECT COUNT(*) as total FROM claims WHERE ${whereSql}`;
    const totalResult = db.prepare(totalSql).get(...params) as { total: number };
    const total_claims = totalResult.total;

    const approvedSql = `SELECT COUNT(*) as approved, COALESCE(SUM(approved_amount), 0) as total_payout FROM claims WHERE ${whereSql} AND status = 'approved'`;
    const approvedResult = db.prepare(approvedSql).get(...params) as { approved: number; total_payout: number };
    const approved_claims = approvedResult.approved;
    const total_payout = approvedResult.total_payout;

    const rejectedSql = `SELECT COUNT(*) as rejected FROM claims WHERE ${whereSql} AND status = 'rejected'`;
    const rejectedResult = db.prepare(rejectedSql).get(...params) as { rejected: number };
    const rejected_claims = rejectedResult.rejected;

    const pendingSql = `SELECT COUNT(*) as pending FROM claims WHERE ${whereSql} AND status IN ('pending', 'assessing')`;
    const pendingResult = db.prepare(pendingSql).get(...params) as { pending: number };
    const pending_claims = pendingResult.pending;

    const avgPayout = approved_claims > 0 ? total_payout / approved_claims : 0;
    const payout_rate = total_claims > 0 ? Math.round(approved_claims / total_claims * 10000) / 100 : 0;

    const closedSql = `SELECT report_date, close_date FROM claims WHERE ${whereSql} AND status IN ('approved', 'rejected', 'closed') AND close_date IS NOT NULL`;
    const closedClaims = db.prepare(closedSql).all(...params) as { report_date: string; close_date: string }[];
    
    let totalProcessingDays = 0;
    closedClaims.forEach(claim => {
      const start = new Date(claim.report_date);
      const end = new Date(claim.close_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalProcessingDays += diff;
    });
    const avg_processing_days = closedClaims.length > 0 ? Math.round(totalProcessingDays / closedClaims.length * 100) / 100 : 0;

    const fraudSql = `SELECT COUNT(*) as fraud_count FROM claims WHERE ${whereSql} AND reject_reason LIKE '%欺诈%'`;
    const fraudResult = db.prepare(fraudSql).get(...params) as { fraud_count: number };
    const suspected_fraud_count = fraudResult.fraud_count;
    const suspected_fraud_ratio = total_claims > 0 ? Math.round(suspected_fraud_count / total_claims * 10000) / 100 : 0;

    const typeBreakdownSql = `
      SELECT 
        insurance_type, 
        COUNT(*) as count, 
        COALESCE(SUM(approved_amount), 0) as payout 
      FROM claims 
      WHERE ${whereSql} 
      GROUP BY insurance_type 
      ORDER BY count DESC
    `;
    const insurance_type_breakdown = db.prepare(typeBreakdownSql).all(...params) as { insurance_type: string; count: number; payout: number }[];

    const closureDistribution = [
      { range: '0-3天', min: 0, max: 3, count: 0 },
      { range: '4-7天', min: 4, max: 7, count: 0 },
      { range: '8-15天', min: 8, max: 15, count: 0 },
      { range: '16-30天', min: 16, max: 30, count: 0 },
      { range: '30天以上', min: 31, max: 9999, count: 0 }
    ];
    closedClaims.forEach(claim => {
      const start = new Date(claim.report_date);
      const end = new Date(claim.close_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = closureDistribution.find(d => days >= d.min && days <= d.max);
      if (bucket) bucket.count++;
    });
    const closure_time_distribution = closureDistribution.map(d => ({ range: d.range, count: d.count }));

    const suggestions: string[] = [];
    const payoutRate = total_claims > 0 ? approved_claims / total_claims : 0;
    if (payoutRate > 0.8) {
      suggestions.push('赔付率较高，建议加强理赔审核流程，控制赔付风险');
    } else if (payoutRate < 0.4) {
      suggestions.push('赔付率偏低，建议检查审核标准是否过于严格');
    }
    if (avg_processing_days > 10) {
      suggestions.push('平均理赔周期较长，建议优化理赔流程');
    }
    if (suspected_fraud_ratio > 10) {
      suggestions.push('疑似欺诈案件比例较高，建议加强反欺诈调查');
    }
    if (suggestions.length === 0) {
      suggestions.push('本月各项指标正常，请继续保持良好的理赔管理');
    }

    const reportData = {
      month,
      total_claims,
      approved_claims,
      rejected_claims,
      pending_claims,
      total_payout,
      avg_payout: Math.round(avgPayout * 100) / 100,
      payout_rate,
      avg_processing_days,
      suspected_fraud_count,
      suspected_fraud_ratio,
      insurance_type_breakdown,
      closure_time_distribution,
      suggestions
    };

    const pdfBuffer = await generateReportPDF(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('Export report PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  generateMonthlyReport,
  getMonthlyReports,
  generateSuggestions,
  exportReportPDF
};
