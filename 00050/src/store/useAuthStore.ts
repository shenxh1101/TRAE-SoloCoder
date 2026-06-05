import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { mockUsers } from '../utils/mockData';
import { generateId } from '../utils/helpers';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'role'> & { role: UserRole }) => User;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  users: mockUsers,

  login: (email: string, role: UserRole) => {
    const user = get().users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
    );

    if (user) {
      set({ currentUser: user, isAuthenticated: true });
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
    localStorage.removeItem('currentUser');
  },

  register: (userData) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
    };

    set((state) => ({
      users: [...state.users, newUser],
      currentUser: newUser,
      isAuthenticated: true,
    }));

    localStorage.setItem('currentUser', JSON.stringify(newUser));
    return newUser;
  },

  updateUser: (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...updates };
    set((state) => ({
      currentUser: updatedUser,
      users: state.users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
    }));

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  },
}));

export const initializeAuth = () => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser) as User;
      useAuthStore.setState({ currentUser: user, isAuthenticated: true });
    } catch {
      localStorage.removeItem('currentUser');
    }
  }
};
