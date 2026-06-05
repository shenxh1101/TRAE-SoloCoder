import { create } from 'zustand';
import type { FollowUp } from '../../shared/types';
import { get, post } from '@/utils/api';

function mapFollowUp(raw: any): FollowUp {
  return {
    id: String(raw.id),
    agreementId: String(raw.agreement_id || raw.agreementId || ''),
    month: raw.month || 1,
    dueDate: raw.scheduled_date || raw.dueDate || '',
    status: raw.status || 'pending',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    notes: raw.notes,
    completedAt: raw.completed_at || raw.completedAt,
    animalName: raw.animal_name || raw.animalName,
    animalPhoto: raw.animal_photo || raw.animalPhoto,
  };
}

interface FollowupState {
  followUps: FollowUp[];
}

interface FollowupActions {
  fetchFollowUps: () => Promise<void>;
  submitFollowUp: (id: string, data: { photos: string[]; notes?: string }) => Promise<void>;
}

const useFollowupStore = create<FollowupState & FollowupActions>((set) => ({
  followUps: [],

  fetchFollowUps: async () => {
    try {
      const data = await get<any[]>('/followup');
      set({ followUps: Array.isArray(data) ? data.map(mapFollowUp) : [] });
    } catch { /* empty */ }
  },

  submitFollowUp: async (id, data) => {
    const updated = await post<any>(`/followup/${id}`, data);
    set((state) => ({
      followUps: state.followUps.map((f) => (f.id === id ? mapFollowUp(updated) : f)),
    }));
  },
}));

export default useFollowupStore;
