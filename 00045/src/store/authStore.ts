import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authApi } from '@/services/api';
import { wsService } from '@/services/websocket';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (username, password) => {
        try {
          const response = await authApi.login({ username, password });
          localStorage.setItem('token', response.token);
          set({ user: response.user, token: response.token });
          wsService.connect(response.user.id);
          return true;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },
      logout: () => {
        localStorage.removeItem('token');
        wsService.disconnect();
        set({ user: null, token: null });
      },
    }),
    {
      name: 'library-auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          localStorage.setItem('token', state.token || '');
          wsService.connect(state.user.id);
        }
      },
    }
  )
);
