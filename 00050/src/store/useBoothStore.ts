import { create } from 'zustand';
import type { Booth, BoothBooking, Contract, ExhibitionHall } from '../types';
import { mockBooths, mockBookings, mockHalls, mockContracts } from '../utils/mockData';
import { generateId } from '../utils/helpers';
import { useNotificationStore } from './useNotificationStore';

interface BoothState {
  halls: ExhibitionHall[];
  booths: Booth[];
  bookings: BoothBooking[];
  contracts: Contract[];
  selectedHallId: string | null;
  selectedBoothIds: string[];
  getHallById: (id: string) => ExhibitionHall | undefined;
  getBoothById: (id: string) => Booth | undefined;
  getBookingsByExhibitor: (exhibitorId: string) => BoothBooking[];
  getBoothsByHall: (hallId: string) => Booth[];
  selectHall: (hallId: string | null) => void;
  toggleBoothSelection: (boothId: string) => void;
  clearBoothSelection: () => void;
  createBooking: (bookingData: Omit<BoothBooking, 'id' | 'createdAt' | 'status'>) => BoothBooking;
  updateBookingStatus: (bookingId: string, status: BoothBooking['status']) => void;
  updateBoothStatus: (boothId: string, status: Booth['status']) => void;
  lockBooth: (boothId: string) => void;
  createContract: (contractData: Omit<Contract, 'id' | 'createdAt' | 'status'>) => Contract;
  signContract: (contractId: string) => void;
  getContractByBookingId: (bookingId: string) => Contract | undefined;
}

export const useBoothStore = create<BoothState>((set, get) => ({
  halls: mockHalls,
  booths: mockBooths,
  bookings: mockBookings,
  contracts: mockContracts,
  selectedHallId: null,
  selectedBoothIds: [],

  getHallById: (id) => get().halls.find((h) => h.id === id),

  getBoothById: (id) => get().booths.find((b) => b.id === id),

  getBookingsByExhibitor: (exhibitorId) =>
    get().bookings.filter((b) => b.exhibitorId === exhibitorId),

  getBoothsByHall: (hallId) => get().booths.filter((b) => b.hallId === hallId),

  selectHall: (hallId) => set({ selectedHallId: hallId, selectedBoothIds: [] }),

  toggleBoothSelection: (boothId) => {
    const { selectedBoothIds } = get();
    const booth = get().getBoothById(boothId);

    if (!booth || booth.status !== 'available') return;

    if (selectedBoothIds.includes(boothId)) {
      set({ selectedBoothIds: selectedBoothIds.filter((id) => id !== boothId) });
    } else {
      set({ selectedBoothIds: [...selectedBoothIds, boothId] });
    }
  },

  clearBoothSelection: () => set({ selectedBoothIds: [] }),

  createBooking: (bookingData) => {
    const newBooking: BoothBooking = {
      ...bookingData,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      bookings: [...state.bookings, newBooking],
    }));

    return newBooking;
  },

  updateBookingStatus: (bookingId, status) => {
    const booking = get().bookings.find((b) => b.id === bookingId);

    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
    }));

    if (booking && status === 'approved') {
      useNotificationStore.getState().pushBookingNotification(
        booking.exhibitorId,
        bookingId,
        '展位预订审核通过',
        `您的展位预订已审核通过！预订编号: ${bookingId}，请前往合同管理页面签署电子合同。`
      );
    } else if (booking && status === 'rejected') {
      useNotificationStore.getState().pushBookingNotification(
        booking.exhibitorId,
        bookingId,
        '展位预订审核未通过',
        `您的展位预订审核未通过。预订编号: ${bookingId}，请重新提交预订申请。`
      );
    }
  },

  updateBoothStatus: (boothId, status) => {
    set((state) => ({
      booths: state.booths.map((b) => (b.id === boothId ? { ...b, status } : b)),
    }));
  },

  lockBooth: (boothId) => {
    get().updateBoothStatus(boothId, 'locked');
  },

  createContract: (contractData) => {
    const newContract: Contract = {
      ...contractData,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      contracts: [...state.contracts, newContract],
    }));

    return newContract;
  },

  signContract: (contractId) => {
    set((state) => ({
      contracts: state.contracts.map((c) =>
        c.id === contractId ? { ...c, status: 'signed', signedAt: new Date().toISOString() } : c
      ),
    }));
  },

  getContractByBookingId: (bookingId) =>
    get().contracts.find((c) => c.bookingId === bookingId),
}));
