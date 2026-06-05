import { create } from 'zustand';
import { UserInfo, Vehicle, MemberInfo, MemberLevel } from '@/types/user';
import { setToken, setRefreshToken, removeToken } from '@/utils/request';
import { wsService } from '@/services/wsService';
import { reminderService } from '@/services/reminderService';

interface UserState {
  userInfo: UserInfo | null;
  memberInfo: MemberInfo | null;
  isLoggedIn: boolean;
  currentVehicle: Vehicle | null;
  vehicles: Vehicle[];
  setUserInfo: (userInfo: UserInfo | null) => void;
  setMemberInfo: (memberInfo: MemberInfo | null) => void;
  setLoggedIn: (status: boolean) => void;
  setCurrentVehicle: (vehicle: Vehicle | null) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (vehicleId: string) => void;
  updateMemberInfo: (consumption: number, isRescue: boolean) => void;
  login: (token: string, refreshToken: string, userInfo: UserInfo, memberInfo?: MemberInfo) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  memberInfo: null,
  isLoggedIn: false,
  currentVehicle: null,
  vehicles: [],

  setUserInfo: (userInfo) => {
    set({ userInfo });
  },

  setMemberInfo: (memberInfo) => {
    set({ memberInfo });
  },

  setLoggedIn: (status) => set({ isLoggedIn: status }),

  setCurrentVehicle: (vehicle) => set({ currentVehicle: vehicle }),

  setVehicles: (vehicles) => {
    set({ vehicles });
    if (vehicles.length > 0 && !get().currentVehicle) {
      const defaultVehicle = vehicles.find(v => v.isDefault) || vehicles[0];
      set({ currentVehicle: defaultVehicle });
    }
  },

  addVehicle: (vehicle) => {
    const { vehicles } = get();
    let newVehicles: Vehicle[];

    if (vehicle.isDefault) {
      newVehicles = vehicles.map(v => ({ ...v, isDefault: false })).concat(vehicle);
    } else {
      newVehicles = vehicles.concat(vehicle);
    }

    set({ vehicles: newVehicles });

    if (vehicle.isDefault || !get().currentVehicle) {
      set({ currentVehicle: vehicle });
    }
  },

  updateVehicle: (vehicle) => {
    const { vehicles } = get();
    let newVehicles = vehicles.map(v => {
      if (vehicle.isDefault && v.id !== vehicle.id) {
        return { ...v, isDefault: false };
      }
      return v.id === vehicle.id ? vehicle : v;
    });

    set({ vehicles: newVehicles });

    if (get().currentVehicle?.id === vehicle.id || vehicle.isDefault) {
      set({ currentVehicle: vehicle });
    }
  },

  removeVehicle: (vehicleId) => {
    const { vehicles, currentVehicle } = get();
    const newVehicles = vehicles.filter(v => v.id !== vehicleId);
    let newCurrentVehicle = currentVehicle;

    if (currentVehicle?.id === vehicleId && newVehicles.length > 0) {
      newCurrentVehicle = newVehicles.find(v => v.isDefault) || newVehicles[0];
    } else if (newVehicles.length === 0) {
      newCurrentVehicle = null;
    }

    set({ vehicles: newVehicles, currentVehicle: newCurrentVehicle });
  },

  updateMemberInfo: (consumption, isRescue) => {
    const { memberInfo } = get();
    if (memberInfo) {
      const newMemberInfo = { ...memberInfo };
      newMemberInfo.yearConsumption += consumption;
      if (isRescue) {
        newMemberInfo.rescueCount += 1;
      }

      let level: MemberLevel = 'normal';
      if (newMemberInfo.yearConsumption >= 10000 || newMemberInfo.rescueCount >= 5) {
        level = 'gold';
      } else if (newMemberInfo.yearConsumption >= 5000 || newMemberInfo.rescueCount >= 3) {
        level = 'silver';
      }
      newMemberInfo.level = level;
      newMemberInfo.levelName = level === 'gold' ? '金卡会员' : level === 'silver' ? '银卡会员' : '普通会员';

      const levelThresholds = { normal: 5000, silver: 10000, gold: 20000 };
      const currentThreshold = levelThresholds[level];
      const nextLevel = level === 'gold' ? 'gold' : level === 'silver' ? 'gold' : 'silver';
      const nextThreshold = levelThresholds[nextLevel];
      newMemberInfo.currentExp = newMemberInfo.yearConsumption;
      newMemberInfo.nextLevelExp = nextThreshold;
      newMemberInfo.upgradeProgress = Math.min(
        100,
        Math.floor(((newMemberInfo.currentExp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      );

      newMemberInfo.benefits = {
        freeCarWashCount: level === 'gold' ? 12 : level === 'silver' ? 6 : 0,
        maintenanceDiscount: level === 'gold' ? 0.85 : level === 'silver' ? 0.9 : 1,
        rescuePriority: level === 'gold',
        otherBenefits: level === 'gold'
          ? ['24小时专属客服', '生日礼包', '免费道路救援3次']
          : level === 'silver'
          ? ['专属客服', '生日礼包']
          : []
      };

      set({ memberInfo: newMemberInfo });
    }
  },

  login: (token, refreshToken, userInfo, memberInfo) => {
    console.log('[UserStore] 用户登录:', userInfo.phone);

    setToken(token);
    setRefreshToken(refreshToken);

    set({
      userInfo,
      memberInfo: memberInfo || null,
      isLoggedIn: true
    });

    // 连接WebSocket
    wsService.connect();

    // 检查提醒
    setTimeout(() => {
      reminderService.triggerCheck('all');
    }, 1000);
  },

  logout: () => {
    console.log('[UserStore] 用户登出');

    removeToken();

    // 断开WebSocket
    wsService.disconnect();

    set({
      userInfo: null,
      memberInfo: null,
      isLoggedIn: false,
      currentVehicle: null,
      vehicles: []
    });
  }
}));
