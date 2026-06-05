import { create } from 'zustand';
import type { User } from '../../shared/types';
import { post, get } from '@/utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email, password) => {
    const res = await post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    set({ token: res.token, user: res.user, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await post<{ token: string; user: User }>('/auth/register', data);
    localStorage.setItem('token', res.token);
    set({ token: res.token, user: res.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const user = await get<User>('/auth/me');
    set({ user, isAuthenticated: true });
  },
}));

export default useAuthStore;
