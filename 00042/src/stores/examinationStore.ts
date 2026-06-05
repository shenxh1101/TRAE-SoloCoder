import { create } from 'zustand'
import type { Examination } from '@/types'

interface ExaminationState {
  examinations: Examination[]
  loading: boolean
  fetchExaminations: (patientId?: string) => Promise<void>
  createExamination: (data: { patientId: string; type: string; name: string }) => Promise<boolean>
  submitResult: (id: string, result: string, resultValue: number) => Promise<Examination | null>
}

const useExaminationStore = create<ExaminationState>((set) => ({
  examinations: [],
  loading: false,
  
  fetchExaminations: async (patientId) => {
    set({ loading: true })
    try {
      const url = patientId ? `/api/examinations?patientId=${patientId}` : '/api/examinations'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) set({ examinations: data.data })
    } catch (e) {
      console.error(e)
    } finally {
      set({ loading: false })
    }
  },
  
  createExamination: async (data) => {
    try {
      const res = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: data.patientId,
          type: data.type,
          name: data.name,
        }),
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },
  
  submitResult: async (id, result, resultValue) => {
    try {
      const res = await fetch(`/api/examinations/${id}/result`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, result_value: resultValue }),
      })
      const data = await res.json()
      if (data.success) return data.data
      return null
    } catch {
      return null
    }
  },
}))

export default useExaminationStore
