export interface Terminal {
  id: string;
  name: string;
  code: string;
  gateCount: number;
  checkinCount: number;
  securityCount: number;
  carouselCount: number;
}

export interface Gate {
  id: string;
  terminalId: string;
  code: string;
  status: 'available' | 'occupied' | 'maintenance';
  aircraftType: string[];
  taxiTime: number;
  currentPosition: string;
}

export interface Flight {
  id: string;
  flightNo: string;
  airline: string;
  airlineCode: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  status: 'scheduled' | 'boarding' | 'departed' | 'delayed' | 'cancelled' | 'arrived';
  gateId: string | null;
  terminalId: string;
  aircraftType: string;
  passengerCount: number;
  delayReason: string | null;
  delayMinutes: number;
}

export interface CheckinCounter {
  id: string;
  terminalId: string;
  counterNo: string;
  status: 'open' | 'closed' | 'maintenance';
  flightId: string | null;
  airline: string | null;
  passengerLoad: number;
  timeSlot: string;
}

export interface SecurityChannel {
  id: string;
  terminalId: string;
  channelNo: string;
  status: 'open' | 'closed';
  currentFlow: number;
  suggestedStatus: 'open' | 'closed';
  throughput: number;
}

export interface Baggage {
  id: string;
  tagId: string;
  passengerId: string;
  flightId: string;
  status: 'checked_in' | 'screening' | 'sorted' | 'loaded' | 'transit' | 'arrived' | 'claimed';
  carouselId: string | null;
  location: string;
  lastUpdate: string;
}

export interface BaggageCarousel {
  id: string;
  terminalId: string;
  carouselNo: string;
  status: 'active' | 'idle' | 'maintenance';
  flightId: string | null;
  baggageCount: number;
}

export interface GroundCrew {
  id: string;
  name: string;
  skills: string[];
  currentTask: string | null;
  status: 'available' | 'busy' | 'off_duty';
  shift: string;
  location: string;
}

export interface Alert {
  id: string;
  type: 'peak' | 'emergency' | 'delay' | 'weather';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  terminalId: string;
}

export type UserRole = 'passenger' | 'ground_crew' | 'airline' | 'admin';

export interface Passenger {
  id: string;
  name: string;
  flightId: string;
  baggageIds: string[];
  role: UserRole;
}

export interface FilterParams {
  airline: string | null;
  terminalId: string | null;
  date: string | null;
  flightStatus: Flight['status'] | null;
}

export interface CompensationVoucher {
  id: string;
  flightId: string;
  passengerId: string;
  type: 'meal' | 'hotel' | 'transport';
  value: number;
  status: 'issued' | 'used' | 'expired';
}
