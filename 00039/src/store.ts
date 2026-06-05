import { create } from 'zustand';

export type UserRole = 'purchaser' | 'quality' | 'warehouse' | 'admin';

export type OrderStatus =
  | 'draft'
  | 'pending_quote'
  | 'quoted'
  | 'locked'
  | 'approved'
  | 'contracted'
  | 'shipping'
  | 'inspecting'
  | 'partial_return'
  | 'completed'
  | 'rejected'
  | 'pending_approval'
  | 'purchasing'
  | 'delivered'
  | 'qualified'
  | 'unqualified'
  | 'returned';

export interface OrderItem {
  materialId: string;
  materialName: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  suggestedPrice?: number;
  quotedPrice?: number;
  historicalAvgPrice?: number;
  marketPrice?: number;
}

export interface Order {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  totalAmount: number;
  budget: number;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  onTimeRate: number;
  passRate: number;
  totalOrders: number;
  totalAmount: number;
}

export interface Material {
  id: string;
  name: string;
  spec: string;
  unit: string;
  category: string;
  suggestedPrice: number;
  marketPrice: number;
  historyAvgPrice: number;
  priceTrend: 'up' | 'down' | 'stable';
}

export interface InventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  spec: string;
  batchNo: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location: string;
  stockInDate: string;
  orderId?: string;
}

export interface InspectionItem {
  name: string;
  standard: string;
  actual: string;
  passed: boolean | null;
}

export interface Inspection {
  id: string;
  orderId: string;
  orderNo: string;
  supplierName: string;
  batchNo: string;
  items: InspectionItem[];
  result: string;
  inspector: string;
  createdAt: string;
  completedAt?: string;
}

export type MessageType = 'system' | 'order' | 'quality' | 'warehouse' | 'approval' | 'order_change' | 'quality_result' | 'return_notice' | 'report_ready' | 'budget_alert';

export interface Message {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  read: boolean;
  attachment?: { name: string; url: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Contract {
  id: string;
  orderId: string;
  orderNo: string;
  supplierName: string;
  buyerSignature: string | null;
  supplierSignature: string | null;
  buyerSignedAt: string | null;
  supplierSignedAt: string | null;
  status: 'pending' | 'partial_signed' | 'signed';
  createdAt: string;
  items?: OrderItem[];
  budgetAmount?: number;
  totalAmount?: number;
}

export interface MonthlyReport {
  month: string;
  totalAmount: number;
  returnAmount: number;
  orderCount: number;
  returnRate: number;
}

export interface OperationLog {
  id: string;
  orderId: string;
  action: string;
  operator: string;
  detail: string;
  createdAt: string;
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transform<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(transform) as T;
  if (obj !== null && typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), transform(v)]);
    return Object.fromEntries(entries) as T;
  }
  return obj as T;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const json = await res.json();
  if (json.success && json.data !== undefined) return transform<T>(json.data);
  return transform<T>(json);
}

function transformOrderItem(item: Record<string, unknown>): OrderItem {
  return {
    materialId: (item.materialId || item.material_id) as string,
    materialName: (item.materialName || item.material_name) as string,
    spec: (item.spec || item.specification || '') as string,
    unit: item.unit as string,
    quantity: item.quantity as number,
    unitPrice: (item.unitPrice || item.suggested_price || item.suggestedPrice || 0) as number,
    totalPrice: (item.totalPrice || ((item.quantity as number) * ((item.unitPrice || item.suggestedPrice || item.suggested_price || 0) as number))) as number,
    suggestedPrice: (item.suggestedPrice || item.suggested_price) as number | undefined,
    quotedPrice: (item.quotedPrice || item.quoted_price) as number | undefined,
    historicalAvgPrice: (item.historicalAvgPrice || item.historical_avg_price) as number | undefined,
    marketPrice: (item.marketPrice || item.market_price) as number | undefined,
  };
}

function transformOrder(order: Record<string, unknown>): Order {
  const rawItems = (order.items || []) as Array<Record<string, unknown>>;
  return {
    id: order.id as string,
    orderNo: (order.orderNo || order.order_no) as string,
    supplierId: (order.supplierId || order.supplier_id) as string,
    supplierName: (order.supplierName || order.supplier_name) as string,
    items: rawItems.map(transformOrderItem),
    totalAmount: (order.totalAmount || order.total_amount) as number,
    budget: (order.budget || order.budget_amount) as number,
    status: order.status as string,
    createdBy: (order.createdBy || order.creatorName || order.created_by || order.creator_name) as string,
    createdAt: order.createdAt as string,
    updatedAt: (order.updatedAt || order.updated_at) as string,
  };
}

function transformSupplier(s: Record<string, unknown>): Supplier {
  return {
    id: s.id as string,
    name: s.name as string,
    contactPerson: (s.contactPerson || s.contact || '') as string,
    phone: (s.phone || '') as string,
    onTimeRate: (s.onTimeRate || s.on_time_rate || 0) as number,
    passRate: (s.passRate || s.pass_rate || 0) as number,
    totalOrders: (s.totalOrders || s.total_orders || 0) as number,
    totalAmount: (s.totalAmount || s.total_amount || 0) as number,
  };
}

function transformMaterial(m: Record<string, unknown>): Material {
  const suggested = (m.suggestedPrice || m.suggested_price || 0) as number;
  const market = (m.marketPrice || m.market_price || 0) as number;
  const histAvg = (m.historyAvgPrice || m.historicalAvgPrice || m.historical_avg_price || 0) as number;
  const trend: 'up' | 'down' | 'stable' = market > histAvg ? 'up' : market < histAvg ? 'down' : 'stable';
  return {
    id: m.id as string,
    name: m.name as string,
    spec: (m.spec || m.specification || '') as string,
    unit: m.unit as string,
    category: (m.category || '') as string,
    suggestedPrice: suggested,
    marketPrice: market,
    historyAvgPrice: histAvg,
    priceTrend: trend,
  };
}

function transformInventory(item: Record<string, unknown>): InventoryItem {
  return {
    id: item.id as string,
    materialId: (item.materialId || item.material_id) as string,
    materialName: (item.materialName || item.material_name) as string,
    spec: (item.spec || item.specification || '') as string,
    batchNo: (item.batchNo || item.batch_no || '') as string,
    quantity: item.quantity as number,
    unit: (item.unit || '') as string,
    warehouse: item.warehouse as string,
    location: (item.location || '') as string,
    stockInDate: (item.stockInDate || item.lastInAt || item.last_in_at || '') as string,
    orderId: (item.orderId || item.order_id) as string | undefined,
  };
}

function transformInspection(item: Record<string, unknown>): Inspection {
  const rawItems = (item.items || []) as Array<Record<string, unknown>>;
  const rawResult = (item.result || '') as string;
  let displayResult = rawResult;
  if (rawResult === 'pass') displayResult = 'qualified';
  if (rawResult === 'fail') displayResult = 'unqualified';
  return {
    id: item.id as string,
    orderId: (item.orderId || item.order_id) as string,
    orderNo: (item.orderNo || item.order_no) as string,
    supplierName: (item.supplierName || '') as string,
    batchNo: (item.batchNo || item.batch_no) as string,
    items: rawItems.map((ri) => ({
      name: ri.name as string,
      standard: ri.standard as string,
      actual: ri.actual as string,
      passed: ri.passed === 1 ? true : ri.passed === 0 ? false : ri.passed as boolean | null,
    })),
    result: displayResult,
    inspector: (item.inspector || item.inspectorName || item.inspector_name || '') as string,
    createdAt: (item.createdAt || item.created_at) as string,
    completedAt: (item.completedAt || item.updated_at) as string | undefined,
  };
}

function transformMessage(m: Record<string, unknown>): Message {
  const typeMap: Record<string, MessageType> = {
    order_change: 'order',
    quality_result: 'quality',
    return_notice: 'quality',
    report_ready: 'system',
    budget_alert: 'approval',
    system: 'system',
    order: 'order',
    quality: 'quality',
    warehouse: 'warehouse',
    approval: 'approval',
  };
  return {
    id: m.id as string,
    title: m.title as string,
    content: m.content as string,
    type: typeMap[m.type as string] || (m.type as MessageType),
    read: m.read === 1 ? true : m.read as boolean,
    createdAt: (m.createdAt || m.created_at) as string,
  };
}

function transformReport(r: Record<string, unknown>): MonthlyReport {
  const totalPurchase = (r.totalPurchase || r.total_purchase || 0) as number;
  const totalReturn = (r.totalReturn || r.total_return || 0) as number;
  return {
    month: r.month as string,
    totalAmount: totalPurchase,
    returnAmount: totalReturn,
    orderCount: (r.orderCount || r.order_count || 0) as number,
    returnRate: totalPurchase > 0 ? Math.round((totalReturn / totalPurchase) * 10000) / 100 : 0,
  };
}

function transformContract(c: Record<string, unknown>): Contract {
  return {
    id: c.id as string,
    orderId: (c.orderId || c.order_id) as string,
    orderNo: (c.orderNo || c.order_no) as string,
    supplierName: (c.supplierName || c.supplier_name) as string,
    buyerSignature: (c.buyerSignature || c.buyer_signature) as string | null,
    supplierSignature: (c.supplierSignature || c.supplier_signature) as string | null,
    buyerSignedAt: (c.buyerSignedAt || c.buyer_signed_at) as string | null,
    supplierSignedAt: (c.supplierSignedAt || c.supplier_signed_at) as string | null,
    status: (c.status as 'pending' | 'partial_signed' | 'signed') || 'pending',
    createdAt: (c.createdAt || c.created_at) as string,
    items: (c.items as Array<Record<string, unknown>> | undefined)?.map(transformOrderItem),
    budgetAmount: (c.budgetAmount || c.budget_amount) as number | undefined,
    totalAmount: (c.totalAmount || c.total_amount) as number | undefined,
  };
}

interface AppState {
  currentUser: User;
  orders: Order[];
  suppliers: Supplier[];
  materials: Material[];
  inventory: InventoryItem[];
  inspections: Inspection[];
  messages: Message[];
  notifications: Notification[];
  reports: MonthlyReport[];
  operationLogs: OperationLog[];
  contracts: Contract[];
  currentContract: Contract | null;
  loading: Record<string, boolean>;
  pollingInterval: number | null;

  switchRole: (role: UserRole) => void;
  fetchOrders: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchMaterials: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchInspections: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchContract: (orderId: string) => Promise<Contract | null>;
  generateContract: (orderId: string) => Promise<Contract>;
  signContract: (contractId: string, role: 'buyer' | 'supplier', signature: string) => Promise<Contract>;
  createOrder: (order: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  approveLockedOrder: (id: string, approved: boolean) => Promise<void>;
  markMessageRead: (id: string) => Promise<void>;
  markAllMessagesRead: () => Promise<void>;
  createInspection: (inspection: Partial<Inspection>) => Promise<Inspection>;
  createInventory: (item: Partial<InventoryItem>) => Promise<InventoryItem>;
  getOperationLogs: (orderId: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  downloadAttachment: (messageId: string) => Promise<void>;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: {
    id: 'u1',
    name: '张伟',
    role: 'purchaser',
  },
  orders: [],
  suppliers: [],
  materials: [],
  inventory: [],
  inspections: [],
  messages: [],
  notifications: [],
  reports: [],
  operationLogs: [],
  contracts: [],
  currentContract: null,
  loading: {},
  pollingInterval: null,

  switchRole: (role) => {
    const roleNames: Record<UserRole, string> = {
      purchaser: '张伟',
      quality: '陈刚',
      warehouse: '周明',
      admin: '赵总',
    };
    set({
      currentUser: { ...get().currentUser, role, name: roleNames[role] },
    });
  },

  fetchOrders: async () => {
    set((s) => ({ loading: { ...s.loading, orders: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/orders');
      const data = raw.map(transformOrder);
      set({ orders: data });
    } catch {
      set({ orders: mockOrders });
    } finally {
      set((s) => ({ loading: { ...s.loading, orders: false } }));
    }
  },

  fetchSuppliers: async () => {
    set((s) => ({ loading: { ...s.loading, suppliers: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/suppliers');
      const data = raw.map(transformSupplier);
      if (data.length > 0 && data.every((s) => s.onTimeRate === 0)) {
        try {
          const perfRaw = await apiFetch<Record<string, unknown>[]>('/api/suppliers/performance/all');
          const perfData = perfRaw.map(transformSupplier);
          const merged = data.map((s) => {
            const perf = perfData.find((p) => p.id === s.id);
            return perf ? { ...s, onTimeRate: perf.onTimeRate, passRate: perf.passRate, totalOrders: perf.totalOrders } : s;
          });
          set({ suppliers: merged });
        } catch {
          set({ suppliers: data });
        }
      } else {
        set({ suppliers: data });
      }
    } catch {
      set({ suppliers: mockSuppliers });
    } finally {
      set((s) => ({ loading: { ...s.loading, suppliers: false } }));
    }
  },

  fetchMaterials: async () => {
    set((s) => ({ loading: { ...s.loading, materials: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/materials');
      const data = raw.map(transformMaterial);
      set({ materials: data });
    } catch {
      set({ materials: mockMaterials });
    } finally {
      set((s) => ({ loading: { ...s.loading, materials: false } }));
    }
  },

  fetchInventory: async () => {
    set((s) => ({ loading: { ...s.loading, inventory: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/warehouse/stock');
      const data = raw.map(transformInventory);
      set({ inventory: data });
    } catch {
      set({ inventory: mockInventory });
    } finally {
      set((s) => ({ loading: { ...s.loading, inventory: false } }));
    }
  },

  fetchInspections: async () => {
    set((s) => ({ loading: { ...s.loading, inspections: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/quality');
      const data = raw.map(transformInspection);
      set({ inspections: data });
    } catch {
      set({ inspections: mockInspections });
    } finally {
      set((s) => ({ loading: { ...s.loading, inspections: false } }));
    }
  },

  fetchMessages: async () => {
    set((s) => ({ loading: { ...s.loading, messages: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/messages?unread_only=false');
      const data = raw.map(transformMessage);
      const prevIds = new Set(get().messages.map(m => m.id));
      const newMsgs = data.filter(m => !prevIds.has(m.id) && !m.read);
      if (newMsgs.length > 0) {
        newMsgs.forEach(m => {
          const notification = new Notification(`新消息：${m.title}`, {
            body: m.content,
            icon: '/favicon.ico'
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          setTimeout(() => notification.close(), 5000);
        });
      }
      set({ messages: data });
    } catch {
      set({ messages: mockMessages });
    } finally {
      set((s) => ({ loading: { ...s.loading, messages: false } }));
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await apiFetch<Notification[]>('/api/notifications');
      set({ notifications: data });
    } catch {
      set({ notifications: [] });
    }
  },

  fetchReports: async () => {
    set((s) => ({ loading: { ...s.loading, reports: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/reports');
      const data = raw.map(transformReport);
      set({ reports: data });
    } catch {
      set({ reports: mockReports });
    } finally {
      set((s) => ({ loading: { ...s.loading, reports: false } }));
    }
  },

  fetchContract: async (orderId) => {
    set((s) => ({ loading: { ...s.loading, contract: true } }));
    try {
      const raw = await apiFetch<Record<string, unknown>[]>(`/api/contracts?order_id=${orderId}`);
      if (raw.length > 0) {
        const data = transformContract(raw[0]);
        set({ currentContract: data });
        return data;
      }
      set({ currentContract: null });
      return null;
    } catch {
      set({ currentContract: null });
      return null;
    } finally {
      set((s) => ({ loading: { ...s.loading, contract: false } }));
    }
  },

  generateContract: async (orderId) => {
    const raw = await apiFetch<Record<string, unknown>>('/api/contracts/generate', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
    const data = transformContract(raw);
    set({ currentContract: data });
    await get().fetchOrders();
    return data;
  },

  signContract: async (contractId, role, signature) => {
    const raw = await apiFetch<Record<string, unknown>>(`/api/contracts/${contractId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ role, signature }),
    });
    const data = transformContract(raw);
    set({ currentContract: data });
    await get().fetchOrders();
    return data;
  },

  createOrder: async (order) => {
    const payload = {
      supplierId: order.supplierId,
      createdBy: get().currentUser.id,
      budgetAmount: order.budget,
      items: order.items?.map((i) => ({
        materialId: i.materialId,
        quantity: i.quantity,
        unit: i.unit,
      })),
    };
    const raw = await apiFetch<Record<string, unknown>>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = transformOrder(raw);
    set((s) => ({ orders: [data, ...s.orders] }));
    return data;
  },

  updateOrderStatus: async (id, status) => {
    await apiFetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)),
    }));
  },

  approveLockedOrder: async (id, approved) => {
    await apiFetch(`/api/orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    });
    await get().fetchOrders();
    await get().fetchMessages();
  },

  markMessageRead: async (id) => {
    await apiFetch(`/api/messages/${id}/read`, { method: 'PUT' });
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
  },

  markAllMessagesRead: async () => {
    await apiFetch('/api/messages/read-all', { method: 'PUT' });
    set((s) => ({
      messages: s.messages.map((m) => ({ ...m, read: true })),
    }));
  },

  createInspection: async (inspection) => {
    const payload = {
      orderId: inspection.orderId,
      batchNo: inspection.batchNo,
      materialId: inspection.items?.[0]?.name || '',
      inspector: get().currentUser.id,
      items: inspection.items?.map((i) => ({
        name: i.name,
        standard: i.standard,
        actual: i.actual,
        passed: i.passed,
      })),
    };
    const raw = await apiFetch<Record<string, unknown>>('/api/quality', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = transformInspection(raw);
    set((s) => ({ inspections: [data, ...s.inspections] }));
    await get().fetchOrders();
    await get().fetchMessages();
    return data;
  },

  createInventory: async (item) => {
    const payload = {
      materialId: item.materialId,
      warehouse: item.warehouse,
      quantity: item.quantity,
      orderId: item.orderId,
    };
    const raw = await apiFetch<Record<string, unknown>>('/api/warehouse/scan-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = transformInventory(raw);
    set((s) => ({ inventory: [data, ...s.inventory] }));
    await get().fetchOrders();
    return data;
  },

  getOperationLogs: async (orderId) => {
    try {
      const data = await apiFetch<OperationLog[]>(`/api/orders/${orderId}/logs`);
      set({ operationLogs: data });
    } catch {
      set({ operationLogs: [] });
    }
  },

  startPolling: () => {
    if (get().pollingInterval) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = window.setInterval(() => {
      get().fetchMessages();
    }, 10000);
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  downloadAttachment: async (messageId) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/attachment`);
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `凭证_${messageId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载失败:', err);
      throw err;
    }
  },
}));

const mockOrders: Order[] = [
  {
    id: 'o1', orderNo: 'PO-2026-0001', supplierId: 's1', supplierName: '华鑫钢铁集团',
    items: [{ materialId: 'm1', materialName: 'Q235B热轧钢板', spec: '6mm×1500mm', unit: '吨', quantity: 50, unitPrice: 5200, totalPrice: 260000 }],
    totalAmount: 260000, budget: 280000, status: 'pending_approval', createdBy: '张伟', createdAt: '2026-05-28T10:00:00Z', updatedAt: '2026-05-28T10:00:00Z',
  },
  {
    id: 'o2', orderNo: 'PO-2026-0002', supplierId: 's2', supplierName: '盛达化工',
    items: [{ materialId: 'm3', materialName: '环氧树脂E-44', spec: '200kg/桶', unit: '桶', quantity: 200, unitPrice: 280, totalPrice: 56000 }],
    totalAmount: 56000, budget: 62000, status: 'delivered', createdBy: '张伟', createdAt: '2026-05-25T14:00:00Z', updatedAt: '2026-05-27T09:00:00Z',
  },
  {
    id: 'o3', orderNo: 'PO-2026-0003', supplierId: 's1', supplierName: '华鑫钢铁集团',
    items: [{ materialId: 'm2', materialName: '304不锈钢板', spec: '3mm×1220mm', unit: '吨', quantity: 30, unitPrice: 15800, totalPrice: 474000 }],
    totalAmount: 474000, budget: 500000, status: 'inspecting', createdBy: '张伟', createdAt: '2026-05-20T08:00:00Z', updatedAt: '2026-05-29T16:00:00Z',
  },
  {
    id: 'o4', orderNo: 'PO-2026-0004', supplierId: 's3', supplierName: '恒力机械制造',
    items: [{ materialId: 'm5', materialName: '6205-2RS深沟球轴承', spec: '25×52×15mm', unit: '个', quantity: 200, unitPrice: 12, totalPrice: 2400 }],
    totalAmount: 2400, budget: 3000, status: 'completed', createdBy: '张伟', createdAt: '2026-04-15T11:00:00Z', updatedAt: '2026-05-10T15:00:00Z',
  },
  {
    id: 'o5', orderNo: 'PO-2026-0005', supplierId: 's4', supplierName: '鼎盛电子科技',
    items: [{ materialId: 'm6', materialName: 'HY2-8行程开关', spec: 'AC380V 5A', unit: '个', quantity: 100, unitPrice: 35, totalPrice: 3500 }],
    totalAmount: 3500, budget: 4000, status: 'unqualified', createdBy: '张伟', createdAt: '2026-05-10T09:00:00Z', updatedAt: '2026-05-26T11:00:00Z',
  },
];

const mockSuppliers: Supplier[] = [
  { id: 's1', name: '华鑫钢铁集团', contactPerson: '王强', phone: '021-55551001', onTimeRate: 92, passRate: 97, totalOrders: 156, totalAmount: 5680000 },
  { id: 's2', name: '盛达化工有限公司', contactPerson: '赵敏', phone: '0571-55552002', onTimeRate: 88, passRate: 95, totalOrders: 89, totalAmount: 2340000 },
  { id: 's3', name: '恒力机械制造', contactPerson: '孙浩', phone: '0512-55553003', onTimeRate: 85, passRate: 93, totalOrders: 67, totalAmount: 3120000 },
  { id: 's4', name: '鼎盛电子科技', contactPerson: '钱磊', phone: '0755-55554004', onTimeRate: 78, passRate: 88, totalOrders: 45, totalAmount: 980000 },
  { id: 's5', name: '中联建材集团', contactPerson: '周涛', phone: '025-55555005', onTimeRate: 90, passRate: 96, totalOrders: 52, totalAmount: 1860000 },
];

const mockMaterials: Material[] = [
  { id: 'm1', name: 'Q235B热轧钢板', spec: '6mm×1500mm', unit: '吨', category: '钢材', suggestedPrice: 5200, marketPrice: 5350, historyAvgPrice: 5100, priceTrend: 'up' },
  { id: 'm2', name: '304不锈钢板', spec: '3mm×1220mm', unit: '吨', category: '钢材', suggestedPrice: 15800, marketPrice: 16200, historyAvgPrice: 15500, priceTrend: 'up' },
  { id: 'm3', name: '环氧树脂E-44', spec: '200kg/桶', unit: '桶', category: '化工', suggestedPrice: 280, marketPrice: 295, historyAvgPrice: 270, priceTrend: 'up' },
  { id: 'm4', name: '工业酒精(乙醇)', spec: '160kg/桶 99.5%', unit: '桶', category: '化工', suggestedPrice: 680, marketPrice: 670, historyAvgPrice: 690, priceTrend: 'down' },
  { id: 'm5', name: '6205-2RS深沟球轴承', spec: '25×52×15mm', unit: '个', category: '机械', suggestedPrice: 12, marketPrice: 12.5, historyAvgPrice: 11.8, priceTrend: 'up' },
  { id: 'm6', name: 'HY2-8行程开关', spec: 'AC380V 5A', unit: '个', category: '电子', suggestedPrice: 35, marketPrice: 34, historyAvgPrice: 36, priceTrend: 'down' },
];

const mockInventory: InventoryItem[] = [
  { id: 'i1', materialId: 'm1', materialName: 'Q235B热轧钢板', spec: '6mm×1500mm', batchNo: 'B20260501', quantity: 50, unit: '吨', warehouse: 'A区主仓库', location: 'A-01-03', stockInDate: '2026-05-28' },
  { id: 'i2', materialId: 'm3', materialName: '环氧树脂E-44', spec: '200kg/桶', batchNo: 'B20260502', quantity: 200, unit: '桶', warehouse: 'B区化工仓', location: 'B-02-01', stockInDate: '2026-05-27' },
  { id: 'i3', materialId: 'm5', materialName: '6205-2RS深沟球轴承', spec: '25×52×15mm', batchNo: 'B20260401', quantity: 500, unit: '个', warehouse: 'C区电子仓', location: 'C-03-02', stockInDate: '2026-04-20' },
];

const mockInspections: Inspection[] = [
  {
    id: 'q1', orderId: 'o3', orderNo: 'PO-2026-0003', supplierName: '华鑫钢铁集团', batchNo: 'B20260520',
    items: [
      { name: '外观检查', standard: '表面无裂纹、气泡', actual: '表面光滑无缺陷', passed: true },
      { name: '尺寸测量', standard: '6±0.2mm', actual: '6.05mm', passed: true },
      { name: '硬度测试', standard: 'HB120-180', actual: 'HB145', passed: true },
    ],
    result: 'qualified', inspector: '陈刚', createdAt: '2026-05-29T10:00:00Z', completedAt: '2026-05-29T14:00:00Z',
  },
  {
    id: 'q2', orderId: 'o5', orderNo: 'PO-2026-0005', supplierName: '鼎盛电子科技', batchNo: 'B20260510',
    items: [
      { name: '外观检查', standard: '表面无裂纹', actual: '发现2处裂纹', passed: false },
      { name: '尺寸测量', standard: 'Φ12±0.3mm', actual: 'Φ11.5mm', passed: false },
      { name: '抗拉强度', standard: '≥540MPa', actual: '510MPa', passed: false },
    ],
    result: 'unqualified', inspector: '刘芳', createdAt: '2026-05-25T09:00:00Z', completedAt: '2026-05-26T11:00:00Z',
  },
  {
    id: 'q3', orderId: 'o2', orderNo: 'PO-2026-0002', supplierName: '盛达化工', batchNo: 'B20260525',
    items: [],
    result: 'pending', inspector: '陈刚', createdAt: '2026-05-27T09:00:00Z',
  },
];

const mockMessages: Message[] = [
  { id: 'msg1', title: '订单PO202606002待报价', content: '采购订单PO202606002已创建，请尽快确认报价', type: 'order', read: false, createdAt: '2026-06-02T10:05:00Z' },
  { id: 'msg2', title: '订单报价超预算', content: '采购订单PO202606006供应商修改报价后超出预算5%，已自动锁定，请审批', type: 'approval', read: false, createdAt: '2026-06-01T11:05:00Z' },
  { id: 'msg3', title: '质检不合格通知', content: '批次BATCH2026060901质检结果为不合格，已自动发起退货流程', type: 'quality', read: false, createdAt: '2026-06-03T08:00:00Z' },
  { id: 'msg4', title: '质检合格通知', content: '批次BATCH2026060801质检结果为合格，可安排入库', type: 'quality', read: true, createdAt: '2026-06-02T15:30:00Z' },
  { id: 'msg5', title: '退货通知', content: '采购订单PO202606010因质检不合格已发起退货，请安排补发', type: 'quality', read: false, createdAt: '2026-06-03T09:00:00Z' },
];

const mockReports: MonthlyReport[] = [
  { month: '2026-04', totalAmount: 542000, returnAmount: 12000, orderCount: 8, returnRate: 2.21 },
  { month: '2026-05', totalAmount: 648000, returnAmount: 18000, orderCount: 10, returnRate: 2.78 },
  { month: '2026-06', totalAmount: 725000, returnAmount: 15000, orderCount: 12, returnRate: 2.07 },
];
