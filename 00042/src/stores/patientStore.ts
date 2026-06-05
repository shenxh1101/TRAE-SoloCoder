import { create } from 'zustand'
import type { Patient, TriageResult, Adjustment } from '@/types'

interface PatientState {
  patients: Patient[]
  currentPatient: Patient | null
  totalCount: number
  pendingAdjustments: Adjustment[]
  loading: boolean
  error: string | null
  fetchPatients: (filters?: { status?: string; level?: string; page?: number }) => Promise<void>
  fetchPatient: (id: string) => Promise<void>
  createPatient: (data: Partial<Patient>) => Promise<{ patient: Patient; triageResult: TriageResult } | null>
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>
  updatePatientStatus: (id: string, status: string) => Promise<void>
  adjustAssignment: (id: string, data: { roomId: string; doctorId: string; reason: string }) => Promise<boolean>
  fetchPendingAdjustments: () => Promise<void>
  approveAdjustment: (patientId: string, adjustmentId: string, approved: boolean, approvedBy?: string) => Promise<boolean>
  clearError: () => void
}

const usePatientStore = create<PatientState>((set) => ({
  patients: [],
  currentPatient: null,
  totalCount: 0,
  pendingAdjustments: [],
  loading: false,
  error: null,
  
  fetchPatients: async (filters) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.level) params.set('level', filters.level)
      if (filters?.page) params.set('page', String(filters.page))
      
      const res = await fetch(`/api/patients${params.size ? `?${params}` : ''}`)
      const data = await res.json()
      if (data.success) {
        set({ patients: data.data || [], totalCount: data.total || 0 })
      }
    } catch (e) {
      set({ error: '获取患者列表失败' })
    } finally {
      set({ loading: false })
    }
  },
  
  fetchPatient: async (id) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/patients/${id}`)
      const data = await res.json()
      if (data.success) {
        set({ currentPatient: data.data })
      }
    } catch (e) {
      set({ error: '获取患者信息失败' })
    } finally {
      set({ loading: false })
    }
  },
  
  createPatient: async (data) => {
    set({ loading: true })
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          id_card: data.idCard,
          chief_complaint: data.chiefComplaint,
          temperature: data.temperature,
          heart_rate: data.heartRate,
          respiratory_rate: data.respiratoryRate,
          systolic_bp: data.systolicBP,
          diastolic_bp: data.diastolicBP,
          blood_oxygen: data.bloodOxygen,
          allergy_history: data.allergyHistory,
        }),
      })
      const result = await res.json()
      if (result.success) {
        return { patient: result.patient, triageResult: result.triageResult }
      }
      set({ error: result.error || '创建患者失败' })
      return null
    } catch (e) {
      set({ error: '创建患者失败' })
      return null
    } finally {
      set({ loading: false })
    }
  },
  
  updatePatient: async (id, data) => {
    set({ loading: true })
    try {
      await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          id_card: data.idCard,
          chief_complaint: data.chiefComplaint,
          temperature: data.temperature,
          heart_rate: data.heartRate,
          respiratory_rate: data.respiratoryRate,
          systolic_bp: data.systolicBP,
          diastolic_bp: data.diastolicBP,
          blood_oxygen: data.bloodOxygen,
          allergy_history: data.allergyHistory,
        }),
      })
    } finally {
      set({ loading: false })
    }
  },
  
  updatePatientStatus: async (id, status) => {
    try {
      await fetch(`/api/patients/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (e) {
      console.error(e)
    }
  },
  
  adjustAssignment: async (id, data) => {
    try {
      const res = await fetch(`/api/patients/${id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_room_id: data.roomId,
          new_doctor_id: data.doctorId,
          reason: data.reason,
        }),
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },

  fetchPendingAdjustments: async () => {
    try {
      const res = await fetch('/api/patients/adjustments/pending')
      const data = await res.json()
      if (data.success) {
        set({ pendingAdjustments: data.data || [] })
      }
    } catch (e) {
      console.error(e)
    }
  },
  
  approveAdjustment: async (patientId, adjustmentId, approved, approvedBy) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adjustment_id: adjustmentId, 
          approved,
          approved_by: approvedBy,
        }),
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },
  
  clearError: () => set({ error: null }),
}))

export default usePatientStore
