import { MemberLevel, MemberInfo, MemberBenefits } from '@/types/user';

export interface MemberLevelConfig {
  level: MemberLevel;
  name: string;
  minConsumption: number;
  minRescueCount: number;
  benefits: MemberBenefits;
  color: string;
  bgColor: string;
}

export const MEMBER_LEVEL_CONFIGS: MemberLevelConfig[] = [
  {
    level: 'normal',
    name: '普通会员',
    minConsumption: 0,
    minRescueCount: 0,
    benefits: {
      freeCarWashCount: 0,
      maintenanceDiscount: 1,
      rescuePriority: false,
      otherBenefits: []
    },
    color: '#86909C',
    bgColor: 'rgba(134, 144, 156, 0.1)'
  },
  {
    level: 'silver',
    name: '银卡会员',
    minConsumption: 5000,
    minRescueCount: 3,
    benefits: {
      freeCarWashCount: 6,
      maintenanceDiscount: 0.9,
      rescuePriority: false,
      otherBenefits: ['专属客服', '生日礼包']
    },
    color: '#C0C0C0',
    bgColor: 'rgba(192, 192, 192, 0.15)'
  },
  {
    level: 'gold',
    name: '金卡会员',
    minConsumption: 10000,
    minRescueCount: 5,
    benefits: {
      freeCarWashCount: 12,
      maintenanceDiscount: 0.85,
      rescuePriority: true,
      otherBenefits: ['24小时专属客服', '生日礼包', '免费道路救援3次']
    },
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.2)'
  }
];

export const calculateMemberLevel = (yearConsumption: number, rescueCount: number): MemberLevel => {
  console.log('[Member] 计算会员等级，年消费:', yearConsumption, '救援次数:', rescueCount);

  if (yearConsumption >= MEMBER_LEVEL_CONFIGS[2].minConsumption ||
      rescueCount >= MEMBER_LEVEL_CONFIGS[2].minRescueCount) {
    return 'gold';
  }
  if (yearConsumption >= MEMBER_LEVEL_CONFIGS[1].minConsumption ||
      rescueCount >= MEMBER_LEVEL_CONFIGS[1].minRescueCount) {
    return 'silver';
  }
  return 'normal';
};

export const getMemberLevelConfig = (level: MemberLevel): MemberLevelConfig => {
  return MEMBER_LEVEL_CONFIGS.find(c => c.level === level) || MEMBER_LEVEL_CONFIGS[0];
};

export const calculateUpgradeProgress = (yearConsumption: number, currentLevel: MemberLevel): {
  progress: number;
  currentExp: number;
  nextLevelExp: number;
  nextLevel: MemberLevel;
} => {
  const currentConfig = getMemberLevelConfig(currentLevel);
  const nextLevelIndex = MEMBER_LEVEL_CONFIGS.findIndex(c => c.level === currentLevel) + 1;
  const nextConfig = MEMBER_LEVEL_CONFIGS[nextLevelIndex] || MEMBER_LEVEL_CONFIGS[MEMBER_LEVEL_CONFIGS.length - 1];
  const nextLevel = nextConfig.level;

  if (currentLevel === 'gold') {
    return {
      progress: 100,
      currentExp: yearConsumption,
      nextLevelExp: yearConsumption,
      nextLevel: 'gold'
    };
  }

  const currentThreshold = currentConfig.minConsumption;
  const nextThreshold = nextConfig.minConsumption;
  const progress = Math.min(
    100,
    Math.floor(((yearConsumption - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
  );

  console.log('[Member] 升级进度:', progress + '%', `(${yearConsumption}/${nextThreshold})`);

  return {
    progress,
    currentExp: yearConsumption,
    nextLevelExp: nextThreshold,
    nextLevel
  };
};

export const generateMemberInfo = (yearConsumption: number, rescueCount: number): MemberInfo => {
  const level = calculateMemberLevel(yearConsumption, rescueCount);
  const config = getMemberLevelConfig(level);
  const { progress, currentExp, nextLevelExp, nextLevel } = calculateUpgradeProgress(yearConsumption, level);

  return {
    level,
    levelName: config.name,
    currentExp,
    nextLevelExp,
    upgradeProgress: progress,
    yearConsumption,
    rescueCount,
    benefits: config.benefits
  };
};

export const getDiscountText = (discount: number): string => {
  if (discount === 1) return '无折扣';
  return `${(discount * 10).toFixed(1)}折优惠`;
};
