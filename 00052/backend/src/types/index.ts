export type BloodType = 'A' | 'B' | 'AB' | 'O';
export type BloodComponent = 'whole_blood' | 'plasma' | 'platelet';
export type BloodBagStatus = 'available' | 'allocated' | 'used' | 'expired' | 'quarantined';
export type RequestStatus = 'pending' | 'doctor_approved' | 'director_approved' | 'approved' | 'rejected' | 'cancelled' | 'cross_matched' | 'transporting' | 'delivered' | 'completed';
export type ApprovalDecision = 'approved' | 'rejected';
export type MatchResult = 'compatible' | 'incompatible' | 'pending';
export type TransportStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'temperature' | 'inventory' | 'expiry' | 'system';
export type UserRole = 'doctor' | 'department_director' | 'blood_bank_director' | 'nurse' | 'admin';

export interface StorageLocation {
  shelf: number;
  row: number;
  column: number;
}

export interface TestReport {
  id: string;
  bloodBagId: string;
  testDate: string;
  hemoglobin: number;
  hematocrit: number;
  plateletCount: number;
  whiteBloodCellCount: number;
  ph: number;
  isNormal: boolean;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department?: string;
  token?: string;
}

export interface BloodBag {
  id: string;
  bloodType: BloodType;
  component: BloodComponent;
  collectionDate: string;
  expiryDate: string;
  storageLocation: StorageLocation;
  volume: number;
  donorId: string;
  testReports: TestReport[];
  position3D: Position3D;
  status: BloodBagStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  bloodType: BloodType;
  medicalRecordNumber: string;
  department: string;
  bedNumber: string;
  diagnosis: string;
}

export interface ApprovalRecord {
  id: string;
  requestId: string;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  decision: ApprovalDecision;
  comments?: string;
  approvedAt: string;
  approvalLevel: number;
}

export interface CrossMatchResult {
  id: string;
  requestId: string;
  bloodBagId: string;
  patientId: string;
  matchResult: MatchResult;
  crossMatchDate: string;
  performedBy: string;
  remarks?: string;
}

export interface NurseConfirmation {
  id: string;
  taskId: string;
  nurseName: string;
  confirmedAt: string;
  qrCode: string;
  isOverdue: boolean;
}

export interface TransportTask {
  id: string;
  requestId: string;
  robotId: string;
  path: Position3D[];
  status: TransportStatus;
  startTime: string;
  estimatedArrival: string;
  currentPosition: Position3D;
  progress: number;
  nurseConfirmation?: NurseConfirmation;
  bloodBagIds?: string[];
  destinationWard?: string;
}

export interface TransfusionRequest {
  id: string;
  patientId: string;
  bloodType: BloodType;
  component: BloodComponent;
  volume: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: string;
  requesterId: string;
  requesterName: string;
  department: string;
  ward: string;
  bedNumber: string;
  status: RequestStatus;
  approvalRecords: ApprovalRecord[];
  crossMatchResult?: CrossMatchResult;
  transportTask?: TransportTask;
  createdAt: string;
  updatedAt: string;
}

export interface ColdStorage {
  id: string;
  name: string;
  currentTemperature: number;
  targetTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  isBackupCoolingActive: boolean;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface BloodCollectionPlan {
  id: string;
  bloodType: BloodType;
  component: BloodComponent;
  targetVolume: number;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notifiedAt: string;
  bloodStationName: string;
}

export interface InventoryAlert {
  id: string;
  bloodType: BloodType;
  component: BloodComponent;
  currentStock: number;
  threshold: number;
  daysOfSupply: number;
  severity: AlertSeverity;
  acknowledged: boolean;
  createdAt: string;
  collectionPlanId?: string;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
  details?: Record<string, any>;
}

export interface DailyReport {
  reportDate: string;
  inventoryStats: Record<BloodType, Record<BloodComponent, { available: number; total: number; used: number; expired: number }>>;
  inRecords: { bloodBagId: string; bloodType: BloodType; component: BloodComponent; volume: number; date: string }[];
  outRecords: { bloodBagId: string; bloodType: BloodType; component: BloodComponent; volume: number; date: string; patientName: string }[];
  matchStats: { total: number; compatible: number; incompatible: number; matchRate: number };
}

export interface Robot {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'charging' | 'error';
  battery: number;
  currentPosition: Position3D;
  currentTaskId?: string;
}

export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  type: 'floor' | 'wall' | 'door' | 'elevator' | 'blood_bank' | 'nurse_station' | 'ward' | 'corridor';
  label?: string;
}

export interface FloorMap {
  width: number;
  height: number;
  grid: GridCell[][];
  scale: number;
  origin: Position3D;
}

export const BLOOD_TYPE_COLORS: Record<BloodType, string> = {
  'A': '#165DFF',
  'B': '#722ED1',
  'AB': '#F53F3F',
  'O': '#00B42A'
};

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  'A': 'A型',
  'B': 'B型',
  'AB': 'AB型',
  'O': 'O型'
};

export const COMPONENT_LABELS: Record<BloodComponent, string> = {
  'whole_blood': '全血',
  'plasma': '血浆',
  'platelet': '血小板'
};

export const URGENCY_LABELS: Record<string, string> = {
  'routine': '常规',
  'urgent': '紧急',
  'emergency': '急诊'
};

export const URGENCY_COLORS: Record<string, string> = {
  'routine': '#165DFF',
  'urgent': '#F7BA1E',
  'emergency': '#F53F3F'
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  'low': '#86909C',
  'medium': '#F7BA1E',
  'high': '#FF7D00',
  'critical': '#F53F3F'
};

export const APPROVAL_LABELS: Record<string, string> = {
  'pending': '待审批',
  'doctor_approved': '医生已审批',
  'director_approved': '主任已审批',
  'approved': '血库主任已审批',
  'rejected': '已拒绝',
  'cancelled': '已取消',
  'cross_matched': '已配血',
  'transporting': '运输中',
  'delivered': '已送达',
  'completed': '已完成'
};

export const ROLE_LABELS: Record<UserRole, string> = {
  'doctor': '医生',
  'department_director': '科室主任',
  'blood_bank_director': '血库主任',
  'nurse': '护士',
  'admin': '管理员'
};
