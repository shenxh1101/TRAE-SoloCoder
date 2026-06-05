import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

interface CriticalRule {
  name: string
  field: string
  low_critical: number | null
  high_critical: number | null
  low_warning: number | null
  high_warning: number | null
}

const CRITICAL_RULES: CriticalRule[] = [
  { name: 'pH值', field: 'pH', low_critical: 7.2, high_critical: 7.55, low_warning: 7.3, high_warning: 7.45 },
  { name: '血钾', field: 'K+', low_critical: 2.5, high_critical: 6.5, low_warning: 3.0, high_warning: 5.5 },
  { name: '血钠', field: 'Na+', low_critical: 120, high_critical: 160, low_warning: 130, high_warning: 150 },
  { name: '血糖', field: 'Glu', low_critical: 2.2, high_critical: 33.3, low_warning: 3.9, high_warning: 11.1 },
  { name: '血钙', field: 'Ca2+', low_critical: 1.5, high_critical: 3.5, low_warning: 2.0, high_warning: 3.0 },
  { name: '血红蛋白', field: 'Hb', low_critical: 50, high_critical: 200, low_warning: 70, high_warning: 180 },
  { name: '白细胞', field: 'WBC', low_critical: 1.0, high_critical: 30.0, low_warning: 2.0, high_warning: 15.0 },
  { name: '血小板', field: 'PLT', low_critical: 30, high_critical: 1000, low_warning: 50, high_warning: 400 },
]

router.get('/', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.query
    let sql = 'SELECT e.*, p.name as patient_name FROM examinations e LEFT JOIN patients p ON e.patient_id = p.id WHERE 1=1'
    const params: any[] = []

    if (patientId) {
      sql += ' AND patient_id = ?'
      params.push(patientId)
    }

    sql += ' ORDER BY ordered_at DESC'
    const examsRaw = db.prepare(sql).all(...params) as any[]
    const examinations = examsRaw.map(e => ({
      id: e.id,
      patientId: e.patient_id,
      patientName: e.patient_name,
      type: e.type,
      name: e.name,
      status: e.status,
      result: e.result,
      resultValue: e.result_value,
      criticalValue: e.critical_value === 1,
      orderedAt: e.ordered_at,
      completedAt: e.completed_at,
    }))
    res.json({ success: true, data: examinations })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取检查列表失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { patient_id, type, name } = req.body
    if (!patient_id || !type || !name) {
      res.status(400).json({ success: false, error: '患者ID、检查类型和检查名称为必填项' })
      return
    }

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO examinations (id, patient_id, type, name, status, result, result_value, critical_value, ordered_at, completed_at)
      VALUES (?, ?, ?, ?, 'ordered', NULL, NULL, 0, ?, NULL)
    `).run(id, patient_id, type, name, now)

    db.prepare(`
      INSERT INTO billing_items (id, patient_id, category, name, amount, created_at)
      VALUES (?, ?, 'examination', ?, ?, ?)
    `).run(uuidv4(), patient_id, name, type === 'imaging' ? 300 : 100, now)

    const examRaw = db.prepare('SELECT e.*, p.name as patient_name FROM examinations e LEFT JOIN patients p ON e.patient_id = p.id WHERE e.id = ?').get(id) as any
    const examination = {
      id: examRaw.id,
      patientId: examRaw.patient_id,
      patientName: examRaw.patient_name,
      type: examRaw.type,
      name: examRaw.name,
      status: examRaw.status,
      result: examRaw.result,
      resultValue: examRaw.result_value,
      criticalValue: examRaw.critical_value === 1,
      orderedAt: examRaw.ordered_at,
      completedAt: examRaw.completed_at,
    }

    res.status(201).json({ success: true, data: examination })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建检查失败' })
  }
})

router.put('/:id/result', (req: Request, res: Response): void => {
  try {
    const examination = db.prepare('SELECT * FROM examinations WHERE id = ?').get(req.params.id) as any
    if (!examination) {
      res.status(404).json({ success: false, error: '检查记录不存在' })
      return
    }

    const { result, result_value } = req.body
    if (result === undefined && result_value === undefined) {
      res.status(400).json({ success: false, error: '检查结果不能为空' })
      return
    }

    let isCritical = 0
    if (result_value != null) {
      const checkResult = checkCriticalValue(examination.name, result_value)
      isCritical = checkResult.isCritical ? 1 : 0

      if (checkResult.isCritical || checkResult.isWarning) {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(examination.patient_id) as any
        const now = new Date().toISOString()
        db.prepare(`
          INSERT INTO alerts (id, type, level, message, patient_id, acknowledged, created_at)
          VALUES (?, 'critical_value', ?, ?, ?, 0, ?)
        `).run(
          uuidv4(),
          checkResult.isCritical ? 'critical' : 'warning',
          checkResult.message,
          examination.patient_id,
          now
        )
      }
    }

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE examinations SET result = ?, result_value = ?, critical_value = ?, status = 'completed', completed_at = ? WHERE id = ?
    `).run(result ?? null, result_value ?? null, isCritical, now, req.params.id)

    const updatedRaw = db.prepare('SELECT e.*, p.name as patient_name FROM examinations e LEFT JOIN patients p ON e.patient_id = p.id WHERE e.id = ?').get(req.params.id) as any
    const updated = {
      id: updatedRaw.id,
      patientId: updatedRaw.patient_id,
      patientName: updatedRaw.patient_name,
      type: updatedRaw.type,
      name: updatedRaw.name,
      status: updatedRaw.status,
      result: updatedRaw.result,
      resultValue: updatedRaw.result_value,
      criticalValue: updatedRaw.critical_value === 1,
      orderedAt: updatedRaw.ordered_at,
      completedAt: updatedRaw.completed_at,
    }
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '提交检查结果失败' })
  }
})

router.get('/critical-values', (_req: Request, res: Response): void => {
  try {
    res.json({ success: true, data: CRITICAL_RULES })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取危急值规则失败' })
  }
})

router.post('/critical-values/check', (req: Request, res: Response): void => {
  try {
    const { exam_name, result_value } = req.body
    if (!exam_name || result_value === undefined) {
      res.status(400).json({ success: false, error: '检查名称和结果值为必填项' })
      return
    }

    const result = checkCriticalValue(exam_name, result_value)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '危急值检查失败' })
  }
})

function checkCriticalValue(examName: string, resultValue: number): {
  isCritical: boolean
  isWarning: boolean
  message: string
  rule: CriticalRule | null
} {
  for (const rule of CRITICAL_RULES) {
    if (examName.includes(rule.name) || examName.includes(rule.field)) {
      if (resultValue <= rule.low_critical || resultValue >= rule.high_critical) {
        return {
          isCritical: true,
          isWarning: true,
          message: `${rule.name}危急值: ${resultValue}（正常范围 ${rule.low_warning}-${rule.high_warning}，危急值 <${rule.low_critical} 或 >${rule.high_critical}）`,
          rule,
        }
      }
      if (resultValue <= rule.low_warning || resultValue >= rule.high_warning) {
        return {
          isCritical: false,
          isWarning: true,
          message: `${rule.name}异常值: ${resultValue}（正常范围 ${rule.low_warning}-${rule.high_warning}）`,
          rule,
        }
      }
      return {
        isCritical: false,
        isWarning: false,
        message: `${rule.name}正常: ${resultValue}`,
        rule,
      }
    }
  }

  return {
    isCritical: false,
    isWarning: false,
    message: '无匹配的危急值规则',
    rule: null,
  }
}

export default router
