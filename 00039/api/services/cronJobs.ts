import cron from 'node-cron'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

function generateMonthlyReport() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

  const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString()
  const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const existing = db.prepare(
    `SELECT * FROM monthly_reports WHERE month = ?`
  ).get(monthStr)

  if (existing) {
    console.log(`[Cron] ${monthStr} 月度报表已存在，跳过生成`)
    return
  }

  const purchaseResult = db.prepare(
    `SELECT COALESCE(SUM(total_amount), 0) as total,
            COUNT(*) as order_count
     FROM purchase_orders
     WHERE created_at >= ? AND created_at <= ?`
  ).get(startOfMonth, endOfMonth) as { total: number; order_count: number }

  const returnResult = db.prepare(
    `SELECT COALESCE(SUM(po.total_amount), 0) as total,
            COUNT(*) as return_count
     FROM returns r
     JOIN purchase_orders po ON r.order_id = po.id
     WHERE r.created_at >= ? AND r.created_at <= ?`
  ).get(startOfMonth, endOfMonth) as { total: number; return_count: number }

  const totalPurchase = Math.round(purchaseResult.total * 100) / 100
  const totalReturn = Math.round(returnResult.total * 100) / 100
  const returnRate = totalPurchase > 0 ? Math.round((totalReturn / totalPurchase) * 10000) / 100 : 0

  const reportId = uuidv4()
  db.prepare(
    `INSERT INTO monthly_reports
     (id, month, total_purchase, total_return, return_rate, order_count, return_count, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    reportId, monthStr, totalPurchase, totalReturn, returnRate,
    purchaseResult.order_count, returnResult.return_count,
    new Date().toISOString()
  )

  db.prepare(
    `INSERT INTO messages
     (id, type, title, content, recipient_role, recipient_id, related_order_id, attachment_path, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(), 'report_ready',
    `${monthStr} 月度采购分析报表已生成`,
    `上月采购总额 ¥${totalPurchase.toLocaleString()}，退货金额 ¥${totalReturn.toLocaleString()}，退货率 ${returnRate}%，共 ${purchaseResult.order_count} 个订单`,
    'purchaser', null, null, null, 0,
    new Date().toISOString()
  )

  console.log(`[Cron] ${monthStr} 月度报表已生成，采购额 ¥${totalPurchase}，退货额 ¥${totalReturn}`)
}

export function startCronJobs() {
  console.log('[Cron] 定时任务已启动：每月1号 00:00 自动生成上月报表')

  cron.schedule('0 0 1 * *', () => {
    console.log('[Cron] 开始执行月度报表生成任务...')
    try {
      generateMonthlyReport()
    } catch (err) {
      console.error('[Cron] 月度报表生成失败:', err)
    }
  }, {
    timezone: 'Asia/Shanghai'
  })

  console.log('[Cron] 定时任务已启动：每小时检查订单状态更新')
  cron.schedule('0 * * * *', () => {
    try {
      const pendingOrders = db.prepare(
        `SELECT po.*, s.name as supplier_name
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.status IN ('pending_quote', 'locked')`
      ).all() as Array<Record<string, unknown>>

      if (pendingOrders.length > 0) {
        console.log(`[Cron] 当前待处理订单: ${pendingOrders.length} 个`)
      }
    } catch (err) {
      console.error('[Cron] 订单状态检查失败:', err)
    }
  }, {
    timezone: 'Asia/Shanghai'
  })
}

export { generateMonthlyReport }
