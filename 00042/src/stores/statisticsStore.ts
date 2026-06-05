import { create } from 'zustand'
import type { StatisticsOverview, DepartmentStats, DiagnosisStats, MonthlyReportData } from '@/types'

interface StatisticsState {
  overview: StatisticsOverview | null
  departmentStats: DepartmentStats[]
  diagnosisStats: DiagnosisStats[]
  monthlyReport: MonthlyReportData | null
  loading: boolean
  fetchOverview: () => Promise<void>
  fetchByDepartment: () => Promise<void>
  fetchByDiagnosis: () => Promise<void>
  fetchMonthlyReport: (month?: string) => Promise<void>
  fetchAll: () => Promise<void>
}

const useStatisticsStore = create<StatisticsState>((set) => ({
  overview: null,
  departmentStats: [],
  diagnosisStats: [],
  monthlyReport: null,
  loading: false,
  
  fetchOverview: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/statistics/overview')
      const data = await res.json()
      if (data.success) set({ overview: data.data })
    } catch (e) {
      console.error(e)
    } finally {
      set({ loading: false })
    }
  },
  
  fetchByDepartment: async () => {
    try {
      const res = await fetch('/api/statistics/by-department')
      const data = await res.json()
      if (data.success) set({ departmentStats: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchByDiagnosis: async () => {
    try {
      const res = await fetch('/api/statistics/by-diagnosis')
      const data = await res.json()
      if (data.success) set({ diagnosisStats: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchMonthlyReport: async (month) => {
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetch(`/api/statistics/monthly-report${params}`)
      const data = await res.json()
      if (data.success) set({ monthlyReport: data.data })
    } catch (e) {
      console.error(e)
    }
  },
  
  fetchAll: async () => {
    set({ loading: true })
    const state = useStatisticsStore.getState()
    await Promise.all([
      state.fetchOverview(),
      state.fetchByDepartment(),
      state.fetchByDiagnosis(),
    ])
    set({ loading: false })
  },
}))

export default useStatisticsStore
