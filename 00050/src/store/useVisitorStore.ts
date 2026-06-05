import { create } from 'zustand';
import type { Forum, ForumReservation, VisitingRoute, RecommendationResult } from '../types';
import { mockForums, mockForumReservations } from '../utils/mockData';
import { generateId } from '../utils/helpers';
import { useNotificationStore } from './useNotificationStore';

interface VisitorState {
  forums: Forum[];
  reservations: ForumReservation[];
  recommendations: RecommendationResult[];
  currentRoute: VisitingRoute | null;
  waitingQueue: Map<string, number>;
  getForumsByIndustry: (industry: string) => Forum[];
  getReservationsByVisitor: (visitorId: string) => ForumReservation[];
  reserveForum: (visitorId: string, forumId: string, forumTitle: string) => ForumReservation;
  cancelReservation: (reservationId: string) => void;
  checkInForum: (reservationId: string) => void;
  setRecommendations: (recommendations: RecommendationResult[]) => void;
  generateRoute: (route: VisitingRoute) => void;
  updateForumSeats: (forumId: string, delta: number) => void;
  getQueuePosition: (forumId: string, visitorId: string) => number | null;
}

export const useVisitorStore = create<VisitorState>((set, get) => ({
  forums: mockForums,
  reservations: mockForumReservations,
  recommendations: [],
  currentRoute: null,
  waitingQueue: new Map(),

  getForumsByIndustry: (industry) =>
    get().forums.filter((f) => f.industry === industry),

  getReservationsByVisitor: (visitorId) =>
    get().reservations.filter((r) => r.visitorId === visitorId),

  reserveForum: (visitorId, forumId, forumTitle) => {
    const forum = get().forums.find((f) => f.id === forumId);
    let status: ForumReservation['status'] = 'confirmed';
    let queuePosition: number | undefined = undefined;

    if (forum && forum.availableSeats > 0) {
      get().updateForumSeats(forumId, -1);
    } else {
      status = 'waiting';
      const currentQueue = get().waitingQueue.get(forumId) || 0;
      queuePosition = currentQueue + 1;
      get().waitingQueue.set(forumId, queuePosition);
    }

    const newReservation: ForumReservation = {
      id: generateId(),
      visitorId,
      forumId,
      forumTitle,
      status,
      createdAt: new Date().toISOString(),
      queuePosition,
    };

    set((state) => ({
      reservations: [...state.reservations, newReservation],
    }));

    if (status === 'confirmed') {
      useNotificationStore.getState().pushForumNotification(
        visitorId,
        forumId,
        '论坛预约成功',
        `您已成功预约「${forumTitle}」论坛！请准时参加，点击查看详情并下载入场凭证。`
      );
    } else {
      useNotificationStore.getState().pushForumNotification(
        visitorId,
        forumId,
        '论坛预约候补成功',
        `「${forumTitle}」论坛座位已满，您已进入候补队列，当前排位: 第${queuePosition}位。如有空位将自动为您安排。`
      );
    }

    return newReservation;
  },

  cancelReservation: (reservationId) => {
    const reservation = get().reservations.find((r) => r.id === reservationId);
    if (reservation?.status === 'confirmed') {
      get().updateForumSeats(reservation.forumId, 1);
    }

    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === reservationId ? { ...r, status: 'cancelled' } : r
      ),
    }));
  },

  checkInForum: (reservationId) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === reservationId ? { ...r, status: 'checked_in' } : r
      ),
    }));
  },

  setRecommendations: (recommendations) => set({ recommendations }),

  generateRoute: (route) => set({ currentRoute: route }),

  updateForumSeats: (forumId, delta) => {
    set((state) => ({
      forums: state.forums.map((f) =>
        f.id === forumId
          ? { ...f, availableSeats: Math.max(0, f.availableSeats + delta) }
          : f
      ),
    }));
  },

  getQueuePosition: (forumId, visitorId) => {
    const reservation = get().reservations.find(
      (r) => r.forumId === forumId && r.visitorId === visitorId && r.status === 'waiting'
    );
    return reservation?.queuePosition || null;
  },
}));
