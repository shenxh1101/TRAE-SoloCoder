export type UserRole = 'nurse' | 'doctor' | 'director' | 'cashier' | 'admin'
export type TriageLevel = 'red' | 'yellow' | 'green'
export type PatientStatus = 'waiting' | 'treating' | 'examining' | 'observation' | 'transfer' | 'discharged'
export type RoomType = 'rescue' | 'emergency' | 'general'
export type RoomStatus = 'available' | 'busy' | 'full' | 'maintenance'
export type DoctorStatus = 'available' | 'busy' | 'off'
export type EquipmentType = 'lab' | 'imaging' | 'other'
export type EquipmentStatus = 'idle' | 'in_use' | 'maintenance'
export type BedStatus = 'empty' | 'occupied'
export type ExamType = 'lab' | 'imaging'
export type ExamStatus = 'ordered' | 'in_progress' | 'completed'
export type BillingCategory = 'drug' | 'examination' | 'observation' | 'other'
export type PaymentMethod = 'cash' | 'insurance' | 'credit_card'
export type AlertType = 'timeout' | 'critical_value' | 'bed_capacity' | 'adjustment'
export type AlertLevel = 'warning' | 'urgent' | 'critical'
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  department?: string
}

export interface Patient {
  id: string
  name: string
  idCard: string
  chiefComplaint: string
  temperature: number | null
  heartRate: number | null
  respiratoryRate: number | null
  systolicBP: number | null
  diastolicBP: number | null
  bloodOxygen: number | null
  allergyHistory: string
  triageLevel: TriageLevel | null
  status: PatientStatus
  assignedRoomId: string | null
  assignedDoctorId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  roomName?: string
  doctorName?: string
  waitingMinutes?: number
}

export interface Room {
  id: string
  name: string
  type: RoomType
  capacity: number
  currentLoad: number
  status: RoomStatus
}

export interface Doctor {
  id: string
  name: string
  title: string
  specialty: string
  roomId: string | null
  status: DoctorStatus
  roomName?: string
}

export interface Equipment {
  id: string
  name: string
  type: EquipmentType
  roomId: string | null
  status: EquipmentStatus
}

export interface Bed {
  id: string
  number: string
  status: BedStatus
  patientId: string | null
  occupiedAt: string | null
  patientName?: string
}

export interface Examination {
  id: string
  patientId: string
  type: ExamType
  name: string
  status: ExamStatus
  result: string | null
  resultValue: number | null
  criticalValue: boolean
  orderedAt: string
  completedAt: string | null
  patientName?: string
}

export interface Observation {
  id: string
  patientId: string
  bedId: string
  startedAt: string
  endedAt: string | null
  bedFee: number
  patientName?: string
  bedNumber?: string
  observationHours?: number
}

export interface BillingItem {
  id: string
  patientId: string
  category: BillingCategory
  name: string
  amount: number
  createdAt: string
}

export interface BillingSummary {
  items: BillingItem[]
  totalAmount: number
  hasSettled: boolean
  settlement?: Settlement
}

export interface Settlement {
  id: string
  patientId: string
  totalAmount: number
  paymentMethod: PaymentMethod
  insuranceCovered: number
  selfPaid: number
  settledAt: string
  invoiceNumber: string
}

export interface Alert {
  id: string
  type: AlertType
  level: AlertLevel
  message: string
  patientId: string | null
  acknowledged: boolean
  createdAt: string
  patientName?: string
}

export interface Adjustment {
  id: string
  patientId: string
  originalRoomId: string | null
  newRoomId: string | null
  originalDoctorId: string | null
  newDoctorId: string | null
  reason: string
  status: AdjustmentStatus
  approvedBy: string | null
  createdAt: string
  patientName?: string
  originalRoomName?: string
  newRoomName?: string
  originalDoctorName?: string
  newDoctorName?: string
}

export interface ResourceOverview {
  totalRooms: number
  availableRooms: number
  busyRooms: number
  fullRooms: number
  totalDoctors: number
  availableDoctors: number
  busyDoctors: number
  offDoctors: number
  totalBeds: number
  occupiedBeds: number
  emptyBeds: number
  totalEquipment: number
  idleEquipment: number
  inUseEquipment: number
  waitingPatients: number
  treatingPatients: number
  examiningPatients: number
  observationPatients: number
}

export interface TriageResult {
  level: TriageLevel
  roomId: string
  roomName: string
  doctorId: string
  doctorName: string
  reasoning: string
}

export interface StatisticsOverview {
  totalPatients: number
  avgStayMinutes: number
  criticalRatio: number
  mortalityRate: number
  redCount: number
  yellowCount: number
  greenCount: number
  dailyCounts: DailyCount[]
  totalRevenue: number
  totalAlerts: number
}

export interface DailyCount {
  date: string
  count: number
}

export interface DepartmentStats {
  department: string
  patientCount: number
  avgStay: number
  criticalRatio: number
  mortalityCount: number
}

export interface DiagnosisStats {
  diagnosis: string
  count: number
  criticalRatio: number
  avgStay: number
}

export interface MonthlyReportData {
  month: string
  totalPatients: number
  avgStayMinutes: number
  criticalRatio: number
  mortalityRate: number
  departmentStats: DepartmentStats[]
  dailyTrend: DailyCount[]
}

export interface Invoice {
  invoiceNumber: string
  patientName: string
  patientIdCard: string
  items: BillingItem[]
  totalAmount: number
  insuranceCovered: number
  selfPaid: number
  paymentMethod: string
  issuedAt: string
}
