import type {
  Intersection,
  Vehicle,
  RoadSegment,
  TrafficEvent,
  ControlPlan,
  User,
  OperationLog,
  DailyReport,
  TimingReport,
  Notification,
  EmergencyRoute,
  CongestionPrediction,
} from '../types';
import { generateHistoricalData } from '../utils/congestionPredictor';

export const mockIntersections: Intersection[] = [
  {
    id: 'int-001',
    name: '人民大道-中山路交叉口',
    position: [0, 0, 0],
    trafficFlow: { north: 120, south: 95, east: 150, west: 110 },
    congestionIndex: 0.65,
    signalTiming: {
      north: { green: 30, yellow: 3, red: 67 },
      south: { green: 30, yellow: 3, red: 67 },
      east: { green: 37, yellow: 3, red: 60 },
      west: { green: 37, yellow: 3, red: 60 },
      currentPhase: 'east',
      remainingTime: 25,
    },
    avgDelay: 12.5,
    accidents: 2,
  },
  {
    id: 'int-002',
    name: '解放路-建国路交叉口',
    position: [30, 0, 0],
    trafficFlow: { north: 80, south: 70, east: 90, west: 85 },
    congestionIndex: 0.42,
    signalTiming: {
      north: { green: 25, yellow: 3, red: 72 },
      south: { green: 25, yellow: 3, red: 72 },
      east: { green: 45, yellow: 3, red: 52 },
      west: { green: 45, yellow: 3, red: 52 },
      currentPhase: 'north',
      remainingTime: 12,
    },
    avgDelay: 8.3,
    accidents: 0,
  },
  {
    id: 'int-003',
    name: '和平路-长江路交叉口',
    position: [-30, 0, 0],
    trafficFlow: { north: 200, south: 180, east: 160, west: 170 },
    congestionIndex: 0.85,
    signalTiming: {
      north: { green: 45, yellow: 3, red: 52 },
      south: { green: 45, yellow: 3, red: 52 },
      east: { green: 27, yellow: 3, red: 70 },
      west: { green: 27, yellow: 3, red: 70 },
      currentPhase: 'south',
      remainingTime: 38,
    },
    avgDelay: 25.8,
    accidents: 5,
  },
  {
    id: 'int-004',
    name: '南京路-北京路交叉口',
    position: [0, 0, 30],
    trafficFlow: { north: 100, south: 110, east: 130, west: 140 },
    congestionIndex: 0.55,
    signalTiming: {
      north: { green: 32, yellow: 3, red: 65 },
      south: { green: 32, yellow: 3, red: 65 },
      east: { green: 33, yellow: 3, red: 64 },
      west: { green: 33, yellow: 3, red: 64 },
      currentPhase: 'west',
      remainingTime: 8,
    },
    avgDelay: 10.2,
    accidents: 1,
  },
  {
    id: 'int-005',
    name: '延安路-西藏路交叉口',
    position: [0, 0, -30],
    trafficFlow: { north: 150, south: 140, east: 95, west: 105 },
    congestionIndex: 0.58,
    signalTiming: {
      north: { green: 40, yellow: 3, red: 57 },
      south: { green: 40, yellow: 3, red: 57 },
      east: { green: 20, yellow: 3, red: 77 },
      west: { green: 20, yellow: 3, red: 77 },
      currentPhase: 'north',
      remainingTime: 32,
    },
    avgDelay: 11.6,
    accidents: 3,
  },
  {
    id: 'int-006',
    name: '淮海路-重庆路交叉口',
    position: [30, 0, 30],
    trafficFlow: { north: 110, south: 105, east: 125, west: 130 },
    congestionIndex: 0.52,
    signalTiming: {
      north: { green: 30, yellow: 3, red: 67 },
      south: { green: 30, yellow: 3, red: 67 },
      east: { green: 37, yellow: 3, red: 60 },
      west: { green: 37, yellow: 3, red: 60 },
      currentPhase: 'east',
      remainingTime: 18,
    },
    avgDelay: 9.8,
    accidents: 1,
  },
  {
    id: 'int-007',
    name: '复兴路-成都路交叉口',
    position: [-30, 0, -30],
    trafficFlow: { north: 180, south: 175, east: 140, west: 145 },
    congestionIndex: 0.72,
    signalTiming: {
      north: { green: 42, yellow: 3, red: 55 },
      south: { green: 42, yellow: 3, red: 55 },
      east: { green: 28, yellow: 3, red: 69 },
      west: { green: 28, yellow: 3, red: 69 },
      currentPhase: 'north',
      remainingTime: 15,
    },
    avgDelay: 18.4,
    accidents: 4,
  },
  {
    id: 'int-008',
    name: '徐家汇路-瑞金路交叉口',
    position: [30, 0, -30],
    trafficFlow: { north: 90, south: 85, east: 115, west: 120 },
    congestionIndex: 0.48,
    signalTiming: {
      north: { green: 28, yellow: 3, red: 69 },
      south: { green: 28, yellow: 3, red: 69 },
      east: { green: 39, yellow: 3, red: 58 },
      west: { green: 39, yellow: 3, red: 58 },
      currentPhase: 'west',
      remainingTime: 22,
    },
    avgDelay: 9.1,
    accidents: 1,
  },
  {
    id: 'int-009',
    name: '衡山路-华山路交叉口',
    position: [-30, 0, 30],
    trafficFlow: { north: 140, south: 135, east: 155, west: 160 },
    congestionIndex: 0.68,
    signalTiming: {
      north: { green: 35, yellow: 3, red: 62 },
      south: { green: 35, yellow: 3, red: 62 },
      east: { green: 32, yellow: 3, red: 65 },
      west: { green: 32, yellow: 3, red: 65 },
      currentPhase: 'south',
      remainingTime: 5,
    },
    avgDelay: 14.2,
    accidents: 2,
  },
];

export const mockRoads: RoadSegment[] = [
  { id: 'road-001', name: '人民大道东段', start: [0, 0, 0], end: [30, 0, 0], lanes: 4, congestionIndex: 0.55, avgSpeed: 35, isClosed: false, history: generateHistoricalData(0.55) },
  { id: 'road-002', name: '人民大道西段', start: [0, 0, 0], end: [-30, 0, 0], lanes: 4, congestionIndex: 0.75, avgSpeed: 22, isClosed: false, history: generateHistoricalData(0.75) },
  { id: 'road-003', name: '中山路东段', start: [0, 0, 0], end: [0, 0, 30], lanes: 6, congestionIndex: 0.48, avgSpeed: 40, isClosed: false, history: generateHistoricalData(0.48) },
  { id: 'road-004', name: '中山路西段', start: [0, 0, 0], end: [0, 0, -30], lanes: 6, congestionIndex: 0.52, avgSpeed: 38, isClosed: false, history: generateHistoricalData(0.52) },
  { id: 'road-005', name: '解放路南段', start: [30, 0, 0], end: [30, 0, 30], lanes: 4, congestionIndex: 0.42, avgSpeed: 42, isClosed: false, history: generateHistoricalData(0.42) },
  { id: 'road-006', name: '解放路北段', start: [30, 0, 0], end: [30, 0, -30], lanes: 4, congestionIndex: 0.38, avgSpeed: 45, isClosed: false, history: generateHistoricalData(0.38) },
  { id: 'road-007', name: '建国路南段', start: [-30, 0, 0], end: [-30, 0, 30], lanes: 4, congestionIndex: 0.68, avgSpeed: 28, isClosed: false, history: generateHistoricalData(0.68) },
  { id: 'road-008', name: '建国路北段', start: [-30, 0, 0], end: [-30, 0, -30], lanes: 4, congestionIndex: 0.72, avgSpeed: 25, isClosed: false, history: generateHistoricalData(0.72) },
  { id: 'road-009', name: '延安路东段', start: [0, 0, 30], end: [30, 0, 30], lanes: 4, congestionIndex: 0.45, avgSpeed: 40, isClosed: false, history: generateHistoricalData(0.45) },
  { id: 'road-010', name: '延安路西段', start: [0, 0, 30], end: [-30, 0, 30], lanes: 4, congestionIndex: 0.62, avgSpeed: 32, isClosed: false, history: generateHistoricalData(0.62) },
  { id: 'road-011', name: '西藏路东段', start: [0, 0, -30], end: [30, 0, -30], lanes: 4, congestionIndex: 0.40, avgSpeed: 43, isClosed: false, history: generateHistoricalData(0.40) },
  { id: 'road-012', name: '西藏路西段', start: [0, 0, -30], end: [-30, 0, -30], lanes: 4, congestionIndex: 0.65, avgSpeed: 30, isClosed: false, history: generateHistoricalData(0.65) },
];

const generateVehicles = (count: number): Vehicle[] => {
  const types: Vehicle['type'][] = ['car', 'car', 'car', 'car', 'car', 'bus', 'bus', 'fire', 'ambulance'];
  const vehicles: Vehicle[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    const angle = Math.random() * Math.PI * 2;
    
    vehicles.push({
      id: `veh-${i.toString().padStart(4, '0')}`,
      type,
      position: [x, type === 'bus' ? 0.5 : type === 'fire' || type === 'ambulance' ? 0.4 : 0.3, z],
      rotation: [0, angle, 0],
      speed: type === 'car' ? 30 + Math.random() * 20 : type === 'bus' ? 25 + Math.random() * 10 : 40 + Math.random() * 20,
      route: `route-${Math.floor(Math.random() * 10) + 1}`,
      status: 'normal',
      plateNumber: `沪A${Math.floor(Math.random() * 90000) + 10000}`,
    });
  }
  
  return vehicles;
};

export const mockVehicles: Vehicle[] = generateVehicles(80);

export const mockEvents: TrafficEvent[] = [
  {
    id: 'evt-001',
    type: 'congestion',
    location: [-15, 0, 0],
    roadId: 'road-002',
    severity: 'high',
    description: '人民大道西段严重拥堵，平均车速低于10km/h',
    status: 'processing',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    workOrder: {
      id: 'wo-001',
      eventId: 'evt-001',
      assignee: '张警官',
      status: 'accepted',
      createdAt: new Date(Date.now() - 1000 * 60 * 12),
    },
  },
  {
    id: 'evt-002',
    type: 'accident',
    location: [15, 0, 15],
    roadId: 'road-005',
    severity: 'high',
    description: '解放路与延安路交叉口发生两车追尾事故',
    status: 'dispatched',
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
    cameraFeed: 'cam-005',
    workOrder: {
      id: 'wo-002',
      eventId: 'evt-002',
      assignee: '李警官',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 7),
    },
  },
  {
    id: 'evt-003',
    type: 'abnormal_parking',
    location: [-20, 0, -15],
    roadId: 'road-008',
    severity: 'medium',
    description: '建国路北段有车辆异常停靠，占用车道',
    status: 'detected',
    createdAt: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: 'evt-004',
    type: 'congestion',
    location: [-15, 0, -15],
    roadId: 'road-012',
    severity: 'medium',
    description: '西藏路西段拥堵，平均车速约18km/h',
    status: 'resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
];

export const mockControlPlans: ControlPlan[] = [
  {
    id: 'plan-001',
    name: '人民大道晚高峰分流方案',
    description: '晚高峰期间对人民大道实施分流，引导车辆绕行周边道路',
    type: 'diversion',
    status: 'pending_bureau',
    approvalHistory: [
      {
        level: 'command_center',
        approver: '王主任',
        approverRole: 'command_director',
        status: 'approved_command',
        comments: '同意，预计可缓解拥堵30%',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        level: 'transport_bureau',
        approver: '',
        approverRole: 'transport_bureau',
        status: 'pending_bureau',
        comments: '',
        timestamp: new Date(),
      },
      {
        level: 'city_government',
        approver: '',
        approverRole: 'transport_bureau',
        status: 'pending_government',
        comments: '',
        timestamp: new Date(),
      },
    ],
    currentLevel: 1,
    affectedAreas: ['road-001', 'road-002', 'road-003', 'road-004'],
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 5),
    createdBy: '王主任',
    roadClosures: [
      { roadId: 'road-001', startTime: Date.now() + 1000 * 60 * 60 * 2, endTime: Date.now() + 1000 * 60 * 60 * 5 },
    ],
  },
  {
    id: 'plan-002',
    name: '和平路临时封路方案',
    description: '因市政工程施工，和平路部分路段临时封闭',
    type: 'road_closure',
    status: 'draft',
    approvalHistory: [
      {
        level: 'command_center',
        approver: '',
        approverRole: 'command_director',
        status: 'draft',
        comments: '',
        timestamp: new Date(),
      },
      {
        level: 'transport_bureau',
        approver: '',
        approverRole: 'transport_bureau',
        status: 'draft',
        comments: '',
        timestamp: new Date(),
      },
      {
        level: 'city_government',
        approver: '',
        approverRole: 'transport_bureau',
        status: 'draft',
        comments: '',
        timestamp: new Date(),
      },
    ],
    currentLevel: 0,
    affectedAreas: ['road-007', 'road-008'],
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    createdBy: '王主任',
    roadClosures: [
      { roadId: 'road-007', startTime: Date.now() + 1000 * 60 * 60 * 24, endTime: Date.now() + 1000 * 60 * 60 * 24 * 3 },
      { roadId: 'road-008', startTime: Date.now() + 1000 * 60 * 60 * 24, endTime: Date.now() + 1000 * 60 * 60 * 24 * 3 },
    ],
  },
];

export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: '张警官',
    role: 'traffic_police',
    department: '交警一大队',
  },
  {
    id: 'user-002',
    name: '李警官',
    role: 'traffic_police',
    department: '交警二大队',
  },
  {
    id: 'user-003',
    name: '王主任',
    role: 'command_director',
    department: '交通指挥中心',
  },
  {
    id: 'user-004',
    name: '刘局长',
    role: 'transport_bureau',
    department: '市交通局',
  },
];

export const mockOperationLogs: OperationLog[] = [
  {
    id: 'log-001',
    userId: 'user-003',
    userName: '王主任',
    action: '调整信号配时',
    details: '将人民大道-中山路交叉口东西方向绿灯时间调整为45秒',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: 'log-002',
    userId: 'user-003',
    userName: '王主任',
    action: '派发工单',
    details: '向张警官派发人民大道拥堵处置工单',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: 'log-003',
    userId: 'user-001',
    userName: '张警官',
    action: '接受工单',
    details: '接受人民大道拥堵处置工单，已赶赴现场',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'log-004',
    userId: 'user-003',
    userName: '王主任',
    action: '创建管控方案',
    details: '创建人民大道晚高峰分流方案',
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
  },
  {
    id: 'log-005',
    userId: 'user-003',
    userName: '王主任',
    action: '审批通过',
    details: '指挥中心审批通过人民大道晚高峰分流方案',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
];

export const mockDailyReport: DailyReport = {
  date: new Date().toISOString().split('T')[0],
  intersections: [
    { id: 'int-001', name: '人民大道-中山路', avgDelay: 12.5, accidents: 2, peakFlow: 580 },
    { id: 'int-002', name: '解放路-建国路', avgDelay: 8.3, accidents: 0, peakFlow: 420 },
    { id: 'int-003', name: '和平路-长江路', avgDelay: 25.8, accidents: 5, peakFlow: 850 },
    { id: 'int-004', name: '南京路-北京路', avgDelay: 10.2, accidents: 1, peakFlow: 520 },
    { id: 'int-005', name: '延安路-西藏路', avgDelay: 11.6, accidents: 3, peakFlow: 550 },
    { id: 'int-006', name: '淮海路-重庆路', avgDelay: 9.8, accidents: 1, peakFlow: 490 },
    { id: 'int-007', name: '复兴路-成都路', avgDelay: 18.4, accidents: 4, peakFlow: 720 },
    { id: 'int-008', name: '徐家汇路-瑞金路', avgDelay: 9.1, accidents: 1, peakFlow: 440 },
    { id: 'int-009', name: '衡山路-华山路', avgDelay: 14.2, accidents: 2, peakFlow: 620 },
  ],
  busOnTimeRate: 92.5,
  totalTrafficVolume: 128500,
  totalAccidents: 19,
};

export const mockTimingReports: TimingReport[] = [
  {
    id: 'timing-001',
    intersectionId: 'int-003',
    intersectionName: '和平路-长江路交叉口',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    originalTiming: {
      north: { green: 35, yellow: 3, red: 62 },
      south: { green: 35, yellow: 3, red: 62 },
      east: { green: 30, yellow: 3, red: 67 },
      west: { green: 30, yellow: 3, red: 67 },
    },
    optimizedTiming: {
      north: { green: 45, yellow: 3, red: 52 },
      south: { green: 45, yellow: 3, red: 52 },
      east: { green: 25, yellow: 3, red: 72 },
      west: { green: 25, yellow: 3, red: 72 },
    },
    flowData: { north: 200, south: 180, east: 160, west: 170 },
    expectedImprovement: 18.5,
  },
  {
    id: 'timing-002',
    intersectionId: 'int-007',
    intersectionName: '复兴路-成都路交叉口',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    originalTiming: {
      north: { green: 35, yellow: 3, red: 62 },
      south: { green: 35, yellow: 3, red: 62 },
      east: { green: 30, yellow: 3, red: 67 },
      west: { green: 30, yellow: 3, red: 67 },
    },
    optimizedTiming: {
      north: { green: 42, yellow: 3, red: 55 },
      south: { green: 42, yellow: 3, red: 55 },
      east: { green: 28, yellow: 3, red: 69 },
      west: { green: 28, yellow: 3, red: 69 },
    },
    flowData: { north: 180, south: 175, east: 140, west: 145 },
    expectedImprovement: 12.3,
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'warning',
    title: '拥堵预警',
    message: '和平路-长江路交叉口拥堵指数达到0.85，建议启动应急响应',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    read: false,
  },
  {
    id: 'notif-002',
    type: 'danger',
    title: '事故告警',
    message: '解放路与延安路交叉口发生交通事故，请立即处理',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    read: false,
  },
  {
    id: 'notif-003',
    type: 'info',
    title: '配时优化',
    message: '系统已自动优化和平路-长江路交叉口信号配时',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: true,
  },
];

export const mockEmergencyRoutes: EmergencyRoute[] = [
  {
    id: 'route-001',
    vehicleId: 'veh-0072',
    vehicleType: 'fire',
    start: [-20, 0, 20],
    end: [15, 0, 15],
    waypoints: [[-15, 0, 15], [0, 0, 15], [10, 0, 15]],
    active: true,
    startTime: new Date(Date.now() - 1000 * 60 * 3),
  },
];

export const generateCongestionPredictions = (): CongestionPrediction[] => {
  return mockRoads.map(road => {
    const predictions = [];
    for (let i = 0; i < 12; i++) {
      const baseCongestion = road.congestionIndex;
      const timeFactor = Math.sin((i / 12) * Math.PI) * 0.3;
      const randomFactor = (Math.random() - 0.5) * 0.15;
      predictions.push({
        timestamp: new Date(Date.now() + i * 1000 * 60 * 5),
        congestionIndex: Math.max(0, Math.min(1, baseCongestion + timeFactor + randomFactor)),
      });
    }
    return {
      roadId: road.id,
      roadName: road.name,
      predictions,
    };
  });
};

export const mockPoliceOfficers = [
  { id: 'user-001', name: '张警官', location: [-10, 0, 5], status: 'available' },
  { id: 'user-002', name: '李警官', location: [10, 0, -10], status: 'on_duty' },
  { id: 'user-005', name: '王警官', location: [20, 0, 20], status: 'available' },
  { id: 'user-006', name: '赵警官', location: [-20, 0, -20], status: 'available' },
];

export const mockCameras = [
  { id: 'cam-001', name: '人民大道东段监控', position: [15, 10, 0], direction: 'west' },
  { id: 'cam-002', name: '人民大道西段监控', position: [-15, 10, 0], direction: 'east' },
  { id: 'cam-003', name: '中山路东段监控', position: [0, 10, 15], direction: 'south' },
  { id: 'cam-004', name: '中山路西段监控', position: [0, 10, -15], direction: 'north' },
  { id: 'cam-005', name: '解放路监控', position: [30, 10, 15], direction: 'west' },
  { id: 'cam-006', name: '建国路监控', position: [-30, 10, -15], direction: 'east' },
];
