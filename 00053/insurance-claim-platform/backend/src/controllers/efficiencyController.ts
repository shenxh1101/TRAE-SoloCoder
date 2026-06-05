import { Request, Response } from 'express';
import db from '../db';
import { checkDataScope } from '../middleware/auth';
import { ApiResponse } from '../types';

export function getHandlerEfficiency(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const insuranceType = req.query.insurance_type as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let whereClauses: string[] = ['handler IS NOT NULL'];
    let params: any[] = [];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    if (insuranceType) {
      whereClauses.push('insurance_type = ?');
      params.push(insuranceType);
    }

    if (startDate) {
      whereClauses.push('report_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('report_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        handler as handler_name,
        COUNT(*) as total_cases,
        SUM(CASE WHEN status IN ('approved', 'rejected', 'closed') THEN 1 ELSE 0 END) as closed_cases,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_cases,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_cases,
        GROUP_CONCAT(CASE WHEN close_date IS NOT NULL THEN report_date || '|' || close_date END, ',') as date_pairs
      FROM claims
      WHERE ${whereSql}
      GROUP BY handler
      ORDER BY total_cases DESC
    `;

    const results = db.prepare(sql).all(...params) as {
      handler_name: string;
      total_cases: number;
      closed_cases: number;
      approved_cases: number;
      rejected_cases: number;
      date_pairs: string;
    }[];

    const handlerStats = results.map(result => {
      let totalDays = 0;
      let closedWithDates = 0;

      if (result.date_pairs) {
        const pairs = result.date_pairs.split(',');
        pairs.forEach(pair => {
          const [reportDate, closeDate] = pair.split('|');
          if (reportDate && closeDate) {
            const start = new Date(reportDate);
            const end = new Date(closeDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += days;
            closedWithDates++;
          }
        });
      }

      const avg_days = closedWithDates > 0 ? Math.round(totalDays / closedWithDates * 100) / 100 : 0;
      const rejection_rate = result.total_cases > 0 ? Math.round(result.rejected_cases / result.total_cases * 10000) / 100 : 0;
      const approval_rate = result.total_cases > 0 ? Math.round(result.approved_cases / result.total_cases * 10000) / 100 : 0;

      return {
        handler_name: result.handler_name,
        total_cases: result.total_cases,
        closed_cases: result.closed_cases,
        avg_days,
        rejection_rate,
        approval_rate
      };
    });

    res.json({
      success: true,
      data: handlerStats,
      message: 'Handler efficiency data retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get handler efficiency error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getRejectReasons(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const insuranceType = req.query.insurance_type as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let whereClauses: string[] = ['status = ?', 'reject_reason IS NOT NULL', 'reject_reason != ?'];
    let params: any[] = ['rejected', ''];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    if (insuranceType) {
      whereClauses.push('insurance_type = ?');
      params.push(insuranceType);
    }

    if (startDate) {
      whereClauses.push('report_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('report_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        reject_reason,
        COUNT(*) as count
      FROM claims
      WHERE ${whereSql}
      GROUP BY reject_reason
      ORDER BY count DESC
    `;

    const reasons = db.prepare(sql).all(...params) as { reject_reason: string; count: number }[];

    const wordCloudData = reasons.map(item => ({
      text: item.reject_reason,
      value: item.count
    }));

    res.json({
      success: true,
      data: {
        word_cloud: wordCloudData,
        total_rejections: wordCloudData.reduce((sum, item) => sum + item.value, 0)
      },
      message: 'Reject reasons retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get reject reasons error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  getHandlerEfficiency,
  getRejectReasons
};
