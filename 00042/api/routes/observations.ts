import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { patientId, active } = req.query
    let sql = 'SELECT o.*, p.name as patient_name, b.number as bed_number FROM observations o LEFT JOIN patients p ON o.patient_id = p.id LEFT JOIN beds b ON o.bed_id = b.id WHERE 1=1'
    const params: any[] = []

    if (patientId) {
      sql += ' AND o.patient_id = ?'
      params.push(patientId)
    }
    if (active === 'true') {
      sql += ' AND o.ended_at IS NULL'
    }

    sql += ' ORDER BY o.started_at DESC'
    const obsRaw = db.prepare(sql).all(...params) as any[]
    const observations = obsRaw.map(o => ({
      id: o.id,
      patientId: o.patient_id,
      patientName: o.patient_name,
      bedId: o.bed_id,
      bedNumber: o.bed_number,
      startedAt: o.started_at,
      endedAt: o.ended_at,
      bedFee: o.bed_fee,
      observationHours: o.ended_at ? Math.ceil((new Date(o.ended_at).getTime() - new Date(o.started_at).getTime()) / (1000 * 60 * 60)) : null,
    }))
    res.json({ success: true, data: observations })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取留观记录失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { patient_id, bed_id, bed_fee } = req.body
    if (!patient_id || !bed_id) {
      res.status(400).json({ success: false, error: '患者ID和床位ID为必填项' })
      return
    }

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bed_id) as any
    if (!bed) {
      res.status(404).json({ success: false, error: '床位不存在' })
      return
    }
    if (bed.status === 'occupied') {
      res.status(400).json({ success: false, error: '该床位已被占用' })
      return
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    const fee = bed_fee ?? 50

    db.prepare(`
      INSERT INTO observations (id, patient_id, bed_id, started_at, ended_at, bed_fee)
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(id, patient_id, bed_id, now, fee)

    db.prepare('UPDATE beds SET status = \'occupied\', patient_id = ?, occupied_at = ? WHERE id = ?').run(patient_id, now, bed_id)

    db.prepare('UPDATE patients SET status = \'observation\', updated_at = ? WHERE id = ?').run(now, patient_id)

    const obsRaw = db.prepare('SELECT o.*, p.name as patient_name, b.number as bed_number FROM observations o LEFT JOIN patients p ON o.patient_id = p.id LEFT JOIN beds b ON o.bed_id = b.id WHERE o.id = ?').get(id) as any
    const observation = {
      id: obsRaw.id,
      patientId: obsRaw.patient_id,
      patientName: obsRaw.patient_name,
      bedId: obsRaw.bed_id,
      bedNumber: obsRaw.bed_number,
      startedAt: obsRaw.started_at,
      endedAt: obsRaw.ended_at,
      bedFee: obsRaw.bed_fee,
    }
    res.status(201).json({ success: true, data: observation })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建留观记录失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id) as any
    if (!observation) {
      res.status(404).json({ success: false, error: '留观记录不存在' })
      return
    }

    const now = new Date().toISOString()
    db.prepare('UPDATE observations SET ended_at = ? WHERE id = ?').run(now, req.params.id)

    db.prepare('UPDATE beds SET status = \'empty\', patient_id = NULL, occupied_at = NULL WHERE id = ?').run(observation.bed_id)

    const startedAt = new Date(observation.started_at)
    const endedAt = new Date(now)
    const hours = Math.ceil((endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60))
    const totalFee = hours * observation.bed_fee

    db.prepare(`
      INSERT INTO billing_items (id, patient_id, category, name, amount, created_at)
      VALUES (?, ?, 'observation', ?, ?, ?)
    `).run(uuidv4(), observation.patient_id, `留观床位费（${hours}小时）`, totalFee, now)

    const updatedRaw = db.prepare('SELECT o.*, p.name as patient_name, b.number as bed_number FROM observations o LEFT JOIN patients p ON o.patient_id = p.id LEFT JOIN beds b ON o.bed_id = b.id WHERE o.id = ?').get(req.params.id) as any
    const updated = {
      id: updatedRaw.id,
      patientId: updatedRaw.patient_id,
      patientName: updatedRaw.patient_name,
      bedId: updatedRaw.bed_id,
      bedNumber: updatedRaw.bed_number,
      startedAt: updatedRaw.started_at,
      endedAt: updatedRaw.ended_at,
      bedFee: updatedRaw.bed_fee,
      observationHours: hours,
    }
    res.json({ success: true, data: { observation: updated, bedFeeTotal: totalFee, hours } })
  } catch (error) {
    res.status(500).json({ success: false, error: '结束留观失败' })
  }
})

router.get('/billing/:patientId', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const itemsRaw = db.prepare('SELECT * FROM billing_items WHERE patient_id = ? ORDER BY created_at').all(req.params.patientId) as any[]
    const items = itemsRaw.map(item => ({
      id: item.id,
      patientId: item.patient_id,
      category: item.category,
      name: item.name,
      amount: item.amount,
      createdAt: item.created_at,
    }))
    const total = items.reduce((sum: number, item: any) => sum + (item.amount as number), 0)

    const categoryTotals = items.reduce((acc: any, item: any) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount
      return acc
    }, {})

    const settlementRaw = db.prepare('SELECT * FROM settlements WHERE patient_id = ? ORDER BY settled_at DESC LIMIT 1').get(req.params.patientId) as any
    const settlement = settlementRaw ? {
      id: settlementRaw.id,
      patientId: settlementRaw.patient_id,
      totalAmount: settlementRaw.total_amount,
      paymentMethod: settlementRaw.payment_method,
      insuranceCovered: settlementRaw.insurance_covered,
      selfPaid: settlementRaw.self_paid,
      settledAt: settlementRaw.settled_at,
      invoiceNumber: settlementRaw.invoice_number,
    } : null

    res.json({
      success: true,
      data: {
        patientId: req.params.patientId,
        patientName: patient.name,
        items,
        totalAmount: Math.round(total * 100) / 100,
        categoryTotals,
        hasSettled: !!settlement,
        settlement,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取账单失败' })
  }
})

router.post('/billing/:patientId/settle', (req: Request, res: Response): void => {
  try {
    const { payment_method, insurance_covered } = req.body
    if (!payment_method || !['cash', 'insurance', 'credit_card'].includes(payment_method)) {
      res.status(400).json({ success: false, error: '无效的支付方式' })
      return
    }

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const existingSettlement = db.prepare('SELECT * FROM settlements WHERE patient_id = ?').get(req.params.patientId) as any
    if (existingSettlement) {
      res.status(400).json({ success: false, error: '该患者已结算' })
      return
    }

    const items = db.prepare('SELECT * FROM billing_items WHERE patient_id = ?').all(req.params.patientId)
    const totalAmount = (items as any[]).reduce((sum: number, item: any) => sum + (item.amount as number), 0)
    const insuranceCovered = insurance_covered ?? 0
    const selfPaid = totalAmount - insuranceCovered

    const id = uuidv4()
    const now = new Date().toISOString()
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    db.prepare(`
      INSERT INTO settlements (id, patient_id, total_amount, payment_method, insurance_covered, self_paid, settled_at, invoice_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.patientId, totalAmount, payment_method, insuranceCovered, selfPaid, now, invoiceNumber)

    db.prepare('UPDATE patients SET status = \'discharged\', updated_at = ? WHERE id = ?').run(now, req.params.patientId)

    const settlementRaw = db.prepare('SELECT * FROM settlements WHERE id = ?').get(id) as any
    const settlement = {
      id: settlementRaw.id,
      patientId: settlementRaw.patient_id,
      totalAmount: settlementRaw.total_amount,
      paymentMethod: settlementRaw.payment_method,
      insuranceCovered: settlementRaw.insurance_covered,
      selfPaid: settlementRaw.self_paid,
      settledAt: settlementRaw.settled_at,
      invoiceNumber: settlementRaw.invoice_number,
    }
    res.status(201).json({ success: true, data: settlement })
  } catch (error) {
    res.status(500).json({ success: false, error: '结算失败' })
  }
})

router.get('/billing/:patientId/invoice', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.patientId) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const settlementRaw = db.prepare('SELECT * FROM settlements WHERE patient_id = ? ORDER BY settled_at DESC LIMIT 1').get(req.params.patientId) as any
    if (!settlementRaw) {
      res.status(404).json({ success: false, error: '未找到结算记录' })
      return
    }

    const itemsRaw = db.prepare('SELECT * FROM billing_items WHERE patient_id = ? AND created_at <= ? ORDER BY created_at').all(req.params.patientId, settlementRaw.settled_at) as any[]
    const items = itemsRaw.map(item => ({
      id: item.id,
      patientId: item.patient_id,
      category: item.category,
      name: item.name,
      amount: item.amount,
      createdAt: item.created_at,
    }))

    res.json({
      success: true,
      data: {
        invoiceNumber: settlementRaw.invoice_number,
        patientName: patient.name,
        patientIdCard: patient.id_card,
        items,
        totalAmount: settlementRaw.total_amount,
        insuranceCovered: settlementRaw.insurance_covered,
        selfPaid: settlementRaw.self_paid,
        paymentMethod: settlementRaw.payment_method,
        issuedAt: settlementRaw.settled_at,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取发票信息失败' })
  }
})

export default router
