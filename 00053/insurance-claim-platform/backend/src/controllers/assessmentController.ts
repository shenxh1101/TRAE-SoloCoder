import { Request, Response } from 'express';
import db, { generateId, getTimestamp } from '../db';
import { checkDataScope } from '../middleware/auth';
import { AssessmentRecord, AssessmentItem, ApiResponse } from '../types';

interface AssessmentItemInput {
  item_name: string;
  category: string;
  estimated_cost: number;
  actual_cost: number;
}

export function getRecords(req: Request, res: Response): void {
  try {
    const dataScope = checkDataScope(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const deviationFlag = req.query.deviation_flag as string;
    const assessor = req.query.assessor as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (dataScope.region || dataScope.branch) {
      whereClauses.push(`claim_id IN (SELECT id FROM claims WHERE 1=1
        ${dataScope.region ? ' AND region = ?' : ''}
        ${dataScope.branch ? ' AND branch = ?' : ''}
      )`);
      if (dataScope.region) params.push(dataScope.region);
      if (dataScope.branch) params.push(dataScope.branch);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (deviationFlag) {
      whereClauses.push('deviation_flag = ?');
      params.push(parseInt(deviationFlag));
    }

    if (assessor) {
      whereClauses.push('assessor = ?');
      params.push(assessor);
    }

    if (startDate) {
      whereClauses.push('assessment_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('assessment_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM assessment_records ${whereSql}`;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult.total;

    const dataSql = `SELECT * FROM assessment_records ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const records = db.prepare(dataSql).all(...params) as AssessmentRecord[];

    res.json({
      success: true,
      data: {
        items: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Assessment records retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function getRecordById(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const dataScope = checkDataScope(req);

    let whereClauses: string[] = ['ar.id = ?'];
    let params: any[] = [id];

    if (dataScope.region || dataScope.branch) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM claims c 
        WHERE c.id = ar.claim_id
        ${dataScope.region ? ' AND c.region = ?' : ''}
        ${dataScope.branch ? ' AND c.branch = ?' : ''}
      )`);
      if (dataScope.region) params.push(dataScope.region);
      if (dataScope.branch) params.push(dataScope.branch);
    }

    const sql = `SELECT ar.* FROM assessment_records ar WHERE ${whereClauses.join(' AND ')}`;
    const record = db.prepare(sql).get(...params) as AssessmentRecord | undefined;

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Assessment record not found'
      } as ApiResponse);
      return;
    }

    const itemsSql = `SELECT * FROM assessment_items WHERE record_id = ?`;
    const items = db.prepare(itemsSql).all(id) as AssessmentItem[];

    res.json({
      success: true,
      data: {
        ...record,
        items
      },
      message: 'Assessment record retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get record by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function checkDeviation(items: AssessmentItemInput[]): {
  items: (AssessmentItemInput & { deviation: number; needs_review: number })[];
  total_estimated: number;
  total_actual: number;
  deviation_flag: number;
} {
  const categoryAverages = getCategoryAverages();
  
  let total_estimated = 0;
  let total_actual = 0;
  let hasHighDeviation = false;

  const processedItems = items.map(item => {
    const deviation = item.estimated_cost > 0 
      ? Math.round((item.actual_cost - item.estimated_cost) / item.estimated_cost * 10000) / 100
      : 0;
    
    const needs_review = Math.abs(deviation) > 20 ? 1 : 0;
    
    const categoryAvg = categoryAverages[item.category] || item.estimated_cost;
    const deviationFromAvg = categoryAvg > 0 
      ? Math.round((item.actual_cost - categoryAvg) / categoryAvg * 10000) / 100
      : 0;
    
    if (Math.abs(deviation) > 20 || Math.abs(deviationFromAvg) > 20) {
      hasHighDeviation = true;
    }

    total_estimated += item.estimated_cost;
    total_actual += item.actual_cost;

    return {
      ...item,
      deviation,
      needs_review
    };
  });

  return {
    items: processedItems,
    total_estimated,
    total_actual,
    deviation_flag: hasHighDeviation ? 1 : 0
  };
}

function getCategoryAverages(): Record<string, number> {
  const sql = `
    SELECT category, AVG(actual_cost) as avg_cost 
    FROM assessment_items 
    GROUP BY category
  `;
  const results = db.prepare(sql).all() as { category: string; avg_cost: number }[];
  
  const averages: Record<string, number> = {};
  results.forEach(r => {
    averages[r.category] = r.avg_cost;
  });
  
  return averages;
}

export function createRecord(req: Request, res: Response): void {
  try {
    const {
      claim_id,
      claim_no,
      assessor,
      assessment_date,
      status,
      items
    }: {
      claim_id: number;
      claim_no: string;
      assessor: string;
      assessment_date: string;
      status: string;
      items: AssessmentItemInput[];
    } = req.body;

    if (!claim_id || !claim_no || !assessor || !assessment_date || !status || !items || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Required fields are missing'
      } as ApiResponse);
      return;
    }

    const deviationResult = checkDeviation(items);

    const recordId = generateId();
    const created_at = getTimestamp();

    const recordSql = `INSERT INTO assessment_records 
      (id, claim_id, claim_no, assessor, assessment_date, total_estimated, total_actual, status, deviation_flag, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.prepare(recordSql).run(
      recordId,
      claim_id,
      claim_no,
      assessor,
      assessment_date,
      deviationResult.total_estimated,
      deviationResult.total_actual,
      status,
      deviationResult.deviation_flag,
      created_at
    );

    const itemsInsert = db.prepare(`INSERT INTO assessment_items 
      (id, record_id, item_name, category, estimated_cost, actual_cost, deviation, needs_review, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    deviationResult.items.forEach(item => {
      const itemId = generateId();
      itemsInsert.run(
        itemId,
        recordId,
        item.item_name,
        item.category,
        item.estimated_cost,
        item.actual_cost,
        item.deviation,
        item.needs_review,
        created_at
      );
    });

    const newRecord = db.prepare('SELECT * FROM assessment_records WHERE id = ?').get(recordId) as AssessmentRecord;
    const newItems = db.prepare('SELECT * FROM assessment_items WHERE record_id = ?').all(recordId) as AssessmentItem[];

    res.status(201).json({
      success: true,
      data: {
        ...newRecord,
        items: newItems
      },
      message: 'Assessment record created successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Create record error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export function updateRecord(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const dataScope = checkDataScope(req);

    let whereClauses: string[] = ['id = ?'];
    let params: any[] = [id];

    if (dataScope.region || dataScope.branch) {
      whereClauses.push(`claim_id IN (SELECT id FROM claims WHERE 1=1
        ${dataScope.region ? ' AND region = ?' : ''}
        ${dataScope.branch ? ' AND branch = ?' : ''}
      )`);
      if (dataScope.region) params.push(dataScope.region);
      if (dataScope.branch) params.push(dataScope.branch);
    }

    const checkSql = `SELECT * FROM assessment_records WHERE ${whereClauses.join(' AND ')}`;
    const existingRecord = db.prepare(checkSql).get(...params) as AssessmentRecord | undefined;

    if (!existingRecord) {
      res.status(404).json({
        success: false,
        error: 'Assessment record not found'
      } as ApiResponse);
      return;
    }

    const {
      claim_id,
      claim_no,
      assessor,
      assessment_date,
      status,
      items
    }: {
      claim_id?: number;
      claim_no?: string;
      assessor?: string;
      assessment_date?: string;
      status?: string;
      items?: AssessmentItemInput[];
    } = req.body;

    let deviationResult = {
      total_estimated: existingRecord.total_estimated,
      total_actual: existingRecord.total_actual,
      deviation_flag: existingRecord.deviation_flag,
      items: [] as any[]
    };

    if (items && items.length > 0) {
      deviationResult = checkDeviation(items);
    }

    const updateSql = `UPDATE assessment_records SET 
      claim_id = ?, 
      claim_no = ?, 
      assessor = ?, 
      assessment_date = ?, 
      total_estimated = ?, 
      total_actual = ?, 
      status = ?, 
      deviation_flag = ? 
      WHERE id = ?`;

    db.prepare(updateSql).run(
      claim_id || existingRecord.claim_id,
      claim_no || existingRecord.claim_no,
      assessor || existingRecord.assessor,
      assessment_date || existingRecord.assessment_date,
      deviationResult.total_estimated,
      deviationResult.total_actual,
      status || existingRecord.status,
      deviationResult.deviation_flag,
      id
    );

    if (items && items.length > 0) {
      db.prepare('DELETE FROM assessment_items WHERE record_id = ?').run(id);

      const itemsInsert = db.prepare(`INSERT INTO assessment_items 
        (id, record_id, item_name, category, estimated_cost, actual_cost, deviation, needs_review, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const created_at = getTimestamp();
      deviationResult.items.forEach(item => {
        const itemId = generateId();
        itemsInsert.run(
          itemId,
          id,
          item.item_name,
          item.category,
          item.estimated_cost,
          item.actual_cost,
          item.deviation,
          item.needs_review,
          created_at
        );
      });
    }

    const updatedRecord = db.prepare('SELECT * FROM assessment_records WHERE id = ?').get(id) as AssessmentRecord;
    const updatedItems = db.prepare('SELECT * FROM assessment_items WHERE record_id = ?').all(id) as AssessmentItem[];

    res.json({
      success: true,
      data: {
        ...updatedRecord,
        items: updatedItems
      },
      message: 'Assessment record updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
}

export default {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  checkDeviation
};
