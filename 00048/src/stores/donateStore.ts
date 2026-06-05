import { create } from 'zustand';
import type { Donation, Fundraise } from '../../shared/types';
import { get, post } from '@/utils/api';

function mapDonation(raw: any): Donation {
  return {
    id: String(raw.id),
    userId: String(raw.user_id || raw.userId || ''),
    type: raw.type || 'one_time',
    amount: Number(raw.amount) || 0,
    status: raw.status || 'pending',
    createdAt: raw.created_at || raw.createdAt || '',
  };
}

function mapFundraise(raw: any): Fundraise {
  return {
    id: String(raw.id),
    initiatorId: String(raw.creator_id || raw.initiatorId || ''),
    animalId: '',
    animalName: raw.title || raw.animalName || '',
    animalPhoto: raw.cover_image || raw.animalPhoto || '',
    hospitalId: '',
    hospitalName: '',
    targetAmount: Number(raw.target_amount || raw.targetAmount) || 0,
    currentAmount: Number(raw.current_amount || raw.currentAmount) || 0,
    deadline: raw.end_date || raw.deadline || '',
    status: raw.status || 'active',
    participants: 0,
    createdAt: raw.created_at || raw.createdAt || '',
  };
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface DonateState {
  donations: Donation[];
  donationHistory: Donation[];
  certificate: unknown | null;
  fundraises: Fundraise[];
  currentFundraise: Fundraise | null;
}

interface DonateActions {
  createDonation: (data: { type: Donation['type']; amount: number }) => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchCertificate: (donationId: string) => Promise<void>;
  fetchFundraises: () => Promise<void>;
  createFundraise: (data: Record<string, unknown>) => Promise<void>;
  fetchFundraise: (id: string) => Promise<void>;
  donateToFundraise: (id: string, amount: number) => Promise<void>;
}

const useDonateStore = create<DonateState & DonateActions>((set) => ({
  donations: [],
  donationHistory: [],
  certificate: null,
  fundraises: [],
  currentFundraise: null,

  createDonation: async (data) => {
    const raw = await post('/donate', data);
    const donation = mapDonation(raw);
    set((state) => ({ donations: [...state.donations, donation] }));
  },

  fetchHistory: async () => {
    try {
      const data = await get<PaginatedData<any>>('/donate/history');
      set({ donationHistory: (data.items || []).map(mapDonation) });
    } catch { /* empty */ }
  },

  fetchCertificate: async (donationId) => {
    const certificate = await get(`/donate/certificate?id=${donationId}`);
    set({ certificate });
  },

  fetchFundraises: async () => {
    try {
      const data = await get<PaginatedData<any>>('/fundraise');
      set({ fundraises: (data.items || []).map(mapFundraise) });
    } catch { /* empty */ }
  },

  createFundraise: async (data) => {
    const raw = await post('/fundraise', data);
    const fundraise = mapFundraise(raw);
    set((state) => ({ fundraises: [fundraise, ...state.fundraises] }));
  },

  fetchFundraise: async (id) => {
    const raw = await get(`/fundraise/${id}`);
    const currentFundraise = mapFundraise(raw);
    set({ currentFundraise });
  },

  donateToFundraise: async (id, amount) => {
    const result = await post<any>(`/fundraise/${id}/donate`, { amount });
    const updated = mapFundraise(result.fundraise ?? result);
    set((state) => ({
      fundraises: state.fundraises.map((f) => (f.id === id ? updated : f)),
      currentFundraise: state.currentFundraise?.id === id ? updated : state.currentFundraise,
    }));
  },
}));

export default useDonateStore;
