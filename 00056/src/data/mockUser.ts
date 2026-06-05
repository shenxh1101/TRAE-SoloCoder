import { UserInfo, ViolationRecord, InsuranceInfo } from '@/types/user';

export const mockUser: UserInfo = {
  id: 'u001',
  phone: '13800138000',
  nickname: '爱车达人',
  avatar: 'https://picsum.photos/id/1005/200/200',
  realName: '张三',
  idCard: '110101199001011234',
  memberInfo: {
    level: 'silver',
    levelName: '银卡会员',
    currentExp: 6800,
    nextLevelExp: 10000,
    upgradeProgress: 36,
    yearConsumption: 6800,
    rescueCount: 2,
    benefits: {
      freeCarWashCount: 6,
      maintenanceDiscount: 0.9,
      rescuePriority: false,
      otherBenefits: ['专属客服', '生日礼包']
    }
  },
  vehicles: [
    {
      id: 'v001',
      plateNumber: '京A12345',
      brand: '宝马',
      model: 'X5 xDrive40i',
      color: '矿石白',
      buyYear: 2022,
      mileage: 35000,
      lastMaintenanceDate: '2026-03-15',
      engineNumber: 'B48B201234567',
      frameNumber: 'WBAVM11010V123456',
      insuranceExpireDate: '2026-12-20',
      isDefault: true
    },
    {
      id: 'v002',
      plateNumber: '京B67890',
      brand: '丰田',
      model: '凯美瑞 2.5G',
      color: '墨渊黑',
      buyYear: 2021,
      mileage: 52000,
      lastMaintenanceDate: '2026-04-10',
      engineNumber: 'A25A1234567',
      frameNumber: 'LVGBM51K0MG123456',
      insuranceExpireDate: '2026-08-15',
      isDefault: false
    }
  ],
  registerTime: '2023-06-15 10:30:00'
};

export const mockViolations: ViolationRecord[] = [
  {
    id: 'vio001',
    vehicleId: 'v001',
    plateNumber: '京A12345',
    time: '2026-05-20 14:35:00',
    location: '北京市朝阳区建国路与西大望路交叉口',
    reason: '驾驶机动车违反道路交通信号灯通行',
    fine: 200,
    points: 6,
    status: 'unpaid'
  },
  {
    id: 'vio002',
    vehicleId: 'v001',
    plateNumber: '京A12345',
    time: '2026-05-10 09:15:00',
    location: '北京市海淀区中关村大街',
    reason: '不按规定停车',
    fine: 100,
    points: 0,
    status: 'paid'
  },
  {
    id: 'vio003',
    vehicleId: 'v002',
    plateNumber: '京B67890',
    time: '2026-05-25 16:45:00',
    location: '北京市西城区长安街',
    reason: '超速行驶（超速10%以下）',
    fine: 0,
    points: 0,
    status: 'processing'
  }
];

export const mockInsurances: InsuranceInfo[] = [
  {
    id: 'ins001',
    vehicleId: 'v001',
    company: '中国平安保险',
    policyNumber: 'PA2025122012345678',
    type: '机动车交通事故责任强制保险+商业险',
    startDate: '2025-12-20',
    expireDate: '2026-12-20',
    amount: 8500,
    status: 'active'
  },
  {
    id: 'ins002',
    vehicleId: 'v002',
    company: '中国人保财险',
    policyNumber: 'RB2025081512345678',
    type: '机动车交通事故责任强制保险+商业险',
    startDate: '2025-08-15',
    expireDate: '2026-08-15',
    amount: 5200,
    status: 'expiring'
  }
];
