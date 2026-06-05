import { api } from './api';
import type { User, UserRole } from '../types';

export type { UserRole };

export interface LoginRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

const ROLE_CREDENTIALS: Record<UserRole, { username: string; password: string }> = {
  doctor: { username: 'doctor', password: 'password123' },
  department_director: { username: 'director', password: 'password123' },
  blood_bank_director: { username: 'blood_bank_director', password: 'password123' },
  nurse: { username: 'nurse', password: 'password123' },
  admin: { username: 'admin', password: 'password123' },
};

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);
  saveToken(response.token);
  saveUser(response.user);
  return response;
}

export async function quickLogin(role: UserRole): Promise<LoginResponse> {
  const credentials = ROLE_CREDENTIALS[role];
  return await login({ ...credentials, role });
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export async function fetchCurrentUser(): Promise<User> {
  return await api.get<User>('/auth/me');
}

export function getCurrentUser(): User | null {
  return getUser();
}

export function saveToken(token: string): void {
  localStorage.setItem('token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function saveUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export const authService = {
  login,
  quickLogin,
  logout,
  getCurrentUser,
  fetchCurrentUser,
  saveToken,
  getToken,
  saveUser,
  getUser,
};
