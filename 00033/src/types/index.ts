export interface SeismicEvent {
  id: string;
  eventTime: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  mechanism: { strike: number; dip: number; rake: number } | null;
}

export interface Station {
  id: string;
  networkCode: string;
  stationCode: string;
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WaveformRecord {
  id: string;
  stationId: string;
  userId: string;
  fileName: string;
  format: 'sac' | 'mseed' | 'seed';
  sampleRate: number;
  dataPoints: number;
  startTime: string;
  endTime: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  snr?: number;
  qualityMetrics?: { completeness: number; frequencyRange: [number, number] };
}

export interface WaveformData {
  time: number[];
  amplitude: number[];
  processed: { time: number[]; amplitude: number[] } | null;
}

export interface VelocityLayer {
  depth: number;
  vp: number;
  vs: number;
  density: number;
}

export interface VelocityModel {
  id: string;
  name: string;
  layers: VelocityLayer[];
  createdAt: string;
}

export interface SimulationTask {
  id: string;
  userId: string;
  velocityModelId: string;
  type: 'forward' | 'inversion';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  config: Record<string, unknown>;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export interface WaveSnapshot {
  time: number;
  dataUrl: string;
}

export interface MomentTensor {
  mrr: number;
  mtt: number;
  mpp: number;
  mrt: number;
  mrp: number;
  mtp: number;
}

export interface FocalMechanism {
  strike: number;
  dip: number;
  rake: number;
}

export interface InversionTask {
  id: string;
  simulationId: string;
  eventId: string | null;
  initialMt: MomentTensor;
  bestMt: MomentTensor | null;
  bestMechanism: FocalMechanism | null;
  residual: number | null;
  iterations: number;
  status: 'running' | 'converged' | 'failed';
  convergenceHistory: Array<{ iteration: number; residual: number }>;
  createdAt: string;
}

export interface InversionVersion {
  id: string;
  inversionId: string;
  version: number;
  mechanism: MomentTensor;
  residual: number;
  note: string;
  createdAt: string;
}

export interface AlertRecord {
  id: string;
  triggerTime: string;
  stationIds: string[];
  signalType: string;
  location: { latitude: number; longitude: number; depth: number } | null;
  errorEllipse: { semiMajor: number; semiMinor: number; azimuth: number } | null;
  status: 'pending' | 'located' | 'acknowledged';
}

export interface NotificationRecord {
  id: string;
  alertId: string;
  recipient: string;
  sentAt: string;
  acknowledgedAt: string | null;
}

export interface Report {
  id: string;
  inversionId: string;
  userId: string;
  filePath: string;
  metadata: { title: string; author: string; institution: string };
  createdAt: string;
}

export interface CatalogQuery {
  startTime?: string;
  endTime?: string;
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  minMag?: number;
  maxMag?: number;
  page?: number;
  pageSize?: number;
}

export interface Recommendation {
  eventId: string;
  similarity: number;
  reason: string;
  initialModel: { mt: MomentTensor; velocityModelId: string };
}

export type FilterType = 'bandpass' | 'highpass' | 'lowpass' | 'demean' | 'detrend' | 'remove_response';

export interface PreprocessOperation {
  type: FilterType;
  params: Record<string, number>;
}
