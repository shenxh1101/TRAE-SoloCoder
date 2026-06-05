import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import styles from './index.module.scss';
import { Store } from '@/types/service';

interface StoreCardProps {
  store: Store;
  onClick?: () => void;
  showServices?: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onClick, showServices = true }) => {
  const serviceNames: Record<string, string> = {
    car_wash: '洗车',
    maintenance: '保养',
    repair: '维修',
    rescue: '救援'
  };

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.imageWrap}>
        <Image
          className={styles.image}
          src={store.image}
          mode="aspectFill"
          onError={(e) => console.error('[StoreCard] 图片加载失败:', e)}
        />
      </View>

      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.name}>{store.name}</Text>
          <View className={styles.rating}>
            <Text className={styles.ratingStar}>⭐</Text>
            <Text className={styles.ratingValue}>{store.rating}</Text>
            <Text className={styles.ratingCount}>({store.ratingCount})</Text>
          </View>
        </View>

        <View className={styles.address}>
          <Text className={styles.addressText}>📍 {store.address}</Text>
          {store.distance !== undefined && (
            <Text className={styles.distance}>{store.distance}km</Text>
          )}
        </View>

        <View className={styles.meta}>
          <Text className={styles.metaItem}>🕐 {store.businessHours}</Text>
          <Text className={styles.metaItem}>📞 {store.phone}</Text>
        </View>

        {showServices && (
          <View className={styles.services}>
            {store.services.map(s => (
              <View key={s} className={styles.serviceTag}>
                {serviceNames[s]}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default StoreCard;
