import { Request, Response } from 'express';
import db, { generateId, getTimestamp } from '../db';
import { checkDataScope } from '../middleware/auth';
import { Policy, ApiResponse } from '../types';

export function getPolicies(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const insuranceType = req.query.insurance_type as string;

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
      whereClauses.push('(policy_no LIKE ? OR holder_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (insuranceType) {
      whereClauses.push('insurance_type = ?');
      params.push(insuranceType);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM policies ${whereSql}`;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult.total;

    const dataSql = `SELECT * FROM policies ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const policies = db.prepare(dataSql).all(...params) as Policy[];

    res.json({
      success: true,
      data: {
        items: policies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Policies retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getPolicyById(req: Request, res: Response): void {
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

    const sql = `SELECT * FROM policies WHERE ${whereClauses.join(' AND ')}`;
    const policy = db.prepare(sql).get(...params) as Policy | undefined;

    if (!policy) {
      res.status(404).json({
        success: false,
        error: 'Policy not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: policy,
      message: 'Policy retrieved successfully'
    } as ApiResponse<Policy>);
  } catch (error) {
    console.error('Get policy by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function createPolicy(req: Request, res: Response): void {
  try {
    const {
      policy_no,
      holder_name,
      insurance_type,
      start_date,
      end_date,
      premium,
      coverage,
      branch,
      region
    }: Partial<Policy> = req.body;

    if (!policy_no || !holder_name || !insurance_type || !start_date || !end_date || !premium || !coverage || !branch || !region) {
      res.status(400).json({
        success: false,
        error: 'All fields are required'
      } as ApiResponse);
      return;
    }

    const id = generateId();
    const created_at = getTimestamp();

    const sql = `INSERT INTO policies (id, policy_no, holder_name, insurance_type, start_date, end_date, premium, coverage, branch, region, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.prepare(sql).run(id, policy_no, holder_name, insurance_type, start_date, end_date, premium, coverage, branch, region, created_at);

    const newPolicy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as Policy;

    res.status(201).json({
      success: true,
      data: newPolicy,
      message: 'Policy created successfully'
    } as ApiResponse<Policy>);
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function updatePolicy(req: Request, res: Response): void {
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

    const checkSql = `SELECT * FROM policies WHERE ${whereClauses.join(' AND ')}`;
    const existingPolicy = db.prepare(checkSql).get(...params) as Policy | undefined;

    if (!existingPolicy) {
      res.status(404).json({
        success: false,
        error: 'Policy not found'
      } as ApiResponse);
      return;
    }

    const {
      policy_no,
      holder_name,
      insurance_type,
      start_date,
      end_date,
      premium,
      coverage,
      branch,
      region
    }: Partial<Policy> = req.body;

    const updateSql = `UPDATE policies SET policy_no = ?, holder_name = ?, insurance_type = ?, start_date = ?, end_date = ?, premium = ?, coverage = ?, branch = ?, region = ? WHERE id = ?`;

    db.prepare(updateSql).run(
      policy_no || existingPolicy.policy_no,
      holder_name || existingPolicy.holder_name,
      insurance_type || existingPolicy.insurance_type,
      start_date || existingPolicy.start_date,
      end_date || existingPolicy.end_date,
      premium || existingPolicy.premium,
      coverage || existingPolicy.coverage,
      branch || existingPolicy.branch,
      region || existingPolicy.region,
      id
    );

    const updatedPolicy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as Policy;

    res.json({
      success: true,
      data: updatedPolicy,
      message: 'Policy updated successfully'
    } as ApiResponse<Policy>);
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function deletePolicy(req: Request, res: Response): void {
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

    const checkSql = `SELECT * FROM policies WHERE ${whereClauses.join(' AND ')}`;
    const existingPolicy = db.prepare(checkSql).get(...params) as Policy | undefined;

    if (!existingPolicy) {
      res.status(404).json({
        success: false,
        error: 'Policy not found'
      } as ApiResponse);
      return;
    }

    const deleteSql = `DELETE FROM policies WHERE id = ?`;
    db.prepare(deleteSql).run(id);

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
};
