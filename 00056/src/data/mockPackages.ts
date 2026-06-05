import { ServicePackage } from '@/types/service';

export const mockPackages: ServicePackage[] = [
  {
    id: 'p001',
    name: '精致洗车服务',
    type: 'car_wash',
    description: '包含车身清洗、轮毂清洁、仪表台擦拭、玻璃清洁、车内吸尘等全套服务',
    price: 58,
    originalPrice: 88,
    duration: 45,
    suitableMileage: '不限',
    suitableModels: ['所有车型'],
    includes: ['车身精洗', '轮毂清洁', '玻璃清洁', '仪表台擦拭', '车内吸尘', '轮胎上光'],
    image: 'https://picsum.photos/id/145/750/500',
    isRecommend: true,
    isHot: true,
    discount: 0.66
  },
  {
    id: 'p002',
    name: '小保养套餐（机油+机滤）',
    type: 'maintenance',
    description: '更换全合成机油+机油滤清器，含工时费，适合5000-10000公里保养',
    price: 398,
    originalPrice: 520,
    duration: 60,
    suitableMileage: '5000-10000公里',
    suitableModels: ['所有车型'],
    includes: ['全合成机油 4L', '机油滤清器', '工时费', '36项安全检测', '洗车服务'],
    image: 'https://picsum.photos/id/133/750/500',
    isRecommend: true,
    isHot: true,
    discount: 0.76
  },
  {
    id: 'p003',
    name: '大保养套餐（全面养护）',
    type: 'maintenance',
    description: '包含机油三滤、空调滤芯、刹车油、防冻液更换，适合40000公里大保养',
    price: 1280,
    originalPrice: 1680,
    duration: 180,
    suitableMileage: '40000-60000公里',
    suitableModels: ['所有车型'],
    includes: ['全合成机油 4L', '机油滤清器', '空气滤清器', '空调滤清器', '燃油滤清器', '刹车油', '防冻液', '工时费', '全车检测', '精洗服务'],
    image: 'https://picsum.photos/id/111/750/500',
    isRecommend: true,
    isHot: false,
    discount: 0.76
  },
  {
    id: 'p004',
    name: '空调系统深度清洁',
    type: 'maintenance',
    description: '蒸发器清洗、风道消毒、更换空调滤芯，改善车内空气质量',
    price: 298,
    originalPrice: 398,
    duration: 90,
    suitableMileage: '10000-20000公里',
    suitableModels: ['所有车型'],
    includes: ['空调滤芯更换', '蒸发器清洗', '风道消毒杀菌', '出风口清洁', '制冷效果检测'],
    image: 'https://picsum.photos/id/119/750/500',
    isRecommend: false,
    isHot: false,
    discount: 0.75
  },
  {
    id: 'p005',
    name: '发动机积碳清洗',
    type: 'maintenance',
    description: '使用专业设备清洗进气道、燃烧室积碳，恢复动力，降低油耗',
    price: 580,
    originalPrice: 780,
    duration: 120,
    suitableMileage: '30000公里以上',
    suitableModels: ['所有车型'],
    includes: ['进气道清洗', '燃烧室积碳清洗', '节气门清洗', '喷油嘴清洗', '电脑检测清除故障码'],
    image: 'https://picsum.photos/id/160/750/500',
    isRecommend: false,
    isHot: false,
    discount: 0.74
  },
  {
    id: 'p006',
    name: '变速箱油更换',
    type: 'maintenance',
    description: '循环机更换变速箱油，深度清洁，延长变速箱使用寿命',
    price: 880,
    originalPrice: 1280,
    duration: 150,
    suitableMileage: '60000-80000公里',
    suitableModels: ['所有车型'],
    includes: ['自动变速箱油 12L', '变速箱滤芯', '油底壳密封垫', '循环机更换工时', '变速箱电脑检测'],
    image: 'https://picsum.photos/id/201/750/500',
    isRecommend: true,
    isHot: false,
    discount: 0.69
  },
  {
    id: 'p007',
    name: '刹车系统养护',
    type: 'maintenance',
    description: '刹车片检测、刹车油更换、刹车盘打磨，确保行车安全',
    price: 498,
    originalPrice: 680,
    duration: 90,
    suitableMileage: '20000-40000公里',
    suitableModels: ['所有车型'],
    includes: ['刹车油更换', '刹车片检测', '刹车盘打磨', '制动系统排气', '刹车管路检查'],
    image: 'https://picsum.photos/id/1/750/500',
    isRecommend: false,
    isHot: true,
    discount: 0.73
  },
  {
    id: 'p008',
    name: '底盘装甲',
    type: 'maintenance',
    description: '喷涂高弹性防腐材料，保护底盘，减少行驶噪音',
    price: 1580,
    originalPrice: 2180,
    duration: 240,
    suitableMileage: '新车/30000公里内',
    suitableModels: ['所有车型'],
    includes: ['底盘清洁除锈', '水性橡胶型装甲 6L', '排气管防锈处理', '车身底部防护', '四轮隔音'],
    image: 'https://picsum.photos/id/8/750/500',
    isRecommend: false,
    isHot: false,
    discount: 0.72
  },
  {
    id: 'p009',
    name: '漆面镀晶',
    type: 'car_wash',
    description: '纳米镀晶涂层，漆面光亮如新，长期保护车漆',
    price: 2580,
    originalPrice: 3680,
    duration: 300,
    suitableMileage: '不限',
    suitableModels: ['所有车型'],
    includes: ['精细洗车', '漆面去污', '划痕修复', '漆面抛光', '镀晶涂层', '玻璃镀膜'],
    image: 'https://picsum.photos/id/2/750/500',
    isRecommend: false,
    isHot: false,
    discount: 0.7
  },
  {
    id: 'p010',
    name: '故障检测诊断',
    type: 'repair',
    description: '专业技师使用电脑诊断仪检测车辆故障，提供维修方案',
    price: 99,
    originalPrice: 199,
    duration: 30,
    suitableMileage: '不限',
    suitableModels: ['所有车型'],
    includes: ['电脑故障诊断', '故障码读取', '维修方案建议', '检测报告'],
    image: 'https://picsum.photos/id/3/750/500',
    isRecommend: false,
    isHot: true,
    discount: 0.5
  }
];

export const getRecommendedPackages = (mileage: number): ServicePackage[] => {
  console.log('[Package] 基于里程推荐养护套餐，当前里程:', mileage);
  let recommended: ServicePackage[] = [];

  if (mileage >= 5000 && mileage < 10000) {
    recommended = mockPackages.filter(p => p.id === 'p002' || p.id === 'p001');
  } else if (mileage >= 10000 && mileage < 30000) {
    recommended = mockPackages.filter(p => ['p002', 'p004', 'p001', 'p007'].includes(p.id));
  } else if (mileage >= 30000 && mileage < 40000) {
    recommended = mockPackages.filter(p => ['p002', 'p005', 'p007', 'p001'].includes(p.id));
  } else if (mileage >= 40000 && mileage < 60000) {
    recommended = mockPackages.filter(p => ['p003', 'p006', 'p007', 'p001'].includes(p.id));
  } else if (mileage >= 60000) {
    recommended = mockPackages.filter(p => ['p003', 'p006', 'p005', 'p007', 'p001'].includes(p.id));
  } else {
    recommended = mockPackages.filter(p => p.isRecommend).slice(0, 4);
  }

  console.log('[Package] 推荐套餐数量:', recommended.length);
  return recommended;
};
