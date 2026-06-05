export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'caregiver' | 'admin';
  avatar?: string;
}

export interface VaccineRecord {
  id: string;
  name: string;
  date: string;
  status: string;
  nextDate?: string;
}

export interface Pet {
  id: string;
  userId: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  gender?: 'male' | 'female';
  avatar: string;
  vaccines: VaccineRecord[];
  allergies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  features: string[];
  roomIds: string[];
  minAge?: number;
  maxAge?: number;
  minWeight?: number;
  maxWeight?: number;
  requiresAllergyFriendly?: boolean;
  createdAt?: string;
}

export type RoomStatus = 'available' | 'occupied' | 'locked' | 'maintenance';
export type RoomType = 'economy' | 'luxury';

export interface Room {
  id: string;
  name: string;
  type: 'standard' | 'luxury';
  status: RoomStatus;
  capacity: number;
  features: string[];
  createdAt?: string;
}

export interface Caregiver {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  recommendationWeight: number;
  specialties: string[];
  experienceYears: number;
  createdAt?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'in-progress' | 'completed' | 'cancelled';

export interface BookingUpdate {
  id: string;
  bookingId: string;
  caregiverId: string;
  type: 'photo' | 'video';
  content: string;
  note?: string;
  notes?: string;
  mediaUrls?: string[];
  videoUrl?: string;
  timestamp?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderType?: 'user' | 'caregiver';
  senderRole?: 'user' | 'caregiver' | 'admin';
  senderName?: string;
  timestamp?: string;
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  caregiverId: string;
  rating: number;
  comment?: string;
  content?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  petId: string;
  packageId: string;
  roomId: string;
  caregiverId: string;
  startDate: string;
  endDate: string;
  deposit: number;
  totalPrice: number;
  status: BookingStatus;
  updates: BookingUpdate[];
  messages: Message[];
  review: Review | null;
  reviewId?: string;
  createdAt: string;
}

export interface DashboardStats {
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
  pendingReminders: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  monthlyRevenue: number;
}

export interface ScheduleItem {
  id: string;
  caregiverId: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  createdAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

export interface RoomOccupancy {
  date: string;
  occupied: number;
  available: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface CaregiverPerformance {
  caregiverId: string;
  name: string;
  bookings: number;
  avgRating: number;
  revenue: number;
}

export type PackageType = 'economy' | 'luxury';

export interface BookingFilter {
  startDate?: string;
  endDate?: string;
  caregiverId?: string;
  packageType?: PackageType;
  status?: BookingStatus;
}
