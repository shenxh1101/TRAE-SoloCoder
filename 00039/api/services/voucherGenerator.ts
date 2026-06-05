import db from '../db.js'

export function generateVoucherContent(messageId: string): { content: string; type: string } {
  const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId) as Record<string, unknown> | undefined

  if (!message) {
    return { content: '凭证不存在', type: 'error' }
  }

  const type = message.type as string
  const orderId = message.related_order_id as string | null

  let content = `
===========================================
           智采质检系统 - 业务凭证
===========================================

凭证编号: VCH-${messageId.slice(0, 8).toUpperCase()}
生成时间: ${new Date().toLocaleString('zh-CN')}
消息类型: ${getTypeLabel(type)}
标题: ${message.title}
内容: ${message.content}
`

  if (orderId) {
    const order = db.prepare(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`
    ).get(orderId) as Record<string, unknown> | undefined

    if (order) {
      content += `
-------------------------------------------
                 订单信息
-------------------------------------------
订单编号: ${order.order_no}
供应商: ${order.supplier_name}
预算金额: ¥${Number(order.budget_amount).toLocaleString()}
实际金额: ¥${Number(order.total_amount).toLocaleString()}
订单状态: ${getStatusLabel(order.status as string)}
创建时间: ${new Date(order.created_at as string).toLocaleString('zh-CN')}
`
      if (type === 'quality_result' || type === 'return_notice') {
        const report = db.prepare(
          `SELECT ir.*, m.name as material_name FROM inspection_reports ir
           JOIN materials m ON ir.material_id = m.id
           WHERE ir.order_id = ? ORDER BY ir.created_at DESC LIMIT 1`
        ).get(orderId) as Record<string, unknown> | undefined

        if (report) {
          content += `
-------------------------------------------
                 质检信息
-------------------------------------------
质检批次: ${report.batch_no}
物料名称: ${report.material_name}
质检结果: ${report.result === 'pass' ? '✅ 合格' : '❌ 不合格'}
质检时间: ${new Date(report.created_at as string).toLocaleString('zh-CN')}
`
        }
      }

      if (type === 'return_notice') {
        const returnRecord = db.prepare(
          `SELECT * FROM returns WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
        ).get(orderId) as Record<string, unknown> | undefined

        if (returnRecord) {
          content += `
-------------------------------------------
                 退货信息
-------------------------------------------
退货原因: ${returnRecord.reason}
退货状态: ${returnRecord.status === 'pending' ? '待处理' :
                       returnRecord.status === 'approved' ? '已批准' :
                       returnRecord.status === 'shipped' ? '已发货' : '已完成'}
创建时间: ${new Date(returnRecord.created_at as string).toLocaleString('zh-CN')}
`
        }
      }
    }
  }

  content += `
===========================================
              系统自动生成
  本凭证由智采质检协同系统自动生成，
  具有法律效力，请妥善保存。
===========================================
`

  return { content, type }
}

export function generateVoucherPDF(messageId: string): string {
  const { content } = generateVoucherContent(messageId)
  return content
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    order: '订单通知',
    order_change: '订单变更',
    quality: '质检通知',
    quality_result: '质检结果',
    return_notice: '退货通知',
    warehouse: '仓储通知',
    approval: '审批通知',
    budget_alert: '预算预警',
    system: '系统通知',
    report_ready: '报表通知',
  }
  return labels[type] || type
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '草稿',
    pending_quote: '待报价',
    quoted: '已报价',
    locked: '已锁定',
    pending_approval: '待审批',
    approved: '已审批',
    contracted: '已签约',
    shipping: '运输中',
    inspecting: '质检中',
    partial_return: '部分退货',
    qualified: '已合格',
    unqualified: '不合格',
    returned: '已退货',
    completed: '已完成',
    rejected: '已驳回',
  }
  return labels[status] || status
}
