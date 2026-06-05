import { create } from 'zustand';
import type { Animal, RescueTask, StrayReport, MedicalRecord, VaccineRecord } from '../../shared/types';
import { get, post, patch } from '@/utils/api';

function mapRescueTask(raw: any): RescueTask {
  return {
    id: String(raw.id),
    reportId: String(raw.reportId || raw.report_id || ''),
    volunteerId: raw.volunteerId || raw.volunteer_id ? String(raw.volunteerId || raw.volunteer_id) : undefined,
    volunteerName: raw.volunteerName || raw.volunteer_name || undefined,
    status: raw.status,
    address: raw.address || raw.location || '',
    lat: Number(raw.lat || raw.latitude || 0),
    lng: Number(raw.lng || raw.longitude || 0),
    urgency: raw.urgency || 'medium',
    animalType: raw.animalType || raw.animal_type,
    description: raw.description,
    notes: raw.notes,
    createdAt: raw.createdAt || raw.created_at || '',
  };
}

function mapMedicalRecord(raw: any): MedicalRecord {
  return {
    id: String(raw.id),
    animalId: String(raw.animalId || raw.animal_id || ''),
    hospitalId: String(raw.hospitalId || raw.hospital_id || ''),
    hospitalName: raw.hospitalName || raw.hospital_name,
    diagnosis: raw.diagnosis || '',
    treatment: raw.treatment || '',
    medication: raw.prescription || raw.medication || '',
    notes: raw.notes,
    date: raw.record_date || raw.date || '',
  };
}

function mapVaccineRecord(raw: any): VaccineRecord {
  return {
    id: String(raw.id),
    animalId: String(raw.animalId || raw.animal_id || ''),
    name: raw.vaccine_name || raw.name || '',
    date: raw.vaccinate_date || raw.date || '',
    nextDate: raw.next_date || raw.nextDate,
  };
}

function mapAnimal(raw: any): Animal {
  return {
    id: String(raw.id),
    name: raw.name,
    type: raw.type,
    breed: raw.breed,
    age: raw.age,
    gender: raw.gender || 'unknown',
    photos: raw.photos || [],
    personality: raw.personality || [],
    rescueTaskId: String(raw.rescueTaskId || raw.rescue_task_id || ''),
    hospitalId: raw.hospitalId || raw.hospital_id ? String(raw.hospitalId || raw.hospital_id) : undefined,
    hospitalName: raw.hospitalName || raw.hospital_name || undefined,
    status: raw.status,
    medicalRecords: (raw.medical_records || raw.medicalRecords || []).map(mapMedicalRecord),
    vaccines: (raw.vaccine_records || raw.vaccines || []).map(mapVaccineRecord),
    isNeutered: Boolean(raw.neutered ?? raw.isNeutered ?? false),
    recoveryProgress: raw.recoveryProgress ?? raw.recovery_progress ?? 50,
    estimatedRecovery: raw.estimatedRecovery || raw.estimated_recovery,
    createdAt: raw.createdAt || raw.created_at || '',
  };
}

function mapStrayReport(raw: any): StrayReport {
  return {
    id: String(raw.id),
    reporterId: String(raw.user_id || raw.reporterId || ''),
    reporterName: raw.reporterName,
    photos: raw.photos || [],
    address: raw.location || raw.address || '',
    lat: Number(raw.latitude || raw.lat || 0),
    lng: Number(raw.longitude || raw.lng || 0),
    city: raw.city || '',
    district: raw.district,
    animalType: raw.animal_type || raw.animalType || 'other',
    description: raw.description || '',
    conditionStatus: raw.conditionStatus || 'healthy',
    urgency: raw.urgency || 'medium',
    status: raw.status || 'pending',
    createdAt: raw.created_at || raw.createdAt || '',
  };
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface AnimalState {
  animals: Animal[];
  rescueTasks: RescueTask[];
  reports: StrayReport[];
  currentAnimal: Animal | null;
  loading: boolean;
}

interface AnimalActions {
  fetchAnimals: () => Promise<void>;
  fetchAnimal: (id: string) => Promise<void>;
  fetchRescueTasks: (status?: string) => Promise<void>;
  fetchReports: () => Promise<void>;
  createReport: (data: Record<string, unknown>) => Promise<StrayReport>;
  acceptTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: string, notes?: string) => Promise<void>;
}

const useAnimalStore = create<AnimalState & AnimalActions>((set) => ({
  animals: [],
  rescueTasks: [],
  reports: [],
  currentAnimal: null,
  loading: false,

  fetchAnimals: async () => {
    set({ loading: true });
    try {
      const data = await get<PaginatedData<Animal>>('/animals');
      set({ animals: (data.items || []).map(mapAnimal), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAnimal: async (id) => {
    set({ loading: true });
    try {
      const animal = await get<Animal>(`/animals/${id}`);
      set({ currentAnimal: mapAnimal(animal), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchRescueTasks: async (status) => {
    set({ loading: true });
    try {
      const query = status ? `?status=${status}` : '';
      const data = await get<PaginatedData<RescueTask>>(`/rescue${query}`);
      set({ rescueTasks: (data.items || []).map(mapRescueTask), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchReports: async () => {
    set({ loading: true });
    try {
      const data = await get<PaginatedData<StrayReport>>('/reports');
      set({ reports: (data.items || []).map(mapStrayReport), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createReport: async (data) => {
    const report = await post<StrayReport>('/reports', data);
    const mapped = mapStrayReport(report);
    set((state) => ({ reports: [mapped, ...state.reports] }));
    return mapped;
  },

  acceptTask: async (id) => {
    const task = await post<RescueTask>(`/rescue/${id}/accept`);
    const mapped = mapRescueTask(task);
    set((state) => ({
      rescueTasks: state.rescueTasks.map((t) => (t.id === id ? mapped : t)),
    }));
  },

  updateTaskStatus: async (id, status, notes) => {
    const task = await patch<RescueTask>(`/rescue/${id}/status`, { status, notes });
    const mapped = mapRescueTask(task);
    set((state) => ({
      rescueTasks: state.rescueTasks.map((t) => (t.id === id ? mapped : t)),
    }));
  },
}));

export default useAnimalStore;
