import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { OrderRecord } from '@/types/service';
import { getStatusText, getTypeText } from '@/services/serviceService';

interface OrderCardProps {
  order: OrderRecord;
  onClick?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const statusClass = order.status === 'completed' ? 'completed' :
    order.status === 'in_progress' ? 'inProgress' :
    order.status === 'cancelled' ? 'cancelled' : 'pending';

  const typeIcon = order.type === 'car_wash' ? '🚗' :
    order.type === 'maintenance' ? '🔧' :
    order.type === 'repair' ? '🛠️' : '🚨';

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <View className={styles.typeInfo}>
          <Text className={styles.typeIcon}>{typeIcon}</Text>
          <Text className={styles.typeName}>{getTypeText(order.type)}</Text>
        </View>
        <View className={classnames(styles.status, styles[statusClass])}>
          {getStatusText(order.status)}
        </View>
      </View>

      <View className={styles.content}>
        <Text className={styles.storeName}>{order.storeName}</Text>
        <View className={styles.meta}>
          <Text className={styles.plate}>{order.vehiclePlate}</Text>
          <Text className={styles.orderNo}>#{order.orderNo}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <Text className={styles.time}>{order.createTime.slice(0, 16)}</Text>
        <Text className={styles.amount}>¥{order.amount}</Text>
      </View>
    </View>
  );
};

export default OrderCard;
