import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Terminal,
  Gate,
  Flight,
  CheckinCounter,
  SecurityChannel,
  Baggage,
  BaggageCarousel,
  GroundCrew,
  Alert,
  Passenger,
  CompensationVoucher,
} from '../types';
import {
  terminals as initialTerminals,
  gates as initialGates,
  flights as initialFlights,
  checkinCounters as initialCheckinCounters,
  securityChannels as initialSecurityChannels,
  baggages as initialBaggages,
  baggageCarousels as initialBaggageCarousels,
  groundCrew as initialGroundCrew,
  alerts as initialAlerts,
  passengers as initialPassengers,
  compensationVouchers as initialCompensationVouchers,
  hourlyPassengerFlow as initialHourlyPassengerFlow,
  monthlyPunctualityRate as initialMonthlyPunctualityRate,
} from '../data/mockData';

export type UserRoleKey = 'passenger' | 'ground_crew' | 'airline' | 'admin';

const ROLE_MAPPING: Record<string, UserRoleKey> = {
  '旅客': 'passenger',
  '地勤人员': 'ground_crew',
  '航司代表': 'airline',
  '机场管理员': 'admin',
};

export interface CrewTask {
  id: string;
  crewId: string;
  flightId: string;
  flightNo: string;
  taskType: string;
  scheduledTime: string;
  location: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  operator: string;
}

export interface AirportContextType {
  terminals: Terminal[];
  gates: Gate[];
  flights: Flight[];
  checkinCounters: CheckinCounter[];
  securityChannels: SecurityChannel[];
  baggages: Baggage[];
  baggageCarousels: BaggageCarousel[];
  groundCrew: GroundCrew[];
  alerts: Alert[];
  passengers: Passenger[];
  compensationVouchers: CompensationVoucher[];
  hourlyPassengerFlow: typeof initialHourlyPassengerFlow;
  monthlyPunctualityRate: typeof initialMonthlyPunctualityRate;
  crewTasks: CrewTask[];
  dispatchLogs: DispatchLog[];
  currentRole: UserRoleKey;
  currentUser: Passenger | GroundCrew | null;
  selectedPassengerId: string;
  selectedCrewId: string;
  selectedAirlineCode: string;

  setCurrentRole: (role: string) => void;
  setSelectedPassengerId: (id: string) => void;
  setSelectedCrewId: (id: string) => void;
  setSelectedAirlineCode: (code: string) => void;

  assignGateToFlight: (flightId: string, gateId: string) => void;
  recommendGates: (aircraftType: string, terminalId?: string) => Array<Gate & { score: number; reason: string }>;
  calculateTaxiTime: (gateId: string) => number;

  allocateCheckinCounters: (flightId: string, count: number) => string[];
  calculateNeededCounters: (passengerCount: number, isPeak: boolean) => number;
  getPeakHours: () => string[];
  openCounter: (counterId: string) => void;
  closeCounter: (counterId: string) => void;

  getSecuritySuggestion: (terminalId: string) => { channelsToOpen: string[]; channelsToClose: string[]; reason: string };
  dispatchSecurityChannel: (channelId: string, action: 'open' | 'close') => void;
  getTotalFlowByTerminal: (terminalId: string) => number;
  getTotalCapacityByTerminal: (terminalId: string) => number;

  getBaggageByTag: (tagId: string) => Baggage | undefined;
  getBaggageByPassenger: (passengerId: string) => Baggage[];
  updateBaggageStatus: (baggageId: string, status: Baggage['status'], location: string) => void;

  analyzeDelayCause: (flight: Flight) => { cause: string; confidence: number; category: string };
  generateCompensation: (flightId: string) => CompensationVoucher[];
  reallocateResourcesForDelay: (flightId: string) => { gates: string[]; counters: string[] };

  generateCrewSchedule: () => CrewTask[];
  assignTaskToCrew: (task: Omit<CrewTask, 'id'>) => void;
  updateTaskStatus: (taskId: string, status: CrewTask['status']) => void;
  pushTasksToCrew: (crewId: string) => Promise<boolean>;

  filterFlightsByRole: (flights: Flight[]) => Flight[];
  filterGatesByRole: (gates: Gate[]) => Gate[];
  filterBaggageByRole: (baggages: Baggage[]) => Baggage[];

  generateEfficiencyReport: () => string;
  generateDispatchLogCSV: () => string;
}

const AirportContext = createContext<AirportContextType | null>(null);

export const useAirport = () => {
  const context = useContext(AirportContext);
  if (!context) throw new Error('useAirport must be used within AirportProvider');
  return context;
};

const AIRPORT_LAYOUT: Record<string, { distance: number; taxiTime: number }> = {
  'G-T1-01': { distance: 0.8, taxiTime: 8 },
  'G-T1-02': { distance: 1.0, taxiTime: 10 },
  'G-T1-03': { distance: 2.5, taxiTime: 12 },
  'G-T1-04': { distance: 0.9, taxiTime: 9 },
  'G-T1-05': { distance: 3.0, taxiTime: 14 },
  'G-T1-06': { distance: 0.7, taxiTime: 7 },
  'G-T1-07': { distance: 1.1, taxiTime: 11 },
  'G-T1-08': { distance: 3.2, taxiTime: 15 },
  'G-T1-09': { distance: 0.6, taxiTime: 6 },
  'G-T1-10': { distance: 1.2, taxiTime: 12 },
  'G-T1-11': { distance: 0.85, taxiTime: 9 },
  'G-T1-12': { distance: 1.3, taxiTime: 13 },
  'G-T2-01': { distance: 1.5, taxiTime: 14 },
  'G-T2-02': { distance: 1.7, taxiTime: 16 },
  'G-T2-03': { distance: 3.5, taxiTime: 18 },
  'G-T2-04': { distance: 1.6, taxiTime: 15 },
  'G-T2-05': { distance: 4.0, taxiTime: 20 },
  'G-T2-06': { distance: 1.4, taxiTime: 13 },
  'G-T2-07': { distance: 1.8, taxiTime: 17 },
  'G-T2-08': { distance: 4.2, taxiTime: 21 },
  'G-T2-09': { distance: 1.3, taxiTime: 12 },
  'G-T2-10': { distance: 2.0, taxiTime: 19 },
  'G-T3-01': { distance: 1.2, taxiTime: 11 },
  'G-T3-02': { distance: 1.4, taxiTime: 13 },
  'G-T3-03': { distance: 2.8, taxiTime: 16 },
  'G-T3-04': { distance: 1.3, taxiTime: 12 },
  'G-T3-05': { distance: 3.2, taxiTime: 18 },
  'G-T3-06': { distance: 1.1, taxiTime: 10 },
  'G-T3-07': { distance: 1.5, taxiTime: 14 },
  'G-T3-08': { distance: 3.5, taxiTime: 20 },
};

export const AirportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gates, setGates] = useState<Gate[]>(initialGates);
  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [checkinCounters, setCheckinCounters] = useState<CheckinCounter[]>(initialCheckinCounters);
  const [securityChannels, setSecurityChannels] = useState<SecurityChannel[]>(initialSecurityChannels);
  const [baggages, setBaggages] = useState<Baggage[]>(initialBaggages);
  const [groundCrew, setGroundCrew] = useState<GroundCrew[]>(initialGroundCrew);
  const [compensationVouchers, setCompensationVouchers] = useState<CompensationVoucher[]>(initialCompensationVouchers);
  const [crewTasks, setCrewTasks] = useState<CrewTask[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [currentRole, setCurrentRoleState] = useState<UserRoleKey>('admin');
  const [selectedPassengerId, setSelectedPassengerId] = useState('P001');
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [selectedAirlineCode, setSelectedAirlineCode] = useState('CA');
  const [flowData, setFlowData] = useState(initialHourlyPassengerFlow);

  const setCurrentRole = useCallback((roleLabel: string) => {
    const roleKey = ROLE_MAPPING[roleLabel] || 'admin';
    setCurrentRoleState(roleKey);
  }, []);

  const currentUser = useMemo(() => {
    if (currentRole === 'passenger') {
      return initialPassengers.find(p => p.id === selectedPassengerId) || null;
    }
    if (currentRole === 'ground_crew') {
      return initialGroundCrew.find(c => c.id === selectedCrewId) || null;
    }
    return null;
  }, [currentRole, selectedPassengerId, selectedCrewId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBaggages(prev =>
        prev.map(baggage => {
          if (baggage.status === 'claimed') return baggage;
          const statuses: Baggage['status'][] = ['checked_in', 'screening', 'sorted', 'loaded', 'transit', 'arrived', 'claimed'];
          const currentIndex = statuses.indexOf(baggage.status);
          if (Math.random() > 0.7 && currentIndex < statuses.length - 1) {
            const locations = [
              'T1 值机区', 'T1 安检区', 'T1 分拣中心', 'T1 货舱', '运输中', 'T2 到达区', '已提取',
            ];
            return {
              ...baggage,
              status: statuses[currentIndex + 1],
              location: locations[currentIndex + 1],
              lastUpdate: new Date().toISOString(),
            };
          }
          return baggage;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecurityChannels(prev =>
        prev.map(ch => ({
          ...ch,
          currentFlow: ch.status === 'open'
            ? Math.max(20, Math.min(ch.throughput, ch.currentFlow + Math.floor(Math.random() * 10) - 5))
            : 0,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlowData(prev =>
        prev.map(hour => ({
          ...hour,
          T1: Math.max(200, hour.T1 + Math.floor(Math.random() * 100) - 50),
          T2: Math.max(150, hour.T2 + Math.floor(Math.random() * 80) - 40),
          T3: Math.max(100, hour.T3 + Math.floor(Math.random() * 60) - 30),
        }))
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const addDispatchLog = useCallback((type: string, message: string) => {
    const log: DispatchLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      operator: currentRole,
    };
    setDispatchLogs(prev => [log, ...prev].slice(0, 100));
  }, [currentRole]);

  const assignGateToFlight = useCallback((flightId: string, gateId: string) => {
    setFlights(prev => prev.map(f => (f.id === flightId ? { ...f, gateId } : f)));
    setGates(prev => prev.map(g => (g.id === gateId ? { ...g, status: 'occupied' as const } : g)));
    addDispatchLog('机位分配', `航班 ${flightId} 分配至机位 ${gateId}`);
  }, [addDispatchLog]);

  const recommendGates = useCallback((aircraftType: string, terminalId?: string) => {
    const availableGates = gates.filter(g => {
      const typeMatch = g.aircraftType.includes(aircraftType);
      const statusMatch = g.status === 'available';
      const terminalMatch = !terminalId || g.terminalId === terminalId;
      return typeMatch && statusMatch && terminalMatch;
    });

    return availableGates
      .map(gate => {
        const layoutInfo = AIRPORT_LAYOUT[gate.id] || { taxiTime: 15, distance: 2.5 };
        const taxiTime = layoutInfo.taxiTime;
        const isBridge = gate.currentPosition === '廊桥';

        let score = 100 - taxiTime * 2;
        if (isBridge) score += 15;
        if (gate.aircraftType.length > 2) score += 5;

        let reason = '';
        if (taxiTime <= 8) reason += '滑行时间短；';
        if (isBridge) reason += '廊桥机位；';
        reason += '机型匹配';

        return { ...gate, taxiTime, score, reason };
      })
      .sort((a, b) => b.score - a.score);
  }, [gates]);

  const calculateTaxiTime = useCallback((gateId: string) => {
    return AIRPORT_LAYOUT[gateId]?.taxiTime || 15;
  }, []);

  const calculateNeededCounters = useCallback((passengerCount: number, isPeak: boolean) => {
    const baseCounters = Math.ceil(passengerCount / 50);
    const peakMultiplier = isPeak ? 1.5 : 1;
    return Math.max(1, Math.ceil(baseCounters * peakMultiplier));
  }, []);

  const getPeakHours = useCallback(() => {
    return ['06:00-09:00', '11:00-14:00', '17:00-20:00'];
  }, []);

  const isPeakHour = useCallback(() => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 9) || (hour >= 11 && hour < 14) || (hour >= 17 && hour < 20);
  }, []);

  const allocateCheckinCounters = useCallback((flightId: string, count: number) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return [];

    const availableCounters = checkinCounters.filter(
      c => c.terminalId === flight.terminalId && c.status === 'closed'
    );
    const assigned = availableCounters.slice(0, count);

    setCheckinCounters(prev =>
      prev.map(c =>
        assigned.find(a => a.id === c.id)
          ? { ...c, status: 'open' as const, flightId, airline: flight.airlineCode }
          : c
      )
    );
    addDispatchLog('值机分配', `航班 ${flight.flightNo} 分配 ${count} 个值机柜台`);
    return assigned.map(a => a.id);
  }, [flights, checkinCounters, addDispatchLog]);

  const openCounter = useCallback((counterId: string) => {
    setCheckinCounters(prev => prev.map(c => (c.id === counterId ? { ...c, status: 'open' as const } : c)));
    addDispatchLog('值机柜台', `开启柜台 ${counterId}`);
  }, [addDispatchLog]);

  const closeCounter = useCallback((counterId: string) => {
    setCheckinCounters(prev =>
      prev.map(c => (c.id === counterId ? { ...c, status: 'closed' as const, flightId: null, airline: null } : c))
    );
    addDispatchLog('值机柜台', `关闭柜台 ${counterId}`);
  }, [addDispatchLog]);

  const getTotalFlowByTerminal = useCallback((terminalId: string) => {
    return securityChannels.filter(c => c.terminalId === terminalId && c.status === 'open').reduce((sum, c) => sum + c.currentFlow, 0);
  }, [securityChannels]);

  const getTotalCapacityByTerminal = useCallback((terminalId: string) => {
    return securityChannels.filter(c => c.terminalId === terminalId && c.status === 'open').reduce((sum, c) => sum + c.throughput, 0);
  }, [securityChannels]);

  const getSecuritySuggestion = useCallback((terminalId: string) => {
    const channels = securityChannels.filter(c => c.terminalId === terminalId);
    const totalFlow = channels.filter(c => c.status === 'open').reduce((sum, c) => sum + c.currentFlow, 0);
    const totalCapacity = channels.filter(c => c.status === 'open').reduce((sum, c) => sum + c.throughput, 0);
    const closedChannels = channels.filter(c => c.status === 'closed');
    const openChannels = channels.filter(c => c.status === 'open');

    const utilization = totalCapacity > 0 ? totalFlow / totalCapacity : 0;
    const channelsToOpen: string[] = [];
    const channelsToClose: string[] = [];
    let reason = '';

    if (utilization > 0.85 && closedChannels.length > 0) {
      channelsToOpen.push(closedChannels[0].id);
      reason = `当前流量 ${totalFlow} 人/分，容量利用率 ${(utilization * 100).toFixed(0)}%，建议增开通道缓解压力`;
    } else if (utilization > 0.75 && closedChannels.length > 0) {
      channelsToOpen.push(closedChannels[0].id);
      reason = `当前流量 ${totalFlow} 人/分，容量利用率 ${(utilization * 100).toFixed(0)}%，建议预备开启通道`;
    } else if (utilization < 0.25 && openChannels.length > 4) {
      const lowFlowChannel = openChannels.reduce((min, ch) => (ch.currentFlow < min.currentFlow ? ch : min), openChannels[0]);
      channelsToClose.push(lowFlowChannel.id);
      reason = `当前流量 ${totalFlow} 人/分，容量利用率 ${(utilization * 100).toFixed(0)}%，建议关闭低流量通道节约人力`;
    } else {
      reason = `当前流量 ${totalFlow} 人/分，容量利用率 ${(utilization * 100).toFixed(0)}%，运营状态正常`;
    }

    return { channelsToOpen, channelsToClose, reason };
  }, [securityChannels]);

  const dispatchSecurityChannel = useCallback((channelId: string, action: 'open' | 'close') => {
    setSecurityChannels(prev =>
      prev.map(c =>
        c.id === channelId
          ? { ...c, status: action === 'open' ? ('open' as const) : ('closed' as const), currentFlow: action === 'open' ? 30 : 0 }
          : c
      )
    );
    addDispatchLog('安检调度', `${action === 'open' ? '开启' : '关闭'}安检通道 ${channelId}`);
  }, [addDispatchLog]);

  const getBaggageByTag = useCallback((tagId: string) => {
    return baggages.find(b => b.tagId.toLowerCase().includes(tagId.toLowerCase()));
  }, [baggages]);

  const getBaggageByPassenger = useCallback((passengerId: string) => {
    return baggages.filter(b => b.passengerId === passengerId);
  }, [baggages]);

  const updateBaggageStatus = useCallback((baggageId: string, status: Baggage['status'], location: string) => {
    setBaggages(prev =>
      prev.map(b => (b.id === baggageId ? { ...b, status, location, lastUpdate: new Date().toISOString() } : b))
    );
  }, []);

  const analyzeDelayCause = useCallback((flight: Flight) => {
    const reason = flight.delayReason || '';
    const lowerReason = reason.toLowerCase();

    if (lowerReason.includes('天气') || lowerReason.includes('雷雨') || lowerReason.includes('雷暴') || lowerReason.includes('大风')) {
      return { cause: '天气原因', confidence: 0.95, category: 'weather' };
    }
    if (lowerReason.includes('机械') || lowerReason.includes('故障') || lowerReason.includes('技术')) {
      return { cause: '机械故障', confidence: 0.9, category: 'mechanical' };
    }
    if (lowerReason.includes('管制') || lowerReason.includes('流量') || lowerReason.includes('空中')) {
      return { cause: '流量控制', confidence: 0.92, category: 'atc' };
    }
    if (lowerReason.includes('机组') || lowerReason.includes('机组人员')) {
      return { cause: '机组原因', confidence: 0.85, category: 'crew' };
    }
    return { cause: '其他原因', confidence: 0.7, category: 'other' };
  }, []);

  const generateCompensation = useCallback((flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight || flight.delayMinutes <= 0) return [];

    const vouchers: CompensationVoucher[] = [];
    const affectedPassengers = initialPassengers.filter(p => p.flightId === flightId);

    affectedPassengers.forEach(passenger => {
      if (flight.delayMinutes > 120) {
        vouchers.push({
          id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flightId,
          passengerId: passenger.id,
          type: 'hotel',
          value: 300,
          status: 'issued',
        });
        vouchers.push({
          id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flightId,
          passengerId: passenger.id,
          type: 'meal',
          value: 100,
          status: 'issued',
        });
        vouchers.push({
          id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flightId,
          passengerId: passenger.id,
          type: 'transport',
          value: 50,
          status: 'issued',
        });
      } else if (flight.delayMinutes > 60) {
        vouchers.push({
          id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flightId,
          passengerId: passenger.id,
          type: 'meal',
          value: 100,
          status: 'issued',
        });
      } else if (flight.delayMinutes > 30) {
        vouchers.push({
          id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flightId,
          passengerId: passenger.id,
          type: 'meal',
          value: 50,
          status: 'issued',
        });
      }
    });

    setCompensationVouchers(prev => [...prev, ...vouchers]);
    addDispatchLog('补偿发放', `航班 ${flight.flightNo} 发放 ${vouchers.length} 张补偿券`);
    return vouchers;
  }, [flights, addDispatchLog]);

  const reallocateResourcesForDelay = useCallback((flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return { gates: [], counters: [] };

    const gateRecommendations = recommendGates(flight.aircraftType, flight.terminalId);
    const counterAllocations = allocateCheckinCounters(flightId, 2);

    return {
      gates: gateRecommendations.slice(0, 3).map(g => g.id),
      counters: counterAllocations,
    };
  }, [flights, recommendGates, allocateCheckinCounters]);

  const generateCrewSchedule = useCallback(() => {
    const tasks: CrewTask[] = [];
    const availableCrew = groundCrew.filter(c => c.status === 'available');
    const pendingFlights = flights.filter(f => f.status === 'scheduled' || f.status === 'boarding');

    const taskTypes = [
      { type: '登机引导', skill: '登机引导' },
      { type: '行李装卸', skill: '行李装卸' },
      { type: '机务检修', skill: '机务检修' },
      { type: '清洁服务', skill: '清洁' },
    ];

    pendingFlights.slice(0, 8).forEach(flight => {
      taskTypes.forEach(({ type, skill }) => {
        const qualifiedCrew = availableCrew.find(c => c.skills.includes(skill));
        if (qualifiedCrew) {
          tasks.push({
            id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            crewId: qualifiedCrew.id,
            flightId: flight.id,
            flightNo: flight.flightNo,
            taskType: type,
            scheduledTime: flight.scheduledDeparture,
            location: `T${flight.terminalId}`,
            status: 'pending',
          });
        }
      });
    });

    setCrewTasks(tasks);
    addDispatchLog('排班生成', `生成 ${tasks.length} 个地勤任务`);
    return tasks;
  }, [groundCrew, flights, addDispatchLog]);

  const assignTaskToCrew = useCallback((task: Omit<CrewTask, 'id'>) => {
    const newTask: CrewTask = {
      ...task,
      id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };
    setCrewTasks(prev => [...prev, newTask]);
    setGroundCrew(prev => prev.map(c => (c.id === task.crewId ? { ...c, status: 'busy' as const, currentTask: task.taskType } : c)));
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: CrewTask['status']) => {
    setCrewTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status } : t)));
    if (status === 'completed') {
      const task = crewTasks.find(t => t.id === taskId);
      if (task) {
        setGroundCrew(prev => prev.map(c => (c.id === task.crewId ? { ...c, status: 'available' as const, currentTask: null } : c)));
      }
    }
  }, [crewTasks]);

  const pushTasksToCrew = useCallback(async (crewId: string): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        addDispatchLog('任务推送', `任务清单已推送至地勤人员 ${crewId}`);
        resolve(true);
      }, 1500);
    });
  }, [addDispatchLog]);

  const filterFlightsByRole = useCallback((flightList: Flight[]) => {
    if (currentRole === 'admin') return flightList;
    if (currentRole === 'airline') {
      return flightList.filter(f => f.airlineCode === selectedAirlineCode);
    }
    if (currentRole === 'passenger') {
      const passenger = initialPassengers.find(p => p.id === selectedPassengerId);
      return passenger ? flightList.filter(f => f.id === passenger.flightId) : [];
    }
    if (currentRole === 'ground_crew') {
      return flightList.slice(0, 10);
    }
    return flightList;
  }, [currentRole, selectedAirlineCode, selectedPassengerId]);

  const filterGatesByRole = useCallback((gateList: Gate[]) => {
    if (currentRole === 'admin' || currentRole === 'airline' || currentRole === 'ground_crew') {
      return gateList;
    }
    return [];
  }, [currentRole]);

  const filterBaggageByRole = useCallback((baggageList: Baggage[]) => {
    if (currentRole === 'admin') return baggageList;
    if (currentRole === 'passenger') {
      return baggageList.filter(b => b.passengerId === selectedPassengerId);
    }
    if (currentRole === 'airline') {
      const airlineFlights = flights.filter(f => f.airlineCode === selectedAirlineCode).map(f => f.id);
      return baggageList.filter(b => airlineFlights.includes(b.flightId));
    }
    return baggageList.slice(0, 50);
  }, [currentRole, selectedPassengerId, selectedAirlineCode, flights]);

  const generateEfficiencyReport = useCallback(() => {
    const totalFlights = flights.length;
    const delayedFlights = flights.filter(f => f.delayMinutes > 0).length;
    const avgDelay = flights.filter(f => f.delayMinutes > 0).reduce((sum, f) => sum + f.delayMinutes, 0) / Math.max(1, delayedFlights);
    const punctualityRate = ((totalFlights - delayedFlights) / totalFlights * 100).toFixed(1);

    const gateUtilization = ((gates.filter(g => g.status === 'occupied').length / gates.length) * 100).toFixed(1);
    const counterUtilization = ((checkinCounters.filter(c => c.status === 'open').length / checkinCounters.length) * 100).toFixed(1);

    const delayCauses = flights
      .filter(f => f.delayReason)
      .reduce((acc, f) => {
        const cause = analyzeDelayCause(f).cause;
        acc[cause] = (acc[cause] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const report = `
=================================================================
              机场月度运营效率分析报告
=================================================================
生成时间: ${new Date().toLocaleString('zh-CN')}

一、航班运行指标
-----------------------------------------------------------------
总航班数: ${totalFlights}
延误航班数: ${delayedFlights}
平均延误时间: ${avgDelay.toFixed(1)} 分钟
准点率: ${punctualityRate}%

二、资源利用率
-----------------------------------------------------------------
机位利用率: ${gateUtilization}%
值机柜台利用率: ${counterUtilization}%
安检通道利用率: ${(getTotalFlowByTerminal('T1') / getTotalCapacityByTerminal('T1') * 100).toFixed(1)}% (T1)

三、延误原因分析
-----------------------------------------------------------------
${Object.entries(delayCauses).map(([cause, count]) => `${cause}: ${count} 班 (${(count / delayedFlights * 100).toFixed(1)}%)`).join('\n')}

四、旅客流量趋势
-----------------------------------------------------------------
T1 航站楼日均客流: ${flowData.reduce((s, h) => s + h.T1, 0)} 人次
T2 航站楼日均客流: ${flowData.reduce((s, h) => s + h.T2, 0)} 人次
T3 航站楼日均客流: ${flowData.reduce((s, h) => s + h.T3, 0)} 人次

五、补偿发放统计
-----------------------------------------------------------------
已发放补偿券: ${compensationVouchers.length} 张
餐饮券: ${compensationVouchers.filter(v => v.type === 'meal').length} 张
住宿券: ${compensationVouchers.filter(v => v.type === 'hotel').length} 张
交通券: ${compensationVouchers.filter(v => v.type === 'transport').length} 张

=================================================================
                        报告结束
=================================================================
    `.trim();

    return report;
  }, [flights, gates, checkinCounters, getTotalFlowByTerminal, getTotalCapacityByTerminal, analyzeDelayCause, flowData, compensationVouchers]);

  const generateDispatchLogCSV = useCallback(() => {
    const headers = ['时间', '类型', '内容', '操作员'];
    const rows = dispatchLogs.map(log => [
      new Date(log.timestamp).toLocaleString('zh-CN'),
      log.type,
      log.message,
      log.operator,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    return '\uFEFF' + csvContent;
  }, [dispatchLogs]);

  const value: AirportContextType = {
    terminals: initialTerminals,
    gates,
    flights,
    checkinCounters,
    securityChannels,
    baggages,
    baggageCarousels: initialBaggageCarousels,
    groundCrew,
    alerts: initialAlerts,
    passengers: initialPassengers,
    compensationVouchers,
    hourlyPassengerFlow: flowData,
    monthlyPunctualityRate: initialMonthlyPunctualityRate,
    crewTasks,
    dispatchLogs,
    currentRole,
    currentUser,
    selectedPassengerId,
    selectedCrewId,
    selectedAirlineCode,

    setCurrentRole,
    setSelectedPassengerId,
    setSelectedCrewId,
    setSelectedAirlineCode,

    assignGateToFlight,
    recommendGates,
    calculateTaxiTime,

    allocateCheckinCounters,
    calculateNeededCounters,
    getPeakHours,
    openCounter,
    closeCounter,

    getSecuritySuggestion,
    dispatchSecurityChannel,
    getTotalFlowByTerminal,
    getTotalCapacityByTerminal,

    getBaggageByTag,
    getBaggageByPassenger,
    updateBaggageStatus,

    analyzeDelayCause,
    generateCompensation,
    reallocateResourcesForDelay,

    generateCrewSchedule,
    assignTaskToCrew,
    updateTaskStatus,
    pushTasksToCrew,

    filterFlightsByRole,
    filterGatesByRole,
    filterBaggageByRole,

    generateEfficiencyReport,
    generateDispatchLogCSV,
  };

  return <AirportContext.Provider value={value}>{children}</AirportContext.Provider>;
};
