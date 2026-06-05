const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

function seed(store) {
  if (store.count('users') > 0) return;

  const now = dayjs();
  const ids = {};

  ids.admin = store.generateId('U');
  store.create('users', {
    id: ids.admin,
    phone: '13800000000',
    password: bcrypt.hashSync('admin123456', 10),
    nickname: '系统管理员',
    avatar: '',
    gender: '',
    role: 'admin',
    status: 'active',
  });

  ids.zhangsan = store.generateId('U');
  store.create('users', {
    id: ids.zhangsan,
    phone: '13800000001',
    nickname: '张三',
    avatar: '',
    gender: '男',
    role: 'user',
    status: 'active',
  });

  ids.lisi = store.generateId('U');
  store.create('users', {
    id: ids.lisi,
    phone: '13800000002',
    nickname: '李四',
    avatar: '',
    gender: '男',
    role: 'user',
    status: 'active',
  });

  ids.wangwu = store.generateId('U');
  store.create('users', {
    id: ids.wangwu,
    phone: '13800000003',
    nickname: '王五',
    avatar: '',
    gender: '男',
    role: 'user',
    status: 'active',
  });

  const vehicleDefs = [
    { userId: ids.zhangsan, plateNumber: '京A12345', brand: '宝马', model: '3系 320Li', color: '白色', mileage: 35000, isDefault: true },
    { userId: ids.zhangsan, plateNumber: '京B67890', brand: '奔驰', model: 'C级 C260L', color: '黑色', mileage: 52000, isDefault: false },
    { userId: ids.lisi, plateNumber: '沪C11111', brand: '大众', model: '迈腾', color: '银色', mileage: 3800, isDefault: true },
    { userId: ids.lisi, plateNumber: '沪D22222', brand: '丰田', model: '凯美瑞', color: '白色', mileage: 12000, isDefault: false },
    { userId: ids.wangwu, plateNumber: '粤E33333', brand: '奥迪', model: 'A4L', color: '灰色', mileage: 68000, isDefault: true },
    { userId: ids.wangwu, plateNumber: '粤F44444', brand: '本田', model: '雅阁', color: '黑色', mileage: 25000, isDefault: false },
  ];

  ids.vehicles = vehicleDefs.map(v => {
    const id = store.generateId('V');
    store.create('vehicles', { id, ...v, vin: '' });
    return id;
  });

  const storeDefs = [
    { name: '北京朝阳店', city: '北京', address: '北京市朝阳区建国路88号', latitude: 39.9219, longitude: 116.4435, rating: 4.8, monthlySales: 580, phone: '010-88881234' },
    { name: '北京海淀店', city: '北京', address: '北京市海淀区中关村大街66号', latitude: 39.9590, longitude: 116.2982, rating: 4.7, monthlySales: 420, phone: '010-62221234' },
    { name: '上海浦东店', city: '上海', address: '上海市浦东新区陆家嘴环路100号', latitude: 31.2304, longitude: 121.4737, rating: 4.9, monthlySales: 650, phone: '021-68881234' },
    { name: '上海徐汇店', city: '上海', address: '上海市徐汇区漕溪北路88号', latitude: 31.1888, longitude: 121.4365, rating: 4.6, monthlySales: 380, phone: '021-54441234' },
    { name: '广州天河店', city: '广州', address: '广州市天河区天河路228号', latitude: 23.1291, longitude: 113.2644, rating: 4.8, monthlySales: 520, phone: '020-86661234' },
    { name: '深圳南山店', city: '深圳', address: '深圳市南山区科技园路66号', latitude: 22.5431, longitude: 113.9300, rating: 4.7, monthlySales: 460, phone: '0755-26661234' },
  ];

  ids.stores = storeDefs.map(s => {
    const id = store.generateId('ST');
    store.create('stores', {
      id,
      ...s,
      businessHours: '08:00-20:00',
      serviceTypes: ['car_wash', 'maintenance', 'repair', 'inspection'],
      services: [
        { name: '精致洗车', price: 39, duration: 30 },
        { name: '小保养', price: 399, duration: 60 },
        { name: '全面检测', price: 99, duration: 45 },
      ],
    });
    return id;
  });

  const allBrands = ['宝马', '奔驰', '大众', '丰田', '奥迪', '本田'];
  const packageDefs = [
    { name: '精致洗车', type: 'car_wash', price: 39, rating: 4.8, description: '外观清洗+轮毂清洁+玻璃清洁', items: ['外观清洗', '轮毂清洁', '玻璃清洁', '吸尘'], mileageRange: { min: 0, max: 100000 } },
    { name: '内饰深度清洁', type: 'car_wash', price: 129, rating: 4.7, description: '全车内饰深度清洁消毒', items: ['座椅清洁', '地毯清洗', '空调管道消毒', '仪表盘护理'], mileageRange: { min: 0, max: 100000 } },
    { name: '小保养套餐', type: 'maintenance', price: 399, rating: 4.9, description: '机油+机滤更换+基础检测', items: ['机油更换', '机滤更换', '胎压检测', '油液检查', '灯光检查'], mileageRange: { min: 5000, max: 10000 } },
    { name: '大保养套餐', type: 'maintenance', price: 799, rating: 4.8, description: '全面保养+多项更换', items: ['机油更换', '机滤更换', '空滤更换', '空调滤更换', '刹车油更换', '防冻液更换', '全面检测'], mileageRange: { min: 30000, max: 60000 } },
    { name: '空调系统清洗', type: 'maintenance', price: 259, rating: 4.7, description: '空调管道清洗+蒸发箱清洁', items: ['空调管道清洗', '蒸发箱清洁', '更换空调滤芯', '除味杀菌'], mileageRange: { min: 10000, max: 80000 } },
    { name: '发动机积碳清洗', type: 'maintenance', price: 499, rating: 4.6, description: '发动机内部积碳清洗', items: ['进气道清洗', '气门清洗', '燃烧室清洗', '三元催化清洗'], applicableModels: ['宝马', '奔驰', '大众', '奥迪'], mileageRange: { min: 30000, max: 100000 } },
    { name: '刹车系统养护', type: 'maintenance', price: 359, rating: 4.8, description: '刹车片+刹车盘检测养护', items: ['刹车片检测', '刹车盘检测', '刹车油更换', '刹车系统润滑'], mileageRange: { min: 20000, max: 80000 } },
    { name: '四轮定位', type: 'repair', price: 199, rating: 4.5, description: '专业四轮定位服务', items: ['前轮定位', '后轮定位', '方向盘校准', '悬挂检测'], mileageRange: { min: 20000, max: 100000 } },
    { name: '蓄电池更换', type: 'repair', price: 399, rating: 4.7, description: '蓄电池检测+更换', items: ['蓄电池检测', '蓄电池更换', '电路检查', '启动测试'], mileageRange: { min: 30000, max: 100000 } },
    { name: '全面检测套餐', type: 'inspection', price: 99, rating: 4.9, description: '28项全车安全检测', items: ['发动机检测', '变速箱检测', '刹车系统检测', '轮胎检测', '灯光检测', '油液检测', '电路检测', '底盘检测'], mileageRange: { min: 0, max: 100000 } },
  ];

  ids.packages = packageDefs.map(p => {
    const id = store.generateId('PKG');
    store.create('packages', { id, ...p, applicableModels: p.applicableModels || allBrands });
    return id;
  });

  const rvDefs = [
    { plateNumber: '京R11001', driverName: '刘师傅', driverPhone: '13900001001', type: 'tow', capabilities: ['tow', 'recovery'], status: 'idle', city: '北京', lat: 39.9300, lng: 116.4500, addr: '北京市朝阳区国贸附近' },
    { plateNumber: '京R11002', driverName: '陈师傅', driverPhone: '13900001002', type: 'tow', capabilities: ['tow', 'recovery'], status: 'busy', city: '北京', lat: 39.9500, lng: 116.3100, addr: '北京市海淀区中关村附近' },
    { plateNumber: '京R11003', driverName: '赵师傅', driverPhone: '13900001003', type: 'jump_start', capabilities: ['jump_start', 'fuel_delivery', 'unlock'], status: 'idle', city: '北京', lat: 39.9100, lng: 116.4200, addr: '北京市朝阳区三里屯附近' },
    { plateNumber: '京R11004', driverName: '孙师傅', driverPhone: '13900001004', type: 'tire_change', capabilities: ['tire_change', 'jump_start'], status: 'offline', city: '北京', lat: 39.9400, lng: 116.3500, addr: '北京市西城区西单附近' },
    { plateNumber: '沪R22001', driverName: '周师傅', driverPhone: '13900002001', type: 'tow', capabilities: ['tow', 'recovery'], status: 'busy', city: '上海', lat: 31.2400, lng: 121.4800, addr: '上海市浦东新区陆家嘴附近' },
    { plateNumber: '沪R22002', driverName: '吴师傅', driverPhone: '13900002002', type: 'jump_start', capabilities: ['jump_start', 'tire_change', 'unlock'], status: 'busy', city: '上海', lat: 31.1900, lng: 121.4400, addr: '上海市徐汇区漕溪附近' },
    { plateNumber: '粤R33001', driverName: '郑师傅', driverPhone: '13900003001', type: 'tow', capabilities: ['tow', 'recovery', 'fuel_delivery'], status: 'idle', city: '广州', lat: 23.1300, lng: 113.2700, addr: '广州市天河区体育中心附近' },
    { plateNumber: '粤R33002', driverName: '王师傅', driverPhone: '13900003002', type: 'tire_change', capabilities: ['tire_change', 'jump_start'], status: 'offline', city: '广州', lat: 23.1200, lng: 113.2500, addr: '广州市越秀区北京路附近' },
  ];

  ids.rescueVehicles = rvDefs.map(rv => {
    const id = store.generateId('RV');
    store.create('rescueVehicles', {
      id,
      plateNumber: rv.plateNumber,
      driverName: rv.driverName,
      driverPhone: rv.driverPhone,
      type: rv.type,
      capabilities: rv.capabilities,
      status: rv.status,
      city: rv.city,
      latitude: rv.lat,
      longitude: rv.lng,
      currentLatitude: rv.lat,
      currentLongitude: rv.lng,
      currentAddress: rv.addr,
    });
    return id;
  });

  const violationDefs = [
    { vehicleId: ids.vehicles[0], type: '超速', fine: 200, points: 3, location: '京沪高速120km处', time: now.subtract(5, 'day').toISOString(), status: 'unpaid' },
    { vehicleId: ids.vehicles[1], type: '违停', fine: 100, points: 0, location: '北京市朝阳区建国路', time: now.subtract(12, 'day').toISOString(), status: 'paid' },
    { vehicleId: ids.vehicles[2], type: '闯红灯', fine: 200, points: 6, location: '上海市浦东新区世纪大道', time: now.subtract(3, 'day').toISOString(), status: 'unpaid' },
    { vehicleId: ids.vehicles[3], type: '不按车道行驶', fine: 100, points: 2, location: '上海市徐汇区漕溪路', time: now.subtract(20, 'day').toISOString(), status: 'paid' },
    { vehicleId: ids.vehicles[4], type: '未系安全带', fine: 50, points: 1, location: '广州市天河区天河路', time: now.subtract(8, 'day').toISOString(), status: 'unpaid' },
  ];
  violationDefs.forEach(v => {
    store.create('violations', { id: store.generateId('VL'), ...v });
  });

  const insuranceDefs = [
    { vehicleId: ids.vehicles[0], company: '中国人保', type: '综合险', price: 3200, startDate: now.subtract(6, 'month').toISOString(), endDate: now.add(6, 'month').toISOString(), status: 'active' },
    { vehicleId: ids.vehicles[1], company: '中国平安', type: '综合险', price: 3500, startDate: now.subtract(11, 'month').subtract(25, 'day').toISOString(), endDate: now.add(5, 'day').toISOString(), status: 'active' },
    { vehicleId: ids.vehicles[2], company: '太平洋保险', type: '交强险', price: 950, startDate: now.subtract(6, 'month').toISOString(), endDate: now.add(6, 'month').toISOString(), status: 'active' },
    { vehicleId: ids.vehicles[3], company: '中国人保', type: '综合险', price: 2800, startDate: now.subtract(11, 'month').subtract(28, 'day').toISOString(), endDate: now.add(2, 'day').toISOString(), status: 'active' },
    { vehicleId: ids.vehicles[4], company: '中国平安', type: '综合险', price: 3800, startDate: now.subtract(3, 'month').toISOString(), endDate: now.add(9, 'month').toISOString(), status: 'active' },
    { vehicleId: ids.vehicles[5], company: '太平洋保险', type: '交强险', price: 950, startDate: now.subtract(6, 'month').toISOString(), endDate: now.add(6, 'month').toISOString(), status: 'active' },
  ];
  insuranceDefs.forEach(ins => {
    store.create('insurances', { id: store.generateId('INS'), ...ins });
  });

  const memberDefs = [
    { userId: ids.admin, level: 'normal', points: 0, annualSpending: 0, rescueCount: 0, discountRate: 1.0, expiresAt: now.add(1, 'year').toISOString() },
    { userId: ids.zhangsan, level: 'silver', points: 3200, annualSpending: 6800, rescueCount: 2, discountRate: 0.9, expiresAt: now.add(1, 'year').toISOString() },
    { userId: ids.lisi, level: 'normal', points: 800, annualSpending: 1200, rescueCount: 0, discountRate: 1.0, expiresAt: now.add(1, 'year').toISOString() },
    { userId: ids.wangwu, level: 'gold', points: 8600, annualSpending: 15000, rescueCount: 6, discountRate: 0.8, expiresAt: now.add(1, 'year').toISOString() },
  ];
  memberDefs.forEach(m => {
    store.create('members', { id: store.generateId('MB'), ...m });
  });

  const bookingDefs = [
    { userId: ids.zhangsan, storeId: ids.stores[0], date: now.add(1, 'day').format('YYYY-MM-DD'), startHour: 10, packageId: ids.packages[0], vehicleId: ids.vehicles[0], remark: '', status: 'confirmed' },
    { userId: ids.lisi, storeId: ids.stores[2], date: now.subtract(2, 'day').format('YYYY-MM-DD'), startHour: 14, packageId: ids.packages[2], vehicleId: ids.vehicles[2], remark: '请使用原厂机油', status: 'completed' },
    { userId: ids.wangwu, storeId: ids.stores[4], date: now.add(3, 'day').format('YYYY-MM-DD'), startHour: 9, packageId: ids.packages[9], vehicleId: ids.vehicles[4], remark: '', status: 'confirmed' },
  ];
  bookingDefs.forEach(b => {
    store.create('bookings', { id: store.generateId('BK'), ...b });
  });

  const workOrderDefs = [
    {
      storeId: ids.stores[0], vehicleId: ids.vehicles[0], userId: ids.zhangsan, qrCode: '',
      status: 'in_progress',
      items: [{ name: '小保养套餐', price: 399, quantity: 1 }],
      totalAmount: 399,
      startedAt: now.subtract(1, 'hour').toISOString(),
      progress: [{ step: '开始施工', description: '车辆已进入工位', images: [], timestamp: now.subtract(1, 'hour').toISOString() }],
    },
    {
      storeId: ids.stores[2], vehicleId: ids.vehicles[2], userId: ids.lisi, qrCode: '',
      status: 'completed',
      items: [{ name: '大保养套餐', price: 799, quantity: 1 }],
      totalAmount: 799,
      paymentMethod: 'wechat',
      paidAt: now.subtract(3, 'day').toISOString(),
      startedAt: now.subtract(3, 'day').add(1, 'hour').toISOString(),
      completedAt: now.subtract(3, 'day').add(3, 'hour').toISOString(),
    },
    {
      storeId: ids.stores[4], vehicleId: ids.vehicles[4], userId: ids.wangwu, qrCode: '',
      status: 'pending',
      items: [],
      totalAmount: 0,
    },
  ];
  ids.workOrders = workOrderDefs.map(wo => {
    const id = store.generateId('WO');
    store.create('workOrders', { id, ...wo });
    return id;
  });

  const orderDefs = [
    { userId: ids.zhangsan, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[0], vehicleId: ids.vehicles[0], createdAt: now.subtract(10, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'maintenance', status: 'completed', totalAmount: 399, storeId: ids.stores[0], vehicleId: ids.vehicles[0], workOrderId: ids.workOrders[1], createdAt: now.subtract(30, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'repair', status: 'pending', totalAmount: 199, storeId: ids.stores[1], vehicleId: ids.vehicles[1], createdAt: now.subtract(1, 'day').toISOString() },
    { userId: ids.lisi, type: 'car_wash', status: 'completed', totalAmount: 129, storeId: ids.stores[2], vehicleId: ids.vehicles[2], createdAt: now.subtract(15, 'day').toISOString() },
    { userId: ids.lisi, type: 'maintenance', status: 'in_progress', totalAmount: 799, storeId: ids.stores[2], vehicleId: ids.vehicles[2], workOrderId: ids.workOrders[0], createdAt: now.subtract(2, 'day').toISOString() },
    { userId: ids.lisi, type: 'rescue', status: 'completed', totalAmount: 350, createdAt: now.subtract(20, 'day').toISOString() },
    { userId: ids.wangwu, type: 'maintenance', status: 'completed', totalAmount: 259, storeId: ids.stores[4], vehicleId: ids.vehicles[4], createdAt: now.subtract(7, 'day').toISOString() },
    { userId: ids.wangwu, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[5], vehicleId: ids.vehicles[5], createdAt: now.subtract(5, 'day').toISOString() },
    { userId: ids.wangwu, type: 'repair', status: 'refund_pending', totalAmount: 399, storeId: ids.stores[4], vehicleId: ids.vehicles[4], refundReason: '服务不满意', createdAt: now.subtract(3, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'rescue', status: 'dispatched', totalAmount: 150, createdAt: now.subtract(1, 'hour').toISOString() },
  ];

  const consumptionDefs = [
    { userId: ids.zhangsan, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[0], vehicleId: ids.vehicles[0], createdAt: now.subtract(45, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'car_wash', status: 'completed', totalAmount: 129, storeId: ids.stores[0], vehicleId: ids.vehicles[0], createdAt: now.subtract(60, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'maintenance', status: 'completed', totalAmount: 499, storeId: ids.stores[1], vehicleId: ids.vehicles[1], createdAt: now.subtract(90, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[1], vehicleId: ids.vehicles[1], createdAt: now.subtract(120, 'day').toISOString() },
    { userId: ids.lisi, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[2], vehicleId: ids.vehicles[2], createdAt: now.subtract(40, 'day').toISOString() },
    { userId: ids.lisi, type: 'maintenance', status: 'completed', totalAmount: 259, storeId: ids.stores[3], vehicleId: ids.vehicles[3], createdAt: now.subtract(55, 'day').toISOString() },
    { userId: ids.lisi, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[2], vehicleId: ids.vehicles[3], createdAt: now.subtract(70, 'day').toISOString() },
    { userId: ids.lisi, type: 'car_wash', status: 'completed', totalAmount: 129, storeId: ids.stores[3], vehicleId: ids.vehicles[2], createdAt: now.subtract(100, 'day').toISOString() },
    { userId: ids.wangwu, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[4], vehicleId: ids.vehicles[4], createdAt: now.subtract(25, 'day').toISOString() },
    { userId: ids.wangwu, type: 'maintenance', status: 'completed', totalAmount: 799, storeId: ids.stores[4], vehicleId: ids.vehicles[4], createdAt: now.subtract(50, 'day').toISOString() },
    { userId: ids.wangwu, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[5], vehicleId: ids.vehicles[5], createdAt: now.subtract(65, 'day').toISOString() },
    { userId: ids.wangwu, type: 'maintenance', status: 'completed', totalAmount: 359, storeId: ids.stores[5], vehicleId: ids.vehicles[5], createdAt: now.subtract(80, 'day').toISOString() },
    { userId: ids.wangwu, type: 'rescue', status: 'completed', totalAmount: 200, createdAt: now.subtract(95, 'day').toISOString() },
    { userId: ids.zhangsan, type: 'car_wash', status: 'completed', totalAmount: 39, storeId: ids.stores[0], vehicleId: ids.vehicles[0], createdAt: now.subtract(150, 'day').toISOString() },
    { userId: ids.wangwu, type: 'car_wash', status: 'completed', totalAmount: 129, storeId: ids.stores[4], vehicleId: ids.vehicles[4], createdAt: now.subtract(180, 'day').toISOString() },
  ];

  [...orderDefs, ...consumptionDefs].forEach(o => {
    store.create('orders', { id: store.generateId('ORD'), ...o });
  });

  const rescueDefs = [
    {
      userId: ids.zhangsan, vehicleId: ids.vehicles[0], rescueVehicleId: ids.rescueVehicles[0],
      type: 'tow', typeName: '拖车', status: 'completed',
      userLocation: { latitude: 39.9200, longitude: 116.4400, address: '北京市朝阳区国贸' },
      rescueVehicleLocation: { latitude: 39.9300, longitude: 116.4500 },
      distance: 1.5, eta: 8, estimatedFee: 350, actualFee: 350,
      description: '车辆无法启动',
      dispatchTime: now.subtract(20, 'day').subtract(2, 'hour').toISOString(),
      arrivalTime: now.subtract(20, 'day').subtract(1, 'hour').subtract(50, 'minute').toISOString(),
      completedAt: now.subtract(20, 'day').subtract(1, 'hour').toISOString(),
      city: '北京', storeId: ids.stores[0],
      createdAt: now.subtract(20, 'day').toISOString(),
    },
    {
      userId: ids.lisi, vehicleId: ids.vehicles[2], rescueVehicleId: ids.rescueVehicles[4],
      type: 'jump_start', typeName: '搭电', status: 'dispatched',
      userLocation: { latitude: 31.2300, longitude: 121.4700, address: '上海市浦东新区' },
      rescueVehicleLocation: { latitude: 31.2400, longitude: 121.4800 },
      distance: 2.1, eta: 12, estimatedFee: 100,
      description: '电瓶没电',
      city: '上海',
      createdAt: now.subtract(30, 'minute').toISOString(),
    },
    {
      userId: ids.wangwu, vehicleId: ids.vehicles[4], rescueVehicleId: ids.rescueVehicles[6],
      type: 'tire_change', typeName: '换胎', status: 'arrived',
      userLocation: { latitude: 23.1280, longitude: 113.2630, address: '广州市天河区' },
      rescueVehicleLocation: { latitude: 23.1300, longitude: 113.2700 },
      distance: 0.8, eta: 0, estimatedFee: 150,
      description: '轮胎爆胎',
      city: '广州',
      createdAt: now.subtract(1, 'hour').toISOString(),
    },
  ];
  rescueDefs.forEach(r => {
    store.create('rescues', { id: store.generateId('RSC'), ...r });
  });

  console.log('✅ 种子数据初始化完成');
  console.log(`  用户: ${store.count('users')} | 车辆: ${store.count('vehicles')} | 门店: ${store.count('stores')}`);
  console.log(`  套餐: ${store.count('packages')} | 救援车: ${store.count('rescueVehicles')} | 订单: ${store.count('orders')}`);
}

module.exports = seed;
