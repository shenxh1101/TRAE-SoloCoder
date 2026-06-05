import { create } from 'zustand';
import type {
  BloodBag,
  Patient,
  TransfusionRequest,
  ColdStorage,
  Robot,
  InventoryAlert,
  SystemAlert,
  ApprovalRecord,
  CrossMatchResult,
  TransportTask,
  NurseConfirmation,
  BloodType,
  BloodComponent,
  User,
  UserRole,
  RequestStatus,
  TransportStatus,
  BloodBagStatus
} from '../types';
import { calculateInventoryStats, get3DayThreshold, getDaysOfSupply } from '../utils/bloodTypeUtils';
import { authService } from '../services/authService';
import * as bloodBagService from '../services/bloodBagService';
import * as transfusionRequestService from '../services/transfusionRequestService';
import * as transportService from '../services/transportService';
import * as alertService from '../services/alertService';
import * as reportService from '../services/reportService';
import * as robotService from '../services/robotService';
import { websocketService } from '../services/websocketService';
import type { WebSocketMessage } from '../services/websocketService';

interface BloodBankState {
  bloodBags: BloodBag[];
  patients: Patient[];
  transfusionRequests: TransfusionRequest[];
  crossMatchResults: CrossMatchResult[];
  transportTasks: TransportTask[];
  coldStorage: ColdStorage;
  robots: Robot[];
  inventoryAlerts: InventoryAlert[];
  systemAlerts: SystemAlert[];
  selectedBloodBag: BloodBag | null;
  selectedRequest: TransfusionRequest | null;
  currentUser: User | null;
  dataLoading: boolean;
  error: string | null;
  pollingIntervalId: number | null;
  wsConnected: boolean;

  setSelectedBloodBag: (bag: BloodBag | null) => void;
  setSelectedRequest: (request: TransfusionRequest | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  loadInitialData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  initWebSocket: () => void;
  startPolling: () => void;
  stopPolling: () => void;

  login: (username: string, password: string, role: UserRole) => Promise<User>;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<User>;

  createTransfusionRequest: (data: {
    patientId: string;
    requestingDoctor: string;
    department: string;
    bloodType: string;
    component: string;
    volume: number;
    urgency: 'routine' | 'urgent' | 'emergency';
  }) => Promise<TransfusionRequest>;
  approveRequest: (requestId: string) => Promise<ApprovalRecord>;
  rejectRequest: (requestId: string, reason: string) => Promise<ApprovalRecord>;
  performCrossMatch: (requestId: string) => Promise<CrossMatchResult>;
  performCrossMatchForRequest: (requestId: string) => Promise<CrossMatchResult>;

  createTransportTask: (requestId: string) => Promise<TransportTask>;
  updateRobotPosition: (taskId: string, progress: number) => Promise<TransportTask>;
  confirmNurseReceive: (taskId: string, nurseName: string) => Promise<NurseConfirmation>;
  scanQRCodeAndConfirm: (taskId: string, nurseName: string) => Promise<NurseConfirmation>;

  checkInventoryAlerts: () => Promise<InventoryAlert[]>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  createBloodCollectionPlan: (alertId: string) => Promise<void>;

  addSystemAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp'>) => void;

  updateTemperature: () => Promise<void>;
  triggerHighTemperature: () => Promise<void>;
  activateBackupCooling: () => Promise<void>;

  updateBloodBagStatus: (bagId: string, status: BloodBagStatus) => Promise<BloodBag>;

  getInventoryStats: () => ReturnType<typeof calculateInventoryStats>;
  getRequestsByStatus: (status: string) => TransfusionRequest[];
  getPendingApprovals: (role: 'department_director' | 'blood_bank_director') => TransfusionRequest[];

  exportDailyReport: (startDate?: string, endDate?: string) => Promise<Blob>;

  simulateTimeline: () => Promise<void>;
}

const defaultColdStorage: ColdStorage = {
  id: 'cold_storage_1',
  name: '主冷库',
  currentTemperature: 4,
  targetTemperature: 4,
  minTemperature: 2,
  maxTemperature: 6,
  backupCoolingActive: false,
  lastUpdate: new Date().toISOString(),
  alertStatus: 'normal',
  position3D: { x: -5, y: 0, z: 0 }
};

export const useBloodBankStore = create<BloodBankState>((set, get) => ({
  bloodBags: [],
  patients: [],
  transfusionRequests: [],
  crossMatchResults: [],
  transportTasks: [],
  coldStorage: defaultColdStorage,
  robots: [],
  inventoryAlerts: [],
  systemAlerts: [],
  selectedBloodBag: null,
  selectedRequest: null,
  currentUser: authService.getCurrentUser(),
  dataLoading: false,
  error: null,
  pollingIntervalId: null,
  wsConnected: false,

  setSelectedBloodBag: (bag) => set({ selectedBloodBag: bag }),
  setSelectedRequest: (request) => set({ selectedRequest: request }),
  setLoading: (loading) => set({ dataLoading: loading }),
  setError: (error) => set({ error }),

  loadInitialData: async () => {
    const { setLoading, setError, initWebSocket, startPolling } = get();
    setLoading(true);
    setError(null);

    try {
      const [
        bloodBags,
        requests,
        transportTasks,
        inventoryAlerts,
        systemAlerts,
        coldStorage,
        robots
      ] = await Promise.all([
        bloodBagService.getBloodBags(),
        transfusionRequestService.getRequests(),
        transportService.getTransportTasks(),
        alertService.getInventoryAlerts(),
        alertService.getSystemAlerts(),
        alertService.getColdStorage(),
        robotService.getRobots()
      ]);

      const crossMatchResults = requests
        .filter(r => r.crossMatchResult)
        .map(r => r.crossMatchResult!);

      set({
        bloodBags,
        transfusionRequests: requests,
        transportTasks,
        crossMatchResults,
        inventoryAlerts,
        systemAlerts,
        coldStorage,
        robots,
        dataLoading: false
      });

      initWebSocket();
      startPolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载数据失败';
      setError(message);
      setLoading(false);
      throw error;
    }
  },

  refreshAllData: async () => {
    const { setError } = get();
    try {
      const [
        bloodBags,
        requests,
        transportTasks,
        inventoryAlerts,
        systemAlerts,
        coldStorage,
        robots
      ] = await Promise.all([
        bloodBagService.getBloodBags(),
        transfusionRequestService.getRequests(),
        transportService.getTransportTasks(),
        alertService.getInventoryAlerts(),
        alertService.getSystemAlerts(),
        alertService.getColdStorage(),
        robotService.getRobots()
      ]);

      const crossMatchResults = requests
        .filter(r => r.crossMatchResult)
        .map(r => r.crossMatchResult!);

      set({
        bloodBags,
        transfusionRequests: requests,
        transportTasks,
        crossMatchResults,
        inventoryAlerts,
        systemAlerts,
        coldStorage,
        robots
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新数据失败';
      setError(message);
    }
  },

  initWebSocket: () => {
    const { addSystemAlert } = get();

    websocketService.connect();
    set({ wsConnected: true });

    websocketService.onTemperature<any>((data) => {
      const coldStorageData = data.coldStorage || data;
      const temperature = coldStorageData.currentTemperature ?? coldStorageData.temperature ?? 4;
      const alertStatus = coldStorageData.status ?? coldStorageData.alertStatus ?? 'normal';
      const backupCoolingActive = coldStorageData.isBackupCoolingActive ?? coldStorageData.backupCoolingActive ?? false;
      const alerts = data.alerts || [];

      set((state) => ({
        coldStorage: {
          ...state.coldStorage,
          currentTemperature: temperature,
          alertStatus: alertStatus,
          backupCoolingActive: backupCoolingActive,
          lastUpdate: new Date().toISOString()
        }
      }));

      if (alertStatus === 'critical' || alertStatus === 'warning') {
        addSystemAlert({
          type: 'temperature',
          severity: alertStatus === 'critical' ? 'critical' : 'high',
          title: alertStatus === 'critical' ? '冷库温度严重异常' : '冷库温度异常警告',
          message: `冷库温度${temperature.toFixed(1)}℃超出正常范围(2-6℃)${backupCoolingActive ? '，已启动备用制冷系统' : ''}`,
          acknowledged: false
        });
      }

      if (alerts && alerts.length > 0) {
        alerts.forEach((alert: any) => {
          if (alert.type === 'temperature' && !alert.acknowledged) {
            addSystemAlert({
              type: 'temperature',
              severity: alert.severity || 'high',
              title: alert.title || '温度告警',
              message: alert.message || `冷库温度异常`,
              acknowledged: false
            });
          }
        });
      }
    });

    websocketService.onNotification<{ title: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical' }>((data) => {
      addSystemAlert({
        type: 'overdue',
        severity: data.severity,
        title: data.title,
        message: data.message,
        acknowledged: false
      });
    });

    websocketService.onTaskUpdate<TransportTask>((task) => {
      set((state) => {
        const transportTasks = state.transportTasks.map(t =>
          t.id === task.id ? task : t
        );

        if (!transportTasks.find(t => t.id === task.id)) {
          transportTasks.push(task);
        }

        const transfusionRequests = state.transfusionRequests.map(req => {
          if (req.transportTask?.id === task.id) {
            return {
              ...req,
              status: task.status === 'delivered' ? 'delivered' as RequestStatus : req.status,
              transportTask: task
            };
          }
          return req;
        });

        const robots = state.robots.map(r => {
          if (r.id === task.robotId) {
            return {
              ...r,
              currentPosition: task.currentPosition,
              status: task.status === 'delivered' ? 'idle' as const : 'busy' as const,
              currentTaskId: task.status === 'delivered' ? undefined : task.id
            };
          }
          return r;
        });

        return { transportTasks, transfusionRequests, robots };
      });
    });

    websocketService.onAlert<SystemAlert>((alert) => {
      set((state) => ({
        systemAlerts: [...state.systemAlerts, alert]
      }));
    });
  },

  startPolling: () => {
    const { refreshAllData, pollingIntervalId } = get();
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
    }

    const intervalId = window.setInterval(() => {
      refreshAllData();
    }, 10000);

    set({ pollingIntervalId: intervalId });
  },

  stopPolling: () => {
    const { pollingIntervalId } = get();
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
      set({ pollingIntervalId: null });
    }
  },

  login: async (username, password, role) => {
    const { setLoading, setError, loadInitialData } = get();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login({ username, password, role });
      set({ currentUser: response.user });
      await loadInitialData();
      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      setError(message);
      setLoading(false);
      throw error;
    }
  },

  logout: () => {
    const { stopPolling } = get();
    authService.logout();
    websocketService.disconnect();
    stopPolling();
    set({
      currentUser: null,
      wsConnected: false,
      bloodBags: [],
      transfusionRequests: [],
      transportTasks: [],
      crossMatchResults: [],
      inventoryAlerts: [],
      systemAlerts: []
    });
  },

  quickLogin: async (role) => {
    const { setLoading, setError, loadInitialData } = get();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.quickLogin(role);
      set({ currentUser: response.user });
      await loadInitialData();
      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '快速登录失败';
      setError(message);
      setLoading(false);
      throw error;
    }
  },

  createTransfusionRequest: async (data) => {
    const { setError } = get();
    try {
      const request = await transfusionRequestService.createRequest(data);
      set((state) => ({
        transfusionRequests: [...state.transfusionRequests, request]
      }));
      return request;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建申请失败';
      setError(message);
      throw error;
    }
  },

  approveRequest: async (requestId) => {
    const { setError, currentUser } = get();
    try {
      const approvalRecord = await transfusionRequestService.approveRequest(requestId, {
        decision: 'approved',
        comments: '同意'
      });

      set((state) => {
        const requests = state.transfusionRequests.map(req => {
          if (req.id !== requestId) return req;

          let newStatus: RequestStatus = req.status;
          if (req.status === 'doctor_approved') {
            newStatus = 'director_approved';
          } else if (req.status === 'director_approved') {
            newStatus = 'approved';
          }

          return {
            ...req,
            status: newStatus,
            approvalRecords: [...req.approvalRecords, approvalRecord]
          };
        });

        return { transfusionRequests: requests };
      });

      return approvalRecord;
    } catch (error) {
      const message = error instanceof Error ? error.message : '审批失败';
      setError(message);
      throw error;
    }
  },

  rejectRequest: async (requestId, reason) => {
    const { setError } = get();
    try {
      const approvalRecord = await transfusionRequestService.approveRequest(requestId, {
        decision: 'rejected',
        comments: reason
      });

      set((state) => {
        const requests = state.transfusionRequests.map(req => {
          if (req.id !== requestId) return req;

          return {
            ...req,
            status: 'rejected' as RequestStatus,
            approvalRecords: [...req.approvalRecords, approvalRecord]
          };
        });

        return { transfusionRequests: requests };
      });

      return approvalRecord;
    } catch (error) {
      const message = error instanceof Error ? error.message : '拒绝失败';
      setError(message);
      throw error;
    }
  },

  performCrossMatch: async (requestId) => {
    const { setError } = get();
    try {
      const result = await transfusionRequestService.crossMatch(requestId);

      set((state) => {
        const crossMatchResults = [...state.crossMatchResults, result];

        const transfusionRequests = state.transfusionRequests.map(req =>
          req.id === requestId
            ? { ...req, status: 'cross_matched' as RequestStatus, crossMatchResult: result }
            : req
        );

        const bloodBags = state.bloodBags.map(bag =>
          bag.id === result.bloodBagId
            ? { ...bag, status: 'allocated' as BloodBagStatus }
            : bag
        );

        return { crossMatchResults, transfusionRequests, bloodBags };
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '交叉配血失败';
      setError(message);
      throw error;
    }
  },

  performCrossMatchForRequest: async (requestId) => {
    return await get().performCrossMatch(requestId);
  },

  createTransportTask: async (requestId) => {
    const { setError } = get();
    try {
      const response = await transfusionRequestService.createTransport(requestId);
      const task = await transportService.getTransportTask(response.transportTaskId);

      set((state) => {
        const transportTasks = [...state.transportTasks, task];

        const transfusionRequests = state.transfusionRequests.map(req =>
          req.id === requestId
            ? { ...req, status: 'transporting' as RequestStatus, transportTask: task }
            : req
        );

        const robots = state.robots.map(r =>
          r.id === task.robotId
            ? { ...r, status: 'busy' as const, currentTaskId: task.id }
            : r
        );

        return { transportTasks, transfusionRequests, robots };
      });

      return task;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建运输任务失败';
      setError(message);
      throw error;
    }
  },

  updateRobotPosition: async (taskId, progress) => {
    const { setError } = get();
    try {
      const task = await transportService.updateProgress(taskId, progress);

      set((state) => {
        const transportTasks = state.transportTasks.map(t =>
          t.id === taskId ? task : t
        );

        const transfusionRequests = state.transfusionRequests.map(req => {
          if (req.transportTask?.id === taskId) {
            return {
              ...req,
              status: task.status === 'delivered' ? 'delivered' as RequestStatus : req.status,
              transportTask: task
            };
          }
          return req;
        });

        const robots = state.robots.map(r => {
          if (r.id === task.robotId) {
            return {
              ...r,
              currentPosition: task.currentPosition,
              status: task.status === 'delivered' ? 'idle' as const : 'busy' as const,
              currentTaskId: task.status === 'delivered' ? undefined : taskId
            };
          }
          return r;
        });

        return { transportTasks, transfusionRequests, robots };
      });

      return task;
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新位置失败';
      setError(message);
      throw error;
    }
  },

  confirmNurseReceive: async (taskId, nurseName) => {
    const { setError } = get();
    try {
      const confirmation = await transportService.confirmReceive(taskId, { nurseName });

      set((state) => {
        const transportTasks = state.transportTasks.map(task =>
          task.id === taskId
            ? { ...task, status: 'delivered' as TransportStatus, nurseConfirmation: confirmation }
            : task
        );

        const transfusionRequests = state.transfusionRequests.map(req => {
          if (req.transportTask?.id === taskId) {
            const updatedTask = transportTasks.find(t => t.id === taskId)!;
            return {
              ...req,
              status: 'completed' as RequestStatus,
              transportTask: updatedTask
            };
          }
          return req;
        });

        const task = transportTasks.find(t => t.id === taskId);
        const request = transfusionRequests.find(r => r.transportTask?.id === taskId);
        const bloodBagId = task?.bloodBagIds?.[0] || request?.crossMatchResult?.bloodBagId;

        const bloodBags = state.bloodBags.map(bag =>
          bag.id === bloodBagId
            ? { ...bag, status: 'used' as BloodBagStatus }
            : bag
        );

        return { transportTasks, transfusionRequests, bloodBags };
      });

      return confirmation;
    } catch (error) {
      const message = error instanceof Error ? error.message : '确认接收失败';
      setError(message);
      throw error;
    }
  },

  scanQRCodeAndConfirm: async (taskId, nurseName) => {
    const { setError, confirmNurseReceive } = get();
    try {
      const scanResult = await transportService.scanQRCode(taskId);
      if (!scanResult.valid) {
        throw new Error('二维码无效');
      }
      return await confirmNurseReceive(taskId, nurseName);
    } catch (error) {
      const message = error instanceof Error ? error.message : '扫码确认失败';
      setError(message);
      throw error;
    }
  },

  checkInventoryAlerts: async () => {
    const { setError } = get();
    try {
      const alerts = await alertService.getInventoryAlerts();
      set({ inventoryAlerts: alerts });
      return alerts;
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查库存告警失败';
      setError(message);
      throw error;
    }
  },

  acknowledgeAlert: async (alertId) => {
    const { setError } = get();
    try {
      await alertService.acknowledgeAlert(alertId);
      set((state) => ({
        inventoryAlerts: state.inventoryAlerts.map(a =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        ),
        systemAlerts: state.systemAlerts.map(a =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        )
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '确认告警失败';
      setError(message);
      throw error;
    }
  },

  createBloodCollectionPlan: async (alertId) => {
    const { setError, inventoryAlerts } = get();
    try {
      const alert = inventoryAlerts.find(a => a.id === alertId);
      if (!alert) throw new Error('告警不存在');

      set((state) => ({
        inventoryAlerts: state.inventoryAlerts.map(a =>
          a.id === alertId
            ? {
                ...a,
                collectionPlan: {
                  id: `plan_${Date.now()}`,
                  alertId,
                  bloodType: a.bloodType,
                  component: a.component,
                  requiredAmount: a.threshold - a.currentStock + 10,
                  bloodStation: '市中心血站',
                  status: 'pending',
                  plannedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                  contactPerson: '李站长',
                  phone: '13800138000'
                }
              }
            : a
        )
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建采血计划失败';
      setError(message);
      throw error;
    }
  },

  addSystemAlert: (alert) => set((state) => ({
    systemAlerts: [
      ...state.systemAlerts,
      {
        ...alert,
        id: `sys_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }
    ]
  })),

  updateTemperature: async () => {
    const { setError } = get();
    try {
      const coldStorage = await alertService.getColdStorage();
      set({ coldStorage });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新温度失败';
      setError(message);
      throw error;
    }
  },

  triggerHighTemperature: async () => {
    const { setError, addSystemAlert } = get();
    try {
      const coldStorage = await alertService.updateTemperature(6.8);
      set({ coldStorage });

      if (coldStorage.alertStatus === 'critical') {
        addSystemAlert({
          type: 'temperature',
          severity: 'critical',
          title: '冷库温度异常警报',
          message: `冷库温度6.8℃超出正常范围(2-6℃)，已自动启动备用制冷系统`,
          acknowledged: false
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '触发高温警报失败';
      setError(message);
      throw error;
    }
  },

  activateBackupCooling: async () => {
    const { setError } = get();
    try {
      set((state) => ({
        coldStorage: {
          ...state.coldStorage,
          backupCoolingActive: true
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '启动备用制冷失败';
      setError(message);
      throw error;
    }
  },

  updateBloodBagStatus: async (bagId, status) => {
    const { setError } = get();
    try {
      const bag = await bloodBagService.updateBloodBag(bagId, { status });
      set((state) => ({
        bloodBags: state.bloodBags.map(b => b.id === bagId ? bag : b)
      }));
      return bag;
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新血袋状态失败';
      setError(message);
      throw error;
    }
  },

  getInventoryStats: () => calculateInventoryStats(get().bloodBags),

  getRequestsByStatus: (status) => get().transfusionRequests.filter(r => r.status === status),

  getPendingApprovals: (role) => {
    const state = get();
    const status = role === 'department_director' ? 'doctor_approved' : 'director_approved';
    return state.transfusionRequests.filter(r => r.status === status);
  },

  exportDailyReport: async (startDate, endDate) => {
    const { setError } = get();
    try {
      return await reportService.exportDailyReport({ startDate, endDate });
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出日报表失败';
      setError(message);
      throw error;
    }
  },

  simulateTimeline: async () => {
    const state = get();
    const approvedRequests = state.transfusionRequests.filter(r => r.status === 'approved');

    for (const req of approvedRequests) {
      if (!req.crossMatchResult) {
        try {
          await state.performCrossMatch(req.id);
        } catch (e) {
          console.error('Cross match failed:', e);
        }
      }
    }

    const matchedRequests = state.transfusionRequests.filter(r => r.status === 'cross_matched' && !r.transportTask);
    for (const req of matchedRequests) {
      if (req.crossMatchResult) {
        try {
          await state.createTransportTask(req.id);
        } catch (e) {
          console.error('Create transport failed:', e);
        }
      }
    }

    const transportingRequests = state.transfusionRequests.filter(r => r.status === 'transporting' && r.transportTask);
    for (const req of transportingRequests) {
      if (req.transportTask) {
        try {
          const newProgress = Math.min(req.transportTask.progress + 0.05, 1);
          await state.updateRobotPosition(req.transportTask.id, newProgress);
        } catch (e) {
          console.error('Update position failed:', e);
        }
      }
    }

    try {
      await state.updateTemperature();
      await state.checkInventoryAlerts();
    } catch (e) {
      console.error('Simulation update failed:', e);
    }
  }
}));
