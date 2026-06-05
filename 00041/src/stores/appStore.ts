import { create } from 'zustand';

export interface ServiceType {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePrice: number;
  duration: number;
}

export interface Staff {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  rating: number;
  totalOrders: number;
  skillTags: string[];
  serviceAreas: string[];
  lat?: number;
  lng?: number;
  status: 'idle' | 'busy' | 'off';
  currentOrders?: number;
  distance?: number;
  score?: number;
  estimatedArrivalMin?: number;
  schedules?: ScheduleRule[];
}

export interface ScheduleRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type OrderStatus = 'pending' | 'assigned' | 'checked_in' | 'in_service' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  serviceTypeId: string;
  staffId: string | null;
  status: OrderStatus;
  address: string;
  lat: number | null;
  lng: number | null;
  qrCode: string;
  checkInTime: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  price: number;
  notes: string;
  createdAt: string;
  staffName?: string;
  staffPhone?: string;
  staffAvatar?: string;
  staffRating?: number;
  staffLat?: number;
  staffLng?: number;
  serviceTypeName?: string;
  serviceTypeIcon?: string;
  serviceDuration?: number;
  userName?: string;
  userPhone?: string;
}

export interface Review {
  id: string;
  orderId: string;
  userId: string;
  staffId: string;
  rating: number;
  comment: string;
  photos: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  orderId: string;
  senderType: 'user' | 'staff' | 'system';
  content: string;
  createdAt: string;
}

export interface DashboardStats {
  pendingCount: number;
  activeCount: number;
  completedToday: number;
  avgRating: number;
}

export interface MonthlyReport {
  month: string;
  totalOrders: number;
  completedOrders: number;
  avgRating: number;
  revenue: number;
}

export interface StaffReport {
  staffId: string;
  staffName: string;
  totalOrders: number;
  completedOrders: number;
  avgRating: number;
  orders: Order[];
}

export interface UserCoupon {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  reason: string;
  code: string;
  used: number;
  createdAt: string;
}

export interface OrderNotification {
  notifications: any[];
  coupons: UserCoupon[];
}

interface AppState {
  currentUserId: string;
  serviceTypes: ServiceType[];
  orders: Order[];
  staff: Staff[];
  dashboardStats: DashboardStats | null;
  activeOrders: Order[];
  loading: Record<string, boolean>;

  fetchServiceTypes: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchActiveOrders: () => Promise<void>;
  createOrder: (data: Partial<Order>) => Promise<Order>;
  fetchOrder: (id: string) => Promise<Order>;
  checkinOrder: (id: string) => Promise<void>;
  startOrder: (id: string) => Promise<void>;
  completeOrder: (id: string) => Promise<void>;
  fetchRecommendedStaff: (serviceTypeId: string) => Promise<Staff[]>;
  fetchStaff: () => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  fetchAdminOrders: (params?: Record<string, string>) => Promise<Order[]>;
  fetchMonthlyReport: (month?: string) => Promise<MonthlyReport>;
  fetchStaffReport: (staffId: string) => Promise<StaffReport>;
  submitReview: (data: Partial<Review>) => Promise<void>;
  fetchMessages: (orderId: string) => Promise<Message[]>;
  sendMessage: (orderId: string, content: string) => Promise<void>;
  fetchLocation: (orderId: string) => Promise<{ lat: number; lng: number; name?: string }>;
  fetchOrderNotifications: (orderId: string) => Promise<OrderNotification>;
  uploadPhotos: (files: File[]) => Promise<string[]>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.success && json.data !== undefined) return json.data as T;
  return json as T;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUserId: 'user-1',
  serviceTypes: [],
  orders: [],
  staff: [],
  dashboardStats: null,
  activeOrders: [],
  loading: {},

  fetchServiceTypes: async () => {
    set((s) => ({ loading: { ...s.loading, serviceTypes: true } }));
    try {
      const data = await apiFetch<ServiceType[]>('/staff/service-types');
      set({ serviceTypes: data });
    } finally {
      set((s) => ({ loading: { ...s.loading, serviceTypes: false } }));
    }
  },

  fetchDashboardStats: async () => {
    try {
      const data = await apiFetch<DashboardStats>('/dashboard/stats');
      set({ dashboardStats: data });
    } catch {}
  },

  fetchActiveOrders: async () => {
    try {
      const data = await apiFetch<Order[]>('/dashboard/active-orders');
      set({ activeOrders: data });
    } catch {}
  },

  createOrder: async (data) => {
    const payload: Record<string, unknown> = {
      userId: get().currentUserId,
      serviceTypeId: data.serviceTypeId,
      address: data.address,
      notes: data.notes,
      price: data.price,
      lat: data.lat,
      lng: data.lng,
    };
    const order = await apiFetch<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    set((s) => ({ orders: [...s.orders, order] }));
    return order;
  },

  fetchOrder: async (id) => {
    const order = await apiFetch<Order>(`/orders/${id}`);
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? order : o)),
    }));
    return order;
  },

  checkinOrder: async (id) => {
    await apiFetch(`/orders/${id}/checkin`, { method: 'PUT' });
    const order = await apiFetch<Order>(`/orders/${id}`);
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? order : o)),
      activeOrders: s.activeOrders.map((o) => (o.id === id ? order : o)),
    }));
  },

  startOrder: async (id) => {
    await apiFetch(`/orders/${id}/start`, { method: 'PUT' });
    const order = await apiFetch<Order>(`/orders/${id}`);
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? order : o)),
      activeOrders: s.activeOrders.map((o) => (o.id === id ? order : o)),
    }));
  },

  completeOrder: async (id) => {
    await apiFetch(`/orders/${id}/complete`, { method: 'PUT' });
    const order = await apiFetch<Order>(`/orders/${id}`);
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? order : o)),
      activeOrders: s.activeOrders.filter((o) => o.id !== id),
    }));
  },

  fetchRecommendedStaff: async (serviceTypeId) => {
    const lat = 39.9;
    const lng = 116.4;
    const data = await apiFetch<Staff[]>(`/staff/recommend?serviceTypeId=${serviceTypeId}&lat=${lat}&lng=${lng}`);
    return data;
  },

  fetchStaff: async () => {
    set((s) => ({ loading: { ...s.loading, staff: true } }));
    try {
      const data = await apiFetch<Staff[]>('/staff');
      set({ staff: data });
    } finally {
      set((s) => ({ loading: { ...s.loading, staff: false } }));
    }
  },

  updateStaff: async (id, data) => {
    await apiFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const updated = await apiFetch<Staff>(`/staff/${id}`);
    set((s) => ({
      staff: s.staff.map((st) => (st.id === id ? updated : st)),
    }));
  },

  fetchAdminOrders: async (params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await apiFetch<any>(`/admin/orders${query}`);
    return data?.orders || data || [];
  },

  fetchMonthlyReport: async (month) => {
    const query = month ? `?month=${month}` : '';
    const data = await apiFetch<MonthlyReport>(`/admin/reports/monthly${query}`);
    return data;
  },

  fetchStaffReport: async (staffId) => {
    const data = await apiFetch<StaffReport>(`/admin/reports/staff/${staffId}`);
    return data;
  },

  submitReview: async (data) => {
    await apiFetch('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  fetchMessages: async (orderId) => {
    const data = await apiFetch<Message[]>(`/orders/${orderId}/messages`);
    return data;
  },

  sendMessage: async (orderId, content) => {
    await apiFetch(`/orders/${orderId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, senderType: 'user' }),
    });
  },

  fetchLocation: async (orderId) => {
    const data = await apiFetch<{ lat: number; lng: number; name?: string }>(`/orders/${orderId}/location`);
    return data;
  },

  fetchOrderNotifications: async (orderId) => {
    const data = await apiFetch<OrderNotification>(`/orders/${orderId}/notifications`);
    return data;
  },

  uploadPhotos: async (files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('photos', file);
    }
    const res = await fetch('/api/upload/photos', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('上传失败');
    const json = await res.json();
    if (json.success && json.data) return json.data.urls as string[];
    throw new Error('上传失败');
  },
}));
