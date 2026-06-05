import { create } from 'zustand';
import type {
  SeismicEvent,
  Station,
  WaveformRecord,
  VelocityModel,
  SimulationTask,
  InversionTask,
  InversionVersion,
  AlertRecord,
  Report,
  CatalogQuery,
  Recommendation,
  WaveSnapshot,
  MomentTensor,
} from '@/types';

interface AppState {
  currentPage: string;
  setCurrentPage: (page: string) => void;

  stations: Station[];
  setStations: (stations: Station[]) => void;

  waveforms: WaveformRecord[];
  addWaveform: (wf: WaveformRecord) => void;
  updateWaveform: (id: string, updates: Partial<WaveformRecord>) => void;

  velocityModels: VelocityModel[];
  setVelocityModels: (models: VelocityModel[]) => void;
  selectedVelocityModelId: string | null;
  setSelectedVelocityModel: (id: string | null) => void;

  simulations: SimulationTask[];
  addSimulation: (sim: SimulationTask) => void;
  updateSimulation: (id: string, updates: Partial<SimulationTask>) => void;

  waveSnapshots: WaveSnapshot[];
  setWaveSnapshots: (snapshots: WaveSnapshot[]) => void;
  currentSnapshotIndex: number;
  setCurrentSnapshotIndex: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  inversions: InversionTask[];
  addInversion: (inv: InversionTask) => void;
  updateInversion: (id: string, updates: Partial<InversionTask>) => void;
  currentInversionId: string | null;
  setCurrentInversion: (id: string | null) => void;
  inversionVersions: InversionVersion[];
  setInversionVersions: (versions: InversionVersion[]) => void;
  initialMt: MomentTensor;
  setInitialMt: (mt: MomentTensor) => void;

  events: SeismicEvent[];
  setEvents: (events: SeismicEvent[]) => void;

  alerts: AlertRecord[];
  setAlerts: (alerts: AlertRecord[]) => void;
  updateAlert: (id: string, updates: Partial<AlertRecord>) => void;
  unreadAlertCount: number;
  setUnreadAlertCount: (count: number) => void;

  catalogQuery: CatalogQuery;
  setCatalogQuery: (query: CatalogQuery) => void;

  recommendations: Recommendation[];
  setRecommendations: (recs: Recommendation[]) => void;

  reports: Report[];
  addReport: (report: Report) => void;
}

const defaultMt: MomentTensor = { mrr: 1, mtt: 0, mpp: -1, mrt: 0, mrp: 0, mtp: 0 };

export const useStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  stations: [],
  setStations: (stations) => set({ stations }),

  waveforms: [],
  addWaveform: (wf) => set((s) => ({ waveforms: [...s.waveforms, wf] })),
  updateWaveform: (id, updates) =>
    set((s) => ({
      waveforms: s.waveforms.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),

  velocityModels: [],
  setVelocityModels: (models) => set({ velocityModels: models }),
  selectedVelocityModelId: null,
  setSelectedVelocityModel: (id) => set({ selectedVelocityModelId: id }),

  simulations: [],
  addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
  updateSimulation: (id, updates) =>
    set((s) => ({
      simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, ...updates } : sim)),
    })),

  waveSnapshots: [],
  setWaveSnapshots: (snapshots) => set({ waveSnapshots: snapshots }),
  currentSnapshotIndex: 0,
  setCurrentSnapshotIndex: (idx) => set({ currentSnapshotIndex: idx }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  inversions: [],
  addInversion: (inv) => set((s) => ({ inversions: [...s.inversions, inv] })),
  updateInversion: (id, updates) =>
    set((s) => ({
      inversions: s.inversions.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
    })),
  currentInversionId: null,
  setCurrentInversion: (id) => set({ currentInversionId: id }),
  inversionVersions: [],
  setInversionVersions: (versions) => set({ inversionVersions: versions }),
  initialMt: defaultMt,
  setInitialMt: (mt) => set({ initialMt: mt }),

  events: [],
  setEvents: (events) => set({ events }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  updateAlert: (id, updates) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  unreadAlertCount: 0,
  setUnreadAlertCount: (count) => set({ unreadAlertCount: count }),

  catalogQuery: {},
  setCatalogQuery: (query) => set({ catalogQuery: query }),

  recommendations: [],
  setRecommendations: (recs) => set({ recommendations: recs }),

  reports: [],
  addReport: (report) => set((s) => ({ reports: [...s.reports, report] })),
}));
