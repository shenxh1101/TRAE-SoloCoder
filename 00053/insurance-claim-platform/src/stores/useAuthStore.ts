import { create } from 'zustand'
import type { User, UserRole } from '../types'

interface AuthState {
  user: User | null
  isLoggedIn: boolean
  setUser: (user: User | null) => void
  setIsLoggedIn: (val: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  setUser: (user) => set({ user }),
  setIsLoggedIn: (val) => set({ isLoggedIn: val }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, isLoggedIn: false })
  },
}))
