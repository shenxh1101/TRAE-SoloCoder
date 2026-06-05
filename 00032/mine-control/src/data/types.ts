export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface SupportRecord {
  id: string;
  date: string;
  type: string;
  quantity: number;
  operator: string;
}

export interface WorkFace {
  id: string;
  name: string;
  position: Position;
  size: { width: number; height: number; depth: number };
  progress: number;
  gasConcentration: number;
  dustConcentration: number;
  temperature: number;
  isWarning: boolean;
  ventilatorActive: boolean;
  gasHistory: { date: string; value: number }[];
  supportRecords: SupportRecord[];
  dailyOutput: number;
}

export interface TransportTask {
  id: string;
  from: string;
  to: string;
  plannedLoad: number;
  priority: number;
}

export interface MineCart {
  id: string;
  number: string;
  position: Position;
  rotation: number;
  load: number;
  maxLoad: number;
  status: 'idle' | 'transporting' | 'loading' | 'unloading';
  currentTask: TransportTask | null;
  route: Position[];
  routeIndex: number;
  speed: number;
}

export interface Worker {
  id: string;
  name: string;
  position: Position;
  jobType: string;
  workDuration: number;
  isInDangerZone: boolean;
  status: 'normal' | 'warning' | 'evacuating';
  headlampColor: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'shearer' | 'conveyor' | 'ventilator' | 'pump';
  position: Position;
  runHours: number;
  status: 'running' | 'stopped' | 'maintenance';
  lastMaintenance: string;
  nextMaintenanceDue: number;
  maintenanceWarning: boolean;
}

export interface WorkOrder {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: 'routine' | 'emergency';
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  assignedTo: string;
}

export interface DangerZone {
  id: string;
  name: string;
  position: Position;
  size: { width: number; height: number; depth: number };
  type: 'goaf' | 'water' | 'gas';
}

export interface EvacuationRoute {
  id: string;
  name: string;
  points: Position[];
  color: string;
  active: boolean;
}

export interface DailyReport {
  date: string;
  shift: 'morning' | 'afternoon' | 'night';
  workFaces: {
    id: string;
    name: string;
    output: number;
    gasExceedCount: number;
    progress: number;
  }[];
  workerAttendance: {
    total: number;
    present: number;
    absent: number;
  };
  equipmentStatus: {
    total: number;
    running: number;
    maintenance: number;
  };
  alerts: number;
}

export interface TunnelSegment {
  id: string;
  name: string;
  start: Position;
  end: Position;
  width: number;
  height: number;
  type: 'main' | 'transport' | 'ventilation';
}
