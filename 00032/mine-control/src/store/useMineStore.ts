import { create } from 'zustand';
import type {
  WorkFace,
  MineCart,
  Worker,
  Equipment,
  WorkOrder,
  DangerZone,
  EvacuationRoute,
  DailyReport,
  Position,
} from '../data/types';
import {
  workFaces as initialWorkFaces,
  mineCarts as initialMineCarts,
  workers as initialWorkers,
  equipment as initialEquipment,
  workOrders as initialWorkOrders,
  dangerZones as initialDangerZones,
  evacuationRoutes as initialEvacuationRoutes,
  initialAlerts,
  dailyReports,
} from '../data/mockData';

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

interface IntersectionQueue {
  [key: string]: { cartId: string; priority: number; arrivalTime: number }[];
}

interface OutputPlan {
  workFaceId: string;
  targetOutput: number;
  currentOutput: number;
}

interface MineState {
  workFaces: WorkFace[];
  mineCarts: MineCart[];
  workers: Worker[];
  equipment: Equipment[];
  workOrders: WorkOrder[];
  dangerZones: DangerZone[];
  evacuationRoutes: EvacuationRoute[];
  alerts: Alert[];
  dailyReports: DailyReport[];
  selectedWorkFace: WorkFace | null;
  selectedCart: MineCart | null;
  selectedWorker: Worker | null;
  emergencyActive: boolean;
  emergencyType: 'none' | 'collapse' | 'flood';
  currentTime: string;
  totalOutput: number;
  intersectionQueues: IntersectionQueue;
  outputPlans: OutputPlan[];
  showEmergencyPlan: boolean;

  setSelectedWorkFace: (workFace: WorkFace | null) => void;
  setSelectedCart: (cart: MineCart | null) => void;
  setSelectedWorker: (worker: Worker | null) => void;
  updateWorkFaceData: (id: string, data: Partial<WorkFace>) => void;
  updateCartPosition: (id: string, position: Position, rotation: number, routeIndex: number) => void;
  updateWorkerPosition: (id: string, position: Position) => void;
  acknowledgeAlert: (alertId: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  triggerEmergency: (type: 'collapse' | 'flood') => void;
  clearEmergency: () => void;
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => void;
  simulateDataUpdate: () => void;
  checkDangerZones: () => void;
  assignCartTasks: () => void;
  manageIntersection: (cartId: string, intersectionId: string) => void;
  checkEquipmentMaintenance: () => void;
  setShowEmergencyPlan: (show: boolean) => void;
}

const INTERSECTIONS = [
  { id: 'int1', position: { x: 0, y: 0, z: -40 } },
  { id: 'int2', position: { x: 0, y: 0, z: -80 } },
  { id: 'int3', position: { x: 0, y: 0, z: 0 } },
];

const isNearPosition = (pos1: Position, pos2: Position, threshold: number = 5): boolean => {
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) +
    Math.pow(pos1.z - pos2.z, 2)
  ) < threshold;
};

const generateRoute = (from: Position, to: Position): Position[] => {
  const midPoint = { x: 0, y: 0, z: (from.z + to.z) / 2 };
  return [from, midPoint, to];
};

export const useMineStore = create<MineState>((set, get) => ({
  workFaces: initialWorkFaces,
  mineCarts: initialMineCarts,
  workers: initialWorkers,
  equipment: initialEquipment,
  workOrders: initialWorkOrders,
  dangerZones: initialDangerZones,
  evacuationRoutes: initialEvacuationRoutes,
  alerts: initialAlerts,
  dailyReports,
  selectedWorkFace: null,
  selectedCart: null,
  selectedWorker: null,
  emergencyActive: false,
  emergencyType: 'none',
  currentTime: new Date().toLocaleString('zh-CN'),
  totalOutput: 10000,
  intersectionQueues: {},
  outputPlans: [
    { workFaceId: 'wf1', targetOutput: 3000, currentOutput: 2800 },
    { workFaceId: 'wf2', targetOutput: 2500, currentOutput: 2200 },
    { workFaceId: 'wf3', targetOutput: 3500, currentOutput: 3100 },
    { workFaceId: 'wf4', targetOutput: 2000, currentOutput: 1900 },
  ],
  showEmergencyPlan: false,

  setSelectedWorkFace: (workFace) => set({ selectedWorkFace: workFace }),
  setSelectedCart: (cart) => set({ selectedCart: cart }),
  setSelectedWorker: (worker) => set({ selectedWorker: worker }),

  updateWorkFaceData: (id, data) =>
    set((state) => ({
      workFaces: state.workFaces.map((wf) =>
        wf.id === id ? { ...wf, ...data } : wf
      ),
    })),

  updateCartPosition: (id, position, rotation, routeIndex) =>
    set((state) => ({
      mineCarts: state.mineCarts.map((cart) =>
        cart.id === id ? { ...cart, position, rotation, routeIndex } : cart
      ),
    })),

  updateWorkerPosition: (id, position) =>
    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === id ? { ...w, position } : w
      ),
    })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: `a${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toLocaleString('zh-CN'),
        },
        ...state.alerts,
      ],
    })),

  triggerEmergency: (type) =>
    set((state) => ({
      emergencyActive: true,
      emergencyType: type,
      evacuationRoutes: state.evacuationRoutes.map((r) => ({ ...r, active: true })),
      workers: state.workers.map((w) => ({ ...w, status: 'evacuating' })),
      showEmergencyPlan: true,
    })),

  clearEmergency: () =>
    set((state) => ({
      emergencyActive: false,
      emergencyType: 'none',
      evacuationRoutes: state.evacuationRoutes.map((r) => ({ ...r, active: false })),
      workers: state.workers.map((w) => ({ ...w, status: w.isInDangerZone ? 'warning' : 'normal' })),
      showEmergencyPlan: false,
    })),

  updateWorkOrderStatus: (id, status) =>
    set((state) => ({
      workOrders: state.workOrders.map((wo) =>
        wo.id === id ? { ...wo, status } : wo
      ),
    })),

  setShowEmergencyPlan: (show) => set({ showEmergencyPlan: show }),

  checkDangerZones: () => {
    const state = get();
    state.workers.forEach((worker) => {
      let inDanger = false;
      let dangerZoneName = '';
      
      state.dangerZones.forEach((zone) => {
        const dx = Math.abs(worker.position.x - zone.position.x);
        const dz = Math.abs(worker.position.z - zone.position.z);
        if (dx < zone.size.width / 2 && dz < zone.size.depth / 2) {
          inDanger = true;
          dangerZoneName = zone.name;
        }
      });

      if (inDanger && !worker.isInDangerZone) {
        get().addAlert({
          type: 'worker',
          level: 'danger',
          message: `${worker.name}进入${dangerZoneName}危险区域，请立即撤离！`,
          sourceId: worker.id,
          sourceName: worker.name,
          acknowledged: false,
        });
      }

      set((prevState) => ({
        workers: prevState.workers.map((w) =>
          w.id === worker.id
            ? {
                ...w,
                isInDangerZone: inDanger,
                status: inDanger ? 'warning' : 'normal',
              }
            : w
        ),
      }));
    });
  },

  assignCartTasks: () => {
    const state = get();
    const idleCarts = state.mineCarts.filter((c) => c.status === 'idle');
    
    if (idleCarts.length === 0) return;

    const needMoreOutput = state.outputPlans.filter(
      (p) => p.currentOutput < p.targetOutput
    );

    if (needMoreOutput.length === 0) return;

    const workFace = state.workFaces.find(
      (wf) => wf.id === needMoreOutput[0].workFaceId
    );
    if (!workFace) return;

    const cart = idleCarts[0];
    const task = {
      id: `task${Date.now()}`,
      from: workFace.name,
      to: '主井',
      plannedLoad: Math.min(18, needMoreOutput[0].targetOutput - needMoreOutput[0].currentOutput),
      priority: 1,
    };

    const route = generateRoute(workFace.position, { x: -15, y: 0, z: 25 });

    set((prevState) => ({
      mineCarts: prevState.mineCarts.map((c) =>
        c.id === cart.id
          ? {
              ...c,
              status: 'transporting' as const,
              currentTask: task,
              route,
              routeIndex: 0,
            }
          : c
      ),
    }));
  },

  manageIntersection: (cartId, intersectionId) => {
    const state = get();
    const intersection = INTERSECTIONS.find((i) => i.id === intersectionId);
    if (!intersection) return;

    const cart = state.mineCarts.find((c) => c.id === cartId);
    if (!cart) return;

    const nearIntersection = isNearPosition(cart.position, intersection.position, 8);
    
    if (nearIntersection) {
      set((prevState) => {
        const currentQueue = prevState.intersectionQueues[intersectionId] || [];
        const alreadyInQueue = currentQueue.some((q) => q.cartId === cartId);
        
        if (alreadyInQueue) return prevState;

        const newQueue = [
          ...currentQueue,
          {
            cartId,
            priority: cart.currentTask?.priority || 1,
            arrivalTime: Date.now(),
          },
        ].sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.arrivalTime - b.arrivalTime;
        });

        return {
          intersectionQueues: {
            ...prevState.intersectionQueues,
            [intersectionId]: newQueue,
          },
        };
      });
    }
  },

  checkEquipmentMaintenance: () => {
    const state = get();
    state.equipment.forEach((eq) => {
      if (eq.runHours >= 500 && !eq.maintenanceWarning) {
        const workOrder: WorkOrder = {
          id: `wo${Date.now()}`,
          equipmentId: eq.id,
          equipmentName: eq.name,
          type: 'routine',
          description: `${eq.name}累计运行${eq.runHours}小时，需进行常规检修`,
          status: 'pending',
          createdAt: new Date().toLocaleString('zh-CN'),
          assignedTo: '维修班A组',
        };

        set((prevState) => ({
          equipment: prevState.equipment.map((e) =>
            e.id === eq.id ? { ...e, maintenanceWarning: true } : e
          ),
          workOrders: [workOrder, ...prevState.workOrders],
        }));

        get().addAlert({
          type: 'equipment',
          level: 'warning',
          message: `${eq.name}累计运行${eq.runHours}小时，建议检修`,
          sourceId: eq.id,
          sourceName: eq.name,
          acknowledged: false,
        });
      }
    });
  },

  simulateDataUpdate: () => {
    const state = get();
    
    set({
      currentTime: new Date().toLocaleString('zh-CN'),
      totalOutput: state.totalOutput + Math.floor(Math.random() * 10),
    });

    state.workFaces.forEach((wf) => {
      const newGas = Math.max(0.1, Math.min(1.2, wf.gasConcentration + (Math.random() - 0.5) * 0.05));
      const isWarning = newGas >= 0.8;
      
      if (isWarning && !wf.isWarning) {
        get().addAlert({
          type: 'gas',
          level: 'danger',
          message: `${wf.name}瓦斯浓度达到${newGas.toFixed(2)}%，超过安全阈值！已自动启动局部通风机`,
          sourceId: wf.id,
          sourceName: wf.name,
          acknowledged: false,
        });
      }

      get().updateWorkFaceData(wf.id, {
        gasConcentration: newGas,
        dustConcentration: Math.max(5, wf.dustConcentration + (Math.random() - 0.5) * 0.5),
        temperature: Math.max(20, Math.min(35, wf.temperature + (Math.random() - 0.5) * 0.3)),
        isWarning,
        ventilatorActive: isWarning,
      });
    });

    get().checkDangerZones();
    get().assignCartTasks();
    get().checkEquipmentMaintenance();

    INTERSECTIONS.forEach((intersection) => {
      state.mineCarts.forEach((cart) => {
        if (cart.status === 'transporting') {
          get().manageIntersection(cart.id, intersection.id);
        }
      });
    });

    set((prevState) => ({
      equipment: prevState.equipment.map((eq) => ({
        ...eq,
        runHours: eq.status === 'running' ? eq.runHours + (eq.type === 'shearer' ? 0.5 : 0.1) : eq.runHours,
      })),
    }));
  },
}));
