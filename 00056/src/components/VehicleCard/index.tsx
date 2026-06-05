import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { Vehicle } from '@/types/user';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  showMileage?: boolean;
  compact?: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick, showMileage = true, compact = false }) => {
  const daysSinceMaintenance = Math.floor(
    (Date.now() - new Date(vehicle.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const maintenanceStatus = daysSinceMaintenance > 180 ? 'overdue' : daysSinceMaintenance > 90 ? 'due' : 'normal';

  return (
    <View
      className={classnames(styles.card, { [styles.compact]: compact })}
      onClick={onClick}
    >
      <View className={styles.header}>
        <View className={styles.plate}>
          <Text className={styles.plateText}>{vehicle.plateNumber}</Text>
          {vehicle.isDefault && (
            <View className={styles.defaultTag}>默认</View>
          )}
        </View>
        <Text className={styles.model}>{vehicle.brand} {vehicle.model}</Text>
      </View>

      {!compact && (
        <View className={styles.info}>
          <View className={styles.infoRow}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>颜色</Text>
              <Text className={styles.infoValue}>{vehicle.color}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>购车年份</Text>
              <Text className={styles.infoValue}>{vehicle.buyYear}年</Text>
            </View>
          </View>

          {showMileage && (
            <View className={styles.infoRow}>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>当前里程</Text>
                <Text className={styles.infoValue}>{vehicle.mileage.toLocaleString()} km</Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>上次保养</Text>
                <Text className={classnames(styles.infoValue, styles[maintenanceStatus])}>
                  {daysSinceMaintenance}天前
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {!compact && (
        <View className={styles.footer}>
          <View className={classnames(styles.statusTag, styles[maintenanceStatus])}>
            {maintenanceStatus === 'overdue' ? '保养逾期' : maintenanceStatus === 'due' ? '即将保养' : '状态良好'}
          </View>
          <Text className={styles.arrow}>&gt;</Text>
        </View>
      )}
    </View>
  );
};

export default VehicleCard;
