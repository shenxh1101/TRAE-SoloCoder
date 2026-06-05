import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { serviceService } from '@/services/serviceService';
import { ServicePackage } from '@/types/service';

const PackageDetailPage: React.FC = () => {
  const router = useRouter();
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [memberDiscount, setMemberDiscount] = useState(0.9);

  useEffect(() => {
    const id = router.params.id as string;
    if (id) {
      loadPackageDetail(id);
    }
  }, [router.params.id]);

  const loadPackageDetail = async (id: string) => {
    try {
      console.log('[PackageDetail] 加载套餐详情:', id);
      const data = await serviceService.getPackageDetail(id);
      console.log('[PackageDetail] 获取套餐详情成功:', data);
      setPkg(data);
    } catch (error) {
      console.error('[PackageDetail] 加载套餐详情失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  const handleBook = () => {
    if (!pkg) return;
    Taro.navigateTo({
      url: `/pages/booking/index?packageId=${pkg.id}&packageName=${encodeURIComponent(pkg.name)}`
    });
  };

  if (!pkg) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        <Image
          className={styles.banner}
          src={pkg.image}
          mode="aspectFill"
          onError={(e) => console.error('[PackageDetail] 图片加载失败:', e)}
        />

        <View className={styles.content}>
          <View className={styles.header}>
            <Text className={styles.name}>{pkg.name}</Text>
            <View className={styles.priceRow}>
              <Text className={styles.currency}>¥</Text>
              <Text className={styles.price}>{Math.round(pkg.price * memberDiscount)}</Text>
              <Text className={styles.originalPrice}>¥{pkg.originalPrice}</Text>
              {pkg.discount && (
                <Text className={styles.discountTag}>
                  会员{(memberDiscount * 10).toFixed(1)}折
                </Text>
              )}
            </View>
          </View>

          <View className={styles.infoCard}>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>适用里程</Text>
              <Text className={styles.infoValue}>{pkg.suitableMileage}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>服务时长</Text>
              <Text className={styles.infoValue}>{pkg.duration} 分钟</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>适用车型</Text>
              <Text className={styles.infoValue}>{pkg.suitableModels.join('、')}</Text>
            </View>
          </View>

          <Text className={styles.sectionTitle}>服务包含</Text>
          <View className={styles.includeList}>
            {pkg.includes.map((item, index) => (
              <View key={index} className={styles.includeItem}>
                <View className={styles.includeIcon}>✓</View>
                <Text className={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>

          <Text className={styles.sectionTitle}>服务说明</Text>
          <View className={styles.infoCard}>
            <Text className={styles.descText}>{pkg.description}</Text>
          </View>
        </View>
      </ScrollView>

      <View className={styles.footer}>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, color: '#86909C' }}>会员到手价</Text>
          <Text style={{ fontSize: 36, color: '#F44336', fontWeight: 600 }}>
            ¥{Math.round(pkg.price * memberDiscount)}
          </Text>
        </View>
        <View className={styles.bookBtn} onClick={handleBook}>
          立即预约
        </View>
      </View>
    </View>
  );
};

export default PackageDetailPage;
