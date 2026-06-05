import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import ProgressBar from '@/components/ProgressBar';
import { MEMBER_LEVEL_CONFIGS, getMemberLevelConfig, calculateUpgradeProgress } from '@/utils/member';
import { MemberLevel, MemberInfo } from '@/types/user';
import { userService } from '@/services/userService';
import { mockUser } from '@/data/mockUser';

interface BenefitItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  levelRequired: MemberLevel;
  remainingCount?: number;
  totalCount?: number;
}

interface LevelRuleItem {
  level: MemberLevel;
  name: string;
  minAnnualSpending: number;
  minRescueTimes: number;
  benefits: string[];
}

interface SpendingItem {
  id: string;
  amount: number;
  type: 'service' | 'rescue' | 'violation' | 'insurance' | 'other';
  description: string;
  createdAt: string;
}

const MemberCenterPage: React.FC = () => {
  const { userInfo, setUserInfo } = useUserStore();
  const [nextLevelName, setNextLevelName] = useState('');
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [levelRules, setLevelRules] = useState<LevelRuleItem[]>([]);
  const [spendingHistory, setSpendingHistory] = useState<SpendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMemberData = async () => {
    setLoading(true);
    try {
      console.log('[MemberCenter] 开始加载会员数据');
      
      const [userData, memberData, benefitsData, levelRulesData, spendingData] = await Promise.all([
        userService.getUserInfo(),
        userService.getMemberInfo(),
        userService.getMemberBenefits(),
        userService.getMemberLevelRules(),
        userService.getMemberSpendingHistory({ page: 1, pageSize: 20 })
      ]);

      console.log('[MemberCenter] 用户信息:', userData);
      console.log('[MemberCenter] 会员信息:', memberData);
      console.log('[MemberCenter] 会员权益:', benefitsData);
      console.log('[MemberCenter] 等级规则:', levelRulesData);
      console.log('[MemberCenter] 消费记录:', spendingData);

      setUserInfo({ ...userData, memberInfo: memberData });
      setMemberInfo(memberData);
      setBenefits(benefitsData);
      setLevelRules(levelRulesData);
      setSpendingHistory(spendingData.list);
    } catch (error) {
      console.error('[MemberCenter] 加载会员数据失败:', error);
      const fallbackMemberInfo = mockUser.memberInfo;
      setMemberInfo(fallbackMemberInfo);
      setBenefits([
        { id: 'b1', icon: '🚿', name: '免费洗车', description: '每年赠送免费洗车服务', levelRequired: 'normal', remainingCount: 6, totalCount: 12 },
        { id: 'b2', icon: '💰', name: '保养折扣', description: '享受会员专属保养折扣', levelRequired: 'normal' },
        { id: 'b3', icon: '🚨', name: '优先救援', description: '金卡会员享受救援优先权', levelRequired: 'gold' },
        { id: 'b4', icon: '🎁', name: '生日礼包', description: '生日当月赠送专属礼包', levelRequired: 'silver' },
        { id: 'b5', icon: '📞', name: '专属客服', description: '一对一专属客服服务', levelRequired: 'silver' },
        { id: 'b6', icon: '⭐', name: '积分加倍', description: '消费积分翻倍累计', levelRequired: 'gold' }
      ]);
      setLevelRules([
        { level: 'normal', name: '普通会员', minAnnualSpending: 0, minRescueTimes: 0, benefits: [] },
        { level: 'silver', name: '银卡会员', minAnnualSpending: 5000, minRescueTimes: 3, benefits: ['免费洗车', '保养折扣', '专属客服', '生日礼包'] },
        { level: 'gold', name: '金卡会员', minAnnualSpending: 10000, minRescueTimes: 5, benefits: ['免费洗车', '保养折扣', '优先救援', '生日礼包', '专属客服', '积分加倍'] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) {
      loadMemberData();
    }
  }, [userInfo]);

  useEffect(() => {
    if (memberInfo) {
      const { nextLevel } = calculateUpgradeProgress(
        memberInfo.yearConsumption,
        memberInfo.level
      );
      setNextLevelName(getMemberLevelConfig(nextLevel).name);
    }
  }, [memberInfo]);

  if (!userInfo) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>请先登录</Text>
        </View>
      </View>
    );
  }

  if (loading || !memberInfo) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  const currentConfig = getMemberLevelConfig(memberInfo.level);

  const isBenefitActive = (benefit: BenefitItem): boolean => {
    const levelOrder: Record<MemberLevel, number> = { normal: 0, silver: 1, gold: 2 };
    return levelOrder[memberInfo.level] >= levelOrder[benefit.levelRequired];
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.headerSection}>
        <View className={styles.levelInfo}>
          <Text className={styles.levelName}>{memberInfo.levelName}</Text>
          <Text className={styles.levelDesc}>
            感谢您一直以来的支持与信赖
          </Text>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>¥{memberInfo.yearConsumption.toLocaleString()}</Text>
            <Text className={styles.statLabel}>年消费金额</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{memberInfo.rescueCount}</Text>
            <Text className={styles.statLabel}>救援次数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{memberInfo.upgradeProgress}%</Text>
            <Text className={styles.statLabel}>升级进度</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>升级进度</Text>
        <View className={styles.progressCard}>
          <View className={styles.progressInfo}>
            <Text className={styles.progressText}>
              距离{nextLevelName}还差
            </Text>
            <Text className={styles.progressValue}>
              ¥{(memberInfo.nextLevelExp - memberInfo.currentExp).toLocaleString()}
            </Text>
          </View>
          <ProgressBar
            percent={memberInfo.upgradeProgress}
            color={currentConfig.color}
            size="lg"
          />
          <Text className={styles.levelTip}>
            升级条件：年消费满{currentConfig.minConsumption.toLocaleString()}元 或 救援{currentConfig.minRescueCount}次
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>会员权益</Text>
        <View className={styles.benefitsGrid}>
          {benefits.map((benefit) => {
            const isActive = isBenefitActive(benefit);
            return (
              <View
                key={benefit.id}
                className={styles.benefitCard}
                style={{ opacity: isActive ? 1 : 0.4 }}
              >
                <Text className={styles.benefitIcon}>{benefit.icon}</Text>
                <Text className={styles.benefitName}>{benefit.name}</Text>
                <Text className={styles.benefitDesc}>{benefit.description}</Text>
                {benefit.remainingCount !== undefined && benefit.totalCount !== undefined && isActive && (
                  <Text style={{ fontSize: 20, color: '#1E88E5', marginTop: 8 }}>
                    剩余 {benefit.remainingCount}/{benefit.totalCount} 次
                  </Text>
                )}
                {!isActive && (
                  <Text style={{ fontSize: 20, color: '#86909C', marginTop: 8 }}>
                    升级后解锁
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View className={styles.levelsSection}>
        <Text className={styles.sectionTitle}>会员等级</Text>
        {(levelRules.length > 0 ? levelRules : MEMBER_LEVEL_CONFIGS.map(config => ({
          level: config.level,
          name: config.name,
          minAnnualSpending: config.minConsumption,
          minRescueTimes: config.minRescueCount,
          benefits: []
        }))).map((rule, index) => (
          <View
            key={rule.level}
            className={classnames(
              styles.levelCard,
              { [styles.current]: memberInfo.level === rule.level },
              styles[rule.level]
            )}
          >
            <View className={classnames(styles.levelIcon, styles[rule.level])}>
              {index === 2 ? '🥇' : index === 1 ? '🥈' : '🥉'}
            </View>
            <View className={styles.levelInfoRight}>
              <Text className={styles.levelTitle}>{rule.name}</Text>
              <Text className={styles.levelCondition}>
                年消费 ¥{rule.minAnnualSpending.toLocaleString()}+ 或 救援{rule.minRescueTimes}次+
              </Text>
            </View>
            {memberInfo.level === rule.level && (
              <View className={styles.currentBadge}>当前等级</View>
            )}
          </View>
        ))}
      </View>

      {spendingHistory.length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>最近消费记录</Text>
          <View className={styles.spendingList}>
            {spendingHistory.slice(0, 5).map((item) => (
              <View key={item.id} className={styles.spendingItem}>
                <View className={styles.spendingInfo}>
                  <Text className={styles.spendingDesc}>{item.description}</Text>
                  <Text className={styles.spendingTime}>{item.createdAt}</Text>
                </View>
                <Text className={styles.spendingAmount}>-¥{item.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default MemberCenterPage;
