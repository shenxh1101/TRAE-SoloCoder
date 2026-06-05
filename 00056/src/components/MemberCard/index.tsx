import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { MemberInfo } from '@/types/user';
import ProgressBar from '@/components/ProgressBar';
import { getMemberLevelConfig } from '@/utils/member';

interface MemberCardProps {
  memberInfo: MemberInfo;
  onClick?: () => void;
  showProgress?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ memberInfo, onClick, showProgress = true }) => {
  const config = getMemberLevelConfig(memberInfo.level);

  return (
    <View
      className={classnames(styles.card, styles[memberInfo.level])}
      onClick={onClick}
    >
      <View className={styles.header}>
        <View className={styles.levelInfo}>
          <View className={styles.levelBadge} style={{ backgroundColor: config.bgColor, color: config.color }}>
            {memberInfo.levelName}
          </View>
          <Text className={styles.title}>会员权益</Text>
        </View>
        <View className={styles.points}>
          <Text className={styles.pointsValue}>{memberInfo.yearConsumption}</Text>
          <Text className={styles.pointsLabel}>年消费（元）</Text>
        </View>
      </View>

      {showProgress && memberInfo.level !== 'gold' && (
        <View className={styles.progressSection}>
          <View className={styles.progressHeader}>
            <Text className={styles.progressLabel}>
              升级还需 ¥{memberInfo.nextLevelExp - memberInfo.currentExp}
            </Text>
            <Text className={styles.progressValue}>{memberInfo.upgradeProgress}%</Text>
          </View>
          <ProgressBar
            percent={memberInfo.upgradeProgress}
            color={config.color}
            size="md"
          />
        </View>
      )}

      <View className={styles.benefits}>
        <View className={styles.benefitItem}>
          <Text className={styles.benefitValue}>{memberInfo.benefits.freeCarWashCount}</Text>
          <Text className={styles.benefitLabel}>免费洗车</Text>
        </View>
        <View className={styles.divider} />
        <View className={styles.benefitItem}>
          <Text className={styles.benefitValue}>{(memberInfo.benefits.maintenanceDiscount * 10).toFixed(1)}折</Text>
          <Text className={styles.benefitLabel}>保养折扣</Text>
        </View>
        <View className={styles.divider} />
        <View className={styles.benefitItem}>
          <Text className={styles.benefitValue}>{memberInfo.benefits.rescuePriority ? '是' : '否'}</Text>
          <Text className={styles.benefitLabel}>优先救援</Text>
        </View>
        <View className={styles.divider} />
        <View className={styles.benefitItem}>
          <Text className={styles.benefitValue}>{memberInfo.rescueCount}</Text>
          <Text className={styles.benefitLabel}>救援次数</Text>
        </View>
      </View>
    </View>
  );
};

export default MemberCard;
