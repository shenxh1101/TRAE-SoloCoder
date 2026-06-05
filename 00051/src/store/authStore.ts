import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const response = await authApi.login(username, password);
      
      const { user, token } = response;
      
      localStorage.setItem('fleet_token', token);
      localStorage.setItem('fleet_currentUser', JSON.stringify(user));
      
      set({ user, loading: false });
      return true;
    } catch (error: any) {
      set({ loading: false, error: error.message || '登录失败，请重试' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_currentUser');
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

const initUser = () => {
  const userStr = localStorage.getItem('fleet_currentUser');
  const token = localStorage.getItem('fleet_token');
  
  if (userStr && token) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({ user });
    } catch {
      localStorage.removeItem('fleet_currentUser');
      localStorage.removeItem('fleet_token');
    }
  }
};

initUser();
