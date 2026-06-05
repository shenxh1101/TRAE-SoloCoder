export type PlasmaType = 'TOKAMAK' | 'STELLARATOR' | 'INERTIAL' | 'MAGNETIC_MIRROR' | 'OTHER';

export type SimulationStatus =
  | 'PENDING'
  | 'PARAM_VALIDATION'
  | 'GRID_GENERATION'
  | 'COMPUTING'
  | 'DATA_DIAGNOSIS'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED';

export type SimulationMode = 'FLUID_MHD' | 'PARTICLE_PIC' | 'HYBRID';

export type BoundaryType = 'DIRICHLET' | 'NEUMANN' | 'PERIODIC' | 'ABSORBING';

export type SourceType = 'HEATING' | 'CURRENT_DRIVE' | 'FUELING' | 'IMPURITY';

export type NotificationType =
  | 'PERFORMANCE_ALERT'
  | 'CONVERGENCE_ISSUE'
  | 'SIMULATION_COMPLETE'
  | 'SUGGESTION'
  | 'INSTABILITY_ALERT';

export type UserRole = 'ADMIN' | 'LEADER' | 'MEMBER';

export interface PlasmaParameters {
  densityProfile: number[][];
  temperatureProfile: number[][];
  magneticField: number;
  majorRadius: number;
  minorRadius: number;
  plasmaCurrent: number;
}

export interface BoundaryCondition {
  id: string;
  name: string;
  type: BoundaryType;
  location: 'INNER' | 'OUTER' | 'TOP' | 'BOTTOM';
  value: number;
}

export interface SourceTerm {
  id: string;
  name: string;
  type: SourceType;
  amplitude: number;
  spatialProfile: string;
  startTime: number;
  duration: number;
}

export interface SimulationResult {
  finalDensity: number[][][];
  finalTemperature: number[][][];
  velocityField: number[][][][];
  confinementTime: number;
  fusionPower: number;
  energyConfinement: number;
  betaValue: number;
  stabilityMargin: number;
  timeSeriesData: TimeSeriesData[];
  performanceTargets: PerformanceTargets;
}

export interface PerformanceTargets {
  targetConfinementTime: number;
  targetFusionPower: number;
  targetBetaValue: number;
  targetStabilityMargin: number;
}

export interface TimeSeriesData {
  time: number;
  growthRate: number;
  averageDensity: number;
  averageTemperature: number;
  storedEnergy: number;
  timeStep: number;
  mode: SimulationMode;
}

export interface Simulation {
  id: string;
  name: string;
  description: string;
  plasmaType: PlasmaType;
  status: SimulationStatus;
  mode: SimulationMode;
  parameters: PlasmaParameters;
  boundaryConditions: BoundaryCondition[];
  sourceTerms: SourceTerm[];
  modelType: string;
  createdAt: string;
  createdBy: string;
  progress: number;
  instabilityGrowthRate: number;
  convergenceCount: number;
  timeStep: number;
  instabilityThreshold: number;
  result?: SimulationResult;
  statusLog: StatusLogEntry[];
  computeLog: string[];
}

export interface StatusLogEntry {
  status: SimulationStatus;
  timestamp: string;
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  simulationId?: string;
  read: boolean;
  createdAt: string;
  recipients: string[];
}

export interface RadarDataPoint {
  simulationId: string;
  simulationName: string;
  indicators: {
    name: string;
    value: number;
    max: number;
    unit: string;
  }[];
  color: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'BOUNDARY' | 'SOURCE' | 'PARAMETER' | 'MODEL' | 'GRID';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedImprovement: string;
  parameterAffected: string;
  suggestedValue: number;
}

export interface ComparisonResult {
  simulationIds: string[];
  parameters: string[];
  radarData: RadarDataPoint[];
  underperformingIds: string[];
  suggestions: OptimizationSuggestion[];
  comparisonTime: string;
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  detectedPlasmaType: PlasmaType;
  matchedModel: string;
  parameters: PlasmaParameters;
  warnings: string[];
}

export interface GridConfig {
  dimensions: number;
  resolution: { x: number; y: number; z: number };
  type: 'uniform' | 'stretched' | 'adaptive';
}

export interface StabilityAnalysis {
  growthRate: number;
  modeNumber: number;
  unstable: boolean;
  threshold: number;
  recommendation: 'CONTINUE' | 'REDUCE_STEP' | 'SWITCH_MODE' | 'PAUSE';
}

export const PLASMA_TYPE_LABELS: Record<PlasmaType, string> = {
  TOKAMAK: '托克马克',
  STELLARATOR: '仿星器',
  INERTIAL: '惯性约束',
  MAGNETIC_MIRROR: '磁镜',
  OTHER: '其他',
};

export const STATUS_LABELS: Record<SimulationStatus, string> = {
  PENDING: '等待中',
  PARAM_VALIDATION: '参数校验',
  GRID_GENERATION: '网格生成',
  COMPUTING: '模拟计算',
  DATA_DIAGNOSIS: '数据诊断',
  COMPLETED: '已完成',
  PAUSED: '已暂停',
  FAILED: '失败',
};

export const MODE_LABELS: Record<SimulationMode, string> = {
  FLUID_MHD: '流体 MHD 模型',
  PARTICLE_PIC: '粒子 PIC 模型',
  HYBRID: '混合模型',
};

export const BOUNDARY_TYPE_LABELS: Record<BoundaryType, string> = {
  DIRICHLET: '狄利克雷边界',
  NEUMANN: '诺依曼边界',
  PERIODIC: '周期性边界',
  ABSORBING: '吸收边界',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  HEATING: '加热源',
  CURRENT_DRIVE: '电流驱动',
  FUELING: '燃料注入',
  IMPURITY: '杂质注入',
};

export const STATUS_FLOW: SimulationStatus[] = [
  'PARAM_VALIDATION',
  'GRID_GENERATION',
  'COMPUTING',
  'DATA_DIAGNOSIS',
  'COMPLETED',
];
