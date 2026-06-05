import { User, Vehicle, Application, ReturnRecord, Maintenance, ViolationRecord } from '../types';
import { addDays, addHours, subDays, subHours } from 'date-fns';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    name: '张管理',
    department: '行政部',
    role: 'admin',
  },
  {
    id: '2',
    username: 'manager',
    password: 'manager123',
    name: '李经理',
    department: '技术部',
    role: 'manager',
  },
  {
    id: '3',
    username: 'employee',
    password: 'employee123',
    name: '王员工',
    department: '技术部',
    role: 'employee',
  },
  {
    id: '4',
    username: 'manager2',
    password: 'manager123',
    name: '赵经理',
    department: '市场部',
    role: 'manager',
  },
  {
    id: '5',
    username: 'employee2',
    password: 'employee123',
    name: '刘员工',
    department: '市场部',
    role: 'employee',
  },
  {
    id: '6',
    username: 'employee3',
    password: 'employee123',
    name: '陈员工',
    department: '财务部',
    role: 'employee',
  },
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    plateNumber: '京A12345',
    model: '大众帕萨特',
    seats: 5,
    status: 'idle',
    currentMileage: 35680,
    fuelLevel: 85,
    createdAt: subDays(new Date(), 365),
  },
  {
    id: 'v2',
    plateNumber: '京B67890',
    model: '别克GL8',
    seats: 7,
    status: 'in_use',
    currentMileage: 42150,
    fuelLevel: 60,
    createdAt: subDays(new Date(), 540),
  },
  {
    id: 'v3',
    plateNumber: '京C11111',
    model: '丰田凯美瑞',
    seats: 5,
    status: 'maintenance',
    currentMileage: 28900,
    fuelLevel: 40,
    createdAt: subDays(new Date(), 200),
  },
  {
    id: 'v4',
    plateNumber: '京D22222',
    model: '奔驰V260',
    seats: 9,
    status: 'idle',
    currentMileage: 15600,
    fuelLevel: 95,
    createdAt: subDays(new Date(), 100),
  },
  {
    id: 'v5',
    plateNumber: '京E33333',
    model: '本田雅阁',
    seats: 5,
    status: 'idle',
    currentMileage: 52300,
    fuelLevel: 70,
    createdAt: subDays(new Date(), 720),
  },
  {
    id: 'v6',
    plateNumber: '京F44444',
    model: '奥迪A6L',
    seats: 5,
    status: 'disabled',
    currentMileage: 89000,
    fuelLevel: 20,
    createdAt: subDays(new Date(), 1000),
  },
  {
    id: 'v7',
    plateNumber: '京G55555',
    model: '丰田考斯特',
    seats: 19,
    status: 'in_use',
    currentMileage: 67800,
    fuelLevel: 55,
    createdAt: subDays(new Date(), 450),
  },
  {
    id: 'v8',
    plateNumber: '京H66666',
    model: '特斯拉Model Y',
    seats: 5,
    status: 'idle',
    currentMileage: 12500,
    fuelLevel: 100,
    createdAt: subDays(new Date(), 60),
  },
];

export const mockApplications: Application[] = [
  {
    id: 'a1',
    userId: '3',
    userName: '王员工',
    userDepartment: '技术部',
    vehicleId: 'v2',
    vehiclePlate: '京B67890',
    vehicleModel: '别克GL8',
    purpose: '客户拜访',
    peopleCount: 4,
    startTime: addHours(new Date(), 1),
    endTime: addHours(new Date(), 5),
    status: 'approved',
    approverId: '2',
    approvalLevel: 'department',
    createdAt: subDays(new Date(), 1),
    approvedAt: subDays(new Date(), 1),
    escalated: false,
    estimatedCost: 500,
  },
  {
    id: 'a2',
    userId: '5',
    userName: '刘员工',
    userDepartment: '市场部',
    vehicleId: 'v7',
    vehiclePlate: '京G55555',
    vehicleModel: '丰田考斯特',
    purpose: '市场活动接送',
    peopleCount: 15,
    startTime: addHours(new Date(), 2),
    endTime: addHours(new Date(), 8),
    status: 'in_progress',
    approverId: '4',
    approvalLevel: 'department',
    createdAt: subDays(new Date(), 2),
    approvedAt: subDays(new Date(), 2),
    escalated: false,
    estimatedCost: 1200,
  },
  {
    id: 'a3',
    userId: '6',
    userName: '陈员工',
    userDepartment: '财务部',
    vehicleId: 'v1',
    vehiclePlate: '京A12345',
    vehicleModel: '大众帕萨特',
    purpose: '银行办事',
    peopleCount: 2,
    startTime: addDays(new Date(), 1),
    endTime: addDays(new Date(), 1.5),
    status: 'pending',
    approvalLevel: 'department',
    createdAt: subHours(new Date(), 12),
    escalated: false,
    estimatedCost: 300,
  },
  {
    id: 'a4',
    userId: '3',
    userName: '王员工',
    userDepartment: '技术部',
    vehicleId: 'v5',
    vehiclePlate: '京E33333',
    vehicleModel: '本田雅阁',
    purpose: '项目现场调试',
    peopleCount: 3,
    startTime: addDays(new Date(), 2),
    endTime: addDays(new Date(), 3),
    status: 'pending',
    approvalLevel: 'department',
    createdAt: subHours(new Date(), 26),
    escalated: true,
    estimatedCost: 800,
  },
  {
    id: 'a5',
    userId: '5',
    userName: '刘员工',
    userDepartment: '市场部',
    vehicleId: 'v4',
    vehiclePlate: '京D22222',
    vehicleModel: '奔驰V260',
    purpose: '重要客户接待',
    peopleCount: 6,
    startTime: subDays(new Date(), 3),
    endTime: subDays(new Date(), 2.5),
    status: 'completed',
    approverId: '4',
    approvalLevel: 'department',
    createdAt: subDays(new Date(), 5),
    approvedAt: subDays(new Date(), 5),
    escalated: false,
    estimatedCost: 600,
    actualCost: 580,
  },
  {
    id: 'a6',
    userId: '6',
    userName: '陈员工',
    userDepartment: '财务部',
    vehicleId: 'v1',
    vehiclePlate: '京A12345',
    vehicleModel: '大众帕萨特',
    purpose: '税务申报',
    peopleCount: 2,
    startTime: subDays(new Date(), 7),
    endTime: subDays(new Date(), 6.8),
    status: 'completed',
    approverId: '1',
    approvalLevel: 'admin',
    createdAt: subDays(new Date(), 9),
    approvedAt: subDays(new Date(), 9),
    escalated: true,
    estimatedCost: 250,
    actualCost: 265,
  },
  {
    id: 'a7',
    userId: '3',
    userName: '王员工',
    userDepartment: '技术部',
    vehicleId: 'v3',
    vehiclePlate: '京C11111',
    vehicleModel: '丰田凯美瑞',
    purpose: '供应商考察',
    peopleCount: 3,
    startTime: subDays(new Date(), 10),
    endTime: subDays(new Date(), 9.5),
    status: 'rejected',
    approverId: '2',
    approvalLevel: 'department',
    createdAt: subDays(new Date(), 12),
    approvedAt: subDays(new Date(), 12),
    approvalComment: '该时段已有其他安排，请调整时间',
    escalated: false,
    estimatedCost: 450,
  },
];

export const mockReturnRecords: ReturnRecord[] = [
  {
    id: 'r1',
    applicationId: 'a5',
    actualMileage: 15620,
    fuelLevel: 75,
    inspectionPhotos: [],
    hasDamage: false,
    returnedAt: subDays(new Date(), 2.5),
  },
  {
    id: 'r2',
    applicationId: 'a6',
    actualMileage: 35200,
    fuelLevel: 60,
    inspectionPhotos: [],
    hasDamage: true,
    damageDescription: '右前保险杠有轻微划痕',
    returnedAt: subDays(new Date(), 6.8),
  },
];

export const mockMaintenanceRecords: Maintenance[] = [
  {
    id: 'm1',
    vehicleId: 'v3',
    applicationId: 'a6',
    description: '右前保险杠划痕修复',
    status: 'in_progress',
    createdAt: subDays(new Date(), 6),
    estimatedCost: 800,
  },
  {
    id: 'm2',
    vehicleId: 'v3',
    applicationId: '',
    description: '常规保养 - 更换机油机滤',
    status: 'completed',
    createdAt: subDays(new Date(), 30),
    completedAt: subDays(new Date(), 28),
    estimatedCost: 600,
    actualCost: 580,
  },
];

export const mockViolationRecords: ViolationRecord[] = [
  {
    id: 'vi1',
    applicationId: 'a5',
    userName: '刘员工',
    vehiclePlate: '京D22222',
    type: '超速',
    description: '在五环路上超速行驶，时速120km/h',
    createdAt: subDays(new Date(), 2),
  },
  {
    id: 'vi2',
    applicationId: 'a6',
    userName: '陈员工',
    vehiclePlate: '京A12345',
    type: '违停',
    description: '在禁止停车区域停放车辆',
    createdAt: subDays(new Date(), 6),
  },
];

export const delay = (ms: number = 300): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const generateMockData = () => {
  return {
    users: mockUsers,
    vehicles: mockVehicles,
    applications: mockApplications,
    returnRecords: mockReturnRecords,
    maintenanceRecords: mockMaintenanceRecords,
    violationRecords: mockViolationRecords,
  };
};

export const initializeLocalStorage = () => {
  if (!localStorage.getItem('fleet_users')) {
    localStorage.setItem('fleet_users', JSON.stringify(mockUsers));
  }
  if (!localStorage.getItem('fleet_vehicles')) {
    localStorage.setItem('fleet_vehicles', JSON.stringify(mockVehicles));
  }
  if (!localStorage.getItem('fleet_applications')) {
    localStorage.setItem('fleet_applications', JSON.stringify(mockApplications));
  }
  if (!localStorage.getItem('fleet_returnRecords')) {
    localStorage.setItem('fleet_returnRecords', JSON.stringify(mockReturnRecords));
  }
  if (!localStorage.getItem('fleet_maintenance')) {
    localStorage.setItem('fleet_maintenance', JSON.stringify(mockMaintenanceRecords));
  }
  if (!localStorage.getItem('fleet_violations')) {
    localStorage.setItem('fleet_violations', JSON.stringify(mockViolationRecords));
  }
};

export const resetMockData = () => {
  localStorage.setItem('fleet_users', JSON.stringify(mockUsers));
  localStorage.setItem('fleet_vehicles', JSON.stringify(mockVehicles));
  localStorage.setItem('fleet_applications', JSON.stringify(mockApplications));
  localStorage.setItem('fleet_returnRecords', JSON.stringify(mockReturnRecords));
  localStorage.setItem('fleet_maintenance', JSON.stringify(mockMaintenanceRecords));
  localStorage.setItem('fleet_violations', JSON.stringify(mockViolationRecords));
};

export const initMockData = initializeLocalStorage;

export { generateId };
