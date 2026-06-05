import apiClient from './apiClient';
import type {
  Pet,
  Package,
  Room,
  Caregiver,
  Booking,
  ScheduleItem,
  DashboardStats,
  User,
} from '../types';

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  caregiver?: Caregiver;
}

export interface BookingCreateData {
  petId: string;
  packageId: string;
  roomId: string;
  caregiverId: string | null;
  startDate: string;
  endDate: string;
  specialInstructions?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    const data = response.data;
    const { token, ...user } = data;
    const userObj = user as User;
    const caregiver: Caregiver | undefined = userObj.role === 'caregiver' ? userObj as unknown as Caregiver : undefined;
    return { success: true, token, user: userObj, caregiver };
  },

  register: async (name: string, email: string, password: string, role: string = 'user'): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/register', { name, email, password, role });
    const data = response.data;
    const { token, ...user } = data;
    const userObj = user as User;
    return { success: true, token, user: userObj };
  },

  getCurrentUser: async (): Promise<{ success: boolean; user: User; caregiver?: Caregiver }> => {
    const response = await apiClient.get('/auth/me');
    const userObj = response.data as User;
    const caregiver: Caregiver | undefined = userObj.role === 'caregiver' ? userObj as unknown as Caregiver : undefined;
    return { success: true, user: userObj, caregiver };
  },
};

export const petApi = {
  getPets: async (): Promise<{ success: boolean; count: number; data: Pet[] }> => {
    const response = await apiClient.get('/pets');
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getAllPets: async (): Promise<{ success: boolean; count: number; data: (Pet & { ownerName?: string; ownerEmail?: string })[] }> => {
    const response = await apiClient.get('/pets/all');
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getPet: async (id: string): Promise<{ success: boolean; data: Pet }> => {
    const response = await apiClient.get(`/pets/${id}`);
    return { success: true, data: response.data };
  },

  createPet: async (petData: Omit<Pet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data: Pet }> => {
    const response = await apiClient.post('/pets', petData);
    return { success: true, data: response.data };
  },

  updatePet: async (id: string, petData: Partial<Pet>): Promise<{ success: boolean; data: Pet }> => {
    const response = await apiClient.put(`/pets/${id}`, petData);
    return { success: true, data: response.data };
  },

  deletePet: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/pets/${id}`);
    return { success: true, message: response.data?.message || '删除成功' };
  },
};

export const packageApi = {
  getPackages: async (): Promise<{ success: boolean; count: number; data: Package[] }> => {
    const response = await apiClient.get('/packages');
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getPackage: async (id: string): Promise<{ success: boolean; data: Package }> => {
    const response = await apiClient.get(`/packages/${id}`);
    return { success: true, data: response.data };
  },

  recommendPackages: async (petId: string): Promise<{ success: boolean; data: (Package & { score: number; reasons: string[]; availableRooms: number; rooms: Room[] })[] }> => {
    const response = await apiClient.get(`/packages/recommend/${petId}`);
    const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return { success: true, data };
  },

  createPackage: async (data: Omit<Package, 'id'>): Promise<{ success: boolean; data: Package }> => {
    const response = await apiClient.post('/packages', data);
    return { success: true, data: response.data };
  },

  updatePackage: async (id: string, data: Partial<Package>): Promise<{ success: boolean; data: Package }> => {
    const response = await apiClient.put(`/packages/${id}`, data);
    return { success: true, data: response.data };
  },

  deletePackage: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/packages/${id}`);
    return { success: true, message: response.data?.message || '删除成功' };
  },
};

export const roomApi = {
  getRooms: async (params?: { status?: string; type?: string }): Promise<{ success: boolean; count: number; data: Room[] }> => {
    const response = await apiClient.get('/rooms', { params });
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getRoom: async (id: string): Promise<{ success: boolean; data: Room }> => {
    const response = await apiClient.get(`/rooms/${id}`);
    return { success: true, data: response.data };
  },

  getAvailableRooms: async (params?: { startDate?: string; endDate?: string; packageId?: string }): Promise<{ success: boolean; count: number; data: Room[] }> => {
    const response = await apiClient.get('/rooms/available', { params });
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  createRoom: async (data: Omit<Room, 'id'>): Promise<{ success: boolean; data: Room }> => {
    const response = await apiClient.post('/rooms', data);
    return { success: true, data: response.data };
  },

  updateRoom: async (id: string, data: Partial<Room>): Promise<{ success: boolean; data: Room }> => {
    const response = await apiClient.put(`/rooms/${id}`, data);
    return { success: true, data: response.data };
  },

  deleteRoom: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/rooms/${id}`);
    return { success: true, message: response.data?.message || '删除成功' };
  },
};

export const caregiverApi = {
  getCaregivers: async (): Promise<{ success: boolean; count: number; data: Caregiver[] }> => {
    const response = await apiClient.get('/caregivers');
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getCaregiver: async (id: string): Promise<{ success: boolean; data: Caregiver }> => {
    const response = await apiClient.get(`/caregivers/${id}`);
    return { success: true, data: response.data };
  },

  assignCaregiver: async (petId: string, startDate: string, endDate: string): Promise<{ success: boolean; recommended: Caregiver | null; alternatives?: Caregiver[]; data: Caregiver[] }> => {
    const response = await apiClient.get('/caregivers/assign', { params: { petId, startDate, endDate } });
    const result = response.data;
    const recommended = result.recommended || null;
    const alternatives = result.alternatives || [];
    const data = recommended ? [recommended, ...alternatives] : alternatives;
    return { success: true, recommended, alternatives, data };
  },

  updateCaregiver: async (id: string, data: Partial<Caregiver>): Promise<{ success: boolean; data: Caregiver }> => {
    const response = await apiClient.put(`/caregivers/${id}`, data);
    return { success: true, data: response.data };
  },

  createCaregiver: async (data: Omit<Caregiver, 'id' | 'reviewCount'>): Promise<{ success: boolean; data: Caregiver }> => {
    const response = await apiClient.post('/caregivers', data);
    return { success: true, data: response.data };
  },

  deleteCaregiver: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/caregivers/${id}`);
    return { success: true, message: response.data?.message || '删除成功' };
  },

  getSchedules: async (params?: { caregiverId?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; count: number; data: ScheduleItem[] }> => {
    const response = await apiClient.get('/caregivers/schedules', { params });
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  createSchedule: async (data: Omit<ScheduleItem, 'id'>): Promise<{ success: boolean; data: ScheduleItem }> => {
    const response = await apiClient.post('/caregivers/schedules', data);
    return { success: true, data: response.data };
  },

  updateSchedule: async (id: string, data: Partial<ScheduleItem>): Promise<{ success: boolean; data: ScheduleItem }> => {
    const response = await apiClient.put(`/caregivers/schedules/${id}`, data);
    return { success: true, data: response.data };
  },

  deleteSchedule: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/caregivers/schedules/${id}`);
    return { success: true, message: response.data?.message || '删除成功' };
  },
};

export const bookingApi = {
  getBookings: async (params?: { status?: string; startDate?: string; endDate?: string; caregiverId?: string; packageId?: string }): Promise<{ success: boolean; count: number; data: Booking[] }> => {
    const response = await apiClient.get('/bookings', { params });
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  getBooking: async (id: string): Promise<{ success: boolean; data: Booking }> => {
    const response = await apiClient.get(`/bookings/${id}`);
    return { success: true, data: response.data };
  },

  createBooking: async (data: BookingCreateData): Promise<{ success: boolean; data: Booking; pricing: { days: number; pricePerDay: number; totalPrice: number; deposit: number } }> => {
    const response = await apiClient.post('/bookings', data);
    const booking = response.data;
    const days = Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
    return {
      success: true,
      data: booking,
      pricing: {
        days: Math.max(1, days),
        pricePerDay: booking.totalPrice / Math.max(1, days),
        totalPrice: booking.totalPrice,
        deposit: booking.deposit,
      },
    };
  },

  payDeposit: async (id: string, paymentMethod: string = 'alipay'): Promise<{ success: boolean; message: string; payment: any; data: Booking }> => {
    const response = await apiClient.post(`/bookings/${id}/pay`, { paymentMethod });
    const booking = response.data;
    return {
      success: true,
      message: '支付成功',
      payment: { transactionId: booking.transactionId, status: 'success' },
      data: booking,
    };
  },

  updateStatus: async (id: string, status: string): Promise<{ success: boolean; data: Booking }> => {
    const response = await apiClient.put(`/bookings/${id}/status`, { status });
    return { success: true, data: response.data };
  },

  addUpdate: async (id: string, formData: FormData): Promise<{ success: boolean; data: Booking; newUpdate: any }> => {
    const response = await apiClient.post(`/bookings/${id}/updates`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, data: response.data, newUpdate: response.data };
  },

  addMessage: async (id: string, content: string): Promise<{ success: boolean; data: Booking; newMessage: any }> => {
    const response = await apiClient.post(`/bookings/${id}/messages`, { content });
    return { success: true, data: response.data, newMessage: response.data };
  },

  addReview: async (id: string, rating: number, content?: string): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.post(`/bookings/${id}/review`, { rating, content });
    return { success: true, data: response.data };
  },

  getReminders: async (params?: { status?: string }): Promise<{ success: boolean; count: number; data: any[] }> => {
    const response = await apiClient.get('/bookings/reminders', { params });
    const data = Array.isArray(response.data) ? response.data : [];
    return { success: true, count: data.length, data };
  },

  dismissReminder: async (id: string): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.put(`/bookings/reminders/${id}/dismiss`);
    return { success: true, data: response.data };
  },
};

export const dashboardApi = {
  getStats: async (): Promise<{ success: boolean; stats: DashboardStats }> => {
    const response = await apiClient.get('/dashboard/stats');
    return { success: true, stats: response.data?.stats || response.data };
  },

  getRevenueReport: async (params?: { year?: number; month?: number; startDate?: string; endDate?: string }): Promise<any> => {
    const response = await apiClient.get('/dashboard/revenue', { params });
    return response.data;
  },

  exportRevenueCSV: async (params?: { year?: number; month?: number; startDate?: string; endDate?: string }): Promise<Blob> => {
    const response = await apiClient.get('/dashboard/revenue/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportCaregiverCSV: async (params?: { year?: number; month?: number; startDate?: string; endDate?: string }): Promise<Blob> => {
    const response = await apiClient.get('/dashboard/caregiver/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export const calculatePrice = (pricePerDay: number, startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = pricePerDay * Math.max(1, days);
  const deposit = totalPrice * 0.3;
  return { days: Math.max(1, days), totalPrice, deposit, pricePerDay };
};

export const api = {
  ...authApi,
  ...petApi,
  ...packageApi,
  ...roomApi,
  ...caregiverApi,
  ...bookingApi,
  ...dashboardApi,
  calculatePrice,
};

export default api;
