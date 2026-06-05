import { create } from 'zustand'
import type { Room, Doctor, Equipment, Bed, ResourceOverview } from '@/types'

interface ResourceState {
  rooms: Room[]
  doctors: Doctor[]
  equipment: Equipment[]
  beds: Bed[]
  overview: ResourceOverview | null
  loading: boolean
  fetchRooms: () => Promise<void>
  fetchDoctors: () => Promise<void>
  fetchEquipment: () => Promise<void>
  fetchBeds: () => Promise<void>
  fetchOverview: () => Promise<void>
  fetchAll: () => Promise<void>
  updateDoctorStatus: (id: string, status: string) => Promise<void>
}

const useResourceStore = create<ResourceState>((set) => ({
  rooms: [],
  doctors: [],
  equipment: [],
  beds: [],
  overview: null,
  loading: false,
  
  fetchRooms: async () => {
    try {
      const res = await fetch('/api/resources/rooms')
      const data = await res.json()
      if (data.success) set({ rooms: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchDoctors: async () => {
    try {
      const res = await fetch('/api/resources/doctors')
      const data = await res.json()
      if (data.success) set({ doctors: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchEquipment: async () => {
    try {
      const res = await fetch('/api/resources/equipment')
      const data = await res.json()
      if (data.success) set({ equipment: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchBeds: async () => {
    try {
      const res = await fetch('/api/resources/beds')
      const data = await res.json()
      if (data.success) set({ beds: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchOverview: async () => {
    try {
      const res = await fetch('/api/resources/overview')
      const data = await res.json()
      if (data.success) set({ overview: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchAll: async () => {
    set({ loading: true })
    const state = useResourceStore.getState()
    await Promise.all([
      state.fetchRooms(),
      state.fetchDoctors(),
      state.fetchEquipment(),
      state.fetchBeds(),
      state.fetchOverview(),
    ])
    set({ loading: false })
  },
  
  updateDoctorStatus: async (id, status) => {
    try {
      await fetch(`/api/resources/doctors/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (e) {
      console.error(e)
    }
  },
}))

export default useResourceStore
