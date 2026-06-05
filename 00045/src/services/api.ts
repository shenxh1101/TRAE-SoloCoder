import api from './request';
import { User, Book, BorrowRecord, Reservation, Fine, Message, MonthlyStats } from '@/types';

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const authApi = {
  login: (data: LoginData) => api.post<LoginResponse>('/auth/login', data),
  getCurrentUser: () => api.get<User>('/auth/me'),
};

export const userApi = {
  getUsers: (params?: { page?: number; pageSize?: number; role?: string; search?: string }) =>
    api.get<PaginatedResponse<User>>(`/users?${new URLSearchParams(params as any).toString()}`),
  getUser: (id: string) => api.get<User>(`/users/${id}`),
  createUser: (data: Partial<User>) => api.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User>) => api.put<User>(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const bookApi = {
  getBooks: (params?: { page?: number; pageSize?: number; category?: string; search?: string; available?: boolean }) =>
    api.get<PaginatedResponse<Book>>(`/books?${new URLSearchParams(params as any).toString()}`),
  getBook: (id: string) => api.get<Book>(`/books/${id}`),
  createBook: (data: Partial<Book>) => api.post<Book>('/books', data),
  updateBook: (id: string, data: Partial<Book>) => api.put<Book>(`/books/${id}`, data),
  deleteBook: (id: string) => api.delete(`/books/${id}`),
  importBooks: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postForm('/books/import', formData);
  },
  exportBooks: () => api.get<Blob>('/books/export'),
};

export const borrowApi = {
  getBorrows: (params?: { page?: number; pageSize?: number; status?: string; userId?: string; bookId?: string }) =>
    api.get<PaginatedResponse<BorrowRecord>>(`/borrows?${new URLSearchParams(params as any).toString()}`),
  getMyBorrows: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<BorrowRecord>>(`/borrows/my?${new URLSearchParams(params as any).toString()}`),
  checkEligibility: (userId: string) => api.get<{ eligible: boolean; reason?: string }>(`/borrows/eligibility/${userId}`),
  borrowBook: (data: { userId: string; bookId: string }) => api.post<BorrowRecord>('/borrows', data),
  returnBook: (id: string, damageLevel: string) => api.post<BorrowRecord>(`/borrows/${id}/return`, { damageLevel }),
  renewBook: (id: string) => api.post<BorrowRecord>(`/borrows/${id}/renew`),
};

export const reservationApi = {
  getReservations: (params?: { page?: number; pageSize?: number; status?: string; userId?: string; bookId?: string }) =>
    api.get<PaginatedResponse<Reservation>>(`/reservations?${new URLSearchParams(params as any).toString()}`),
  getMyReservations: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<Reservation>>(`/reservations/my?${new URLSearchParams(params as any).toString()}`),
  createReservation: (bookId: string) => api.post<Reservation>('/reservations', { bookId }),
  cancelReservation: (id: string) => api.post(`/reservations/${id}/cancel`),
  completeReservation: (id: string) => api.post(`/reservations/${id}/complete`),
};

export const fineApi = {
  getFines: (params?: { page?: number; pageSize?: number; status?: string; userId?: string }) =>
    api.get<PaginatedResponse<Fine>>(`/fines?${new URLSearchParams(params as any).toString()}`),
  getMyFines: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<Fine>>(`/fines/my?${new URLSearchParams(params as any).toString()}`),
  payFine: (id: string) => api.post<Fine>(`/fines/${id}/pay`),
};

export const messageApi = {
  getMessages: (params?: { page?: number; pageSize?: number; unread?: boolean }) =>
    api.get<{ data: Message[]; total: number; unreadCount: number; page: number; pageSize: number }>(
      `/messages?${new URLSearchParams(params as any).toString()}`
    ),
  markAsRead: (id: string) => api.post<Message>(`/messages/${id}/read`),
  markAllAsRead: () => api.post('/messages/read-all'),
  deleteMessage: (id: string) => api.delete(`/messages/${id}`),
};

export const statsApi = {
  getDashboardStats: () => api.get('/stats/dashboard'),
  getPopularBooks: (limit?: number) => api.get(`/stats/popular-books?limit=${limit || 10}`),
  getReaderTypeStats: () => api.get('/stats/reader-types'),
  getOverdueRate: () => api.get('/stats/overdue-rate'),
  getDailyBorrows: (days?: number) => api.get(`/stats/daily-borrows?days=${days || 7}`),
  getMonthlyStats: (month?: string) => api.get<MonthlyStats>(`/stats/monthly?month=${month || ''}`),
};
