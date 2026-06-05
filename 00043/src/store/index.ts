import { create } from 'zustand';
import api from '../services/api';
import type {
  User,
  Pet,
  Package,
  Room,
  Caregiver,
  Booking,
  ScheduleItem,
  DashboardStats,
} from '../types';

interface AppState {
  initialized: boolean;
  currentUser: User | null;
  caregiver: Caregiver | null;
  pets: Pet[];
  rooms: Room[];
  packages: Package[];
  caregivers: Caregiver[];
  bookings: Booking[];
  schedules: ScheduleItem[];
  dashboardStats: DashboardStats | null;
  reminders: any[];
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;

  fetchRooms: () => Promise<void>;
  updateRoomStatus: (roomId: string, status: any) => Promise<void>;

  fetchPackages: () => Promise<void>;
  createPackage: (pkg: any) => Promise<void>;
  addPackage: (pkg: any) => Promise<void>;
  updatePackage: (id: string, pkg: any) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;

  fetchCaregivers: () => Promise<void>;
  updateCaregiverWeight: (id: string, rating: number) => Promise<void>;

  fetchPets: () => Promise<void>;
  createPet: (pet: any) => Promise<void>;
  addPet: (pet: any) => Promise<void>;
  updatePet: (id: string, pet: any) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  fetchBookings: (params?: any) => Promise<void>;
  createBooking: (data: any) => Promise<any>;
  payDeposit: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: string) => Promise<void>;
  addBookingUpdate: (id: string, formData: FormData) => Promise<void>;
  addMessage: (id: string, content: string) => Promise<void>;
  addReview: (id: string, review: any) => Promise<void>;

  fetchSchedules: () => Promise<void>;
  addSchedule: (schedule: any) => Promise<void>;
  updateSchedule: (id: string, schedule: any) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  fetchDashboardStats: () => Promise<void>;
  checkReminders: () => Promise<void>;
  dismissReminder: (id: string) => Promise<void>;

  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  currentUser: null,
  caregiver: null,
  pets: [],
  rooms: [],
  packages: [],
  caregivers: [],
  bookings: [],
  schedules: [],
  dashboardStats: null,
  loading: false,
  error: null,
  reminders: [],

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ initialized: true });
      return;
    }

    set({ loading: true });
    try {
      const result = await api.getCurrentUser();
      set({ currentUser: result.user, caregiver: result.caregiver || null });
      if (result.user) {
        await Promise.all([
          get().fetchRooms(),
          get().fetchPackages(),
          get().fetchCaregivers(),
          get().fetchPets(),
          get().fetchBookings(),
          get().fetchDashboardStats(),
          get().fetchSchedules(),
          get().checkReminders(),
        ]);
      }
    } catch (err: any) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const result = await api.login(email, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      set({
        currentUser: result.user,
        caregiver: result.caregiver || null,
        loading: false,
      });
      await get().init();
    } catch (err: any) {
      set({
        error: err.response?.data?.message || '登录失败',
        loading: false,
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      currentUser: null,
      caregiver: null,
      pets: [],
      bookings: [],
      dashboardStats: null,
      reminders: [],
      initialized: true,
    });
  },

  fetchRooms: async () => {
    try {
      const result = await api.getRooms();
      set({ rooms: result.data });
    } catch (err: any) {
      console.error('获取房间数据失败:', err);
    }
  },

  updateRoomStatus: async (roomId: string, status: any) => {
    try {
      await api.updateRoom(roomId, { status });
      await get().fetchRooms();
    } catch (err: any) {
      console.error('更新房间状态失败:', err);
    }
  },

  fetchPackages: async () => {
    try {
      const result = await api.getPackages();
      set({ packages: result.data });
    } catch (err: any) {
      console.error('获取套餐数据失败:', err);
    }
  },

  createPackage: async (pkg: any) => {
    try {
      await api.createPackage(pkg);
      await get().fetchPackages();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '创建套餐失败' });
      throw err;
    }
  },

  addPackage: async (pkg: any) => {
    await get().createPackage(pkg);
  },

  updatePackage: async (id: string, pkg: any) => {
    try {
      await api.updatePackage(id, pkg);
      await get().fetchPackages();
    } catch (err: any) {
      console.error('更新套餐失败:', err);
    }
  },

  deletePackage: async (id: string) => {
    try {
      await api.deletePackage(id);
      await get().fetchPackages();
    } catch (err: any) {
      console.error('删除套餐失败:', err);
    }
  },

  fetchCaregivers: async () => {
    try {
      const result = await api.getCaregivers();
      set({ caregivers: result.data });
    } catch (err: any) {
      console.error('获取护理员数据失败:', err);
    }
  },

  updateCaregiverWeight: async (id: string, rating: number) => {
    await get().fetchCaregivers();
  },

  fetchPets: async () => {
    try {
      const result = await api.getPets();
      set({ pets: result.data });
    } catch (err: any) {
      console.error('获取宠物数据失败:', err);
    }
  },

  createPet: async (pet: any) => {
    try {
      await api.createPet(pet);
      await get().fetchPets();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '创建宠物档案失败' });
      throw err;
    }
  },

  addPet: async (pet: any) => {
    try {
      await api.createPet(pet);
      await get().fetchPets();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '创建宠物档案失败' });
      throw err;
    }
  },

  updatePet: async (id: string, pet: any) => {
    try {
      await api.updatePet(id, pet);
      await get().fetchPets();
    } catch (err: any) {
      console.error('更新宠物档案失败:', err);
    }
  },

  deletePet: async (id: string) => {
    try {
      await api.deletePet(id);
      await get().fetchPets();
    } catch (err: any) {
      console.error('删除宠物档案失败:', err);
    }
  },

  fetchBookings: async (params?: any) => {
    try {
      const result = await api.getBookings(params);
      set({ bookings: result.data });
    } catch (err: any) {
      console.error('获取订单数据失败:', err);
    }
  },

  createBooking: async (data: any) => {
    try {
      const result = await api.createBooking(data);
      await get().fetchBookings();
      await get().fetchRooms();
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.message || '创建订单失败' });
      throw err;
    }
  },

  payDeposit: async (id: string) => {
    try {
      await api.payDeposit(id);
      await get().fetchBookings();
      await get().fetchRooms();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '支付失败' });
      throw err;
    }
  },

  updateBookingStatus: async (id: string, status: string) => {
    try {
      await api.updateStatus(id, status);
      await get().fetchBookings();
      await get().fetchRooms();
    } catch (err: any) {
      console.error('更新订单状态失败:', err);
    }
  },

  addBookingUpdate: async (id: string, formData: FormData) => {
    try {
      await api.addUpdate(id, formData);
      await get().fetchBookings();
    } catch (err: any) {
      console.error('添加更新失败:', err);
      throw err;
    }
  },

  addMessage: async (id: string, content: string) => {
    try {
      await api.addMessage(id, content);
      await get().fetchBookings();
    } catch (err: any) {
      console.error('发送消息失败:', err);
      throw err;
    }
  },

  addReview: async (id: string, review: any) => {
    try {
      await api.addReview(id, review.rating, review.content);
      await get().fetchBookings();
      await get().fetchCaregivers();
    } catch (err: any) {
      console.error('添加评价失败:', err);
      throw err;
    }
  },

  fetchSchedules: async () => {
    try {
      const result = await api.getSchedules();
      set({ schedules: result.data });
    } catch (err: any) {
      console.error('获取排班数据失败:', err);
    }
  },

  addSchedule: async (schedule: any) => {
    try {
      await api.createSchedule(schedule);
      await get().fetchSchedules();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '创建排班失败' });
      throw err;
    }
  },

  updateSchedule: async (id: string, schedule: any) => {
    try {
      await api.updateSchedule(id, schedule);
      await get().fetchSchedules();
    } catch (err: any) {
      console.error('更新排班失败:', err);
    }
  },

  deleteSchedule: async (id: string) => {
    try {
      await api.deleteSchedule(id);
      await get().fetchSchedules();
    } catch (err: any) {
      console.error('删除排班失败:', err);
    }
  },

  fetchDashboardStats: async () => {
    try {
      const result = await api.getStats();
      set({ dashboardStats: result.stats });
    } catch (err: any) {
      console.error('获取看板数据失败:', err);
    }
  },

  checkReminders: async () => {
    try {
      const result = await api.getReminders({ status: 'pending' });
      set({ reminders: result.data });
    } catch (err: any) {
      console.error('获取提醒数据失败:', err);
    }
  },

  dismissReminder: async (id: string) => {
    try {
      await api.dismissReminder(id);
      await get().checkReminders();
    } catch (err: any) {
      console.error('忽略提醒失败:', err);
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
