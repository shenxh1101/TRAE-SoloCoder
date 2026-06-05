import { Booking, WorkOrder, OrderRecord, ServiceStatus, PaymentStatus } from '@/types/service';
import { RescueRequest, RescueType, RescueStatus, RescueVehicle, AdminDashboardData, MonthlyReport } from '@/types/rescue';

const statusMap: Record<ServiceStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消'
};

const typeMap: Record<string, string> = {
  car_wash: '洗车服务',
  maintenance: '保养服务',
  repair: '维修服务',
  rescue: '道路救援'
};

export const mockBookings: Booking[] = [
  {
    id: 'b001',
    userId: 'u001',
    vehicleId: 'v001',
    storeId: 's001',
    packageId: 'p001',
    packageName: '精致洗车服务',
    serviceType: 'car_wash',
    bookingDate: '2026-06-05',
    bookingTime: '14:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    createTime: '2026-06-03 16:30:00',
    remark: '需要车内消毒'
  },
  {
    id: 'b002',
    userId: 'u001',
    vehicleId: 'v001',
    storeId: 's002',
    packageId: 'p002',
    packageName: '小保养套餐（机油+机滤）',
    serviceType: 'maintenance',
    bookingDate: '2026-06-10',
    bookingTime: '10:00',
    status: 'pending',
    paymentStatus: 'unpaid',
    createTime: '2026-06-04 09:15:00'
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo001',
    bookingId: 'b001',
    orderNo: 'WO202606050001',
    technician: '李师傅',
    items: [
      { id: 'item001', name: '精致洗车服务', price: 58, quantity: 1, unit: '次' },
      { id: 'item002', name: '车内消毒', price: 30, quantity: 1, unit: '次' }
    ],
    totalPrice: 88,
    status: 'in_progress',
    paymentStatus: 'paid',
    createTime: '2026-06-05 14:05:00',
    confirmTime: '2026-06-05 14:08:00',
    startTime: '2026-06-05 14:10:00',
    progress: 40,
    progressSteps: [
      { name: '工单创建', status: 'completed', time: '14:05' },
      { name: '报价确认', status: 'completed', time: '14:08' },
      { name: '服务进行中', status: 'current', time: '14:10' },
      { name: '服务完成', status: 'pending' },
      { name: '订单结算', status: 'pending' }
    ]
  },
  {
    id: 'wo002',
    bookingId: 'b003',
    orderNo: 'WO202606030002',
    technician: '王师傅',
    items: [
      { id: 'item003', name: '小保养套餐', price: 398, quantity: 1, unit: '次' },
      { id: 'item004', name: '空气滤清器更换', price: 88, quantity: 1, unit: '个' }
    ],
    totalPrice: 486,
    status: 'completed',
    paymentStatus: 'paid',
    createTime: '2026-06-03 10:00:00',
    confirmTime: '2026-06-03 10:05:00',
    startTime: '2026-06-03 10:10:00',
    completeTime: '2026-06-03 11:15:00',
    progress: 100,
    progressSteps: [
      { name: '工单创建', status: 'completed', time: '10:00' },
      { name: '报价确认', status: 'completed', time: '10:05' },
      { name: '服务进行中', status: 'completed', time: '10:10' },
      { name: '服务完成', status: 'completed', time: '11:15' },
      { name: '订单结算', status: 'completed', time: '11:20' }
    ]
  }
];

export const mockOrderRecords: OrderRecord[] = [
  {
    id: 'or001',
    orderNo: 'WO202606050001',
    type: 'car_wash',
    typeName: '洗车服务',
    storeName: '车护达旗舰店（国贸店）',
    vehiclePlate: '京A12345',
    amount: 88,
    status: 'in_progress',
    statusText: '服务中',
    createTime: '2026-06-05 14:05:00'
  },
  {
    id: 'or002',
    orderNo: 'WO202606030002',
    type: 'maintenance',
    typeName: '保养服务',
    storeName: '车护达中心店（中关村店）',
    vehiclePlate: '京A12345',
    amount: 486,
    status: 'completed',
    statusText: '已完成',
    createTime: '2026-06-03 10:00:00'
  },
  {
    id: 'or003',
    orderNo: 'WO202605280003',
    type: 'rescue',
    typeName: '道路救援',
    storeName: '车护达24H店（亦庄店）',
    vehiclePlate: '京B67890',
    amount: 350,
    status: 'completed',
    statusText: '已完成',
    createTime: '2026-05-28 18:30:00'
  },
  {
    id: 'or004',
    orderNo: 'WO202605200004',
    type: 'repair',
    typeName: '维修服务',
    storeName: '车护达精品店（三里屯店）',
    vehiclePlate: '京A12345',
    amount: 1280,
    status: 'completed',
    statusText: '已完成',
    createTime: '2026-05-20 09:00:00'
  },
  {
    id: 'or005',
    orderNo: 'WO202606040005',
    type: 'maintenance',
    typeName: '保养服务',
    storeName: '车护达旗舰店（国贸店）',
    vehiclePlate: '京B67890',
    amount: 1280,
    status: 'pending',
    statusText: '待确认',
    createTime: '2026-06-04 16:00:00'
  }
];

export const mockRescueVehicles: RescueVehicle[] = [
  {
    id: 'rv001',
    plateNumber: '救援A·001',
    driverName: '陈师傅',
    driverPhone: '13900139001',
    type: '拖车',
    currentLocation: { latitude: 39.9042, longitude: 116.4074, address: '北京市朝阳区建国路88号' },
    status: 'idle',
    distance: 1.5
  },
  {
    id: 'rv002',
    plateNumber: '救援A·002',
    driverName: '刘师傅',
    driverPhone: '13900139002',
    type: '综合救援车',
    currentLocation: { latitude: 39.9142, longitude: 116.4274, address: '北京市朝阳区东三环中路' },
    status: 'busy',
    distance: 3.2
  },
  {
    id: 'rv003',
    plateNumber: '救援A·003',
    driverName: '赵师傅',
    driverPhone: '13900139003',
    type: '快保救援车',
    currentLocation: { latitude: 39.8842, longitude: 116.4374, address: '北京市朝阳区大望路' },
    status: 'idle',
    distance: 2.8
  }
];

export const mockRescueRequests: RescueRequest[] = [
  {
    id: 'rr001',
    orderNo: 'RS202606040001',
    userId: 'u001',
    vehicleId: 'v001',
    plateNumber: '京A12345',
    type: 'battery',
    typeName: '电瓶亏电',
    description: '车辆停了一周打不着火，应该是电瓶没电了',
    location: { latitude: 39.9042, longitude: 116.4074, address: '北京市朝阳区万达广场地下停车场B2层' },
    status: 'dispatched',
    statusText: '救援车已派出',
    rescueVehicleId: 'rv001',
    rescueVehicle: mockRescueVehicles[0],
    estimatedArrivalTime: 15,
    estimatedCost: 100,
    createTime: '2026-06-04 16:45:00',
    dispatchTime: '2026-06-04 16:46:30'
  }
];

export const mockDashboardData: AdminDashboardData = {
  totalOrders: 15680,
  todayOrders: 128,
  totalRescues: 2356,
  todayRescues: 18,
  avgResponseTime: 3.2,
  orderCompletionRate: 96.5,
  totalRevenue: 8568000,
  customerSatisfaction: 4.8,
  storeStats: [
    { storeId: 's001', storeName: '国贸店', city: '北京市', orderCount: 356, rescueCount: 48, avgResponseTime: 2.8, completionRate: 98.2 },
    { storeId: 's002', storeName: '中关村店', city: '北京市', orderCount: 289, rescueCount: 36, avgResponseTime: 3.1, completionRate: 97.5 },
    { storeId: 's004', storeName: '三里屯店', city: '北京市', orderCount: 412, rescueCount: 52, avgResponseTime: 2.5, completionRate: 98.8 },
    { storeId: 's006', storeName: '亦庄店', city: '北京市', orderCount: 198, rescueCount: 68, avgResponseTime: 4.2, completionRate: 95.2 }
  ],
  timeStats: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(2026, 4, i + 6);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      orderCount: 80 + Math.floor(Math.random() * 60),
      rescueCount: 8 + Math.floor(Math.random() * 15),
      revenue: 15000 + Math.floor(Math.random() * 10000)
    };
  })
};

export const mockMonthlyReport: MonthlyReport = {
  month: '2026-05',
  totalRevenue: 856800,
  totalCost: 523600,
  netProfit: 333200,
  orderCount: 3568,
  rescueCount: 328,
  avgOrderAmount: 240,
  customerSatisfaction: 4.8,
  newMembers: 156,
  storeBreakdown: [
    { storeName: '国贸店', revenue: 256800, orderCount: 892, rescueCount: 78 },
    { storeName: '中关村店', revenue: 198500, orderCount: 756, rescueCount: 58 },
    { storeName: '三里屯店', revenue: 289600, orderCount: 1124, rescueCount: 92 },
    { storeName: '亦庄店', revenue: 111900, orderCount: 796, rescueCount: 100 }
  ],
  serviceBreakdown: [
    { serviceType: '洗车服务', count: 1856, revenue: 148480 },
    { serviceType: '保养服务', count: 1024, revenue: 456800 },
    { serviceType: '维修服务', count: 360, revenue: 185600 },
    { serviceType: '道路救援', count: 328, revenue: 65920 }
  ]
};

const rescueTypeMap: Record<RescueType, string> = {
  towing: '拖车服务',
  battery: '电瓶搭电',
  tire: '换胎救援',
  fuel: '紧急送油',
  lockout: '开锁服务',
  other: '其他救援'
};

const rescueStatusMap: Record<RescueStatus, string> = {
  pending: '待派单',
  dispatched: '已派单',
  arriving: '救援车到达',
  in_progress: '救援中',
  completed: '已完成',
  cancelled: '已取消'
};

export const getStatusText = (status: ServiceStatus): string => statusMap[status];
export const getTypeText = (type: string): string => typeMap[type] || type;
export const getRescueTypeText = (type: RescueType): string => rescueTypeMap[type];
export const getRescueStatusText = (status: RescueStatus): string => rescueStatusMap[status];
export const getPaymentStatusText = (status: PaymentStatus): string => {
  const map: Record<PaymentStatus, string> = { unpaid: '待支付', paid: '已支付', refunded: '已退款' };
  return map[status];
};
