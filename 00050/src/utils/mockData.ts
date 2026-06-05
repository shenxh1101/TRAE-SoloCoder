import type {
  User,
  ExhibitionHall,
  Booth,
  BoothBooking,
  ServiceOrder,
  ServiceProvider,
  Contract,
  Forum,
  ForumReservation,
  RealtimeData,
  VisitorStatistics,
  FinanceReport,
  Notification,
} from '../types';

export const mockUsers: User[] = [
  {
    id: 'exhibitor-1',
    role: 'exhibitor',
    name: '张伟',
    email: 'zhangwei@techcorp.com',
    phone: '13800138001',
    creditLevel: 5,
    company: '科技创新有限公司',
    preferences: {
      industries: ['人工智能', '智能制造', '新能源'],
      interests: ['技术交流', '商务合作'],
    },
  },
  {
    id: 'exhibitor-2',
    role: 'exhibitor',
    name: '李明',
    email: 'liming@greenenergy.com',
    phone: '13800138002',
    creditLevel: 4,
    company: '绿色能源集团',
    preferences: {
      industries: ['新能源', '环保科技', '新材料'],
      interests: ['政策解读', '投融资'],
    },
  },
  {
    id: 'exhibitor-3',
    role: 'exhibitor',
    name: '王芳',
    email: 'wangfang@smartcity.com',
    phone: '13800138003',
    creditLevel: 4,
    company: '智慧城市科技',
    preferences: {
      industries: ['智慧城市', '物联网', '大数据'],
      interests: ['技术展示', '产品发布'],
    },
  },
  {
    id: 'visitor-1',
    role: 'visitor',
    name: '陈静',
    email: 'chenjing@example.com',
    phone: '13900139001',
    preferences: {
      industries: ['人工智能', '新能源', '智能制造'],
      interests: ['技术交流', '商务合作', '产品采购'],
    },
  },
  {
    id: 'visitor-2',
    role: 'visitor',
    name: '刘强',
    email: 'liuqiang@example.com',
    phone: '13900139002',
    preferences: {
      industries: ['智慧城市', '物联网'],
      interests: ['政策解读', '技术交流'],
    },
  },
  {
    id: 'visitor-3',
    role: 'visitor',
    name: '赵丽',
    email: 'zhaoli@example.com',
    phone: '13900139003',
    preferences: {
      industries: ['环保科技', '新能源'],
      interests: ['投融资', '产品发布'],
    },
  },
  {
    id: 'operator-1',
    role: 'operator',
    name: '周主任',
    email: 'zhougz@expo-center.com',
    phone: '13700137001',
  },
  {
    id: 'provider-1',
    role: 'provider',
    name: '孙经理',
    email: 'sunjl@buildpro.com',
    phone: '13600136001',
  },
  {
    id: 'provider-2',
    role: 'provider',
    name: '吴主管',
    email: 'wuzg@techservice.com',
    phone: '13600136002',
  },
  {
    id: 'finance-1',
    role: 'finance',
    name: '郑会计',
    email: 'zhengkj@expo-center.com',
    phone: '13500135001',
  },
];

export const mockHalls: ExhibitionHall[] = [
  { id: 'hall-1', name: '1号馆·科技主题馆', area: 12000, maxCapacity: 8000, safetyThreshold: 0.85, boothCount: 60 },
  { id: 'hall-2', name: '2号馆·智能制造馆', area: 10000, maxCapacity: 6500, safetyThreshold: 0.85, boothCount: 50 },
  { id: 'hall-3', name: '3号馆·新能源馆', area: 9000, maxCapacity: 6000, safetyThreshold: 0.85, boothCount: 45 },
  { id: 'hall-4', name: '4号馆·智慧城市馆', area: 8000, maxCapacity: 5500, safetyThreshold: 0.85, boothCount: 40 },
  { id: 'hall-5', name: '5号馆·综合服务馆', area: 7000, maxCapacity: 5000, safetyThreshold: 0.85, boothCount: 35 },
];

function generateBooths(): Booth[] {
  const booths: Booth[] = [];
  const zones = ['A区', 'B区', 'C区', 'D区', 'E区'];
  const statuses: Booth['status'][] = ['available', 'available', 'available', 'reserved', 'locked', 'occupied'];

  mockHalls.forEach((hall) => {
    for (let i = 0; i < hall.boothCount; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      const boothId = `booth-${hall.id}-${i + 1}`;
      const adjacentBooths: string[] = [];

      if (col > 0) adjacentBooths.push(`booth-${hall.id}-${i}`);
      if (col < 5 && i + 1 < hall.boothCount) adjacentBooths.push(`booth-${hall.id}-${i + 2}`);
      if (row > 0) adjacentBooths.push(`booth-${hall.id}-${i - 5}`);
      if (i + 6 < hall.boothCount) adjacentBooths.push(`booth-${hall.id}-${i + 7}`);

      booths.push({
        id: boothId,
        hallId: hall.id,
        code: `${hall.name.charAt(0)}${String(i + 1).padStart(3, '0')}`,
        area: [9, 12, 18, 24, 36][Math.floor(Math.random() * 5)],
        location: { x: col * 80 + 50, y: row * 60 + 30 },
        basePrice: 800 + Math.floor(Math.random() * 3000),
        popularityScore: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        zone: zones[Math.floor(Math.random() * zones.length)],
        adjacentBooths: adjacentBooths.filter((id) => id !== boothId),
        exhibitorId: Math.random() > 0.6 ? mockUsers[Math.floor(Math.random() * 3)].id : undefined,
      });
    }
  });

  return booths;
}

export const mockBooths: Booth[] = generateBooths();

const today = new Date();

export const mockBookings: BoothBooking[] = [
  {
    id: 'booking-1',
    exhibitorId: 'exhibitor-1',
    boothId: 'booth-hall-1-1',
    boothCode: '1001',
    hallName: '1号馆·科技主题馆',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0],
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10).toISOString().split('T')[0],
    totalPrice: 58600,
    status: 'approved',
    discountApplied: 4200,
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString(),
    companyName: '科技创新有限公司',
  },
  {
    id: 'booking-2',
    exhibitorId: 'exhibitor-2',
    boothId: 'booth-hall-3-1',
    boothCode: '3001',
    hallName: '3号馆·新能源馆',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0],
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10).toISOString().split('T')[0],
    totalPrice: 45200,
    status: 'pending',
    discountApplied: 2800,
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).toISOString(),
    companyName: '绿色能源集团',
  },
  {
    id: 'booking-3',
    exhibitorId: 'exhibitor-3',
    boothId: 'booth-hall-4-1',
    boothCode: '4001',
    hallName: '4号馆·智慧城市馆',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14).toISOString().split('T')[0],
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 17).toISOString().split('T')[0],
    totalPrice: 38900,
    status: 'pending',
    discountApplied: 0,
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString(),
    companyName: '智慧城市科技',
  },
];

export const mockServiceOrders: ServiceOrder[] = [
  {
    id: 'service-1',
    exhibitorId: 'exhibitor-1',
    providerId: 'provider-1',
    serviceType: 'construction',
    description: '特装展位搭建，36平米展位',
    scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9).toISOString(),
    status: 'in_progress',
    price: 28000,
    exhibitorCreditLevel: 5,
    boothCode: '1001',
    providerName: '专业搭建服务公司',
    progress: 65,
  },
  {
    id: 'service-2',
    exhibitorId: 'exhibitor-1',
    providerId: 'provider-2',
    serviceType: 'electricity',
    description: '三相电接入，100A供电',
    scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 8).toISOString(),
    status: 'assigned',
    price: 6000,
    exhibitorCreditLevel: 5,
    boothCode: '1001',
    providerName: '电力技术服务公司',
  },
  {
    id: 'service-3',
    exhibitorId: 'exhibitor-2',
    providerId: 'provider-2',
    serviceType: 'internet',
    description: '100M光纤接入，3天使用',
    scheduledTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 9).toISOString(),
    status: 'pending',
    price: 1500,
    exhibitorCreditLevel: 4,
    boothCode: '3001',
  },
];

export const mockServiceProviders: ServiceProvider[] = [
  {
    id: 'provider-1',
    name: '专业搭建服务公司',
    serviceCategory: ['construction', 'logistics'],
    location: { lat: 31.2304, lng: 121.4737 },
    rating: 4.8,
    responseTime: 15,
    status: 'available',
    completedOrders: 156,
  },
  {
    id: 'provider-2',
    name: '电力技术服务公司',
    serviceCategory: ['electricity', 'internet'],
    location: { lat: 31.2350, lng: 121.4680 },
    rating: 4.6,
    responseTime: 20,
    status: 'available',
    completedOrders: 89,
  },
  {
    id: 'provider-3',
    name: '综合服务集团',
    serviceCategory: ['cleaning', 'security', 'logistics'],
    location: { lat: 31.2280, lng: 121.4800 },
    rating: 4.5,
    responseTime: 25,
    status: 'busy',
    completedOrders: 234,
  },
];

export const mockContracts: Contract[] = [
  {
    id: 'contract-1',
    bookingId: 'booking-1',
    content: `展位租赁合同

甲方：智慧国际会展中心

乙方：科技创新有限公司

根据《中华人民共和国民法典》及相关法律法规的规定，甲乙双方在平等、自愿、公平和诚实信用的基础上，经协商一致，就乙方租赁甲方展位事宜，订立本合同。

第一条 展位信息

1.1 展位位置：1号馆·科技主题馆 1001号展位

1.2 展位面积：36平方米

1.3 租赁期限：2026年${today.getMonth() + 1}月${today.getDate() + 7}日至${today.getMonth() + 1}月${today.getDate() + 10}日，共4天

第二条 费用及支付方式

2.1 展位租金：人民币58,600元整（已享受优惠4,200元）

2.2 支付方式：合同签署后3个工作日内一次性支付

第三条 双方权利与义务

...（合同详细条款省略）

`,
    status: 'signed',
    signedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3).toISOString(),
    signatureUrl: '/signatures/contract-1.png',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString(),
    amount: 58600,
  },
];

export const mockForums: Forum[] = [
  {
    id: 'forum-1',
    title: '人工智能创新发展高峰论坛',
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 9, 30).toISOString(),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 12, 0).toISOString(),
    totalSeats: 300,
    availableSeats: 45,
    speaker: '张教授',
    industry: '人工智能',
    description: '探讨人工智能技术最新发展趋势，分享行业应用案例',
    hallId: 'hall-1',
    hallName: '1号馆·科技主题馆',
  },
  {
    id: 'forum-2',
    title: '新能源技术与产业应用',
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 14, 0).toISOString(),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 17, 0).toISOString(),
    totalSeats: 200,
    availableSeats: 12,
    speaker: '李博士',
    industry: '新能源',
    description: '解析新能源技术突破与未来发展方向',
    hallId: 'hall-3',
    hallName: '3号馆·新能源馆',
  },
  {
    id: 'forum-3',
    title: '智慧城市建设与实践',
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 10, 0).toISOString(),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 12, 30).toISOString(),
    totalSeats: 250,
    availableSeats: 0,
    speaker: '王研究员',
    industry: '智慧城市',
    description: '智慧城市建设的最新实践案例和成功经验分享',
    hallId: 'hall-4',
    hallName: '4号馆·智慧城市馆',
  },
  {
    id: 'forum-4',
    title: '智能制造与工业4.0',
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 14, 0).toISOString(),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 16, 30).toISOString(),
    totalSeats: 300,
    availableSeats: 178,
    speaker: '陈总工程师',
    industry: '智能制造',
    description: '智能制造技术在工业领域的应用与发展',
    hallId: 'hall-2',
    hallName: '2号馆·智能制造馆',
  },
];

export const mockForumReservations: ForumReservation[] = [
  {
    id: 'reservation-1',
    visitorId: 'visitor-1',
    forumId: 'forum-1',
    forumTitle: '人工智能创新发展高峰论坛',
    status: 'confirmed',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3).toISOString(),
  },
  {
    id: 'reservation-2',
    visitorId: 'visitor-1',
    forumId: 'forum-3',
    forumTitle: '智慧城市建设与实践',
    status: 'waiting',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString(),
    queuePosition: 8,
  },
];

export function generateRealtimeData(): RealtimeData[] {
  return mockHalls.map((hall, index) => {
    const baseVisitors = [4500, 3800, 4200, 3200, 2800];
    const variation = Math.floor(Math.random() * 1000) - 500;
    const currentVisitors = baseVisitors[index] + variation;
    const utilization = Math.min(currentVisitors / hall.maxCapacity, 1);
    let warningLevel: RealtimeData['warningLevel'] = 'normal';
    if (utilization > hall.safetyThreshold) warningLevel = 'warning';
    if (utilization > hall.safetyThreshold + 0.1) warningLevel = 'danger';
    if (utilization > hall.safetyThreshold - 0.1 && utilization <= hall.safetyThreshold) warningLevel = 'caution';

    return {
      id: `realtime-${hall.id}`,
      hallId: hall.id,
      hallName: hall.name,
      currentVisitors,
      boothUtilization: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
      timestamp: new Date().toISOString(),
      warningLevel,
    };
  });
}

export const mockRealtimeData: RealtimeData[] = generateRealtimeData();

export function generateVisitorStatistics(): VisitorStatistics[] {
  const stats: VisitorStatistics[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    stats.push({
      id: `stat-${i}`,
      bookingId: 'booking-1',
      date: date.toISOString().split('T')[0],
      visitorCount: 120 + Math.floor(Math.random() * 200),
      intentionCount: 20 + Math.floor(Math.random() * 50),
      effectScore: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
    });
  }
  return stats;
}

export const mockVisitorStatistics: VisitorStatistics[] = generateVisitorStatistics();

export function generateFinanceReports(): FinanceReport[] {
  const reports: FinanceReport[] = [];
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  mockHalls.forEach((hall) => {
    const boothIncome = 800000 + Math.floor(Math.random() * 1500000);
    const serviceIncome = 200000 + Math.floor(Math.random() * 500000);
    const utilizationRate = Math.round((0.7 + Math.random() * 0.25) * 100) / 100;

    reports.push({
      id: `report-${hall.id}`,
      month: currentMonth,
      year: currentYear,
      hallId: hall.id,
      hallName: hall.name,
      boothIncome,
      serviceIncome,
      utilizationRate,
      totalIncome: boothIncome + serviceIncome,
    });
  });

  return reports;
}

export const mockFinanceReports: FinanceReport[] = generateFinanceReports();

export const mockNotifications: Notification[] = [
  {
    id: 'notification-1',
    userId: 'exhibitor-1',
    type: 'booking',
    title: '展位预订审核通过',
    content: '您预订的1号馆1001号展位已审核通过，请及时签署电子合同。',
    status: 'unread',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString(),
    voucherUrl: '/vouchers/booking-1.pdf',
    relatedId: 'booking-1',
    actionUrl: '/exhibitor/contracts',
  },
  {
    id: 'notification-2',
    userId: 'exhibitor-1',
    type: 'service',
    title: '服务工单已接单',
    content: '您申请的展位搭建服务已被专业搭建服务公司接单，预计6月10日开始施工。',
    status: 'read',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString(),
    relatedId: 'service-1',
    actionUrl: '/exhibitor/services',
  },
  {
    id: 'notification-3',
    userId: 'operator-1',
    type: 'warning',
    title: '人流预警提醒',
    content: '1号馆当前人流量已接近安全阈值，请及时关注并采取限流措施。',
    status: 'unread',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
    relatedId: 'hall-1',
    actionUrl: '/operator/warnings',
  },
  {
    id: 'notification-4',
    userId: 'visitor-1',
    type: 'forum',
    title: '论坛预约成功',
    content: '您已成功预约"人工智能创新发展高峰论坛"，请准时参加。',
    status: 'read',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
    voucherUrl: '/vouchers/forum-1.pdf',
    relatedId: 'forum-1',
    actionUrl: '/visitor/forums',
  },
  {
    id: 'notification-5',
    userId: 'finance-1',
    type: 'finance',
    title: '月度财务报表已生成',
    content: '6月份财务报表已自动生成，请及时查看并审核。',
    status: 'unread',
    createdAt: new Date(today.getFullYear(), today.getMonth(), 1, 8, 0).toISOString(),
    voucherUrl: '/reports/june-2026.pdf',
    actionUrl: '/finance/reports',
  },
  {
    id: 'notification-6',
    userId: 'provider-1',
    type: 'service',
    title: '新服务订单',
    content: '您有一个新的展位搭建服务订单待接单，请及时处理。',
    status: 'unread',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString(),
    relatedId: 'service-1',
    actionUrl: '/provider/orders',
  },
  {
    id: 'notification-7',
    userId: 'exhibitor-2',
    type: 'booking',
    title: '展位预订待审核',
    content: '您提交的3号馆3001号展位预订申请正在审核中，请耐心等待。',
    status: 'unread',
    createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString(),
    relatedId: 'booking-2',
    actionUrl: '/exhibitor/booking',
  },
];
