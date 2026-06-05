import type {
  WorkFace,
  MineCart,
  Worker,
  Equipment,
  WorkOrder,
  DangerZone,
  EvacuationRoute,
  DailyReport,
  TunnelSegment,
} from './types';

type AlertType = 'gas' | 'dust' | 'temperature' | 'equipment' | 'worker' | 'emergency';
type AlertLevel = 'info' | 'warning' | 'danger';

interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  timestamp: string;
  sourceId: string;
  sourceName: string;
  acknowledged: boolean;
}

const generateGasHistory = (baseValue: number) => {
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toLocaleDateString('zh-CN'),
      value: Math.max(0.1, baseValue + (Math.random() - 0.5) * 0.4),
    });
  }
  return history;
};

const generateSupportRecords = () => [
  { id: 'sr1', date: '2026-06-02', type: '锚杆支护', quantity: 45, operator: '张工' },
  { id: 'sr2', date: '2026-06-01', type: '锚索支护', quantity: 20, operator: '李工' },
  { id: 'sr3', date: '2026-05-31', type: '锚杆支护', quantity: 50, operator: '王工' },
];

export const workFaces: WorkFace[] = [
  {
    id: 'wf1',
    name: '101采掘面',
    position: { x: -30, y: 0, z: -40 },
    size: { width: 15, height: 8, depth: 25 },
    progress: 1250,
    gasConcentration: 0.35,
    dustConcentration: 8.5,
    temperature: 26,
    isWarning: false,
    ventilatorActive: false,
    gasHistory: generateGasHistory(0.35),
    supportRecords: generateSupportRecords(),
    dailyOutput: 2800,
  },
  {
    id: 'wf2',
    name: '102采掘面',
    position: { x: 30, y: 0, z: -40 },
    size: { width: 15, height: 8, depth: 25 },
    progress: 980,
    gasConcentration: 0.85,
    dustConcentration: 12.3,
    temperature: 28,
    isWarning: true,
    ventilatorActive: true,
    gasHistory: generateGasHistory(0.75),
    supportRecords: generateSupportRecords(),
    dailyOutput: 2200,
  },
  {
    id: 'wf3',
    name: '103采掘面',
    position: { x: -30, y: 0, z: -80 },
    size: { width: 15, height: 8, depth: 25 },
    progress: 1560,
    gasConcentration: 0.42,
    dustConcentration: 9.8,
    temperature: 27,
    isWarning: false,
    ventilatorActive: false,
    gasHistory: generateGasHistory(0.4),
    supportRecords: generateSupportRecords(),
    dailyOutput: 3100,
  },
  {
    id: 'wf4',
    name: '104采掘面',
    position: { x: 30, y: 0, z: -80 },
    size: { width: 15, height: 8, depth: 25 },
    progress: 720,
    gasConcentration: 0.28,
    dustConcentration: 7.2,
    temperature: 25,
    isWarning: false,
    ventilatorActive: false,
    gasHistory: generateGasHistory(0.28),
    supportRecords: generateSupportRecords(),
    dailyOutput: 1900,
  },
];

export const mineCarts: MineCart[] = [
  {
    id: 'mc1',
    number: 'K001',
    position: { x: -10, y: 0, z: -20 },
    rotation: 0,
    load: 15,
    maxLoad: 20,
    status: 'transporting',
    currentTask: { id: 't1', from: '101采掘面', to: '主井', plannedLoad: 18, priority: 1 },
    route: [
      { x: -30, y: 0, z: -40 },
      { x: -30, y: 0, z: -10 },
      { x: 0, y: 0, z: 0 },
    ],
    routeIndex: 1,
    speed: 2,
  },
  {
    id: 'mc2',
    number: 'K002',
    position: { x: 15, y: 0, z: -30 },
    rotation: Math.PI / 2,
    load: 8,
    maxLoad: 20,
    status: 'loading',
    currentTask: { id: 't2', from: '102采掘面', to: '副井', plannedLoad: 15, priority: 2 },
    route: [
      { x: 30, y: 0, z: -40 },
      { x: 30, y: 0, z: -10 },
      { x: 10, y: 0, z: 0 },
    ],
    routeIndex: 0,
    speed: 2,
  },
  {
    id: 'mc3',
    number: 'K003',
    position: { x: -5, y: 0, z: -60 },
    rotation: 0,
    load: 18,
    maxLoad: 20,
    status: 'transporting',
    currentTask: { id: 't3', from: '103采掘面', to: '主井', plannedLoad: 20, priority: 1 },
    route: [
      { x: -30, y: 0, z: -80 },
      { x: -30, y: 0, z: -50 },
      { x: 0, y: 0, z: -50 },
      { x: 0, y: 0, z: 0 },
    ],
    routeIndex: 2,
    speed: 2,
  },
  {
    id: 'mc4',
    number: 'K004',
    position: { x: 5, y: 0, z: 5 },
    rotation: Math.PI,
    load: 0,
    maxLoad: 20,
    status: 'idle',
    currentTask: null,
    route: [],
    routeIndex: 0,
    speed: 2,
  },
];

export const workers: Worker[] = [
  { id: 'w1', name: '张明', position: { x: -28, y: 2, z: -45 }, jobType: '采煤工', workDuration: 6.5, isInDangerZone: false, status: 'normal', headlampColor: '#ffffff' },
  { id: 'w2', name: '李强', position: { x: -32, y: 2, z: -38 }, jobType: '支护工', workDuration: 5.2, isInDangerZone: false, status: 'normal', headlampColor: '#ffffff' },
  { id: 'w3', name: '王磊', position: { x: 28, y: 2, z: -45 }, jobType: '采煤工', workDuration: 7.1, isInDangerZone: false, status: 'normal', headlampColor: '#ffffff' },
  { id: 'w4', name: '赵伟', position: { x: 35, y: 2, z: -35 }, jobType: '瓦斯检查员', workDuration: 4.8, isInDangerZone: false, status: 'normal', headlampColor: '#ffff00' },
  { id: 'w5', name: '陈刚', position: { x: 0, y: 2, z: -100 }, jobType: '维修电工', workDuration: 3.2, isInDangerZone: true, status: 'warning', headlampColor: '#ff0000' },
  { id: 'w6', name: '刘洋', position: { x: -28, y: 2, z: -85 }, jobType: '司机', workDuration: 8.0, isInDangerZone: false, status: 'normal', headlampColor: '#ffffff' },
  { id: 'w7', name: '杨帆', position: { x: 32, y: 2, z: -78 }, jobType: '安全员', workDuration: 2.5, isInDangerZone: false, status: 'normal', headlampColor: '#00ff00' },
  { id: 'w8', name: '周涛', position: { x: 0, y: 2, z: -25 }, jobType: '调度员', workDuration: 1.5, isInDangerZone: false, status: 'normal', headlampColor: '#00ffff' },
];

export const equipment: Equipment[] = [
  { id: 'eq1', name: '1号采煤机', type: 'shearer', position: { x: -30, y: 0, z: -50 }, runHours: 480, status: 'running', lastMaintenance: '2026-05-15', nextMaintenanceDue: 500, maintenanceWarning: false },
  { id: 'eq2', name: '2号采煤机', type: 'shearer', position: { x: 30, y: 0, z: -50 }, runHours: 520, status: 'running', lastMaintenance: '2026-05-10', nextMaintenanceDue: 500, maintenanceWarning: true },
  { id: 'eq3', name: '主输送机', type: 'conveyor', position: { x: 0, y: 0, z: -30 }, runHours: 1200, status: 'running', lastMaintenance: '2026-05-20', nextMaintenanceDue: 1500, maintenanceWarning: false },
  { id: 'eq4', name: '局部通风机1', type: 'ventilator', position: { x: -25, y: 0, z: -35 }, runHours: 800, status: 'stopped', lastMaintenance: '2026-05-25', nextMaintenanceDue: 1000, maintenanceWarning: false },
  { id: 'eq5', name: '局部通风机2', type: 'ventilator', position: { x: 25, y: 0, z: -35 }, runHours: 150, status: 'running', lastMaintenance: '2026-06-01', nextMaintenanceDue: 1000, maintenanceWarning: false },
  { id: 'eq6', name: '排水泵1', type: 'pump', position: { x: 0, y: 0, z: -60 }, runHours: 350, status: 'running', lastMaintenance: '2026-05-28', nextMaintenanceDue: 500, maintenanceWarning: false },
];

export const workOrders: WorkOrder[] = [
  { id: 'wo1', equipmentId: 'eq2', equipmentName: '2号采煤机', type: 'routine', description: '累计运行520小时，需进行常规检修', status: 'pending', createdAt: '2026-06-03 08:00', assignedTo: '维修班A组' },
  { id: 'wo2', equipmentId: 'eq3', equipmentName: '主输送机', type: 'routine', description: '皮带磨损检查', status: 'in_progress', createdAt: '2026-06-02 14:30', assignedTo: '维修班B组' },
];

export const dangerZones: DangerZone[] = [
  { id: 'dz1', name: '采空区A', position: { x: 0, y: 0, z: -100 }, size: { width: 20, height: 10, depth: 30 }, type: 'goaf' },
  { id: 'dz2', name: '积水区B', position: { x: -50, y: 0, z: -60 }, size: { width: 15, height: 5, depth: 15 }, type: 'water' },
];

export const evacuationRoutes: EvacuationRoute[] = [
  {
    id: 'er1',
    name: '主撤离路线',
    points: [
      { x: 0, y: 0, z: -100 },
      { x: 0, y: 0, z: -60 },
      { x: 0, y: 0, z: -20 },
      { x: 0, y: 0, z: 20 },
    ],
    color: '#FF3B3B',
    active: false,
  },
  {
    id: 'er2',
    name: '备用撤离路线',
    points: [
      { x: -40, y: 0, z: -80 },
      { x: -40, y: 0, z: -40 },
      { x: -40, y: 0, z: 0 },
      { x: 0, y: 0, z: 20 },
    ],
    color: '#FFD700',
    active: false,
  },
];

export const initialAlerts: Alert[] = [
  { id: 'a1', type: 'gas', level: 'danger', message: '102采掘面瓦斯浓度达到0.85%，超过安全阈值！', timestamp: '2026-06-03 10:25:30', sourceId: 'wf2', sourceName: '102采掘面', acknowledged: false },
  { id: 'a2', type: 'equipment', level: 'warning', message: '2号采煤机累计运行520小时，建议检修', timestamp: '2026-06-03 09:15:00', sourceId: 'eq2', sourceName: '2号采煤机', acknowledged: true },
  { id: 'a3', type: 'worker', level: 'warning', message: '陈刚进入危险区域，请立即撤离！', timestamp: '2026-06-03 10:10:15', sourceId: 'w5', sourceName: '陈刚', acknowledged: false },
];

export const dailyReports: DailyReport[] = [
  {
    date: '2026-06-03',
    shift: 'morning',
    workFaces: [
      { id: 'wf1', name: '101采掘面', output: 2800, gasExceedCount: 0, progress: 3.2 },
      { id: 'wf2', name: '102采掘面', output: 2200, gasExceedCount: 5, progress: 2.5 },
      { id: 'wf3', name: '103采掘面', output: 3100, gasExceedCount: 1, progress: 3.8 },
      { id: 'wf4', name: '104采掘面', output: 1900, gasExceedCount: 0, progress: 2.1 },
    ],
    workerAttendance: { total: 120, present: 115, absent: 5 },
    equipmentStatus: { total: 24, running: 20, maintenance: 4 },
    alerts: 8,
  },
];

export const tunnelSegments: TunnelSegment[] = [
  { id: 't1', name: '主运输大巷', start: { x: 0, y: 0, z: 30 }, end: { x: 0, y: 0, z: -90 }, width: 8, height: 6, type: 'main' },
  { id: 't2', name: '101联络巷', start: { x: 0, y: 0, z: -40 }, end: { x: -30, y: 0, z: -40 }, width: 6, height: 5, type: 'transport' },
  { id: 't3', name: '102联络巷', start: { x: 0, y: 0, z: -40 }, end: { x: 30, y: 0, z: -40 }, width: 6, height: 5, type: 'transport' },
  { id: 't4', name: '103联络巷', start: { x: 0, y: 0, z: -80 }, end: { x: -30, y: 0, z: -80 }, width: 6, height: 5, type: 'transport' },
  { id: 't5', name: '104联络巷', start: { x: 0, y: 0, z: -80 }, end: { x: 30, y: 0, z: -80 }, width: 6, height: 5, type: 'transport' },
  { id: 't6', name: '回风巷', start: { x: -50, y: 0, z: 0 }, end: { x: -50, y: 0, z: -90 }, width: 5, height: 4, type: 'ventilation' },
];
