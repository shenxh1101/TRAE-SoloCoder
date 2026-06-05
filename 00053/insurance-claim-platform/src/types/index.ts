export type UserRole = 'headquarters' | 'region' | 'branch'

export interface User {
  id: string
  name: string
  role: UserRole
  region?: string
  branch?: string
}

export interface Policy {
  id: string
  policyNo: string
  holderName: string
  insuranceType: string
  startDate: string
  endDate: string
  premium: number
  coverage: number
  branch: string
  region: string
}

export type ClaimStatus = 'pending' | 'assessing' | 'approved' | 'rejected' | 'paid'

export interface Claim {
  id: string
  claimNo: string
  policyId: string
  policyNo: string
  holderName: string
  insuranceType: string
  accidentType: string
  accidentDate: string
  reportDate: string
  status: ClaimStatus
  claimAmount: number
  approvedAmount: number
  assessor: string
  handler: string
  branch: string
  region: string
  closeDate?: string
  rejectReason?: string
  assessmentItems?: AssessmentItem[]
}

export interface AssessmentItem {
  id: string
  itemName: string
  category: string
  estimatedCost: number
  actualCost?: number
  deviation?: number
  needsReview: boolean
}

export interface AssessmentRecord {
  id: string
  claimId: string
  claimNo: string
  assessor: string
  assessmentDate: string
  totalEstimated: number
  totalActual: number
  items: AssessmentItem[]
  photos: string[]
  status: 'draft' | 'submitted' | 'reviewed'
  deviationFlag: boolean
}

export interface EarlyWarning {
  id: string
  branch: string
  region: string
  insuranceType: string
  accidentType: string
  anomalyDays: number
  avgAnomalyCount: number
  historicalAvg: number
  threshold: number
  triggerDate: string
  status: 'active' | 'acknowledged' | 'resolved'
  assignee: string
  level: 'high' | 'medium' | 'low'
}

export interface MonthlyReport {
  month: string
  insuranceType: string
  totalClaims: number
  paidClaims: number
  rejectedClaims: number
  pendingClaims: number
  totalClaimAmount: number
  totalPaidAmount: number
  payoutRate: number
  rejectionRate: number
  avgProcessingDays: number
  suspectedFraudCount: number
  suspectedFraudRate: number
  suggestions: string[]
}

export interface HandlerEfficiency {
  handler: string
  branch: string
  totalCases: number
  closedCases: number
  avgProcessingDays: number
  rejectionRate: number
  approvalRate: number
  rejectReasons: { reason: string; count: number }[]
}

export interface BranchStats {
  branch: string
  region: string
  totalClaims: number
  payoutRate: number
  rejectionRate: number
  avgProcessingDays: number
  anomalyCount: number
}

export type Period = 'month' | 'quarter'
