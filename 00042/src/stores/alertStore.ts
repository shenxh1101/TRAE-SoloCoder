import { create } from 'zustand'
import type { Alert } from '@/types'

interface AlertState {
  alerts: Alert[]
  loading: boolean
  fetchAlerts: () => Promise<void>
  acknowledgeAlert: (id: string) => Promise<void>
}

const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  loading: false,
  
  fetchAlerts: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      if (data.success) set({ alerts: data.data })
    } catch (e) {
      console.error(e)
    } finally {
      set({ loading: false })
    }
  },
  
  acknowledgeAlert: async (id) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PUT' })
      set((state) => ({
        alerts: state.alerts.map((a) => a.id === id ? { ...a, acknowledged: true } : a),
      }))
    } catch (e) {
      console.error(e)
    }
  },
}))

export default useAlertStore
