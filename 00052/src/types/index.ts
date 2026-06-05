export type UserRole = 'doctor' | 'department_director' | 'blood_bank_director' | 'nurse' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  department: string;
}

export type BloodType = 'A' | 'B' | 'AB' | 'O';
export type BloodComponent = 'whole_blood' | 'plasma' | 'platelet';
export type BloodBagStatus = 'available' | 'allocated' | 'used' | 'expired' | 'quarantine';
export type RequestStatus = 'pending' | 'doctor_approved' | 'director_approved' | 'approved' | 'rejected' | 'cancelled' | 'cross_matched' | 'transporting' | 'delivered' | 'completed';
export type ApprovalDecision = 'approved' | 'rejected';
export type MatchResult = 'compatible' | 'incompatible' | 'pending';
export type TransportStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'temperature' | 'inventory' | 'overdue';

export interface StorageLocation {
  row: number;
  col: number;
  shelf: number;
}

export interface TestReport {
  id: string;
  bloodBagId: string;
  testDate: string;
  hemoglobin: number;
  hematocrit: number;
  plateletCount: number;
  wbcCount: number;
  infectiousDisease: boolean;
  remarks: string;
}

export interface BloodBag {
  id: string;
  bloodType: BloodType;
  component: BloodComponent;
  collectionDate: string;
  expiryDate: string;
  storageLocation: StorageLocation;
  status: BloodBagStatus;
  volume: number;
  donorId: string;
  testReports: TestReport[];
  position3D: { x: number; y: number; z: number };
}

export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  bloodType: BloodType;
  department: string;
  bedNumber: string;
}

export interface ApprovalRecord {
  id: string;
  requestId: string;
  approverRole: 'doctor' | 'department_director' | 'blood_bank_director';
  approverName: string;
  decision: ApprovalDecision;
  comments: string;
  approvedAt: string;
}

export interface CrossMatchResult {
  id: string;
  requestId: string;
  bloodBagId: string;
  matchResult: MatchResult;
  compatibilityScore: number;
  crossMatchMethod: string;
  performedAt: string;
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
  path: { x: number; y: number; z: number }[];
  status: TransportStatus;
  startTime: string;
  estimatedArrival: string;
  currentPosition: { x: number; y: number; z: number };
  progress: number;
  nurseConfirmation?: NurseConfirmation;
  bloodBagIds?: string[];
  destinationWard?: string;
}

export interface TransfusionRequest {
  id: string;
  patientId: string;
  patient?: Patient;
  requestingDoctor: string;
  department: string;
  bloodType: BloodType;
  component: BloodComponent;
  volume: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: RequestStatus;
  createdAt: string;
  crossMatchResult?: CrossMatchResult;
  approvalRecords: ApprovalRecord[];
  transportTask?: TransportTask;
}

export interface ColdStorage {
  id: string;
  name: string;
  currentTemperature: number;
  targetTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  backupCoolingActive: boolean;
  lastUpdate: string;
  alertStatus: 'normal' | 'warning' | 'critical';
  position3D: { x: number; y: number; z: number };
}

export interface BloodCollectionPlan {
  id: string;
  alertId: string;
  bloodType: BloodType;
  component: BloodComponent;
  requiredAmount: number;
  bloodStation: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed';
  plannedDate: string;
  contactPerson: string;
  phone: string;
}

export interface InventoryAlert {
  id: string;
  type: AlertType;
  bloodType: BloodType;
  component: BloodComponent;
  currentStock: number;
  threshold: number;
  severity: AlertSeverity;
  createdAt: string;
  acknowledged: boolean;
  collectionPlan?: BloodCollectionPlan;
  message: string;
}

export interface DailyReport {
  date: string;
  inventory: {
    bloodType: BloodType;
    component: BloodComponent;
    openingStock: number;
    received: number;
    issued: number;
    closingStock: number;
  }[];
  transfusionRequests: number;
  crossMatchCount: number;
  matchSuccessRate: number;
  approvalCount: number;
  transportCount: number;
  alerts: number;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  relatedId?: string;
}

export interface Robot {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'charging' | 'error';
  currentPosition: { x: number; y: number; z: number };
  battery: number;
  currentTaskId?: string;
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

export const STATUS_LABELS: Record<BloodBagStatus, string> = {
  'available': '可用',
  'allocated': '已分配',
  'used': '已使用',
  'expired': '已过期',
  'quarantine': '检疫中'
};

export const URGENCY_LABELS: Record<string, string> = {
  'routine': '常规',
  'urgent': '紧急',
  'emergency': '急诊'
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  'low': '#165DFF',
  'medium': '#FF7D00',
  'high': '#F53F3F',
  'critical': '#9E0A0A'
};

export const URGENCY_COLORS: Record<string, string> = {
  'routine': '#165DFF',
  'urgent': '#FF7D00',
  'emergency': '#F53F3F'
};

export const APPROVAL_LABELS: Record<string, string> = {
  'doctor': '医生',
  'department_director': '科室主任',
  'blood_bank_director': '血库主任'
};
