import { create } from 'zustand'
import type { Observation, BillingSummary, BillingItem } from '@/types'

interface ObservationState {
  observations: Observation[]
  loading: boolean
  fetchObservations: () => Promise<void>
  startObservation: (patientId: string, bedId: string) => Promise<boolean>
  endObservation: (id: string) => Promise<boolean>
}

interface BillingState {
  billingItems: BillingItem[]
  summary: BillingSummary | null
  loading: boolean
  fetchBilling: (patientId: string) => Promise<void>
  settleBilling: (patientId: string, paymentMethod: string, insuranceCovered?: number) => Promise<boolean>
}

export const useObservationStore = create<ObservationState>((set) => ({
  observations: [],
  loading: false,
  
  fetchObservations: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/observations')
      const data = await res.json()
      if (data.success) set({ observations: data.data })
    } catch (e) {
      console.error(e)
    } finally {
      set({ loading: false })
    }
  },
  
  startObservation: async (patientId, bedId) => {
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, bed_id: bedId }),
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },
  
  endObservation: async (id) => {
    try {
      const res = await fetch(`/api/observations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },
}))

export const useBillingStore = create<BillingState>((set) => ({
  billingItems: [],
  summary: null,
  loading: false,
  
  fetchBilling: async (patientId) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/observations/billing/${patientId}`)
      const data = await res.json()
      if (data.success) {
        set({ summary: data.data, billingItems: data.data?.items || [] })
      }
    } catch (e) {
      console.error(e)
    } finally {
      set({ loading: false })
    }
  },
  
  settleBilling: async (patientId, paymentMethod, insuranceCovered = 0) => {
    try {
      const res = await fetch(`/api/observations/billing/${patientId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payment_method: paymentMethod,
          insurance_covered: insuranceCovered,
        }),
      })
      const result = await res.json()
      return result.success
    } catch {
      return false
    }
  },
}))
