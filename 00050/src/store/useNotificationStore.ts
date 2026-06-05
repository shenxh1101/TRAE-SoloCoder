import { create } from 'zustand';
import type { Notification, NotificationType } from '../types';
import { mockNotifications } from '../utils/mockData';
import { generateId, generateVoucherHtml, downloadFile } from '../utils/helpers';

interface NotificationState {
  notifications: Notification[];
  getNotificationsByUser: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
  addNotification: (
    notification: Omit<Notification, 'id' | 'status' | 'createdAt'>
  ) => Notification;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;
  getNotificationsByType: (userId: string, type: NotificationType) => Notification[];
  downloadVoucher: (notificationId: string) => void;
  pushBookingNotification: (userId: string, bookingId: string, title: string, content: string) => void;
  pushServiceNotification: (userId: string, serviceId: string, title: string, content: string) => void;
  pushWarningNotification: (userId: string, hallId: string, title: string, content: string) => void;
  pushForumNotification: (userId: string, forumId: string, title: string, content: string) => void;
  pushFinanceNotification: (userId: string, reportId: string, title: string, content: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,

  getNotificationsByUser: (userId) =>
    get()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  getUnreadCount: (userId) =>
    get().notifications.filter((n) => n.userId === userId && n.status === 'unread').length,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      status: 'unread',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));

    return newNotification;
  },

  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, status: 'read' } : n
      ),
    }));
  },

  markAllAsRead: (userId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.userId === userId && n.status === 'unread' ? { ...n, status: 'read' } : n
      ),
    }));
  },

  deleteNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    }));
  },

  getNotificationsByType: (userId, type) =>
    get().notifications.filter((n) => n.userId === userId && n.type === type),

  downloadVoucher: (notificationId) => {
    const notification = get().notifications.find((n) => n.id === notificationId);
    if (!notification) return;

    const voucherContent = generateVoucherHtml({
      '通知类型': notification.type,
      '通知标题': notification.title,
      '通知内容': notification.content,
      '生成时间': notification.createdAt,
    });

    downloadFile(voucherContent, `凭证-${notification.id}.html`, 'text/html');
  },

  pushBookingNotification: (userId, bookingId, title, content) => {
    get().addNotification({
      userId,
      type: 'booking',
      title,
      content,
      relatedId: bookingId,
      actionUrl: '/exhibitor/booking',
      voucherUrl: `/vouchers/${bookingId}.pdf`,
    });
  },

  pushServiceNotification: (userId, serviceId, title, content) => {
    get().addNotification({
      userId,
      type: 'service',
      title,
      content,
      relatedId: serviceId,
      actionUrl: '/provider/orders',
    });
  },

  pushWarningNotification: (userId, hallId, title, content) => {
    get().addNotification({
      userId,
      type: 'warning',
      title,
      content,
      relatedId: hallId,
      actionUrl: '/operator/warnings',
    });
  },

  pushForumNotification: (userId, forumId, title, content) => {
    get().addNotification({
      userId,
      type: 'forum',
      title,
      content,
      relatedId: forumId,
      actionUrl: '/visitor/forums',
      voucherUrl: `/vouchers/${forumId}.pdf`,
    });
  },

  pushFinanceNotification: (userId, reportId, title, content) => {
    get().addNotification({
      userId,
      type: 'finance',
      title,
      content,
      relatedId: reportId,
      actionUrl: '/finance/reports',
      voucherUrl: `/reports/${reportId}.pdf`,
    });
  },
}));
