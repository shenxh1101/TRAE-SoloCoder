import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

function parseJsonFields(animal: any) {
  if (animal) {
    try { animal.personality = JSON.parse(animal.personality) } catch { animal.personality = [] }
    try { animal.photos = JSON.parse(animal.photos) } catch { animal.photos = [] }
  }
  return animal
}

function computeMatch(questionnaire: any, animal: any): { score: number; reasons: string[] } {
  let score = 50
  const reasons: string[] = []
  const personality: string[] = (() => {
    try { return JSON.parse(animal.personality) } catch { return [] }
  })()

  if (questionnaire.housing_type === 'house') {
    if (personality.includes('需要空间')) { score += 20; reasons.push('房屋空间充足，适合需要活动空间的宠物') }
    if (personality.includes('爱散步')) { score += 15; reasons.push('有院子适合爱散步的宠物') }
    if (personality.includes('活泼')) { score += 10; reasons.push('宽敞环境适合活泼宠物') }
  }
  if (questionnaire.housing_type === 'apartment') {
    if (personality.includes('安静')) { score += 15; reasons.push('安静性格适合公寓居住') }
    if (personality.includes('小巧')) { score += 15; reasons.push('体型小巧适合公寓环境') }
    if (personality.includes('独立')) { score += 10; reasons.push('独立性格适合公寓生活') }
    if (animal.type === 'dog' && animal.weight && parseFloat(animal.weight) > 15) {
      score -= 10; reasons.push('大型犬可能不太适合公寓')
    }
  }

  if (questionnaire.has_yard) {
    if (personality.includes('爱散步')) { score += 10; reasons.push('有院子满足散步需求') }
    if (personality.includes('活泼')) { score += 5; reasons.push('院子提供活动空间') }
  } else {
    if (personality.includes('安静')) { score += 8; reasons.push('无院子但宠物性格安静') }
  }

  if (questionnaire.activity_level === 'active') {
    if (personality.includes('活泼')) { score += 12; reasons.push('您活跃的生活方式匹配活泼的宠物') }
    if (personality.includes('爱玩')) { score += 8; reasons.push('爱玩的宠物需要活跃的主人') }
    if (personality.includes('爱散步')) { score += 5; reasons.push('爱散步的宠物适合运动达人') }
  }
  if (questionnaire.activity_level === 'moderate') {
    if (personality.includes('温顺')) { score += 10; reasons.push('温顺性格适合适度运动') }
    if (personality.includes('亲人')) { score += 5; reasons.push('亲人性格适合日常陪伴') }
  }
  if (questionnaire.activity_level === 'low') {
    if (personality.includes('安静')) { score += 12; reasons.push('安静宠物适合悠闲生活') }
    if (personality.includes('独立')) { score += 8; reasons.push('独立性格不需要太多运动') }
  }

  if (questionnaire.has_other_pets) {
    if (personality.includes('友好')) { score += 10; reasons.push('友好性格适合多宠物家庭') }
    if (personality.includes('独立')) { score += 5; reasons.push('独立性格能与其他宠物共处') }
  } else {
    if (personality.includes('粘人')) { score += 8; reasons.push('粘人宠物独享您的关爱') }
  }

  if (questionnaire.experience && questionnaire.experience.length > 20) {
    score += 8; reasons.push('丰富养宠经验加分')
  } else if (questionnaire.experience && questionnaire.experience.length > 5) {
    score += 4; reasons.push('有一定养宠经验')
  }

  if (personality.includes('亲人')) { score += 3 }
  if (personality.includes('温顺')) { score += 3 }

  if (questionnaire.daily_hours_home && parseInt(questionnaire.daily_hours_home) >= 8) {
    if (personality.includes('粘人')) { score += 5; reasons.push('在家时间长满足粘人宠物需求') }
  }

  return { score: Math.min(99, Math.max(10, score)), reasons: reasons.slice(0, 5) }
}

router.get('/available', (req: Request, res: Response): void => {
  const db = getDb()
  const { type, page = '1', limit = '20' } = req.query

  let sql = "SELECT * FROM animals WHERE status = 'available'"
  const params: any[] = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const countResult = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as { total: number }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)

  const animals = db.prepare(sql).all(...params).map(parseJsonFields)

  res.json({
    success: true,
    data: {
      items: animals,
      total: countResult.total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.post('/questionnaire', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { animal_id, housing_type, housing_size, has_yard, has_other_pets, other_pets_description, experience, daily_hours_home, activity_level, reason } = req.body

  if (!animal_id || !housing_type || !reason) {
    res.status(400).json({ success: false, error: '动物ID、住房类型和领养原因不能为空' })
    return
  }

  const db = getDb()
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(animal_id)
  if (!animal) {
    res.status(404).json({ success: false, error: '动物不存在' })
    return
  }

  const result = db.prepare(`
    INSERT INTO adoption_questionnaires (user_id, animal_id, housing_type, housing_size, has_yard, has_other_pets, other_pets_description, experience, daily_hours_home, activity_level, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(currentUser.id, animal_id, housing_type, housing_size || '', has_yard ? 1 : 0, has_other_pets ? 1 : 0, other_pets_description || '', experience || '', daily_hours_home || '', activity_level || '', reason)

  const questionnaire = db.prepare('SELECT * FROM adoption_questionnaires WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: questionnaire })
})

router.get('/match', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const questionnaire = db.prepare('SELECT * FROM adoption_questionnaires WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(currentUser.id) as any
  if (!questionnaire) {
    res.status(400).json({ success: false, error: '请先填写领养问卷' })
    return
  }

  const animals = db.prepare("SELECT * FROM animals WHERE status = 'available'").all() as any[]

  const matches = animals.map(animal => {
    const { score, reasons } = computeMatch(questionnaire, animal)
    return {
      ...parseJsonFields(animal),
      match_score: score,
      match_reasons: reasons,
    }
  }).sort((a, b) => b.match_score - a.match_score)

  res.json({ success: true, data: matches.slice(0, 10) })
})

router.post('/appointment', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { animal_id, appointment_date, notes } = req.body

  if (!animal_id || !appointment_date) {
    res.status(400).json({ success: false, error: '动物ID和预约日期不能为空' })
    return
  }

  const db = getDb()
  const animal = db.prepare("SELECT * FROM animals WHERE id = ? AND status = 'available'").get(animal_id)
  if (!animal) {
    res.status(404).json({ success: false, error: '动物不存在或不可领养' })
    return
  }

  res.status(201).json({
    success: true,
    data: {
      animal_id,
      user_id: currentUser.id,
      appointment_date,
      notes: notes || '',
      status: 'scheduled',
    },
  })
})

router.post('/agreement', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const { questionnaire_id, terms } = req.body

  if (!questionnaire_id) {
    res.status(400).json({ success: false, error: '问卷ID不能为空' })
    return
  }

  const db = getDb()
  const questionnaire = db.prepare('SELECT * FROM adoption_questionnaires WHERE id = ? AND user_id = ?').get(questionnaire_id, currentUser.id) as any
  if (!questionnaire) {
    res.status(404).json({ success: false, error: '问卷不存在' })
    return
  }

  if (questionnaire.status !== 'approved') {
    res.status(400).json({ success: false, error: '问卷尚未通过审核' })
    return
  }

  const existing = db.prepare('SELECT * FROM adoption_agreements WHERE questionnaire_id = ?').get(questionnaire_id)
  if (existing) {
    res.status(409).json({ success: false, error: '协议已存在' })
    return
  }

  const agreementDate = new Date().toISOString().split('T')[0]
  const result = db.prepare(`
    INSERT INTO adoption_agreements (questionnaire_id, user_id, animal_id, agreement_date, terms)
    VALUES (?, ?, ?, ?, ?)
  `).run(questionnaire_id, currentUser.id, questionnaire.animal_id, agreementDate, terms || '1. 承诺不遗弃动物；2. 定期带动物体检和疫苗；3. 接受定期回访；4. 如无法继续饲养需归还救助站')

  db.prepare("UPDATE animals SET status = 'adopted', updated_at = datetime('now', 'localtime') WHERE id = ?").run(questionnaire.animal_id)

  const agreement = db.prepare('SELECT * FROM adoption_agreements WHERE id = ?').get(result.lastInsertRowid)

  db.prepare(`
    INSERT INTO follow_ups (agreement_id, animal_id, user_id, scheduled_date, status, notes, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(result.lastInsertRowid, questionnaire.animal_id, currentUser.id, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 'pending', '第一次回访', '[]')

  res.status(201).json({ success: true, data: agreement })
})

router.get('/my', authMiddleware, (req: Request, res: Response): void => {
  const currentUser = (req as any).user
  const db = getDb()

  const agreements = db.prepare('SELECT * FROM adoption_agreements WHERE user_id = ? ORDER BY created_at DESC').all(currentUser.id) as any[]

  const result = agreements.map(agreement => {
    const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(agreement.animal_id)
    const questionnaire = db.prepare('SELECT * FROM adoption_questionnaires WHERE id = ?').get(agreement.questionnaire_id)
    const followUps = db.prepare('SELECT * FROM follow_ups WHERE agreement_id = ?').all(agreement.id)
    return {
      ...agreement,
      animal: animal ? parseJsonFields(animal) : null,
      questionnaire,
      follow_ups: followUps,
    }
  })

  res.json({ success: true, data: result })
})

export default router
