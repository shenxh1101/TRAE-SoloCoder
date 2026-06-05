import { create } from 'zustand'
import type { Period } from '../types'

interface AppState {
  period: Period
  selectedMonth: string
  selectedRegion: string
  selectedBranch: string
  selectedInsuranceType: string | null
  setPeriod: (period: Period) => void
  setSelectedMonth: (month: string) => void
  setSelectedRegion: (region: string) => void
  setSelectedBranch: (branch: string) => void
  setSelectedInsuranceType: (type: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  period: 'month',
  selectedMonth: '2026-05',
  selectedRegion: '全部',
  selectedBranch: '全部',
  selectedInsuranceType: null,
  setPeriod: (period) => set({ period }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedRegion: (region) => set({ selectedRegion: region, selectedBranch: '全部' }),
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
  setSelectedInsuranceType: (type) => set({ selectedInsuranceType: type }),
}))
