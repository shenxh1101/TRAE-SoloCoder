import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const {
    startTime,
    endTime,
    minLat,
    maxLat,
    minLon,
    maxLon,
    minMag,
    maxMag,
    page = '1',
    pageSize = '20',
  } = req.query

  let sql = 'SELECT * FROM seismic_events WHERE 1=1'
  const params: any[] = []

  if (startTime) {
    sql += ' AND time >= ?'
    params.push(startTime as string)
  }
  if (endTime) {
    sql += ' AND time <= ?'
    params.push(endTime as string)
  }
  if (minLat) {
    sql += ' AND latitude >= ?'
    params.push(parseFloat(minLat as string))
  }
  if (maxLat) {
    sql += ' AND latitude <= ?'
    params.push(parseFloat(maxLat as string))
  }
  if (minLon) {
    sql += ' AND longitude >= ?'
    params.push(parseFloat(minLon as string))
  }
  if (maxLon) {
    sql += ' AND longitude <= ?'
    params.push(parseFloat(maxLon as string))
  }
  if (minMag) {
    sql += ' AND magnitude >= ?'
    params.push(parseFloat(minMag as string))
  }
  if (maxMag) {
    sql += ' AND magnitude <= ?'
    params.push(parseFloat(maxMag as string))
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
  const totalResult = db.prepare(countSql).get(...params) as { total: number }
  const total = totalResult.total

  const p = Math.max(1, parseInt(page as string, 10))
  const ps = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)))
  const offset = (p - 1) * ps

  sql += ' ORDER BY time DESC LIMIT ? OFFSET ?'
  params.push(ps, offset)

  const events = db.prepare(sql).all(...params)

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
      },
    },
  })
})

router.post('/recommend', (req: Request, res: Response): void => {
  const { latitude, longitude, magnitude, radius } = req.body

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
    return
  }

  const searchRadius = radius || 5.0
  const lat = parseFloat(latitude)
  const lon = parseFloat(longitude)
  const mag = magnitude ? parseFloat(magnitude) : null

  let sql = `
    SELECT *,
      (ABS(latitude - ?) + ABS(longitude - ?)) as distance
    FROM seismic_events
    WHERE latitude BETWEEN ? AND ?
    AND longitude BETWEEN ? AND ?
  `
  const params: any[] = [lat, lon, lat - searchRadius, lat + searchRadius, lon - searchRadius, lon + searchRadius]

  if (mag) {
    sql += ' AND magnitude BETWEEN ? AND ?'
    params.push(mag - 1.0, mag + 1.0)
  }

  sql += ' ORDER BY distance ASC LIMIT 10'

  const recommendations = db.prepare(sql).all(...params)

  res.json({
    success: true,
    data: recommendations.map((r: any) => ({
      id: r.id,
      event_id: r.event_id,
      latitude: r.latitude,
      longitude: r.longitude,
      depth: r.depth,
      magnitude: r.magnitude,
      magnitude_type: r.magnitude_type,
      time: r.time,
      location: r.location,
      region: r.region,
      distance: Math.round(r.distance * 100) / 100,
    })),
  })
})

router.get('/export', (req: Request, res: Response): void => {
  const {
    startTime,
    endTime,
    minMag,
    maxMag,
  } = req.query

  let sql = 'SELECT event_id, latitude, longitude, depth, magnitude, magnitude_type, time, location, region FROM seismic_events WHERE 1=1'
  const params: any[] = []

  if (startTime) {
    sql += ' AND time >= ?'
    params.push(startTime as string)
  }
  if (endTime) {
    sql += ' AND time <= ?'
    params.push(endTime as string)
  }
  if (minMag) {
    sql += ' AND magnitude >= ?'
    params.push(parseFloat(minMag as string))
  }
  if (maxMag) {
    sql += ' AND magnitude <= ?'
    params.push(parseFloat(maxMag as string))
  }

  sql += ' ORDER BY time DESC'

  const events = db.prepare(sql).all(...params) as any[]

  const headers = ['event_id', 'latitude', 'longitude', 'depth', 'magnitude', 'magnitude_type', 'time', 'location', 'region']
  const csvRows = [headers.join(',')]

  for (const e of events) {
    csvRows.push(headers.map((h) => {
      const val = e[h]
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }).join(','))
  }

  const csv = csvRows.join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=seismic_catalog.csv')
  res.send(csv)
})

export default router
