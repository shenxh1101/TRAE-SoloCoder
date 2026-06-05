import db from '../database.js'

interface ScheduleResult {
  room_id: string | null
  doctor_id: string | null
  reasons: string[]
}

const LEVEL_TO_ROOM_TYPE: Record<string, string> = {
  red: 'rescue',
  yellow: 'emergency',
  green: 'general',
}

const COMPLAINT_SPECIALTY_MAP: Record<string, string[]> = {
  '心脏': ['心内科', '急诊医学'],
  '胸痛': ['心内科', '急诊医学'],
  '骨折': ['骨科', '创伤外科'],
  '外伤': ['创伤外科', '骨科', '普外科'],
  '腹痛': ['普外科', '急诊医学'],
  '呼吸': ['呼吸内科', '急诊医学'],
  '神经': ['神经内科', '急诊医学'],
  '烧伤': ['创伤外科', '急诊医学'],
  '休克': ['急诊医学', '心内科'],
  '出血': ['急诊医学', '普外科'],
  '意识': ['神经内科', '急诊医学'],
  '高热': ['急诊医学', '感染科'],
}

const COMPLAINT_EQUIPMENT_MAP: Record<string, string[]> = {
  '胸痛': ['心电图机'],
  '心脏': ['心电图机'],
  '头部': ['CT扫描仪'],
  '脑': ['CT扫描仪'],
  '出血': ['CT扫描仪'],
  '腹痛': ['超声仪', 'X光机'],
  '呼吸': ['X光机', '血气分析仪'],
  '发热': ['生化分析仪'],
  '血常规': ['生化分析仪'],
}

export function scheduleResources(triageLevel: string, chiefComplaint: string): ScheduleResult {
  const reasons: string[] = []
  const roomType = LEVEL_TO_ROOM_TYPE[triageLevel] || 'general'

  const rooms = db.prepare(`
    SELECT * FROM rooms 
    WHERE type = ? AND status != 'maintenance' AND current_load < (capacity * 0.8)
    ORDER BY current_load ASC, capacity DESC
  `).all(roomType) as any[]

  let assignedRoom: any = null
  
  for (const room of rooms) {
    const equipment = db.prepare(`
      SELECT * FROM equipment 
      WHERE room_id = ? AND status != 'maintenance'
    `).all(room.id) as any[]

    const neededEquipment = getNeededEquipment(chiefComplaint)
    const hasNeededEquipment = neededEquipment.length === 0 || 
      neededEquipment.some(eqName => equipment.some(e => e.name.includes(eqName)))
    
    if (neededEquipment.length === 0 || hasNeededEquipment) {
      assignedRoom = room
      reasons.push(`分配${room.name}（${room.type}类型，当前负载${room.current_load}/${room.capacity}，设备${hasNeededEquipment ? '可用' : '基本可用'}）`)
      break
    }
  }

  if (!assignedRoom) {
    const fallbackRoom = db.prepare(`
      SELECT * FROM rooms 
      WHERE status != 'maintenance' AND current_load < (capacity * 0.8)
      ORDER BY 
        CASE type WHEN 'rescue' THEN 0 WHEN 'emergency' THEN 1 WHEN 'general' THEN 2 END ASC,
        current_load ASC
      LIMIT 1
    `).get() as any
    
    if (fallbackRoom) {
      assignedRoom = fallbackRoom
      reasons.push(`无匹配${roomType}类型空余房间，降级分配${fallbackRoom.name}`)
    } else {
      reasons.push('当前无可用房间')
    }
  }

  let matchedSpecialties: string[] = []
  for (const [keyword, specialties] of Object.entries(COMPLAINT_SPECIALTY_MAP)) {
    if (chiefComplaint.includes(keyword)) {
      matchedSpecialties = matchedSpecialties.concat(specialties)
    }
  }
  if (matchedSpecialties.length === 0) {
    matchedSpecialties = ['急诊医学']
  }
  const uniqueSpecialties = [...new Set(matchedSpecialties)]

  const historyPatients = db.prepare(`
    SELECT triage_level FROM patients 
    WHERE id_card = (SELECT id_card FROM patients WHERE chief_complaint LIKE ? LIMIT 1)
    ORDER BY created_at DESC LIMIT 5
  `).all(`%${chiefComplaint.substring(0, 10)}%`) as any[]

  if (historyPatients.length > 0) {
    const hasHistoryCritical = historyPatients.some(p => p.triage_level === 'red')
    if (hasHistoryCritical && triageLevel !== 'red') {
      reasons.push('患者历史有危重记录，建议优先处理')
    }
  }

  let doctor: any = null
  for (const specialty of uniqueSpecialties) {
    const candidate = db.prepare(`
      SELECT * FROM doctors 
      WHERE status = 'available' AND specialty = ?
      LIMIT 1
    `).get(specialty) as any
    if (candidate) {
      doctor = candidate
      break
    }
  }

  if (!doctor) {
    doctor = db.prepare(`
      SELECT * FROM doctors 
      WHERE status = 'available'
      LIMIT 1
    `).get() as any
  }

  if (doctor) {
    reasons.push(`分配${doctor.name}（${doctor.specialty}，${doctor.title}）`)
  } else {
    reasons.push('当前无可用医生')
  }

  return {
    room_id: assignedRoom ? assignedRoom.id : null,
    doctor_id: doctor ? doctor.id : null,
    reasons,
  }
}

function getNeededEquipment(chiefComplaint: string): string[] {
  const equipment: string[] = []
  for (const [keyword, eqs] of Object.entries(COMPLAINT_EQUIPMENT_MAP)) {
    if (chiefComplaint.includes(keyword)) {
      equipment.push(...eqs)
    }
  }
  return [...new Set(equipment)]
}
