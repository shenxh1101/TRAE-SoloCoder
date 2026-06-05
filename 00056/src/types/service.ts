export type ServiceType = 'car_wash' | 'maintenance' | 'repair' | 'rescue';

export type ServiceStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface ServicePackage {
  id: string;
  name: string;
  type: ServiceType;
  description: string;
  price: number;
  originalPrice: number;
  duration: number;
  suitableMileage: string;
  suitableModels: string[];
  includes: string[];
  image: string;
  isRecommend: boolean;
  isHot: boolean;
  discount?: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  district: string;
  businessHours: string;
  rating: number;
  ratingCount: number;
  distance?: number;
  services: string[];
  image: string;
}

export interface BookingTimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  vehicleId: string;
  storeId: string;
  packageId: string;
  packageName: string;
  serviceType: ServiceType;
  bookingDate: string;
  bookingTime: string;
  status: ServiceStatus;
  paymentStatus: PaymentStatus;
  createTime: string;
  remark?: string;
}

export interface WorkOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface WorkOrder {
  id: string;
  bookingId: string;
  orderNo: string;
  technician: string;
  items: WorkOrderItem[];
  totalPrice: number;
  status: ServiceStatus;
  paymentStatus: PaymentStatus;
  createTime: string;
  confirmTime?: string;
  startTime?: string;
  completeTime?: string;
  progress: number;
  progressSteps: {
    name: string;
    status: 'pending' | 'current' | 'completed';
    time?: string;
  }[];
}

export interface OrderRecord {
  id: string;
  orderNo: string;
  type: ServiceType;
  typeName: string;
  storeName: string;
  vehiclePlate: string;
  amount: number;
  status: ServiceStatus;
  statusText: string;
  createTime: string;
}
