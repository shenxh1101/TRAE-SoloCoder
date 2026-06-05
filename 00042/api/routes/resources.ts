import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/rooms', (_req: Request, res: Response): void => {
  try {
    const roomsRaw = db.prepare('SELECT * FROM rooms ORDER BY type, name').all() as any[]
    const rooms = roomsRaw.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      currentLoad: r.current_load,
      status: r.status,
    }))
    res.json({ success: true, data: rooms })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取房间列表失败' })
  }
})

router.get('/rooms/:id/status', (req: Request, res: Response): void => {
  try {
    const roomRaw = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any
    if (!roomRaw) {
      res.status(404).json({ success: false, error: '房间不存在' })
      return
    }

    const patientsRaw = db.prepare('SELECT * FROM patients WHERE assigned_room_id = ? AND status NOT IN (\'discharged\', \'transfer\')').all(req.params.id) as any[]
    const patients = patientsRaw.map(p => ({
      id: p.id,
      name: p.name,
      triageLevel: p.triage_level,
      status: p.status,
    }))

    const room = {
      id: roomRaw.id,
      name: roomRaw.name,
      type: roomRaw.type,
      capacity: roomRaw.capacity,
      currentLoad: roomRaw.current_load,
      status: roomRaw.status,
    }

    res.json({
      success: true,
      data: {
        room,
        patients,
        utilization: room.capacity > 0 ? Math.round((room.currentLoad / room.capacity) * 100) : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取房间状态失败' })
  }
})

router.get('/doctors', (_req: Request, res: Response): void => {
  try {
    const doctorsRaw = db.prepare('SELECT d.*, r.name as room_name FROM doctors d LEFT JOIN rooms r ON d.room_id = r.id ORDER BY d.status, d.name').all() as any[]
    const doctors = doctorsRaw.map(d => ({
      id: d.id,
      name: d.name,
      title: d.title,
      specialty: d.specialty,
      roomId: d.room_id,
      status: d.status,
      roomName: d.room_name,
    }))
    res.json({ success: true, data: doctors })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取医生列表失败' })
  }
})

router.put('/doctors/:id/status', (req: Request, res: Response): void => {
  try {
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id) as any
    if (!doctor) {
      res.status(404).json({ success: false, error: '医生不存在' })
      return
    }

    const { status } = req.body
    if (!status || !['available', 'busy', 'off'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' })
      return
    }

    db.prepare('UPDATE doctors SET status = ? WHERE id = ?').run(status, req.params.id)
    const updatedRaw = db.prepare('SELECT d.*, r.name as room_name FROM doctors d LEFT JOIN rooms r ON d.room_id = r.id WHERE d.id = ?').get(req.params.id) as any
    const updated = {
      id: updatedRaw.id,
      name: updatedRaw.name,
      title: updatedRaw.title,
      specialty: updatedRaw.specialty,
      roomId: updatedRaw.room_id,
      status: updatedRaw.status,
      roomName: updatedRaw.room_name,
    }
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新医生状态失败' })
  }
})

router.get('/equipment', (_req: Request, res: Response): void => {
  try {
    const equipmentRaw = db.prepare('SELECT e.*, r.name as room_name FROM equipment e LEFT JOIN rooms r ON e.room_id = r.id ORDER BY e.type, e.name').all() as any[]
    const equipment = equipmentRaw.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      roomId: e.room_id,
      status: e.status,
      roomName: e.room_name,
    }))
    res.json({ success: true, data: equipment })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取设备列表失败' })
  }
})

router.get('/beds', (_req: Request, res: Response): void => {
  try {
    const bedsRaw = db.prepare('SELECT b.*, p.name as patient_name FROM beds b LEFT JOIN patients p ON b.patient_id = p.id ORDER BY b.number').all() as any[]
    const beds = bedsRaw.map(b => ({
      id: b.id,
      number: b.number,
      status: b.status,
      patientId: b.patient_id,
      occupiedAt: b.occupied_at,
      patientName: b.patient_name,
    }))
    res.json({ success: true, data: beds })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取床位列表失败' })
  }
})

router.get('/overview', (_req: Request, res: Response): void => {
  try {
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as any
    const availableRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = \'available\'').get() as any
    const busyRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = \'busy\'').get() as any
    const fullRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = \'full\'').get() as any
    const totalDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors').get() as any
    const availableDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE status = \'available\'').get() as any
    const busyDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE status = \'busy\'').get() as any
    const offDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE status = \'off\'').get() as any
    const totalBeds = db.prepare('SELECT COUNT(*) as count FROM beds').get() as any
    const occupiedBeds = db.prepare('SELECT COUNT(*) as count FROM beds WHERE status = \'occupied\'').get() as any
    const emptyBeds = db.prepare('SELECT COUNT(*) as count FROM beds WHERE status = \'empty\'').get() as any
    const totalEquipment = db.prepare('SELECT COUNT(*) as count FROM equipment').get() as any
    const idleEquipment = db.prepare('SELECT COUNT(*) as count FROM equipment WHERE status = \'idle\'').get() as any
    const inUseEquipment = db.prepare('SELECT COUNT(*) as count FROM equipment WHERE status = \'in_use\'').get() as any
    const waitingPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'waiting\'').get() as any
    const treatingPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'treating\'').get() as any
    const examiningPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'examining\'').get() as any
    const observationPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE status = \'observation\'').get() as any

    res.json({
      success: true,
      data: {
        totalRooms: totalRooms.count,
        availableRooms: availableRooms.count,
        busyRooms: busyRooms.count,
        fullRooms: fullRooms.count,
        totalDoctors: totalDoctors.count,
        availableDoctors: availableDoctors.count,
        busyDoctors: busyDoctors.count,
        offDoctors: offDoctors.count,
        totalBeds: totalBeds.count,
        occupiedBeds: occupiedBeds.count,
        emptyBeds: emptyBeds.count,
        totalEquipment: totalEquipment.count,
        idleEquipment: idleEquipment.count,
        inUseEquipment: inUseEquipment.count,
        waitingPatients: waitingPatients.count,
        treatingPatients: treatingPatients.count,
        examiningPatients: examiningPatients.count,
        observationPatients: observationPatients.count,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取资源概览失败' })
  }
})

export default router
