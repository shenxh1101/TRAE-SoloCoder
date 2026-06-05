export type UserRole = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  department: string;
  role: UserRole;
  avatar?: string;
}

export type VehicleStatus = 'idle' | 'in_use' | 'maintenance' | 'disabled';

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  seats: number;
  status: VehicleStatus;
  currentMileage: number;
  fuelLevel: number;
  createdAt: Date;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

export interface Application {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  purpose: string;
  peopleCount: number;
  startTime: Date;
  endTime: Date;
  status: ApplicationStatus;
  approverId?: string;
  approvalLevel: 'department' | 'admin';
  createdAt: Date;
  approvedAt?: Date;
  approvalComment?: string;
  escalated: boolean;
  estimatedCost?: number;
  actualCost?: number;
}

export interface ReturnRecord {
  id: string;
  applicationId: string;
  actualMileage: number;
  fuelLevel: number;
  inspectionPhotos: string[];
  hasDamage: boolean;
  damageDescription?: string;
  returnedAt: Date;
}

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';

export interface Maintenance {
  id: string;
  vehicleId: string;
  applicationId: string;
  description: string;
  status: MaintenanceStatus;
  createdAt: Date;
  completedAt?: Date;
  estimatedCost?: number;
  actualCost?: number;
}

export interface DashboardStats {
  idleCount: number;
  inUseCount: number;
  maintenanceCount: number;
  todayUsage: number;
  violationCount: number;
  totalVehicles: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  type: 'booking' | 'maintenance';
  status: string;
  userName?: string;
}

export interface ViolationRecord {
  id: string;
  applicationId: string;
  userName: string;
  vehiclePlate: string;
  type: string;
  description: string;
  createdAt: Date;
}

export interface MonthlyCostData {
  month: string;
  cost: number;
  count: number;
}

export interface DepartmentUsageData {
  department: string;
  count: number;
  cost: number;
  mileage: number;
}
