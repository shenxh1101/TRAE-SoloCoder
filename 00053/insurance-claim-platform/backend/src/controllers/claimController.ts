import { Request, Response } from 'express';
import db, { generateId, getTimestamp } from '../db';
import { checkDataScope } from '../middleware/auth';
import { Claim, ApiResponse } from '../types';

export function getClaims(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const insuranceType = req.query.insurance_type as string;
    const accidentType = req.query.accident_type as string;
    const status = req.query.status as string;
    const branch = req.query.branch as string;
    const region = req.query.region as string;

    const offset = (page - 1) * limit;

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

    if (search) {
      whereClauses.push('(claim_no LIKE ? OR holder_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (insuranceType) {
      whereClauses.push('insurance_type = ?');
      params.push(insuranceType);
    }

    if (accidentType) {
      whereClauses.push('accident_type = ?');
      params.push(accidentType);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (branch) {
      whereClauses.push('branch = ?');
      params.push(branch);
    }

    if (region) {
      whereClauses.push('region = ?');
      params.push(region);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM claims ${whereSql}`;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult.total;

    const dataSql = `SELECT * FROM claims ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const claims = db.prepare(dataSql).all(...params) as Claim[];

    res.json({
      success: true,
      data: {
        items: claims,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Claims retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getClaimById(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const dataScope = checkDataScope(req);

    let whereClauses: string[] = ['id = ?'];
    let params: any[] = [id];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const sql = `SELECT * FROM claims WHERE ${whereClauses.join(' AND ')}`;
    const claim = db.prepare(sql).get(...params) as Claim | undefined;

    if (!claim) {
      res.status(404).json({
        success: false,
        error: 'Claim not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: claim,
      message: 'Claim retrieved successfully'
    } as ApiResponse<Claim>);
  } catch (error) {
    console.error('Get claim by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function createClaim(req: Request, res: Response): void {
  try {
    const {
      claim_no,
      policy_id,
      policy_no,
      holder_name,
      insurance_type,
      accident_type,
      accident_date,
      report_date,
      status,
      claim_amount,
      approved_amount,
      assessor,
      handler,
      branch,
      region,
      close_date,
      reject_reason
    }: Partial<Claim> = req.body;

    if (!claim_no || !policy_id || !policy_no || !holder_name || !insurance_type || !accident_type || !accident_date || !report_date || !status || !branch || !region) {
      res.status(400).json({
        success: false,
        error: 'Required fields are missing'
      } as ApiResponse);
      return;
    }

    const id = generateId();
    const created_at = getTimestamp();

    const sql = `INSERT INTO claims (id, claim_no, policy_id, policy_no, holder_name, insurance_type, accident_type, accident_date, report_date, status, claim_amount, approved_amount, assessor, handler, branch, region, close_date, reject_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.prepare(sql).run(id, claim_no, policy_id, policy_no, holder_name, insurance_type, accident_type, accident_date, report_date, status, claim_amount || null, approved_amount || null, assessor || null, handler || null, branch, region, close_date || null, reject_reason || null, created_at);

    const newClaim = db.prepare('SELECT * FROM claims WHERE id = ?').get(id) as Claim;

    res.status(201).json({
      success: true,
      data: newClaim,
      message: 'Claim created successfully'
    } as ApiResponse<Claim>);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function updateClaim(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const dataScope = checkDataScope(req);

    let whereClauses: string[] = ['id = ?'];
    let params: any[] = [id];

    if (dataScope.region) {
      whereClauses.push('region = ?');
      params.push(dataScope.region);
    }

    if (dataScope.branch) {
      whereClauses.push('branch = ?');
      params.push(dataScope.branch);
    }

    const checkSql = `SELECT * FROM claims WHERE ${whereClauses.join(' AND ')}`;
    const existingClaim = db.prepare(checkSql).get(...params) as Claim | undefined;

    if (!existingClaim) {
      res.status(404).json({
        success: false,
        error: 'Claim not found'
      } as ApiResponse);
      return;
    }

    const {
      claim_no,
      policy_id,
      policy_no,
      holder_name,
      insurance_type,
      accident_type,
      accident_date,
      report_date,
      status,
      claim_amount,
      approved_amount,
      assessor,
      handler,
      branch,
      region,
      close_date,
      reject_reason
    }: Partial<Claim> = req.body;

    const updateSql = `UPDATE claims SET claim_no = ?, policy_id = ?, policy_no = ?, holder_name = ?, insurance_type = ?, accident_type = ?, accident_date = ?, report_date = ?, status = ?, claim_amount = ?, approved_amount = ?, assessor = ?, handler = ?, branch = ?, region = ?, close_date = ?, reject_reason = ? WHERE id = ?`;

    db.prepare(updateSql).run(
      claim_no || existingClaim.claim_no,
      policy_id || existingClaim.policy_id,
      policy_no || existingClaim.policy_no,
      holder_name || existingClaim.holder_name,
      insurance_type || existingClaim.insurance_type,
      accident_type || existingClaim.accident_type,
      accident_date || existingClaim.accident_date,
      report_date || existingClaim.report_date,
      status || existingClaim.status,
      claim_amount !== undefined ? claim_amount : existingClaim.claim_amount,
      approved_amount !== undefined ? approved_amount : existingClaim.approved_amount,
      assessor !== undefined ? assessor : existingClaim.assessor,
      handler !== undefined ? handler : existingClaim.handler,
      branch || existingClaim.branch,
      region || existingClaim.region,
      close_date !== undefined ? close_date : existingClaim.close_date,
      reject_reason !== undefined ? reject_reason : existingClaim.reject_reason,
      id
    );

    const updatedClaim = db.prepare('SELECT * FROM claims WHERE id = ?').get(id) as Claim;

    res.json({
      success: true,
      data: updatedClaim,
      message: 'Claim updated successfully'
    } as ApiResponse<Claim>);
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getStatistics(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

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

    if (startDate) {
      whereClauses.push('report_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('report_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const totalSql = `SELECT COUNT(*) as total FROM claims ${whereSql}`;
    const totalResult = db.prepare(totalSql).get(...params) as { total: number };
    const total = totalResult.total;

    const statusPrefix = whereSql.length > 0 ? 'AND' : 'WHERE';
    const approvedSql = `SELECT COUNT(*) as approved FROM claims ${whereSql} ${statusPrefix} status = 'approved'`;
    const approvedResult = db.prepare(approvedSql).get(...params) as { approved: number };
    const approved = approvedResult.approved;

    const rejectedSql = `SELECT COUNT(*) as rejected FROM claims ${whereSql} ${statusPrefix} status = 'rejected'`;
    const rejectedResult = db.prepare(rejectedSql).get(...params) as { rejected: number };
    const rejected = rejectedResult.rejected;

    const closedSql = `SELECT 
      report_date, 
      close_date 
    FROM claims 
    ${whereSql} 
    ${statusPrefix} status IN ('approved', 'rejected', 'paid')
    AND close_date IS NOT NULL`;
    
    const closedClaims = db.prepare(closedSql).all(...params) as { report_date: string; close_date: string }[];
    
    let totalProcessingDays = 0;
    closedClaims.forEach(claim => {
      const start = new Date(claim.report_date);
      const end = new Date(claim.close_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalProcessingDays += diff;
    });
    const avgProcessingDays = closedClaims.length > 0 ? Math.round(totalProcessingDays / closedClaims.length * 100) / 100 : 0;

    const payoutRate = total > 0 ? Math.round(approved / total * 10000) / 100 : 0;
    const rejectionRate = total > 0 ? Math.round(rejected / total * 10000) / 100 : 0;

    res.json({
      success: true,
      data: {
        total,
        approved,
        rejected,
        payout_rate: payoutRate,
        rejection_rate: rejectionRate,
        avg_processing_days: avgProcessingDays
      },
      message: 'Statistics retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getAccidentDistribution(req: Request, res: Response): void {
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

    const sql = `SELECT accident_type, COUNT(*) as count FROM claims ${whereSql} GROUP BY accident_type ORDER BY count DESC`;
    const distribution = db.prepare(sql).all(...params) as { accident_type: string; count: number }[];

    res.json({
      success: true,
      data: distribution,
      message: 'Accident distribution retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get accident distribution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getBranchPerformance(req: Request, res: Response): void {
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

    const sql = `SELECT 
      branch,
      COUNT(*) as total_claims,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM claims 
    ${whereSql} 
    GROUP BY branch 
    ORDER BY total_claims DESC`;
    
    const performance = db.prepare(sql).all(...params) as {
      branch: string;
      total_claims: number;
      approved: number;
      rejected: number;
      pending: number;
    }[];

    res.json({
      success: true,
      data: performance,
      message: 'Branch performance retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get branch performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  getClaims,
  getClaimById,
  createClaim,
  updateClaim,
  getStatistics,
  getAccidentDistribution,
  getBranchPerformance
};
