import { create } from 'zustand';
import type { Animal, AdoptionMatch, AdoptionQuestionnaire, AdoptionAgreement } from '../../shared/types';
import { get, post } from '@/utils/api';

function mapAnimal(raw: any): Animal {
  return {
    id: String(raw.id),
    name: raw.name,
    type: raw.type,
    breed: raw.breed,
    age: raw.age,
    gender: raw.gender || 'unknown',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    personality: Array.isArray(raw.personality) ? raw.personality : [],
    rescueTaskId: String(raw.rescue_task_id || raw.rescueTaskId || ''),
    hospitalId: raw.hospital_id || raw.hospitalId ? String(raw.hospital_id || raw.hospitalId) : undefined,
    hospitalName: raw.hospital_name || raw.hospitalName,
    status: raw.status,
    medicalRecords: [],
    vaccines: [],
    isNeutered: Boolean(raw.neutered ?? raw.isNeutered ?? false),
    recoveryProgress: raw.recovery_progress ?? raw.recoveryProgress ?? 50,
    estimatedRecovery: raw.estimated_recovery || raw.estimatedRecovery,
    createdAt: raw.created_at || raw.createdAt || '',
  };
}

function mapMatch(raw: any): AdoptionMatch {
  return {
    animalId: String(raw.id),
    animal: mapAnimal(raw),
    matchScore: raw.match_score ?? raw.matchScore ?? 0,
    matchReasons: raw.match_reasons || raw.matchReasons || [],
  };
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface AdoptState {
  availableAnimals: Animal[];
  matches: AdoptionMatch[];
  questionnaire: AdoptionQuestionnaire | null;
  appointments: unknown[];
  agreements: AdoptionAgreement[];
  myAdoptions: unknown[];
}

interface AdoptActions {
  fetchAvailable: () => Promise<void>;
  submitQuestionnaire: (data: Record<string, unknown>) => Promise<void>;
  fetchMatches: () => Promise<void>;
  createAppointment: (data: Record<string, unknown>) => Promise<void>;
  signAgreement: (data: { questionnaire_id: string; terms?: string }) => Promise<void>;
  fetchMyAdoptions: () => Promise<void>;
}

const useAdoptStore = create<AdoptState & AdoptActions>((set) => ({
  availableAnimals: [],
  matches: [],
  questionnaire: null,
  appointments: [],
  agreements: [],
  myAdoptions: [],

  fetchAvailable: async () => {
    try {
      const data = await get<PaginatedData<any>>('/adopt/available');
      set({ availableAnimals: (data.items || []).map(mapAnimal) });
    } catch { /* empty */ }
  },

  submitQuestionnaire: async (data) => {
    const questionnaire = await post<AdoptionQuestionnaire>('/adopt/questionnaire', data);
    set({ questionnaire });
  },

  fetchMatches: async () => {
    try {
      const rawList = await get<any[]>('/adopt/match');
      set({ matches: (rawList || []).map(mapMatch) });
    } catch { set({ matches: [] }); }
  },

  createAppointment: async (data) => {
    const appointment = await post('/adopt/appointment', data);
    set((state) => ({ appointments: [...state.appointments, appointment] }));
  },

  signAgreement: async (data) => {
    const agreement = await post<AdoptionAgreement>('/adopt/agreement', data);
    set((state) => ({ agreements: [...state.agreements, agreement] }));
  },

  fetchMyAdoptions: async () => {
    const myAdoptions = await get<unknown[]>('/adopt/my');
    set({ myAdoptions });
  },
}));

export default useAdoptStore;
