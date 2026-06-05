import db from './database.js'
import { v4 as uuidv4 } from 'uuid'

let timeoutCheckInterval: NodeJS.Timeout | null = null
let observationBillingInterval: NodeJS.Timeout | null = null

export function startBackgroundJobs() {
  console.log('Starting background jobs...')

  timeoutCheckInterval = setInterval(() => {
    checkTimeoutPatients()
  }, 60000)

  observationBillingInterval = setInterval(() => {
    checkObservationBilling()
  }, 3600000)

  setTimeout(() => {
    checkTimeoutPatients()
    checkObservationBilling()
  }, 5000)

  console.log('Background jobs started')
}

export { checkTimeoutPatients, checkObservationBilling }

export function stopBackgroundJobs() {
  if (timeoutCheckInterval) {
    clearInterval(timeoutCheckInterval)
  }
  if (observationBillingInterval) {
    clearInterval(observationBillingInterval)
  }
  console.log('Background jobs stopped')
}

function checkTimeoutPatients() {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const waitingPatients = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM alerts a WHERE a.patient_id = p.id AND a.type = 'timeout' AND a.acknowledged = 0) as existing_alerts
      FROM patients p 
      WHERE p.status = 'waiting' 
      AND p.created_at < ?
      AND p.triage_level IN ('red', 'yellow')
    `).all(thirtyMinutesAgo) as any[]

    for (const patient of waitingPatients) {
      if (patient.existing_alerts === 0) {
        const now = new Date().toISOString()
        const waitMinutes = Math.floor((Date.now() - new Date(patient.created_at).getTime()) / 60000)

        db.prepare(`
          INSERT INTO alerts (id, type, level, message, patient_id, acknowledged, created_at)
          VALUES (?, 'timeout', 'critical', ?, ?, 0, ?)
        `).run(
          uuidv4(),
          `患者${patient.name}候诊超时已${waitMinutes}分钟，等级${patient.triage_level === 'red' ? '危重' : '急症'}，请立即处理`,
          patient.id,
          now
        )

        console.log(`Timeout alert created for patient ${patient.name}, waited ${waitMinutes} minutes`)
      }
    }
  } catch (error) {
    console.error('Error in checkTimeoutPatients:', error)
  }
}

function checkObservationBilling() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const observations = db.prepare(`
      SELECT o.*, p.name as patient_name
      FROM observations o
      JOIN patients p ON o.patient_id = p.id
      WHERE o.ended_at IS NULL
      AND o.started_at < ?
    `).all(twentyFourHoursAgo) as any[]

    for (const obs of observations) {
      const lastBilling = db.prepare(`
        SELECT MAX(created_at) as last_billing FROM billing_items 
        WHERE patient_id = ? AND category = 'observation' AND name LIKE '%自动计费%'
      `).get(obs.patient_id) as any

      const shouldBill = !lastBilling.last_billing || 
        new Date(lastBilling.last_billing) < new Date(Date.now() - 24 * 60 * 60 * 1000)

      if (shouldBill) {
        const now = new Date().toISOString()
        const hours = Math.ceil((Date.now() - new Date(obs.started_at).getTime()) / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)
        const fee = days * obs.bed_fee * 24

        db.prepare(`
          INSERT INTO billing_items (id, patient_id, category, name, amount, created_at)
          VALUES (?, ?, 'observation', ?, ?, ?)
        `).run(uuidv4(), obs.patient_id, `留观床位费（自动计费-${days}天）`, fee, now)

        console.log(`Auto billing created for patient ${obs.patient_name}, ${days} days, fee ¥${fee}`)
      }
    }
  } catch (error) {
    console.error('Error in checkObservationBilling:', error)
  }
}

export function checkCriticalExamination(examId: string, patientId: string, examName: string, resultValue: number) {
  const criticalRules = [
    { name: 'pH值', low_critical: 7.2, high_critical: 7.55 },
    { name: '血钾', low_critical: 2.5, high_critical: 6.5 },
    { name: '血糖', low_critical: 2.2, high_critical: 33.3 },
    { name: '血红蛋白', low_critical: 50, high_critical: null },
    { name: '血小板', low_critical: 30, high_critical: null },
    { name: '白细胞', low_critical: 1.0, high_critical: 30.0 },
  ]

  for (const rule of criticalRules) {
    if (examName.includes(rule.name)) {
      if ((rule.low_critical && resultValue <= rule.low_critical) || 
          (rule.high_critical && resultValue >= rule.high_critical)) {
        const now = new Date().toISOString()
        db.prepare(`
          INSERT INTO alerts (id, type, level, message, patient_id, acknowledged, created_at)
          VALUES (?, 'critical_value', 'critical', ?, ?, 0, ?)
        `).run(
          uuidv4(),
          `危急值警报：${examName}结果${resultValue}超出正常范围，请立即复查或考虑转科`,
          patientId,
          now
        )
        return true
      }
    }
  }
  return false
}

export default { startBackgroundJobs, stopBackgroundJobs }
