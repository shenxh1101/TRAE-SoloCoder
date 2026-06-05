export type Direction = 'north' | 'south' | 'east' | 'west';

export type VehicleType = 'car' | 'bus' | 'fire' | 'ambulance';

export type VehicleStatus = 'normal' | 'priority' | 'emergency';

export type EventType = 'congestion' | 'accident' | 'abnormal_parking';

export type EventSeverity = 'low' | 'medium' | 'high';

export type EventStatus = 'detected' | 'dispatched' | 'processing' | 'resolved';

export type WorkOrderStatus = 'pending' | 'accepted' | 'completed';

export type ControlPlanType = 'road_closure' | 'diversion' | 'signal_adjustment';

export type ControlPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

export type PlanStatus = ControlPlanStatus;

export type ApprovalLevel = 'command_center' | 'transport_bureau' | 'city_hall' | 'city_government';

export type ApprovalStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected'
  | 'draft'
  | 'pending_command'
  | 'approved_command'
  | 'rejected_command'
  | 'pending_bureau'
  | 'approved_bureau'
  | 'rejected_bureau'
  | 'pending_government'
  | 'approved_government'
  | 'rejected_government'
  | 'implemented';

export type UserRole = 'traffic_police' | 'command_director' | 'transport_bureau';

export interface SignalTiming {
  green: number;
  yellow: number;
  red: number;
}

export interface TrafficFlow {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Intersection {
  id: string;
  name: string;
  position: [number, number, number];
  trafficFlow: TrafficFlow;
  congestionIndex: number;
  signalTiming: {
    north: SignalTiming;
    south: SignalTiming;
    east: SignalTiming;
    west: SignalTiming;
    currentPhase: Direction;
    remainingTime: number;
  };
  avgDelay: number;
  accidents: number;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  position: [number, number, number];
  rotation: [number, number, number];
  speed: number;
  route: string;
  status: VehicleStatus;
  plateNumber: string;
}

export interface RoadSegment {
  id: string;
  name: string;
  start: [number, number, number];
  end: [number, number, number];
  lanes: number;
  congestionIndex: number;
  avgSpeed: number;
  isClosed: boolean;
  history: { timestamp: number; congestionIndex: number; flowRate: number; avgSpeed: number }[];
  predictions?: { timestamp: number; congestionIndex: number; confidence: number }[];
  heatmapIntensity?: number;
}

export interface TrafficEvent {
  id: string;
  type: EventType;
  location: [number, number, number];
  roadId: string;
  severity: EventSeverity;
  description: string;
  status: EventStatus;
  cameraFeed?: string;
  workOrder?: WorkOrder;
  createdAt: Date;
}

export interface WorkOrder {
  id: string;
  eventId: string;
  assignee: string;
  status: WorkOrderStatus;
  createdAt: Date;
  notes?: string;
}

export interface ControlPlan {
  id: string;
  name: string;
  description: string;
  type: ControlPlanType;
  status: ControlPlanStatus | ApprovalStatus;
  approvalHistory: ApprovalRecord[];
  currentLevel?: number;
  affectedAreas: string[];
  startTime: Date;
  endTime: Date;
  createdBy: string;
  roadClosures?: { roadId: string; startTime: number; endTime: number }[];
}

export interface ApprovalRecord {
  level: ApprovalLevel;
  approver: string;
  status: ApprovalStatus;
  comment?: string;
  comments: string;
  approverRole?: UserRole;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface DailyReport {
  date: string;
  intersections: {
    id: string;
    name: string;
    avgDelay: number;
    accidents: number;
    peakFlow: number;
  }[];
  busOnTimeRate: number;
  totalTrafficVolume: number;
  totalAccidents: number;
}

export interface TimingReport {
  id: string;
  intersectionId: string;
  intersectionName: string;
  timestamp: Date;
  originalTiming: Record<Direction, SignalTiming>;
  optimizedTiming: Record<Direction, SignalTiming>;
  flowData: TrafficFlow;
  expectedImprovement: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface EmergencyRoute {
  id: string;
  vehicleId: string;
  vehicleType: VehicleType;
  start: [number, number, number];
  end: [number, number, number];
  waypoints: [number, number, number][];
  active: boolean;
  startTime: Date;
}

export interface BusPriority {
  busId: string;
  intersectionId: string;
  approaching: boolean;
  extendedTime: number;
  lane: number;
}

export interface CongestionPrediction {
  roadId: string;
  roadName: string;
  predictions: {
    timestamp: Date;
    congestionIndex: number;
    confidence: number;
  }[];
}
