import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'
import { runTriage } from '../engines/triage.js'
import { scheduleResources } from '../engines/scheduler.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, level, page = '1', limit = '50' } = req.query
    let sql = 'SELECT * FROM patients WHERE 1=1'
    const params: any[] = []

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (level) {
      sql += ' AND triage_level = ?'
      params.push(level)
    }

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`).get(...params) as any
    const total = countResult.total

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit as string), offset)

    const patientsRaw = db.prepare(sql).all(...params) as any[]

    const patients = patientsRaw.map(p => ({
      id: p.id,
      name: p.name,
      idCard: p.id_card,
      chiefComplaint: p.chief_complaint,
      temperature: p.temperature,
      heartRate: p.heart_rate,
      respiratoryRate: p.respiratory_rate,
      systolicBP: p.systolic_bp,
      diastolicBP: p.diastolic_bp,
      bloodOxygen: p.blood_oxygen,
      allergyHistory: p.allergy_history,
      triageLevel: p.triage_level,
      status: p.status,
      assignedRoomId: p.assigned_room_id,
      assignedDoctorId: p.assigned_doctor_id,
      createdBy: p.created_by,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    res.json({
      success: true,
      data: patients,
      total,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取患者列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const room = patient.assigned_room_id
      ? db.prepare('SELECT * FROM rooms WHERE id = ?').get(patient.assigned_room_id)
      : null
    const doctor = patient.assigned_doctor_id
      ? db.prepare('SELECT * FROM doctors WHERE id = ?').get(patient.assigned_doctor_id)
      : null
    const exams = db.prepare('SELECT * FROM examinations WHERE patient_id = ?').all(patient.id)
    const observations = db.prepare('SELECT * FROM observations WHERE patient_id = ?').all(patient.id)
    const billingItems = db.prepare('SELECT * FROM billing_items WHERE patient_id = ?').all(patient.id)

    res.json({
      success: true,
      data: {
        ...patient,
        room,
        doctor,
        examinations: exams,
        observations,
        billingItems,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取患者详情失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      name, id_card, chief_complaint,
      temperature, heart_rate, respiratory_rate,
      systolic_bp, diastolic_bp, blood_oxygen,
      allergy_history, created_by,
    } = req.body

    if (!name || !id_card || !chief_complaint) {
      res.status(400).json({ success: false, error: '姓名、身份证号和主诉为必填项' })
      return
    }

    const historyStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN triage_level = 'red' THEN 1 ELSE 0 END) as red_count,
        SUM(CASE WHEN triage_level = 'yellow' THEN 1 ELSE 0 END) as yellow_count
      FROM patients WHERE id_card = ?
    `).get(id_card) as any

    const triageResult = runTriage({
      chief_complaint,
      temperature: temperature ?? null,
      heart_rate: heart_rate ?? null,
      respiratory_rate: respiratory_rate ?? null,
      systolic_bp: systolic_bp ?? null,
      diastolic_bp: diastolic_bp ?? null,
      blood_oxygen: blood_oxygen ?? null,
      historical_red_count: historyStats?.red_count || 0,
      historical_yellow_count: historyStats?.yellow_count || 0,
    })

    const scheduleResult = scheduleResources(triageResult.level, chief_complaint)

    const id = uuidv4()
    const now = new Date().toISOString()
    const status = scheduleResult.room_id && scheduleResult.doctor_id ? 'waiting' : 'waiting'

    db.prepare(`
      INSERT INTO patients (id, name, id_card, chief_complaint, temperature, heart_rate, respiratory_rate, systolic_bp, diastolic_bp, blood_oxygen, allergy_history, triage_level, status, assigned_room_id, assigned_doctor_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, id_card, chief_complaint,
      temperature ?? null, heart_rate ?? null, respiratory_rate ?? null,
      systolic_bp ?? null, diastolic_bp ?? null, blood_oxygen ?? null,
      allergy_history ?? null, triageResult.level, status,
      scheduleResult.room_id, scheduleResult.doctor_id,
      created_by ?? null, now, now
    )

    if (scheduleResult.room_id) {
      db.prepare('UPDATE rooms SET current_load = current_load + 1, status = CASE WHEN current_load + 1 >= capacity THEN \'full\' ELSE CASE WHEN current_load + 1 > 0 THEN \'busy\' ELSE \'available\' END END WHERE id = ?').run(scheduleResult.room_id)
    }

    if (scheduleResult.doctor_id) {
      db.prepare('UPDATE doctors SET status = \'busy\' WHERE id = ? AND status = \'available\'').run(scheduleResult.doctor_id)
    }

    const patientRaw = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as any
    const room = scheduleResult.room_id ? db.prepare('SELECT * FROM rooms WHERE id = ?').get(scheduleResult.room_id) as any : null
    const doctor = scheduleResult.doctor_id ? db.prepare('SELECT * FROM doctors WHERE id = ?').get(scheduleResult.doctor_id) as any : null

    const patient = {
      id: patientRaw.id,
      name: patientRaw.name,
      idCard: patientRaw.id_card,
      chiefComplaint: patientRaw.chief_complaint,
      temperature: patientRaw.temperature,
      heartRate: patientRaw.heart_rate,
      respiratoryRate: patientRaw.respiratory_rate,
      systolicBP: patientRaw.systolic_bp,
      diastolicBP: patientRaw.diastolic_bp,
      bloodOxygen: patientRaw.blood_oxygen,
      allergyHistory: patientRaw.allergy_history,
      triageLevel: patientRaw.triage_level,
      status: patientRaw.status,
      assignedRoomId: patientRaw.assigned_room_id,
      assignedDoctorId: patientRaw.assigned_doctor_id,
      createdBy: patientRaw.created_by,
      createdAt: patientRaw.created_at,
      updatedAt: patientRaw.updated_at,
      roomName: room?.name,
      doctorName: doctor?.name,
    }

    const triageResultFormatted = {
      level: triageResult.level,
      roomId: scheduleResult.room_id,
      roomName: room?.name,
      doctorId: scheduleResult.doctor_id,
      doctorName: doctor?.name,
      reasoning: scheduleResult.reasons.join('；'),
    }

    res.status(201).json({
      success: true,
      patient,
      triageResult: triageResultFormatted,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建患者失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const {
      name, id_card, chief_complaint,
      temperature, heart_rate, respiratory_rate,
      systolic_bp, diastolic_bp, blood_oxygen,
      allergy_history,
    } = req.body

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE patients SET 
        name = COALESCE(?, name),
        id_card = COALESCE(?, id_card),
        chief_complaint = COALESCE(?, chief_complaint),
        temperature = COALESCE(?, temperature),
        heart_rate = COALESCE(?, heart_rate),
        respiratory_rate = COALESCE(?, respiratory_rate),
        systolic_bp = COALESCE(?, systolic_bp),
        diastolic_bp = COALESCE(?, diastolic_bp),
        blood_oxygen = COALESCE(?, blood_oxygen),
        allergy_history = COALESCE(?, allergy_history),
        updated_at = ?
      WHERE id = ?
    `).run(
      name ?? null, id_card ?? null, chief_complaint ?? null,
      temperature ?? null, heart_rate ?? null, respiratory_rate ?? null,
      systolic_bp ?? null, diastolic_bp ?? null, blood_oxygen ?? null,
      allergy_history ?? null, now, req.params.id
    )

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新患者信息失败' })
  }
})

router.put('/:id/status', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const { status } = req.body
    if (!status) {
      res.status(400).json({ success: false, error: '状态不能为空' })
      return
    }

    const now = new Date().toISOString()
    db.prepare('UPDATE patients SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id)

    if (status === 'discharged' && patient.assigned_room_id) {
      db.prepare('UPDATE rooms SET current_load = CASE WHEN current_load > 0 THEN current_load - 1 ELSE 0 END, status = CASE WHEN current_load - 1 <= 0 THEN \'available\' ELSE CASE WHEN current_load - 1 < capacity THEN \'busy\' ELSE \'full\' END END WHERE id = ?').run(patient.assigned_room_id)
    }

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新患者状态失败' })
  }
})

router.post('/:id/triage', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const triageResult = runTriage({
      chief_complaint: patient.chief_complaint,
      temperature: patient.temperature,
      heart_rate: patient.heart_rate,
      respiratory_rate: patient.respiratory_rate,
      systolic_bp: patient.systolic_bp,
      diastolic_bp: patient.diastolic_bp,
      blood_oxygen: patient.blood_oxygen,
    })

    const scheduleResult = scheduleResources(triageResult.level, patient.chief_complaint)

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE patients SET triage_level = ?, assigned_room_id = ?, assigned_doctor_id = ?, updated_at = ? WHERE id = ?
    `).run(triageResult.level, scheduleResult.room_id, scheduleResult.doctor_id, now, req.params.id)

    if (scheduleResult.room_id && scheduleResult.room_id !== patient.assigned_room_id) {
      db.prepare('UPDATE rooms SET current_load = current_load + 1, status = CASE WHEN current_load + 1 >= capacity THEN \'full\' ELSE \'busy\' END WHERE id = ?').run(scheduleResult.room_id)
      if (patient.assigned_room_id) {
        db.prepare('UPDATE rooms SET current_load = CASE WHEN current_load > 0 THEN current_load - 1 ELSE 0 END, status = CASE WHEN current_load - 1 <= 0 THEN \'available\' ELSE \'busy\' END WHERE id = ?').run(patient.assigned_room_id)
      }
    }

    if (scheduleResult.doctor_id && scheduleResult.doctor_id !== patient.assigned_doctor_id) {
      db.prepare('UPDATE doctors SET status = \'busy\' WHERE id = ?').run(scheduleResult.doctor_id)
      if (patient.assigned_doctor_id) {
        db.prepare('UPDATE doctors SET status = \'available\' WHERE id = ?').run(patient.assigned_doctor_id)
      }
    }

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
    res.json({
      success: true,
      data: {
        patient: updated,
        triage: triageResult,
        scheduling: scheduleResult,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '重新分诊失败' })
  }
})

router.post('/:id/adjust', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const { new_room_id, new_doctor_id, reason } = req.body
    if (!reason) {
      res.status(400).json({ success: false, error: '调整原因不能为空' })
      return
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO adjustments (id, patient_id, original_room_id, new_room_id, original_doctor_id, new_doctor_id, reason, status, approved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)
    `).run(id, req.params.id, patient.assigned_room_id, new_room_id ?? null, patient.assigned_doctor_id, new_doctor_id ?? null, reason, now)

    db.prepare(`
      INSERT INTO alerts (id, type, level, message, patient_id, acknowledged, created_at)
      VALUES (?, 'adjustment', 'warning', ?, ?, 0, ?)
    `).run(uuidv4(), `患者${patient.name}请求调整: ${reason}`, req.params.id, now)

    const adjustment = db.prepare('SELECT * FROM adjustments WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: adjustment })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建调整请求失败' })
  }
})

router.get('/adjustments/pending', (_req: Request, res: Response): void => {
  try {
    const adjustmentsRaw = db.prepare(`
      SELECT a.*, p.name as patient_name,
             r1.name as original_room_name, r2.name as new_room_name,
             d1.name as original_doctor_name, d2.name as new_doctor_name
      FROM adjustments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN rooms r1 ON a.original_room_id = r1.id
      LEFT JOIN rooms r2 ON a.new_room_id = r2.id
      LEFT JOIN doctors d1 ON a.original_doctor_id = d1.id
      LEFT JOIN doctors d2 ON a.new_doctor_id = d2.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at DESC
    `).all() as any[]

    const adjustments = adjustmentsRaw.map(a => ({
      id: a.id,
      patientId: a.patient_id,
      patientName: a.patient_name,
      originalRoomId: a.original_room_id,
      originalRoomName: a.original_room_name,
      newRoomId: a.new_room_id,
      newRoomName: a.new_room_name,
      originalDoctorId: a.original_doctor_id,
      originalDoctorName: a.original_doctor_name,
      newDoctorId: a.new_doctor_id,
      newDoctorName: a.new_doctor_name,
      reason: a.reason,
      status: a.status,
      approvedBy: a.approved_by,
      createdAt: a.created_at,
    }))

    res.json({ success: true, data: adjustments })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待审批调整列表失败' })
  }
})

router.post('/:id/approve', (req: Request, res: Response): void => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any
    if (!patient) {
      res.status(404).json({ success: false, error: '患者不存在' })
      return
    }

    const { adjustment_id, approved, approved_by } = req.body
    if (!adjustment_id || approved === undefined) {
      res.status(400).json({ success: false, error: '调整ID和审批结果为必填项' })
      return
    }

    const adjustment = db.prepare('SELECT * FROM adjustments WHERE id = ? AND patient_id = ?').get(adjustment_id, req.params.id) as any
    if (!adjustment) {
      res.status(404).json({ success: false, error: '调整请求不存在' })
      return
    }

    const status = approved ? 'approved' : 'rejected'
    db.prepare('UPDATE adjustments SET status = ?, approved_by = ? WHERE id = ?').run(status, approved_by ?? null, adjustment_id)

    if (approved) {
      const now = new Date().toISOString()

      if (adjustment.new_room_id && adjustment.new_room_id !== patient.assigned_room_id) {
        db.prepare('UPDATE rooms SET current_load = current_load + 1, status = CASE WHEN current_load + 1 >= capacity THEN \'full\' ELSE \'busy\' END WHERE id = ?').run(adjustment.new_room_id)
        if (patient.assigned_room_id) {
          db.prepare('UPDATE rooms SET current_load = CASE WHEN current_load > 0 THEN current_load - 1 ELSE 0 END, status = CASE WHEN current_load - 1 <= 0 THEN \'available\' ELSE \'busy\' END WHERE id = ?').run(patient.assigned_room_id)
        }
      }

      if (adjustment.new_doctor_id && adjustment.new_doctor_id !== patient.assigned_doctor_id) {
        db.prepare('UPDATE doctors SET status = \'busy\' WHERE id = ?').run(adjustment.new_doctor_id)
        if (patient.assigned_doctor_id) {
          db.prepare('UPDATE doctors SET status = \'available\' WHERE id = ?').run(patient.assigned_doctor_id)
        }
      }

      db.prepare('UPDATE patients SET assigned_room_id = ?, assigned_doctor_id = ?, updated_at = ? WHERE id = ?').run(
        adjustment.new_room_id ?? patient.assigned_room_id,
        adjustment.new_doctor_id ?? patient.assigned_doctor_id,
        now,
        req.params.id
      )
    }

    const patientUpdatedRaw = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as Record<string, any>
    const patientUpdatedCamel = {
      id: patientUpdatedRaw.id,
      name: patientUpdatedRaw.name,
      idCard: patientUpdatedRaw.id_card,
      chiefComplaint: patientUpdatedRaw.chief_complaint,
      temperature: patientUpdatedRaw.temperature,
      heartRate: patientUpdatedRaw.heart_rate,
      respiratoryRate: patientUpdatedRaw.respiratory_rate,
      systolicBP: patientUpdatedRaw.systolic_bp,
      diastolicBP: patientUpdatedRaw.diastolic_bp,
      bloodOxygen: patientUpdatedRaw.blood_oxygen,
      allergyHistory: patientUpdatedRaw.allergy_history,
      triageLevel: patientUpdatedRaw.triage_level,
      status: patientUpdatedRaw.status,
      assignedRoomId: patientUpdatedRaw.assigned_room_id,
      assignedDoctorId: patientUpdatedRaw.assigned_doctor_id,
      createdBy: patientUpdatedRaw.created_by,
      createdAt: patientUpdatedRaw.created_at,
      updatedAt: patientUpdatedRaw.updated_at,
    }

    const updatedAdjRaw = db.prepare(`
      SELECT a.*, p.name as patient_name,
             r1.name as original_room_name, r2.name as new_room_name,
             d1.name as original_doctor_name, d2.name as new_doctor_name
      FROM adjustments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN rooms r1 ON a.original_room_id = r1.id
      LEFT JOIN rooms r2 ON a.new_room_id = r2.id
      LEFT JOIN doctors d1 ON a.original_doctor_id = d1.id
      LEFT JOIN doctors d2 ON a.new_doctor_id = d2.id
      WHERE a.id = ?
    `).get(adjustment_id) as any

    const adjustmentUpdated = {
      id: updatedAdjRaw.id,
      patientId: updatedAdjRaw.patient_id,
      patientName: updatedAdjRaw.patient_name,
      originalRoomId: updatedAdjRaw.original_room_id,
      originalRoomName: updatedAdjRaw.original_room_name,
      newRoomId: updatedAdjRaw.new_room_id,
      newRoomName: updatedAdjRaw.new_room_name,
      originalDoctorId: updatedAdjRaw.original_doctor_id,
      originalDoctorName: updatedAdjRaw.original_doctor_name,
      newDoctorId: updatedAdjRaw.new_doctor_id,
      newDoctorName: updatedAdjRaw.new_doctor_name,
      reason: updatedAdjRaw.reason,
      status: updatedAdjRaw.status,
      approvedBy: updatedAdjRaw.approved_by,
      createdAt: updatedAdjRaw.created_at,
    }

    res.json({ success: true, data: { patient: patientUpdatedCamel, adjustment: adjustmentUpdated } })
  } catch (error) {
    res.status(500).json({ success: false, error: '审批调整失败' })
  }
})

export default router
