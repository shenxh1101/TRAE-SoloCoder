export type MemberLevel = 'normal' | 'silver' | 'gold';

export interface MemberBenefits {
  freeCarWashCount: number;
  maintenanceDiscount: number;
  rescuePriority: boolean;
  otherBenefits: string[];
}

export interface MemberInfo {
  level: MemberLevel;
  levelName: string;
  currentExp: number;
  nextLevelExp: number;
  upgradeProgress: number;
  yearConsumption: number;
  rescueCount: number;
  benefits: MemberBenefits;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  buyYear: number;
  mileage: number;
  lastMaintenanceDate: string;
  engineNumber: string;
  frameNumber: string;
  insuranceExpireDate: string;
  isDefault: boolean;
}

export interface UserInfo {
  id: string;
  phone: string;
  nickname: string;
  avatar: string;
  realName: string;
  idCard: string;
  memberInfo: MemberInfo;
  vehicles: Vehicle[];
  registerTime: string;
}

export interface ViolationRecord {
  id: string;
  vehicleId: string;
  plateNumber: string;
  time: string;
  location: string;
  reason: string;
  fine: number;
  points: number;
  status: 'unpaid' | 'paid' | 'processing';
}

export interface InsuranceInfo {
  id: string;
  vehicleId: string;
  company: string;
  policyNumber: string;
  type: string;
  startDate: string;
  expireDate: string;
  amount: number;
  status: 'active' | 'expiring' | 'expired';
}
