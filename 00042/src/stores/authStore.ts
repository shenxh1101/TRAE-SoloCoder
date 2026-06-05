import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        localStorage.setItem('ed_user', JSON.stringify(data.user))
        set({ user: data.user, isAuthenticated: true })
        return true
      }
      return false
    } catch {
      return false
    }
  },
  
  logout: () => {
    localStorage.removeItem('ed_user')
    set({ user: null, isAuthenticated: false })
  },
  
  checkAuth: () => {
    const saved = localStorage.getItem('ed_user')
    if (saved) {
      try {
        const user = JSON.parse(saved)
        set({ user, isAuthenticated: true })
      } catch {
        localStorage.removeItem('ed_user')
      }
    }
  },
}))

export default useAuthStore
