import { Request, Response } from 'express';
import db, { generateId, getTimestamp } from '../db';
import { EarlyWarning, ApiResponse, User } from '../types';

export function getWarnings(req: Request, res: Response): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const level = req.query.level as string;
    const region = req.query.region as string;
    const branch = req.query.branch as string;

    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (level) {
      whereClauses.push('level = ?');
      params.push(level);
    }

    if (region) {
      whereClauses.push('region = ?');
      params.push(region);
    }

    if (branch) {
      whereClauses.push('branch = ?');
      params.push(branch);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM early_warnings ${whereSql}`;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult.total;

    const dataSql = `SELECT * FROM early_warnings ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const warnings = db.prepare(dataSql).all(...params) as EarlyWarning[];

    res.json({
      success: true,
      data: {
        items: warnings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Warnings retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get warnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getWarningById(req: Request, res: Response): void {
  try {
    const { id } = req.params;

    const sql = `SELECT * FROM early_warnings WHERE id = ?`;
    const warning = db.prepare(sql).get(id) as EarlyWarning | undefined;

    if (!warning) {
      res.status(404).json({
        success: false,
        error: 'Warning not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: warning,
      message: 'Warning retrieved successfully'
    } as ApiResponse<EarlyWarning>);
  } catch (error) {
    console.error('Get warning by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function acknowledgeWarning(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const checkSql = `SELECT * FROM early_warnings WHERE id = ?`;
    const existingWarning = db.prepare(checkSql).get(id) as EarlyWarning | undefined;

    if (!existingWarning) {
      res.status(404).json({
        success: false,
        error: 'Warning not found'
      } as ApiResponse);
      return;
    }

    const updateSql = `UPDATE early_warnings SET status = 'acknowledged', assignee = ? WHERE id = ?`;
    db.prepare(updateSql).run(userId || null, id);

    const updatedWarning = db.prepare('SELECT * FROM early_warnings WHERE id = ?').get(id) as EarlyWarning;

    res.json({
      success: true,
      data: updatedWarning,
      message: 'Warning acknowledged successfully'
    } as ApiResponse<EarlyWarning>);
  } catch (error) {
    console.error('Acknowledge warning error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function resolveWarning(req: Request, res: Response): void {
  try {
    const { id } = req.params;

    const checkSql = `SELECT * FROM early_warnings WHERE id = ?`;
    const existingWarning = db.prepare(checkSql).get(id) as EarlyWarning | undefined;

    if (!existingWarning) {
      res.status(404).json({
        success: false,
        error: 'Warning not found'
      } as ApiResponse);
      return;
    }

    const updateSql = `UPDATE early_warnings SET status = 'resolved' WHERE id = ?`;
    db.prepare(updateSql).run(id);

    const updatedWarning = db.prepare('SELECT * FROM early_warnings WHERE id = ?').get(id) as EarlyWarning;

    res.json({
      success: true,
      data: updatedWarning,
      message: 'Warning resolved successfully'
    } as ApiResponse<EarlyWarning>);
  } catch (error) {
    console.error('Resolve warning error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function detectAnomalies(req: Request, res: Response): void {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const anomalySql = `
      SELECT 
        c.branch,
        c.region,
        c.insurance_type,
        c.accident_type,
        COUNT(DISTINCT DATE(c.created_at)) as anomaly_days,
        COUNT(*) as anomaly_count,
        (
          SELECT COUNT(*) FROM claims c2 
          WHERE c2.branch = c.branch 
            AND c2.insurance_type = c.insurance_type
            AND c2.accident_type = c.accident_type
            AND c2.created_at >= ?
            AND c2.created_at < ?
        ) as historical_count
      FROM claims c
      WHERE c.created_at >= ?
      GROUP BY c.branch, c.region, c.insurance_type, c.accident_type
      HAVING anomaly_days >= 3
    `;

    const results = db.prepare(anomalySql).all(
      thirtyDaysAgoStr,
      threeDaysAgoStr,
      threeDaysAgoStr
    ) as {
      branch: string;
      region: string;
      insurance_type: string;
      accident_type: string;
      anomaly_days: number;
      anomaly_count: number;
      historical_count: number;
    }[];

    const createdWarnings: EarlyWarning[] = [];
    const created_at = getTimestamp();

    results.forEach(result => {
      const historical_avg = result.historical_count / 27;
      const threshold = historical_avg * 2;
      const avg_anomaly_count = result.anomaly_count / result.anomaly_days;

      if (avg_anomaly_count > threshold && threshold > 0) {
        let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const ratio = avg_anomaly_count / threshold;
        
        if (ratio >= 4) level = 'critical';
        else if (ratio >= 3) level = 'high';
        else if (ratio >= 2) level = 'medium';

        const warningId = generateId();
        const trigger_date = new Date().toISOString().split('T')[0];

        const insertSql = `INSERT INTO early_warnings 
          (id, branch, region, insurance_type, accident_type, anomaly_days, avg_anomaly_count, historical_avg, threshold, trigger_date, status, level, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`;

        db.prepare(insertSql).run(
          warningId,
          result.branch,
          result.region,
          result.insurance_type,
          result.accident_type,
          result.anomaly_days,
          Math.round(avg_anomaly_count * 100) / 100,
          Math.round(historical_avg * 100) / 100,
          Math.round(threshold * 100) / 100,
          trigger_date,
          level,
          created_at
        );

        const newWarning = db.prepare('SELECT * FROM early_warnings WHERE id = ?').get(warningId) as EarlyWarning;
        createdWarnings.push(newWarning);
      }
    });

    res.json({
      success: true,
      data: {
        detected: results.length,
        created: createdWarnings.length,
        warnings: createdWarnings
      },
      message: 'Anomaly detection completed'
    } as ApiResponse);
  } catch (error) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function pushNotification(req: Request, res: Response): void {
  try {
    const { id } = req.params;

    const checkSql = `SELECT * FROM early_warnings WHERE id = ?`;
    const warning = db.prepare(checkSql).get(id) as EarlyWarning | undefined;

    if (!warning) {
      res.status(404).json({
        success: false,
        error: 'Warning not found'
      } as ApiResponse);
      return;
    }

    const managersSql = `
      SELECT id FROM users 
      WHERE (role = 'headquarters' OR role = 'region' OR role = 'branch')
      AND (
        (role = 'headquarters')
        OR (role = 'region' AND region = ?)
        OR (role = 'branch' AND region = ? AND branch = ?)
      )
    `;
    
    const managers = db.prepare(managersSql).all(
      warning.region,
      warning.region,
      warning.branch
    ) as { id: number }[];

    const created_at = getTimestamp();
    const title = `异常预警: ${warning.branch} - ${warning.accident_type}`;
    const content = `${warning.branch}在连续${warning.anomaly_days}天内${warning.accident_type}理赔数量异常，平均${warning.avg_anomaly_count}件/天，超过历史平均值${warning.historical_avg.toFixed(2)}的${(warning.threshold / warning.historical_avg).toFixed(1)}倍。请及时处理。`;

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, user_id, warning_id, title, content, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 'warning', 0, ?)
    `);

    const notifications: { id: number; user_id: number }[] = [];
    managers.forEach(manager => {
      const notificationId = generateId();
      insertNotification.run(notificationId, manager.id, warning.id, title, content, created_at);
      notifications.push({ id: notificationId, user_id: manager.id });
    });

    res.json({
      success: true,
      data: {
        warning_id: warning.id,
        sent_count: notifications.length,
        notifications
      },
      message: 'Notification pushed successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  getWarnings,
  getWarningById,
  acknowledgeWarning,
  resolveWarning,
  detectAnomalies,
  pushNotification
};
