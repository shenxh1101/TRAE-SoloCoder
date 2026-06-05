import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/service-types', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const types = db.prepare('SELECT * FROM service_types').all()
    res.json({ success: true, data: types })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取服务类型失败' })
  }
})

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

router.get('/recommend', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { serviceType, serviceTypeId, lat, lng } = req.query

    const userLat = parseFloat((lat as string) || '39.9')
    const userLng = parseFloat((lng as string) || '116.4')

    let serviceTypeRecord: any = null
    if (serviceTypeId) {
      serviceTypeRecord = db.prepare("SELECT * FROM service_types WHERE id = ?").get(serviceTypeId) as any
    } else if (serviceType) {
      serviceTypeRecord = db.prepare("SELECT * FROM service_types WHERE name = ?").get(serviceType) as any
    }

    if (!serviceTypeRecord) {
      res.status(404).json({ success: false, error: '未找到该服务类型' })
      return
    }

    const idleStaff = db.prepare("SELECT * FROM staff WHERE status = 'idle'").all() as any[]

    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const candidates = idleStaff.filter((s) => {
      const skills: string[] = JSON.parse(s.skillTags || '[]')
      if (!skills.includes(serviceType as string)) return false

      const schedule = db.prepare(
        'SELECT * FROM schedules WHERE staffId = ? AND dayOfWeek = ? AND isAvailable = 1 AND startTime <= ? AND endTime >= ?'
      ).get(s.id, currentDay, currentTime, currentTime) as any

      return !!schedule
    })

    if (candidates.length === 0) {
      res.json({ success: true, data: [] })
      return
    }

    const maxOrders = Math.max(...candidates.map((s) => s.currentOrders), 1)
    let maxDistance = 0
    const scored = candidates.map((s) => {
      const distance = haversineDistance(userLat, userLng, s.lat, s.lng)
      if (distance > maxDistance) maxDistance = distance
      return { ...s, distance }
    })

    if (maxDistance === 0) maxDistance = 1

    const ranked = scored
      .map((s) => {
        const ratingScore = (s.rating / 5.0) * 0.5
        const distanceScore = (1 - s.distance / maxDistance) * 0.3
        const workloadScore = (1 - s.currentOrders / maxOrders) * 0.2
        const totalScore = ratingScore + distanceScore + workloadScore
        const avgSpeedKmH = 30
        const estimatedArrivalMin = Math.round((s.distance / avgSpeedKmH) * 60)
        return {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          phone: s.phone,
          skillTags: JSON.parse(s.skillTags),
          rating: s.rating,
          totalOrders: s.totalOrders,
          serviceAreas: JSON.parse(s.serviceAreas),
          lat: s.lat,
          lng: s.lng,
          distance: Math.round(s.distance * 10) / 10,
          score: Math.round(totalScore * 100) / 100,
          estimatedArrivalMin,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    res.json({ success: true, data: ranked })
  } catch (error) {
    res.status(500).json({ success: false, error: '推荐失败' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const staffList = db.prepare('SELECT * FROM staff ORDER BY rating DESC').all() as any[]

    const result = staffList.map((s) => {
      const schedules = db.prepare('SELECT * FROM schedules WHERE staffId = ? ORDER BY dayOfWeek').all(s.id)
      return {
        ...s,
        skillTags: JSON.parse(s.skillTags),
        serviceAreas: JSON.parse(s.serviceAreas),
        schedules,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取员工列表失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { skillTags, serviceAreas, status } = req.body

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any
    if (!staff) {
      res.status(404).json({ success: false, error: '员工不存在' })
      return
    }

    const updates: string[] = []
    const values: any[] = []

    if (skillTags !== undefined) {
      updates.push('skillTags = ?')
      values.push(JSON.stringify(skillTags))
    }
    if (serviceAreas !== undefined) {
      updates.push('serviceAreas = ?')
      values.push(JSON.stringify(serviceAreas))
    }
    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' })
      return
    }

    values.push(id)
    db.prepare(`UPDATE staff SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any
    res.json({
      success: true,
      data: {
        ...updated,
        skillTags: JSON.parse(updated.skillTags),
        serviceAreas: JSON.parse(updated.serviceAreas),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新员工信息失败' })
  }
})

export default router
