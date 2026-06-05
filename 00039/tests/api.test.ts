import assert from 'node:assert/strict'

const BASE_URL = 'http://localhost:3001/api'

const TEST_DATA = {
  adminUserId: '83732420-1256-4002-ab98-d98ad9e56d3f',
  purchaserUserId: 'd027c2b8-c7e6-4571-9606-9299bae4a006',
  inspectorUserId: 'f9c6cb7b-91bf-436a-8a3a-fe84498cf8f8',
  supplierId: '1d6a3ebb-77ea-4006-baee-fcc64342cdbc',
  materialId: '720e103d-86d1-4845-9721-8b3ffbf019a9',
  password: '123456',
}

let createdOrderId: string | null = null
let createdContractId: string | null = null
let createdInspectionId: string | null = null

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`✓ ${name} (${Date.now() - start}ms)`)
  } catch (err) {
    results.push({ name, passed: false, error: (err as Error).message, duration: Date.now() - start })
    console.log(`✗ ${name} (${Date.now() - start}ms)`)
    console.log(`  Error: ${(err as Error).message}`)
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function main() {
  console.log('========================================')
  console.log('  API 集成测试')
  console.log('========================================\n')

  console.log('--- 认证 API ---\n')
  await runTest('POST /api/auth/login 登录', async () => {
    const res = await apiFetch<{ success: boolean; data: { id: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: TEST_DATA.password }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.id)
  })

  await runTest('POST /api/auth/login 密码错误', async () => {
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      })
      throw new Error('应该返回 401')
    } catch (err) {
      if ((err as Error).message.includes('HTTP 401') || (err as Error).message.includes('HTTP 400')) {
        return
      }
      throw err
    }
  })

  console.log('\n--- 订单 API ---\n')

  await runTest('GET /api/orders 获取订单列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string; order_no: string }> }>('/orders')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
    assert.ok(res.data.length > 0)
  })

  await runTest('POST /api/orders 创建采购订单', async () => {
    const res = await apiFetch<{ success: boolean; data: { id: string; orderNo: string } }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: TEST_DATA.supplierId,
        createdBy: TEST_DATA.adminUserId,
        budgetAmount: 300000,
        items: [
          { materialId: TEST_DATA.materialId, quantity: 50, unit: '吨' },
        ],
      }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.id)
    assert.ok(res.data.orderNo)
    createdOrderId = res.data.id
  })

  await runTest('GET /api/orders/:id 获取订单详情', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { id: string } }>(`/orders/${createdOrderId}`)
    assert.equal(res.success, true)
    assert.equal(res.data.id, createdOrderId)
  })

  await runTest('PUT /api/orders/:id/quote 供应商报价', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { status: string } }>(`/orders/${createdOrderId}/quote`, {
      method: 'PUT',
      body: JSON.stringify({
        items: [{ materialId: TEST_DATA.materialId, quotedPrice: 5500, quantity: 50 }],
        supplierId: TEST_DATA.supplierId,
      }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.status)
  })

  await runTest('PUT /api/orders/:id/approve 审批锁定订单', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { status: string } }>(`/orders/${createdOrderId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved: true }),
    })
    assert.equal(res.success, true)
  })

  await runTest('PUT /api/orders/:id/status 更新订单状态', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { status: string } }>(`/orders/${createdOrderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'approved' }),
    })
    assert.equal(res.success, true)
    assert.equal(res.data.status, 'approved')
  })

  await runTest('GET /api/orders/:id/logs 获取操作日志', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>(`/orders/${createdOrderId}/logs`)
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('GET /api/orders/suggested-prices/:materialId 获取建议价格', async () => {
    const res = await apiFetch<{ success: boolean; data: { suggestedPrice: number } }>(
      `/orders/suggested-prices/${TEST_DATA.materialId}`
    )
    assert.equal(res.success, true)
    assert.ok(typeof res.data.suggestedPrice === 'number')
  })

  console.log('\n--- 合同 API ---\n')

  await runTest('POST /api/contracts/generate 生成合同', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { id: string } }>('/contracts/generate', {
      method: 'POST',
      body: JSON.stringify({ orderId: createdOrderId }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.id)
    createdContractId = res.data.id
  })

  await runTest('GET /api/contracts 获取合同列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/contracts')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('POST /api/contracts/:id/sign 采购方签名', async () => {
    assert.ok(createdContractId, '需要先创建合同')
    const res = await apiFetch<{ success: boolean; data: { buyer_signature: string } }>(`/contracts/${createdContractId}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        role: 'buyer',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==',
      }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.buyer_signature)
  })

  await runTest('POST /api/contracts/:id/sign 供应商签名', async () => {
    assert.ok(createdContractId, '需要先创建合同')
    const res = await apiFetch<{ success: boolean; data: { status: string } }>(`/contracts/${createdContractId}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        role: 'supplier',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==',
      }),
    })
    assert.equal(res.success, true)
    assert.equal(res.data.status, 'signed')
  })

  console.log('\n--- 质检 API ---\n')

  await runTest('GET /api/quality 获取质检列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/quality')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('POST /api/quality 创建质检报告（合格）', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { id: string; result: string } }>('/quality', {
      method: 'POST',
      body: JSON.stringify({
        orderId: createdOrderId,
        batchNo: 'B20260603-001',
        materialId: TEST_DATA.materialId,
        inspector: TEST_DATA.inspectorUserId,
        items: [
          { name: '厚度', standard: '6mm±0.1mm', actual: '6.02mm', passed: true },
          { name: '表面质量', standard: '无明显划痕', actual: '合格', passed: true },
          { name: '材质成分', standard: 'Q235B标准', actual: '符合标准', passed: true },
        ],
      }),
    })
    assert.equal(res.success, true)
    assert.equal(res.data.result, 'pass')
    createdInspectionId = res.data.id
  })

  await runTest('POST /api/quality 创建质检报告（不合格）', async () => {
    assert.ok(createdOrderId, '需要先创建订单')
    const res = await apiFetch<{ success: boolean; data: { id: string; result: string } }>('/quality', {
      method: 'POST',
      body: JSON.stringify({
        orderId: createdOrderId,
        batchNo: 'B20260603-002',
        materialId: TEST_DATA.materialId,
        inspector: TEST_DATA.inspectorUserId,
        items: [
          { name: '厚度', standard: '6mm±0.1mm', actual: '6.15mm', passed: false },
          { name: '表面质量', standard: '无明显划痕', actual: '合格', passed: true },
        ],
      }),
    })
    assert.equal(res.success, true)
    assert.equal(res.data.result, 'fail')
  })

  await runTest('GET /api/quality/:id 获取质检详情', async () => {
    assert.ok(createdInspectionId, '需要先创建质检报告')
    const res = await apiFetch<{ success: boolean; data: { id: string } }>(`/quality/${createdInspectionId}`)
    assert.equal(res.success, true)
    assert.equal(res.data.id, createdInspectionId)
  })

  console.log('\n--- 仓储 API ---\n')

  await runTest('GET /api/warehouse/stock 获取库存列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/warehouse/stock')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('POST /api/warehouse/scan-in 扫码入库', async () => {
    const res = await apiFetch<{ success: boolean; data: { id: string } }>('/warehouse/scan-in', {
      method: 'POST',
      body: JSON.stringify({
        materialId: TEST_DATA.materialId,
        warehouse: 'A区主仓库',
        location: 'A-01-05',
        quantity: 30,
        orderId: createdOrderId,
      }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.id)
  })

  console.log('\n--- 供应商 API ---\n')

  await runTest('GET /api/suppliers 获取供应商列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/suppliers')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
    assert.ok(res.data.length > 0)
  })

  await runTest('GET /api/suppliers/performance/all 获取供应商绩效', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string; on_time_rate: number }> }>('/suppliers/performance/all')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('GET /api/suppliers/:id 获取供应商详情', async () => {
    const res = await apiFetch<{ success: boolean; data: { id: string } }>(`/suppliers/${TEST_DATA.supplierId}`)
    assert.equal(res.success, true)
    assert.equal(res.data.id, TEST_DATA.supplierId)
  })

  console.log('\n--- 物料 API ---\n')

  await runTest('GET /api/materials 获取物料列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/materials')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
    assert.ok(res.data.length > 0)
  })

  await runTest('GET /api/materials/:id 获取物料详情', async () => {
    const res = await apiFetch<{ success: boolean; data: { id: string } }>(`/materials/${TEST_DATA.materialId}`)
    assert.equal(res.success, true)
    assert.equal(res.data.id, TEST_DATA.materialId)
  })

  await runTest('GET /api/materials/categories/list 获取物料分类', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ category: string }> }>('/materials/categories/list')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  console.log('\n--- 消息 API ---\n')

  await runTest('GET /api/messages 获取消息列表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/messages')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('GET /api/messages/unread-count 获取未读数量', async () => {
    const res = await apiFetch<{ success: boolean; data: { total: number } }>(
      `/messages/unread-count?recipient_id=${TEST_DATA.adminUserId}`
    )
    assert.equal(res.success, true)
    assert.ok(typeof res.data.total === 'number')
  })

  await runTest('PUT /api/messages/:id/read 标记已读', async () => {
    const messagesRes = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/messages')
    if (messagesRes.data.length > 0) {
      const msgId = messagesRes.data[0].id
      const res = await apiFetch<{ success: boolean; data: { read: boolean } }>(`/messages/${msgId}/read`, {
        method: 'PUT',
      })
      assert.equal(res.success, true)
      assert.equal(res.data.read, true)
    }
  })

  await runTest('PUT /api/messages/read-all 全部已读', async () => {
    const res = await apiFetch<{ success: boolean; data: { allRead: boolean } }>('/messages/read-all', {
      method: 'PUT',
      body: JSON.stringify({ recipient_id: TEST_DATA.adminUserId }),
    })
    assert.equal(res.success, true)
    assert.equal(res.data.allRead, true)
  })

  await runTest('GET /api/messages/:id/attachment 下载凭证', async () => {
    const messagesRes = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>('/messages')
    if (messagesRes.data.length > 0) {
      const msgId = messagesRes.data[0].id
      const res = await fetch(`${BASE_URL}/messages/${msgId}/attachment`)
      assert.equal(res.ok, true)
      const disposition = res.headers.get('content-disposition')
      assert.ok(disposition?.includes('attachment'))
      assert.ok(disposition?.includes('voucher_'))
      const text = await res.text()
      assert.ok(text.length > 0)
    }
  })

  console.log('\n--- 报表 API ---\n')

  await runTest('GET /api/reports 获取月度报表', async () => {
    const res = await apiFetch<{ success: boolean; data: Array<{ month: string }> }>('/reports')
    assert.equal(res.success, true)
    assert.ok(Array.isArray(res.data))
  })

  await runTest('POST /api/reports/generate 手动生成月度报表', async () => {
    const res = await apiFetch<{ success: boolean; data: { month: string } }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ month: '2026-05' }),
    })
    assert.equal(res.success, true)
    assert.ok(res.data.month)
  })

  console.log('\n--- 定时任务测试 ---\n')

  await runTest('执行月度报表生成任务', async () => {
    const { generateMonthlyReport } = await import('../api/services/cronJobs.js')
    generateMonthlyReport()
  })

  console.log('\n========================================')
  console.log('  测试结果汇总')
  console.log('========================================\n')

  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed)
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`总测试数: ${results.length}`)
  console.log(`通过: ${passed.length}`)
  console.log(`失败: ${failed.length}`)
  console.log(`总耗时: ${totalTime}ms\n`)

  if (failed.length > 0) {
    console.log('失败的测试:')
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  } else {
    console.log('所有测试通过 ✓')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('\n测试执行失败:', err)
  process.exit(1)
})
