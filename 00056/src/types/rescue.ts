export type RescueType = 'towing' | 'battery' | 'tire' | 'fuel' | 'lockout' | 'other';

export type RescueStatus = 'pending' | 'dispatched' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RescueVehicle {
  id: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  type: string;
  currentLocation: Location;
  status: 'idle' | 'busy' | 'offline';
  distance?: number;
}

export interface RescueRequest {
  id: string;
  orderNo: string;
  userId: string;
  vehicleId: string;
  plateNumber: string;
  type: RescueType;
  typeName: string;
  description: string;
  location: Location;
  status: RescueStatus;
  statusText: string;
  rescueVehicleId?: string;
  rescueVehicle?: RescueVehicle;
  estimatedArrivalTime?: number;
  estimatedCost?: number;
  actualCost?: number;
  createTime: string;
  dispatchTime?: string;
  arrivalTime?: string;
  completeTime?: string;
}

export interface AdminDashboardData {
  totalOrders: number;
  todayOrders: number;
  totalRescues: number;
  todayRescues: number;
  avgResponseTime: number;
  orderCompletionRate: number;
  totalRevenue: number;
  customerSatisfaction: number;
  storeStats: {
    storeId: string;
    storeName: string;
    city: string;
    orderCount: number;
    rescueCount: number;
    avgResponseTime: number;
    completionRate: number;
  }[];
  timeStats: {
    date: string;
    orderCount: number;
    rescueCount: number;
    revenue: number;
  }[];
}

export interface MonthlyReport {
  month: string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  orderCount: number;
  rescueCount: number;
  avgOrderAmount: number;
  customerSatisfaction: number;
  newMembers: number;
  storeBreakdown: {
    storeName: string;
    revenue: number;
    orderCount: number;
    rescueCount: number;
  }[];
  serviceBreakdown: {
    serviceType: string;
    count: number;
    revenue: number;
  }[];
}
