export type UserRole = 'exhibitor' | 'visitor' | 'operator' | 'provider' | 'finance';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  creditLevel?: number;
  company?: string;
  preferences?: {
    industries?: string[];
    interests?: string[];
  };
}

export interface ExhibitionHall {
  id: string;
  name: string;
  area: number;
  maxCapacity: number;
  safetyThreshold: number;
  boothCount: number;
  description?: string;
}

export interface Booth {
  id: string;
  hallId: string;
  code: string;
  area: number;
  location: { x: number; y: number };
  basePrice: number;
  popularityScore: number;
  status: 'available' | 'reserved' | 'locked' | 'occupied';
  zone: string;
  adjacentBooths: string[];
  exhibitorId?: string;
}

export interface BoothBooking {
  id: string;
  exhibitorId: string;
  boothId: string;
  boothCode: string;
  hallName: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  discountApplied: number;
  recommendedCombo?: string[];
  createdAt: string;
  companyName?: string;
}

export type ServiceType = 'construction' | 'electricity' | 'internet' | 'cleaning' | 'security' | 'logistics';

export interface ServiceOrder {
  id: string;
  exhibitorId: string;
  providerId: string;
  serviceType: ServiceType;
  description: string;
  scheduledTime: string;
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  exhibitorCreditLevel: number;
  boothCode: string;
  providerName?: string;
  progress?: number;
}

export interface ServiceProvider {
  id: string;
  name: string;
  serviceCategory: ServiceType[];
  location: { lat: number; lng: number };
  rating: number;
  responseTime: number;
  status: 'available' | 'busy' | 'offline';
  completedOrders: number;
  avatar?: string;
}

export interface Contract {
  id: string;
  bookingId: string;
  content: string;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: string;
  signatureUrl?: string;
  createdAt: string;
  amount: number;
}

export interface Forum {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  totalSeats: number;
  availableSeats: number;
  speaker: string;
  industry: string;
  description: string;
  hallId: string;
  hallName: string;
}

export interface ForumReservation {
  id: string;
  visitorId: string;
  forumId: string;
  forumTitle: string;
  status: 'confirmed' | 'waiting' | 'cancelled' | 'checked_in';
  createdAt: string;
  queuePosition?: number;
}

export interface RealtimeData {
  id: string;
  hallId: string;
  hallName: string;
  currentVisitors: number;
  boothUtilization: number;
  timestamp: string;
  warningLevel: 'normal' | 'caution' | 'warning' | 'danger';
}

export interface VisitorStatistics {
  id: string;
  bookingId: string;
  date: string;
  visitorCount: number;
  intentionCount: number;
  effectScore: number;
}

export interface FinanceReport {
  id: string;
  month: number;
  year: number;
  hallId: string;
  hallName: string;
  boothIncome: number;
  serviceIncome: number;
  utilizationRate: number;
  totalIncome: number;
}

export type NotificationType = 'booking' | 'service' | 'forum' | 'warning' | 'finance';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  status: 'unread' | 'read';
  createdAt: string;
  voucherUrl?: string;
  relatedId?: string;
  actionUrl?: string;
}

export interface PricingResult {
  basePrice: number;
  popularityMultiplier: number;
  dateMultiplier: number;
  demandMultiplier: number;
  discount: number;
  finalPrice: number;
  recommendedAdjacent?: Array<{
    booth: Booth;
    combinedPrice: number;
    saving: number;
  }>;
}

export interface RecommendationResult {
  exhibitor: User;
  booth: Booth;
  matchScore: number;
  reason: string;
}

export interface RoutePoint {
  boothId: string;
  boothCode: string;
  exhibitorName: string;
  industry: string;
  estimatedTime: number;
  order: number;
}

export interface VisitingRoute {
  id: string;
  visitorId: string;
  name: string;
  points: RoutePoint[];
  totalDuration: number;
  createdAt: string;
}
