import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/dashboard', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' })
    return
  }

  const db = getDb()

  const totalRescues = (db.prepare('SELECT COUNT(*) as count FROM rescue_tasks').get() as any).count

  const totalAnimals = (db.prepare('SELECT COUNT(*) as count FROM animals').get() as any).count
  const adoptedAnimals = (db.prepare("SELECT COUNT(*) as count FROM animals WHERE status = 'adopted'").get() as any).count
  const nonHospitalized = (db.prepare("SELECT COUNT(*) as count FROM animals WHERE status != 'hospitalized'").get() as any).count
  const adoptionRate = nonHospitalized > 0 ? Math.round((adoptedAnimals / nonHospitalized) * 100) : 0

  const pendingTasks = (db.prepare("SELECT COUNT(*) as count FROM rescue_tasks WHERE status = 'pending'").get() as any).count

  const activeVolunteers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'volunteer' AND created_at >= datetime('now', '-30 days', 'localtime')").get() as any).count

  const totalDonations = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'completed'").get() as { total: number }

  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      'rescue' as type,
      COUNT(*) as count
    FROM rescue_tasks
    WHERE created_at >= datetime('now', '-6 months', 'localtime')
    GROUP BY strftime('%Y-%m', created_at)
    UNION ALL
    SELECT
      strftime('%Y-%m', created_at) as month,
      'adoption' as type,
      COUNT(*) as count
    FROM adoption_agreements
    WHERE created_at >= datetime('now', '-6 months', 'localtime')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `).all()

  const hospitalAnimals = db.prepare(`
    SELECT h.name as hospital, COUNT(a.id) as count
    FROM hospitals h
    LEFT JOIN animals a ON a.hospital_id = h.id
    GROUP BY h.id, h.name
    ORDER BY count DESC
  `).all()

  const cityStats = db.prepare(`
    SELECT
      sr.city,
      COUNT(DISTINCT sr.id) as rescues,
      COUNT(DISTINCT aa.id) as adoptions
    FROM stray_reports sr
    LEFT JOIN rescue_tasks rt ON rt.report_id = sr.id
    LEFT JOIN animals a ON a.rescue_task_id = rt.id
    LEFT JOIN adoption_agreements aa ON aa.animal_id = a.id
    WHERE sr.city != ''
    GROUP BY sr.city
    ORDER BY rescues DESC
  `).all()

  const monthlyTrendMap = new Map<string, { month: string; rescues: number; adoptions: number }>()
  for (const row of monthlyTrend as any[]) {
    let entry = monthlyTrendMap.get(row.month)
    if (!entry) {
      entry = { month: row.month, rescues: 0, adoptions: 0 }
      monthlyTrendMap.set(row.month, entry)
    }
    if (row.type === 'rescue') entry.rescues += row.count
    else if (row.type === 'adoption') entry.adoptions += row.count
  }

  res.json({
    success: true,
    data: {
      total_rescues: totalRescues,
      adoption_rate: adoptionRate,
      pending_tasks: pendingTasks,
      active_volunteers: activeVolunteers,
      total_donations: totalDonations.total,
      monthly_trend: Array.from(monthlyTrendMap.values()),
      hospital_animals: hospitalAnimals,
      city_stats: (cityStats as any[]).map((row: any) => ({
        ...row,
        rate: Math.round((row.adoptions / Math.max(row.rescues, 1)) * 100),
      })),
    },
  })
})

router.get('/heatmap', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' })
    return
  }

  const db = getDb()
  const { period = '30d' } = req.query

  let dateFilter = ''
  switch (period) {
    case '7d':
      dateFilter = "AND created_at >= datetime('now', '-7 days', 'localtime')"
      break
    case '30d':
      dateFilter = "AND created_at >= datetime('now', '-30 days', 'localtime')"
      break
    case '3m':
      dateFilter = "AND created_at >= datetime('now', '-3 months', 'localtime')"
      break
    case '1y':
      dateFilter = "AND created_at >= datetime('now', '-1 year', 'localtime')"
      break
    default:
      dateFilter = "AND created_at >= datetime('now', '-30 days', 'localtime')"
  }

  const cityData = db.prepare(`
    SELECT city, COUNT(*) as count,
           AVG(latitude) as avg_latitude,
           AVG(longitude) as avg_longitude
    FROM stray_reports
    WHERE city != '' AND latitude IS NOT NULL ${dateFilter}
    GROUP BY city
    ORDER BY count DESC
  `).all()

  const districtData = db.prepare(`
    SELECT city, district, COUNT(*) as count,
           AVG(latitude) as avg_latitude,
           AVG(longitude) as avg_longitude
    FROM stray_reports
    WHERE city != '' AND district != '' AND latitude IS NOT NULL ${dateFilter}
    GROUP BY city, district
    ORDER BY count DESC
  `).all()

  const individualPoints = db.prepare(`
    SELECT id, animal_type, city, district, location, latitude, longitude, urgency, status, created_at
    FROM stray_reports
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL ${dateFilter}
    ORDER BY created_at DESC
    LIMIT 500
  `).all()

  const typeByCity = db.prepare(`
    SELECT city, animal_type, COUNT(*) as count
    FROM stray_reports
    WHERE city != '' ${dateFilter}
    GROUP BY city, animal_type
    ORDER BY city, count DESC
  `).all()

  res.json({
    success: true,
    data: {
      cities: cityData,
      districts: districtData,
      type_distribution: typeByCity,
      points: individualPoints,
      period: period,
    },
  })
})

router.get('/reports', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' })
    return
  }

  const db = getDb()
  const { status, page = '1', limit = '20' } = req.query

  let sql = 'SELECT * FROM stray_reports WHERE 1=1'
  const params: any[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as { total: number }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)

  const reports = db.prepare(sql).all(...params).map((r: any) => {
    const user = db.prepare('SELECT id, username, phone FROM users WHERE id = ?').get(r.user_id)
    return { ...r, reporter: user }
  })

  res.json({
    success: true,
    data: {
      items: reports,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

function escapeCsvField(value: any): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

router.get('/export', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  if (currentUser.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' })
    return
  }

  const db = getDb()
  const { type = 'rescue' } = req.query

  let csvContent = ''
  let filename: string

  switch (type) {
    case 'rescue': {
      filename = 'rescue_export.csv'
      const header = 'id,animal_type,city,district,location,urgency,status,created_at'
      const rows = db.prepare('SELECT r.id, r.animal_type, r.city, r.district, r.location, r.urgency, r.status, r.created_at FROM stray_reports r ORDER BY r.created_at DESC').all() as any[]
      csvContent = [header, ...rows.map(r => [r.id, r.animal_type, r.city, r.district, r.location, r.urgency, r.status, r.created_at].map(escapeCsvField).join(','))].join('\n')
      break
    }
    case 'adoption': {
      filename = 'adoption_export.csv'
      const header = 'animal_name,animal_type,adopter,agreement_date,status'
      const rows = db.prepare(`
        SELECT a.name as animal_name, a.type as animal_type, u.username as adopter, aa.agreement_date, aa.status
        FROM adoption_agreements aa
        JOIN animals a ON a.id = aa.animal_id
        JOIN users u ON u.id = aa.user_id
        ORDER BY aa.created_at DESC
      `).all() as any[]
      csvContent = [header, ...rows.map(r => [r.animal_name, r.animal_type, r.adopter, r.agreement_date, r.status].map(escapeCsvField).join(','))].join('\n')
      break
    }
    case 'donation': {
      filename = 'donation_export.csv'
      const header = 'donor,amount,type,status,payment_method,created_at'
      const rows = db.prepare(`
        SELECT u.username as donor, d.amount, d.type, d.status, d.payment_method, d.created_at
        FROM donations d
        JOIN users u ON u.id = d.user_id
        ORDER BY d.created_at DESC
      `).all() as any[]
      csvContent = [header, ...rows.map(r => [r.donor, r.amount, r.type, r.status, r.payment_method, r.created_at].map(escapeCsvField).join(','))].join('\n')
      break
    }
    case 'volunteer': {
      filename = 'volunteer_export.csv'
      const header = 'username,rescue_count,status'
      const rows = db.prepare(`
        SELECT u.username, COUNT(rt.id) as rescue_count,
          CASE WHEN u.role = 'volunteer' THEN 'active' ELSE u.role END as status
        FROM users u
        LEFT JOIN rescue_tasks rt ON rt.volunteer_id = u.id
        WHERE u.role = 'volunteer'
        GROUP BY u.id, u.username, u.role
        ORDER BY rescue_count DESC
      `).all() as any[]
      csvContent = [header, ...rows.map(r => [r.username, r.rescue_count, r.status].map(escapeCsvField).join(','))].join('\n')
      break
    }
    default: {
      filename = 'rescue_export.csv'
      const header = 'id,animal_type,city,district,location,urgency,status,created_at'
      const rows = db.prepare('SELECT r.id, r.animal_type, r.city, r.district, r.location, r.urgency, r.status, r.created_at FROM stray_reports r ORDER BY r.created_at DESC').all() as any[]
      csvContent = [header, ...rows.map(r => [r.id, r.animal_type, r.city, r.district, r.location, r.urgency, r.status, r.created_at].map(escapeCsvField).join(','))].join('\n')
    }
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csvContent)
})

export default router
