import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type { Reservation, Book, User } from '@/types';
import { mockReservations } from '@/utils/mock';
import { formatDateTime, generateReservationExpireDate } from '@/utils/date';

interface ReservationState {
  reservations: Reservation[];
  reserveBook: (userId: string, bookId: string, user: User, book: Book) => { success: boolean; reason?: string };
  cancelReservation: (reservationId: string) => void;
  getUserReservations: (userId: string) => Reservation[];
  checkReservationExpiry: () => void;
  notifyReserversOnReturn: (bookId: string) => Reservation | null;
  completeReservation: (reservationId: string) => void;
  getAllReservations: () => Reservation[];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useReservationStore = create<ReservationState>()(
  persist(
    (set, get) => ({
      reservations: mockReservations,
      
      reserveBook: (userId, bookId, user, book) => {
        const existingReservation = get().reservations.find(
          (r) => r.userId === userId && r.bookId === bookId && 
          (r.status === 'pending' || r.status === 'ready')
        );
        
        if (existingReservation) {
          return { success: false, reason: '您已预约过此书，请等待通知' };
        }
        
        const newReservation: Reservation = {
          id: generateId(),
          userId,
          bookId,
          book,
          user,
          reserveDate: formatDateTime(new Date()),
          expireDate: generateReservationExpireDate(),
          status: 'pending',
          createdAt: formatDateTime(new Date()),
        };
        
        set((state) => ({
          reservations: [...state.reservations, newReservation],
        }));
        
        return { success: true };
      },
      
      cancelReservation: (reservationId) => {
        set((state) => ({
          reservations: state.reservations.filter((r) => r.id !== reservationId),
        }));
      },
      
      getUserReservations: (userId) => {
        return get().reservations.filter((r) => r.userId === userId);
      },
      
      checkReservationExpiry: () => {
        const now = dayjs();
        set((state) => ({
          reservations: state.reservations.map((r) => {
            if (r.status === 'ready' && now.isAfter(dayjs(r.expireDate))) {
              return { ...r, status: 'expired' };
            }
            return r;
          }),
        }));
      },
      
      notifyReserversOnReturn: (bookId) => {
        const pendingReservation = get().reservations
          .filter((r) => r.bookId === bookId && r.status === 'pending')
          .sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf())[0];
        
        if (pendingReservation) {
          set((state) => ({
            reservations: state.reservations.map((r) =>
              r.id === pendingReservation.id
                ? { ...r, status: 'ready', expireDate: generateReservationExpireDate() }
                : r
            ),
          }));
          return pendingReservation;
        }
        return null;
      },
      
      completeReservation: (reservationId) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: 'completed' } : r
          ),
        }));
      },
      
      getAllReservations: () => get().reservations,
    }),
    {
      name: 'library-reservation-storage',
    }
  )
);
