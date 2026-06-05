import type {
  User, Policy, Claim, AssessmentRecord,
  EarlyWarning, MonthlyReport, HandlerEfficiency, BranchStats
} from '../types'

export const insuranceTypes = ['车险', '财产险', '人身险', '健康险', '责任险']
export const accidentTypes = ['交通事故', '火灾', '水灾', '意外伤害', '疾病', '盗窃', '自然灾害', '第三方责任']
export const regions = ['华东区', '华南区', '华北区', '西南区', '东北区']
const branchMap: Record<string, string[]> = {
  '华东区': ['上海支公司', '南京支公司', '杭州支公司', '苏州支公司'],
  '华南区': ['广州支公司', '深圳支公司', '厦门支公司', '东莞支公司'],
  '华北区': ['北京支公司', '天津支公司', '石家庄支公司', '青岛支公司'],
  '西南区': ['成都支公司', '重庆支公司', '昆明支公司', '贵阳支公司'],
  '东北区': ['沈阳支公司', '大连支公司', '哈尔滨支公司', '长春支公司'],
}

const handlers = ['张伟', '李娜', '王强', '赵敏', '刘洋', '陈静', '杨帆', '周磊', '吴昊', '郑芳', '孙鹏', '马丽']
const assessors = ['黄明', '林峰', '许晴', '何涛', '罗勇']
const rejectReasons = [
  '不在保障范围内', '保险已过期', '虚假申报', '材料不完整', '免赔额未达到',
  '既往病史未告知', '事故原因不符', '重复理赔', '等待期内出险', '违反保险条款',
  '故意造成事故', '伪造证明材料', '虚报损失金额', '无有效驾驶资格', '醉酒驾驶'
]

const holders = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二', '陈十三', '褚十四', '卫十五', '蒋十六', '沈十七']

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function dateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export const mockUsers: User[] = [
  { id: '1', name: '总部管理员', role: 'headquarters' },
  { id: '2', name: '华东区主管', role: 'region', region: '华东区' },
  { id: '3', name: '上海支公司经理', role: 'branch', region: '华东区', branch: '上海支公司' },
]

export const currentUser: User = mockUsers[0]

export function generatePolicies(count: number): Policy[] {
  const policies: Policy[] = []
  for (let i = 0; i < count; i++) {
    const region = pick(regions)
    const branch = pick(branchMap[region])
    policies.push({
      id: `POL${String(i + 1).padStart(6, '0')}`,
      policyNo: `P${String(i + 1).padStart(8, '0')}`,
      holderName: pick(holders),
      insuranceType: pick(insuranceTypes),
      startDate: dateStr(rand(30, 365)),
      endDate: dateStr(rand(-30, -365)),
      premium: randFloat(500, 50000),
      coverage: randFloat(100000, 5000000),
      branch,
      region,
    })
  }
  return policies
}

export function generateClaims(count: number): Claim[] {
  const claims: Claim[] = []
  const statuses: ClaimStatus[] = ['pending', 'assessing', 'approved', 'rejected', 'paid']
  for (let i = 0; i < count; i++) {
    const region = pick(regions)
    const branch = pick(branchMap[region])
    const insType = pick(insuranceTypes)
    const accType = pick(accidentTypes)
    const status = pick(statuses)
    const claimAmount = randFloat(1000, 500000)
    const rejected = status === 'rejected'
    const paid = status === 'paid'
    claims.push({
      id: `CLM${String(i + 1).padStart(6, '0')}`,
      claimNo: `C${String(i + 1).padStart(8, '0')}`,
      policyId: `POL${String(rand(1, 500)).padStart(6, '0')}`,
      policyNo: `P${String(rand(1, 500)).padStart(8, '0')}`,
      holderName: pick(holders),
      insuranceType: insType,
      accidentType: accType,
      accidentDate: dateStr(rand(1, 90)),
      reportDate: dateStr(rand(0, 5)),
      status,
      claimAmount,
      approvedAmount: paid ? claimAmount * randFloat(0.5, 1) : 0,
      assessor: pick(assessors),
      handler: pick(handlers),
      branch,
      region,
      closeDate: (paid || rejected) ? dateStr(rand(0, 10)) : undefined,
      rejectReason: rejected ? pick(rejectReasons) : undefined,
    })
  }
  return claims
}

export function generateAssessmentRecords(count: number): AssessmentRecord[] {
  const records: AssessmentRecord[] = []
  for (let i = 0; i < count; i++) {
    const region = pick(regions)
    const branch = pick(branchMap[region])
    const totalEstimated = randFloat(2000, 200000)
    const deviation = randFloat(-0.3, 0.5)
    const totalActual = totalEstimated * (1 + deviation)
    const items: AssessmentItem[] = []
    const itemCount = rand(3, 8)
    for (let j = 0; j < itemCount; j++) {
      const est = randFloat(200, 50000)
      const dev = randFloat(-0.25, 0.4)
      items.push({
        id: `ITEM${i}_${j}`,
        itemName: pick(['钣金修复', '喷漆', '发动机维修', '变速箱更换', '玻璃更换', '保险杠修复', '电路检修', '内饰更换', '轮胎更换', '刹车系统维修', '空调维修', '底盘校正']),
        category: pick(['车身', '动力系统', '电气系统', '内饰', '底盘', '外观']),
        estimatedCost: est,
        actualCost: est * (1 + dev),
        deviation: dev,
        needsReview: Math.abs(dev) > 0.2,
      })
    }
    records.push({
      id: `ASR${String(i + 1).padStart(6, '0')}`,
      claimId: `CLM${String(rand(1, 200)).padStart(6, '0')}`,
      claimNo: `C${String(rand(1, 200)).padStart(8, '0')}`,
      assessor: pick(assessors),
      assessmentDate: dateStr(rand(0, 30)),
      totalEstimated,
      totalActual,
      items,
      photos: [],
      status: pick(['draft', 'submitted', 'reviewed']),
      deviationFlag: Math.abs(deviation) > 0.2,
    })
  }
  return records
}

export function generateEarlyWarnings(): EarlyWarning[] {
  const warnings: EarlyWarning[] = []
  for (let i = 0; i < 15; i++) {
    const region = pick(regions)
    const branch = pick(branchMap[region])
    const histAvg = randFloat(2, 8)
    warnings.push({
      id: `EW${String(i + 1).padStart(4, '0')}`,
      branch,
      region,
      insuranceType: pick(insuranceTypes),
      accidentType: pick(accidentTypes),
      anomalyDays: rand(3, 10),
      avgAnomalyCount: histAvg * randFloat(2, 4),
      historicalAvg: histAvg,
      threshold: histAvg * 2,
      triggerDate: dateStr(rand(0, 15)),
      status: pick(['active', 'acknowledged', 'resolved']),
      assignee: pick(handlers),
      level: pick(['high', 'medium', 'low']),
    })
  }
  return warnings
}

export function generateMonthlyReports(): MonthlyReport[] {
  const reports: MonthlyReport[] = []
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
  for (const month of months) {
    for (const insType of insuranceTypes) {
      const totalClaims = rand(50, 300)
      const paidClaims = Math.floor(totalClaims * randFloat(0.4, 0.7))
      const rejectedClaims = Math.floor(totalClaims * randFloat(0.05, 0.2))
      const totalClaimAmount = randFloat(500000, 5000000)
      const totalPaidAmount = totalClaimAmount * randFloat(0.3, 0.7)
      const suspectedFraudCount = Math.floor(totalClaims * randFloat(0.01, 0.08))
      reports.push({
        month,
        insuranceType: insType,
        totalClaims,
        paidClaims,
        rejectedClaims,
        pendingClaims: totalClaims - paidClaims - rejectedClaims,
        totalClaimAmount,
        totalPaidAmount,
        payoutRate: parseFloat((totalPaidAmount / totalClaimAmount * 100).toFixed(1)),
        rejectionRate: parseFloat((rejectedClaims / totalClaims * 100).toFixed(1)),
        avgProcessingDays: randFloat(3, 25, 1),
        suspectedFraudCount,
        suspectedFraudRate: parseFloat((suspectedFraudCount / totalClaims * 100).toFixed(1)),
        suggestions: [
          `${insType}赔付率${(totalPaidAmount / totalClaimAmount * 100).toFixed(1)}%，建议优化核赔流程`,
          `平均结案时长${randFloat(3, 25, 1)}天，需提升处理效率`,
          `疑似欺诈占比${(suspectedFraudCount / totalClaims * 100).toFixed(1)}%，建议加强反欺诈审查`,
        ],
      })
    }
  }
  return reports
}

export function generateHandlerEfficiency(): HandlerEfficiency[] {
  return handlers.map(handler => {
    const region = pick(regions)
    const branch = pick(branchMap[region])
    const totalCases = rand(20, 120)
    const closedCases = Math.floor(totalCases * randFloat(0.5, 0.9))
    const rejectionRate = randFloat(5, 25, 1)
    const reasonCount = rand(3, 6)
    const handlerReasons = Array.from({ length: reasonCount }, () => ({
      reason: pick(rejectReasons),
      count: rand(1, 10),
    }))
    return {
      handler,
      branch,
      totalCases,
      closedCases,
      avgProcessingDays: randFloat(3, 20, 1),
      rejectionRate,
      approvalRate: parseFloat((100 - rejectionRate).toFixed(1)),
      rejectReasons: handlerReasons,
    }
  })
}

export function generateBranchStats(): BranchStats[] {
  const stats: BranchStats[] = []
  for (const region of regions) {
    for (const branch of branchMap[region]) {
      stats.push({
        branch,
        region,
        totalClaims: rand(50, 300),
        payoutRate: randFloat(30, 75, 1),
        rejectionRate: randFloat(5, 25, 1),
        avgProcessingDays: randFloat(5, 25, 1),
        anomalyCount: rand(0, 8),
      })
    }
  }
  return stats
}

export const policies = generatePolicies(500)
export const claims = generateClaims(300)
export const assessmentRecords = generateAssessmentRecords(80)
export const earlyWarnings = generateEarlyWarnings()
export const monthlyReports = generateMonthlyReports()
export const handlerEfficiency = generateHandlerEfficiency()
export const branchStats = generateBranchStats()
