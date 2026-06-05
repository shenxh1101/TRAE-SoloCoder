export type UserRole = 'engineer' | 'designer' | 'manager' | 'constructor' | 'chief';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export type TaskStatus = 
  | 'pending' 
  | 'geometry_check' 
  | 'bem_calculation' 
  | 'visualization' 
  | 'completed' 
  | 'abnormal';

export interface SourceParameters {
  frequencyHz: number;
  soundPowerLevelDb: number;
  sourceType: 'point' | 'line' | 'surface';
  sourcePosition: [number, number, number];
}

export interface Task {
  id: string;
  roomId: string;
  roomName: string;
  creatorId: string;
  creatorName: string;
  status: TaskStatus;
  currentStage: string;
  progressPercent: number;
  sourceParameters: SourceParameters;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RoomDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Room {
  id: string;
  name: string;
  geometryFilePath?: string;
  dimensions: RoomDimensions;
  volumeM3: number;
  surfaceAreaM2: number;
  purposeCategory: PurposeCategory;
  singularCount: number;
  isSuspended: boolean;
  suspendedReason?: string;
  createdBy: string;
  createdAt: string;
}

export type PurposeCategory = 
  | 'concert_hall' 
  | 'recording_studio' 
  | 'office' 
  | 'classroom' 
  | 'auditorium' 
  | 'home_theater'
  | 'restaurant';

export interface CalculationResult {
  id: string;
  taskId: string;
  rt60Values: number[];
  splDistribution: SplGridPoint[];
  uniformityScore: number;
  standingWaveRatio: number;
  maxSplDecibel: number;
  avgSplDecibel: number;
  calculationTimeSec: number;
  nodeCount: number;
  computedAt: string;
}

export interface SplGridPoint {
  position: [number, number, number];
  splDb: number;
}

export type AlertLevel = 'red' | 'orange' | 'yellow';

export type AlertStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  taskId: string;
  taskName: string;
  roomName: string;
  alertLevel: AlertLevel;
  alertType: 'spl_exceeded' | 'swr_high' | 'uniformity_low' | 'rt60_deviation';
  thresholdValue: number;
  actualValue: number;
  status: AlertStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  triggeredAt: string;
  reviewedAt?: string;
  responseTimeSec?: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  type: 'absorption' | 'diffusion' | 'bass_trap';
  density: number; // kg/m³
  thickness: number; // mm
  nrc: number; // Noise Reduction Coefficient
  costPerSqm: number;
  position: [number, number, number];
  areaSqm: number;
}

export interface SpeakerConfig {
  id: string;
  model: string;
  position: [number, number, number];
  orientation: [number, number, number];
  powerWatts: number;
  frequencyRangeHz: [number, number];
  coverageAngle: number;
}

export interface NoiseSolution {
  id: string;
  taskId: string;
  materials: MaterialItem[];
  speakerArray: SpeakerConfig[];
  estimatedCost: number;
  effectivenessPrediction: number;
  generatedAt: string;
}

export type ApprovalDecision = 'approved' | 'rejected' | 'escalated';

export interface Approval {
  id: string;
  taskId: string;
  approverId: string;
  approverName: string;
  level: 1 | 2;
  decision: ApprovalDecision;
  comment?: string;
  approvedAt: string;
}

export interface Report {
  id: string;
  taskId: string;
  filePath: string;
  templateType: 'standard' | 'detailed' | 'brief';
  fileSizeBytes: number;
  generatedAt: string;
}

export interface Recommendation {
  id: string;
  roomId: string;
  materialCombination: MaterialItem[];
  confidenceScore: number;
  basedOnTasks: string[];
  predictedEffectiveness: number;
  estimatedCost: number;
}

export interface RealtimeMetrics {
  taskId: string;
  uniformityScore: number;
  standingWaveRatio: number;
  maxSplDecibel: number;
  avgSplDecibel: number;
  currentFrequency: number;
  timestamp: string;
}

export interface DashboardStats {
  totalTasksToday: number;
  activeTasks: number;
  pendingAlerts: number;
  completionRate: number;
  avgResponseTime: number;
  complianceRate: number;
}

export interface AnalyticsData {
  monthlyCompletionRate: Array<{ month: string; rate: number }>;
  alertVsCompliance: Array<{ alerts: number; compliance: number }>;
  commonAnomalies: Array<{ type: string; count: number; percentage: number }>;
}
