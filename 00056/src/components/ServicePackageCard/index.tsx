import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { ServicePackage } from '@/types/service';

interface ServicePackageCardProps {
  pkg: ServicePackage;
  onClick?: () => void;
  showDiscount?: boolean;
}

const ServicePackageCard: React.FC<ServicePackageCardProps> = ({ pkg, onClick, showDiscount = true }) => {
  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.imageWrap}>
        <Image
          className={styles.image}
          src={pkg.image}
          mode="aspectFill"
          onError={(e) => console.error('[ServicePackageCard] 图片加载失败:', e)}
        />
        {pkg.isHot && (
          <View className={classnames(styles.tag, styles.hot)}>热门</View>
        )}
        {pkg.isRecommend && (
          <View className={classnames(styles.tag, styles.recommend)}>推荐</View>
        )}
      </View>

      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.name}>{pkg.name}</Text>
        </View>

        <Text className={styles.description}>{pkg.description}</Text>

        <View className={styles.meta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>适用里程</Text>
            <Text className={styles.metaValue}>{pkg.suitableMileage}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>服务时长</Text>
            <Text className={styles.metaValue}>{pkg.duration}分钟</Text>
          </View>
        </View>

        <View className={styles.footer}>
          <View className={styles.priceWrap}>
            <Text className={styles.currency}>¥</Text>
            <Text className={styles.price}>{pkg.price}</Text>
            {showDiscount && pkg.originalPrice > pkg.price && (
              <Text className={styles.originalPrice}>¥{pkg.originalPrice}</Text>
            )}
          </View>
          {showDiscount && pkg.discount && (
            <View className={styles.discountTag}>
              {(pkg.discount * 10).toFixed(1)}折
            </View>
          )}
          <View className={styles.bookBtn}>立即预约</View>
        </View>
      </View>
    </View>
  );
};

export default ServicePackageCard;
