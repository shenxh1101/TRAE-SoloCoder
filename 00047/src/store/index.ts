import { create } from 'zustand';
import type {
  Intersection,
  RoadSegment,
  Vehicle,
  TrafficEvent,
  ControlPlan,
  Notification,
  EmergencyRoute,
  User,
  OperationLog,
  CongestionPrediction,
  TimingReport,
  WorkOrder,
  SignalTiming,
  Direction,
  EventType,
  EventSeverity,
  ControlPlanStatus,
  ApprovalLevel,
  ApprovalStatus,
  BusPriority,
  ApprovalRecord,
} from '@/types';
import {
  mockIntersections,
  mockRoads,
  mockVehicles,
  mockEvents,
  mockControlPlans,
  mockNotifications,
  mockEmergencyRoutes,
  mockUsers,
  mockOperationLogs,
  mockTimingReports,
  generateCongestionPredictions,
} from '@/data/mockData';
import {
  predictCongestion,
  generateHistoricalData,
  updateRoadCongestion,
  calculateHeatmapIntensity,
} from '../utils/congestionPredictor';
import type { CongestionHistoryPoint } from '../utils/congestionPredictor';

interface TrafficState {
  intersections: Intersection[];
  roads: RoadSegment[];
  vehicles: Vehicle[];
  events: TrafficEvent[];
  controlPlans: ControlPlan[];
  notifications: Notification[];
  emergencyRoutes: EmergencyRoute[];
  busPriorities: BusPriority[];
  currentUser: User | null;
  operationLogs: OperationLog[];
  selectedIntersection: Intersection | null;
  isHeatmapVisible: boolean;
  simulationSpeed: number;
  autoSignalOptimization: boolean;
  congestionPredictions: CongestionPrediction[];
  timingReports: TimingReport[];
  time: number;
  roadClosureAnimations: string[];
  roadHistoryData: Map<string, CongestionHistoryPoint[]>;
  predictionIntervalId: ReturnType<typeof setInterval> | null;
  updateCongestionPredictions: () => void;
  startPredictionLoop: () => void;
  stopPredictionLoop: () => void;
  setSelectedIntersection: (intersection: Intersection | null) => void;
  setHeatmapVisible: (visible: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  setAutoSignalOptimization: (auto: boolean) => void;
  addEvent: (type: EventType, roadId: string, location: [number, number, number], severity: EventSeverity, description: string) => void;
  dispatchWorkOrder: (eventId: string, assignee: string, notes?: string) => void;
  approvePlan: (planId: string, level: ApprovalLevel, approver: string, comment: string, status: ApprovalStatus) => void;
  submitPlan: (planId: string) => void;
  executePlan: (planId: string) => void;
  closeRoads: (roadIds: string[]) => void;
  openRoads: (roadIds: string[]) => void;
  startRoadClosureAnimation: (roadIds: string[]) => void;
  updateSignalTiming: (intersectionId: string, direction: Direction, timing: Partial<SignalTiming>) => void;
  generateEmergencyRoute: (vehicleId: string, vehicleType: Vehicle['type'], start: [number, number, number], end: [number, number, number]) => void;
  addNotification: (type: Notification['type'], title: string, message: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addOperationLog: (action: string, details: string) => void;
  setCurrentUser: (user: User) => void;
  login: (role: User['role']) => void;
  logout: () => void;
  updateVehicles: (vehicles: Vehicle[]) => void;
  addEmergencyRoute: (route: EmergencyRoute) => void;
  removeEmergencyRoute: (id: string) => void;
  updateBusPriority: (priority: BusPriority) => void;
  incrementTime: () => void;
  setRoads: (roads: RoadSegment[]) => void;
  setControlPlans: (plans: ControlPlan[]) => void;
  addApprovalRecord: (planId: string, record: ApprovalRecord) => void;
  updatePlanStatus: (planId: string, status: ApprovalStatus) => void;
}

export const useAppStore = create<TrafficState>((set, get) => ({
  intersections: mockIntersections,
  roads: mockRoads,
  vehicles: mockVehicles,
  events: mockEvents,
  controlPlans: mockControlPlans,
  notifications: mockNotifications,
  emergencyRoutes: mockEmergencyRoutes,
  busPriorities: [
    { busId: 'veh-0010', intersectionId: 'int-001', approaching: true, extendedTime: 5, lane: 1 },
    { busId: 'veh-0025', intersectionId: 'int-004', approaching: true, extendedTime: 3, lane: 0 },
  ],
  currentUser: mockUsers[2],
  operationLogs: mockOperationLogs,
  selectedIntersection: null,
  isHeatmapVisible: false,
  simulationSpeed: 1,
  autoSignalOptimization: true,
  congestionPredictions: generateCongestionPredictions(),
  timingReports: mockTimingReports,
  time: 0,
  roadClosureAnimations: [],
  roadHistoryData: new Map<string, CongestionHistoryPoint[]>(),
  predictionIntervalId: null,

  setSelectedIntersection: (intersection) => set({ selectedIntersection: intersection }),
  setHeatmapVisible: (visible) => set({ isHeatmapVisible: visible }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setAutoSignalOptimization: (auto) => set({ autoSignalOptimization: auto }),
  setCurrentUser: (user) => set({ currentUser: user }),
  updateVehicles: (vehicles) => set({ vehicles }),
  addEmergencyRoute: (route) =>
    set((state) => ({ emergencyRoutes: [...state.emergencyRoutes, route] })),
  removeEmergencyRoute: (id) =>
    set((state) => ({
      emergencyRoutes: state.emergencyRoutes.filter((r) => r.id !== id),
    })),
  updateBusPriority: (priority) =>
    set((state) => {
      const existing = state.busPriorities.find((b) => b.busId === priority.busId);
      if (existing) {
        return {
          busPriorities: state.busPriorities.map((b) =>
            b.busId === priority.busId ? priority : b
          ),
        };
      }
      return { busPriorities: [...state.busPriorities, priority] };
    }),
  incrementTime: () => set((state) => ({ time: state.time + 1 })),

  setRoads: (roads) => set({ roads }),
  setControlPlans: (plans) => set({ controlPlans: plans }),
  addApprovalRecord: (planId, record) =>
    set((state) => ({
      controlPlans: state.controlPlans.map((plan) =>
        plan.id === planId
          ? { ...plan, approvalHistory: [...plan.approvalHistory, record] }
          : plan
      ),
    })),
  updatePlanStatus: (planId, status) =>
    set((state) => ({
      controlPlans: state.controlPlans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              status: (status === 'approved' || status === 'approved_command' || status === 'approved_bureau' || status === 'approved_government'
                ? 'approved'
                : status === 'rejected' || status === 'rejected_command' || status === 'rejected_bureau' || status === 'rejected_government'
                ? 'rejected'
                : status === 'implemented'
                ? 'executed'
                : plan.status) as ControlPlanStatus,
            }
          : plan
      ),
    })),

  updateCongestionPredictions: () => {
    const { roads, events, roadHistoryData } = get();
    const newRoadHistoryData = new Map(roadHistoryData);
    const newCongestionPredictions: CongestionPrediction[] = [];
    const updatedRoads = roads.map((road) => {
      let history = newRoadHistoryData.get(road.id);
      if (!history) {
        history = generateHistoricalData(road.congestionIndex);
        newRoadHistoryData.set(road.id, history);
      }

      const nearbyEventCount = events.filter((e) => e.roadId === road.id).length;
      const updated = updateRoadCongestion(road, 1, nearbyEventCount);

      const predictions = predictCongestion(history, 60);

      newCongestionPredictions.push({
        roadId: road.id,
        roadName: road.name,
        predictions: predictions.map((p) => ({
          timestamp: new Date(p.timestamp),
          congestionIndex: p.congestionIndex,
          confidence: p.confidence,
        })),
      });

      const newPoint: CongestionHistoryPoint = {
        timestamp: Date.now(),
        congestionIndex: updated.congestionIndex,
        flowRate: history.length > 0 ? history[history.length - 1].flowRate : 1000,
        avgSpeed: updated.avgSpeed,
      };
      newRoadHistoryData.set(road.id, [...history, newPoint]);

      return { ...road, congestionIndex: updated.congestionIndex, avgSpeed: updated.avgSpeed };
    });

    set({
      roads: updatedRoads,
      roadHistoryData: newRoadHistoryData,
      congestionPredictions: newCongestionPredictions,
    });
  },

  startPredictionLoop: () => {
    const { predictionIntervalId } = get();
    if (predictionIntervalId) return;
    const id = setInterval(() => {
      get().updateCongestionPredictions();
    }, 10000);
    set({ predictionIntervalId: id });
  },

  stopPredictionLoop: () => {
    const { predictionIntervalId } = get();
    if (predictionIntervalId) {
      clearInterval(predictionIntervalId);
      set({ predictionIntervalId: null });
    }
  },

  addEvent: (type, roadId, location, severity, description) => {
    const newEvent: TrafficEvent = {
      id: `evt-${Date.now()}`,
      type,
      location,
      roadId,
      severity,
      description,
      status: 'detected',
      createdAt: new Date(),
    };
    set((state) => ({ events: [...state.events, newEvent] }));
    get().addNotification(severity === 'high' ? 'danger' : 'warning', '新事件', description);
    get().addOperationLog('检测到事件', `${type}: ${description}`);
  },

  dispatchWorkOrder: (eventId, assignee, notes) => {
    const workOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      eventId,
      assignee,
      status: 'pending',
      createdAt: new Date(),
      notes,
    };
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, status: 'dispatched', workOrder } : e
      ),
    }));
    get().addNotification('info', '工单已派发', `已向 ${assignee} 派工`);
    get().addOperationLog('派发工单', `事件 ${eventId} 派发给 ${assignee}`);
  },

  approvePlan: (planId, level, approver, comment, status) => {
    set((state) => ({
      controlPlans: state.controlPlans.map((plan) => {
        if (plan.id !== planId) return plan;
        const updatedHistory = plan.approvalHistory.map((record) =>
          record.level === level
            ? { ...record, approver, status, comment, timestamp: new Date() }
            : record
        );
        const anyRejected = status === 'rejected';
        let newStatus: ControlPlanStatus | ApprovalStatus = plan.status;
        if (anyRejected) {
          newStatus = 'rejected';
        } else {
          const levelOrder: ApprovalLevel[] = ['command_center', 'transport_bureau', 'city_hall', 'city_government'];
          const currentLevelIndex = levelOrder.indexOf(level);
          if (currentLevelIndex < levelOrder.length - 1) {
            const nextLevel = levelOrder[currentLevelIndex + 1];
            const nextRecordIndex = updatedHistory.findIndex((r) => r.level === nextLevel);
            if (nextRecordIndex !== -1) {
              updatedHistory[nextRecordIndex] = { ...updatedHistory[nextRecordIndex], status: 'pending' };
            }
          } else {
            newStatus = 'approved';
          }
        }
        return { ...plan, approvalHistory: updatedHistory, status: newStatus };
      }),
    }));
    get().addNotification(
      status === 'approved' ? 'success' : 'danger',
      `方案${status === 'approved' ? '通过' : '驳回'}`,
      comment
    );
    get().addOperationLog(`${status === 'approved' ? '审批通过' : '审批驳回'}`, `方案 ${planId}: ${comment}`);
  },

  submitPlan: (planId) => {
    set((state) => ({
      controlPlans: state.controlPlans.map((plan) => {
        if (plan.id !== planId || plan.status !== 'draft') return plan;
        const updatedHistory = plan.approvalHistory.map((record) =>
          record.level === 'command_center'
            ? { ...record, status: 'pending' as ApprovalStatus }
            : record
        );
        return { ...plan, status: 'pending_approval' as ControlPlanStatus, approvalHistory: updatedHistory };
      }),
    }));
    get().addNotification('info', '方案提交', `方案 ${planId} 已提交审批`);
    get().addOperationLog('提交审批', `方案 ${planId} 已提交审批`);
  },

  executePlan: (planId) => {
    const plan = get().controlPlans.find((p) => p.id === planId);
    if (!plan || (plan.status !== 'approved' && plan.status !== 'approved_government')) return;
    set((state) => ({
      controlPlans: state.controlPlans.map((p) =>
        p.id === planId ? { ...p, status: 'executed' as ControlPlanStatus } : p
      ),
    }));
    get().startRoadClosureAnimation(plan.affectedAreas);
    get().addNotification('warning', '方案执行', '管控方案已执行，相关道路已封闭');
    get().addOperationLog('执行方案', `方案 ${planId} 已执行，封闭道路: ${plan.affectedAreas.join(', ')}`);
  },

  closeRoads: (roadIds) => {
    set((state) => ({
      roads: state.roads.map((road) =>
        roadIds.includes(road.id) ? { ...road, isClosed: true } : road
      ),
    }));
  },

  openRoads: (roadIds) => {
    set((state) => ({
      roads: state.roads.map((road) =>
        roadIds.includes(road.id) ? { ...road, isClosed: false } : road
      ),
    }));
  },

  startRoadClosureAnimation: (roadIds) => {
    set((state) => ({
      roadClosureAnimations: [...state.roadClosureAnimations, ...roadIds.filter((id) => !state.roadClosureAnimations.includes(id))],
    }));
    setTimeout(() => {
      get().closeRoads(roadIds);
      set((state) => ({
        roadClosureAnimations: state.roadClosureAnimations.filter((id) => !roadIds.includes(id)),
      }));
    }, 3000);
  },

  updateSignalTiming: (intersectionId, direction, timing) => {
    set((state) => ({
      intersections: state.intersections.map((int) =>
        int.id === intersectionId
          ? {
              ...int,
              signalTiming: {
                ...int.signalTiming,
                [direction]: { ...int.signalTiming[direction], ...timing },
              },
            }
          : int
      ),
    }));
    get().addNotification('success', '配时更新', `路口 ${intersectionId} ${direction} 方向配时已更新`);
    get().addOperationLog('调整信号配时', `路口 ${intersectionId} ${direction} 方向`);
  },

  generateEmergencyRoute: (vehicleId, vehicleType, start, end) => {
    const midX = (start[0] + end[0]) / 2;
    const midZ = (start[2] + end[2]) / 2;
    const newRoute: EmergencyRoute = {
      id: `route-${Date.now()}`,
      vehicleId,
      vehicleType,
      start,
      end,
      waypoints: [
        [midX, 0, start[2]],
        [midX, 0, midZ],
        [end[0], 0, midZ],
      ],
      active: true,
      startTime: new Date(),
    };
    set((state) => ({ emergencyRoutes: [...state.emergencyRoutes, newRoute] }));
    get().addNotification('warning', '应急路线生成', `为 ${vehicleType} 车辆生成应急路线`);
    get().addOperationLog('生成应急路线', `车辆 ${vehicleId} 应急路线已生成`);
  },

  addNotification: (type, title, message) => {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    set((state) => ({ notifications: [notification, ...state.notifications] }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  logout: () => {
    const { currentUser } = get();
    if (currentUser) {
      get().addOperationLog('用户登出', `${currentUser.name} 退出系统`);
    }
    set({ currentUser: null });
  },

  addOperationLog: (action, details) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const log: OperationLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details,
      timestamp: new Date(),
    };
    set((state) => ({ operationLogs: [log, ...state.operationLogs] }));
  },

  login: (role) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    set({ currentUser: user });
    get().addNotification('success', '登录成功', `欢迎回来，${user.name}`);
    get().addOperationLog('用户登录', `${user.name} 登录系统`);
  },
}));

export const useTrafficStore = useAppStore;
