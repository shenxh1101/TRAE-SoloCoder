import { create } from 'zustand';
import type { ServiceOrder, ServiceProvider, ServiceType } from '../types';
import { mockServiceOrders, mockServiceProviders } from '../utils/mockData';
import { generateId } from '../utils/helpers';
import { useNotificationStore } from './useNotificationStore';

interface ServiceState {
  orders: ServiceOrder[];
  providers: ServiceProvider[];
  getOrdersByExhibitor: (exhibitorId: string) => ServiceOrder[];
  getOrdersByProvider: (providerId: string) => ServiceOrder[];
  getProvidersByCategory: (category: ServiceType) => ServiceProvider[];
  createOrder: (orderData: Omit<ServiceOrder, 'id' | 'status' | 'providerId'>) => ServiceOrder;
  assignOrder: (orderId: string, providerId: string) => void;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: ServiceOrder['status']) => void;
  updateOrderProgress: (orderId: string, progress: number) => void;
  completeOrder: (orderId: string) => void;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  orders: mockServiceOrders,
  providers: mockServiceProviders,

  getOrdersByExhibitor: (exhibitorId) =>
    get().orders.filter((o) => o.exhibitorId === exhibitorId),

  getOrdersByProvider: (providerId) =>
    get().orders.filter((o) => o.providerId === providerId),

  getProvidersByCategory: (category) =>
    get().providers.filter((p) => p.serviceCategory.includes(category)),

  createOrder: (orderData) => {
    const newOrder: ServiceOrder = {
      ...orderData,
      id: generateId(),
      status: 'pending',
      providerId: '',
    };

    set((state) => ({
      orders: [...state.orders, newOrder],
    }));

    return newOrder;
  },

  assignOrder: (orderId, providerId) => {
    const provider = get().providers.find((p) => p.id === providerId);
    const order = get().orders.find((o) => o.id === orderId);

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? { ...o, providerId, status: 'assigned', providerName: provider?.name }
          : o
      ),
    }));

    if (provider && order) {
      useNotificationStore.getState().pushServiceNotification(
        providerId,
        orderId,
        '新服务订单已派单',
        `您有新的服务订单！订单编号: ${orderId}，服务类型: ${order.serviceType}，请尽快接单。`
      );

      useNotificationStore.getState().pushServiceNotification(
        order.exhibitorId,
        orderId,
        '服务订单已派单',
        `您的服务订单已成功派单！订单编号: ${orderId}，服务商: ${provider.name}。`
      );
    }
  },

  acceptOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    const provider = order?.providerId
      ? get().providers.find((p) => p.id === order.providerId)
      : undefined;

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'accepted' } : o
      ),
    }));

    if (order && provider) {
      useNotificationStore.getState().pushServiceNotification(
        order.exhibitorId,
        orderId,
        '服务商已接单',
        `服务商已确认接单！订单编号: ${orderId}，服务商: ${provider.name}，将按约定时间提供服务。`
      );
    }
  },

  rejectOrder: (orderId) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'cancelled', providerId: '' } : o
      ),
    }));
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
  },

  updateOrderProgress: (orderId, progress) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, progress } : o
      ),
    }));
  },

  completeOrder: (orderId) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'completed', progress: 100 } : o
      ),
    }));
  },
}));
