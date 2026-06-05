import { getDb } from '../database.js'

const OVERTIME_THRESHOLD_MS = 15 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000

let intervalId: ReturnType<typeof setInterval> | null = null

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'COMP'
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function startOvertimeChecker(): void {
  if (intervalId) return

  console.log('[OvertimeChecker] 启动超时检查服务，检查间隔: 30秒')

  const check = () => {
    try {
      const db = getDb()

      const inServiceOrders = db.prepare(
        "SELECT * FROM orders WHERE status = 'in_service'"
      ).all() as any[]

      const now = Date.now()

      for (const order of inServiceOrders) {
        if (!order.serviceStartTime) continue

        const elapsed = now - new Date(order.serviceStartTime).getTime()

        if (elapsed >= OVERTIME_THRESHOLD_MS && !order.overtime_reminded) {
          console.log(`[OvertimeChecker] 订单 ${order.id} 已超时15分钟，发放补偿优惠券`)

          db.prepare(
            'UPDATE orders SET overtime_reminded = 1 WHERE id = ?'
          ).run(order.id)

          const couponId = crypto.randomUUID()
          const couponCode = generateCouponCode()
          const couponAmount = 30

          db.prepare(
            `INSERT INTO user_coupons (id, userId, orderId, amount, reason, code) VALUES (?, ?, ?, ?, ?, ?)`
          ).run(couponId, order.userId, order.id, couponAmount, '服务超时15分钟自动补偿', couponCode)

          db.prepare(
            'UPDATE orders SET coupon_compensated = 1 WHERE id = ?'
          ).run(order.id)

          const notificationId = crypto.randomUUID()
          db.prepare(
            `INSERT INTO notifications (id, userId, type, title, content, relatedId) VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            notificationId,
            order.userId,
            'coupon',
            '超时补偿通知',
            `您的订单 ${order.id.slice(0, 8)}... 服务超时15分钟，系统已自动发放${couponAmount}元补偿优惠券（码：${couponCode}），可在下次预约时使用。`,
            order.id
          )

          db.prepare(
            `INSERT INTO messages (id, orderId, senderType, content) VALUES (?, ?, 'system', ?)`
          ).run(
            crypto.randomUUID(),
            order.id,
            `⚠️ 服务超时提醒：已超时15分钟，系统已发放${couponAmount}元补偿优惠券（码：${couponCode}）`
          )

          console.log(`[OvertimeChecker] 已为订单 ${order.id} 发放优惠券: ${couponCode}`)
        }
      }
    } catch (error) {
      console.error('[OvertimeChecker] 检查出错:', error)
    }
  }

  check()
  intervalId = setInterval(check, CHECK_INTERVAL_MS)
}

export function stopOvertimeChecker(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[OvertimeChecker] 超时检查服务已停止')
  }
}
