import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Swiper, SwiperItem, Image, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { userService } from '@/services/userService';
import { serviceService } from '@/services/serviceService';
import { ServicePackage, Store } from '@/types/service';
import MemberCard from '@/components/MemberCard';
import VehicleCard from '@/components/VehicleCard';
import ServicePackageCard from '@/components/ServicePackageCard';

const bannerImages = [
  'https://picsum.photos/id/145/750/320',
  'https://picsum.photos/id/133/750/320',
  'https://picsum.photos/id/111/750/320'
];

const quickEntries = [
  { icon: '🚗', text: '洗车', key: 'car_wash', color: 'carWash' },
  { icon: '🔧', text: '保养', key: 'maintenance', color: 'maintenance' },
  { icon: '🛠️', text: '维修', key: 'repair', color: 'repair' },
  { icon: '🚨', text: '救援', key: 'rescue', color: 'rescue' }
];

const HomePage: React.FC = () => {
  const { userInfo, isLoggedIn, currentVehicle, setUserInfo, setLoggedIn } = useUserStore();
  const [recommendedPackages, setRecommendedPackages] = useState<ServicePackage[]>([]);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('北京市');
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    console.log('[HomePage] 加载首页数据');
    setLoading(true);
    try {
      if (!isLoggedIn || !userInfo) {
        console.log('[HomePage] 未登录，获取用户信息');
        const user = await userService.getUserInfo();
        console.log('[HomePage] 获取用户信息成功:', user);
        setUserInfo(user);
        setLoggedIn(true);
      }

      if (currentVehicle) {
        const packages = await serviceService.getRecommendedPackages(currentVehicle.mileage, currentVehicle.id);
        console.log('[HomePage] 获取推荐套餐成功:', packages);
        setRecommendedPackages(packages);
      } else if (userInfo?.vehicles && userInfo.vehicles.length > 0) {
        const packages = await serviceService.getRecommendedPackages(userInfo.vehicles[0].mileage, userInfo.vehicles[0].id);
        console.log('[HomePage] 获取推荐套餐成功:', packages);
        setRecommendedPackages(packages);
      }

      const stores = await serviceService.getStores({ pageSize: 3, sortBy: 'distance' });
      console.log('[HomePage] 获取附近门店成功:', stores);
      setNearbyStores(stores);
    } catch (error) {
      console.error('[HomePage] 加载数据失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [isLoggedIn, userInfo, currentVehicle, setUserInfo, setLoggedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useDidShow(() => {
    if (isLoggedIn) {
      loadData();
    }
  });

  usePullDownRefresh(() => {
    loadData();
  });

  const handleQuickEntry = (type: string) => {
    console.log('[HomePage] 点击快捷入口:', type);
    if (type === 'rescue') {
      Taro.switchTab({ url: '/pages/rescue/index' });
    } else {
      Taro.switchTab({ url: '/pages/service/index' });
    }
  };

  const handleRescue = () => {
    console.log('[HomePage] 点击一键救援');
    Taro.showModal({
      title: '发起救援',
      content: '确定要发起道路救援吗？系统将自动定位并派最近的救援车辆。',
      confirmText: '立即救援',
      confirmColor: '#FF9800',
      success: (res) => {
        if (res.confirm) {
          Taro.switchTab({ url: '/pages/rescue/index' });
        }
      }
    });
  };

  const handleMemberClick = () => {
    Taro.navigateTo({ url: '/pages/member-center/index' });
  };

  const handleVehicleClick = () => {
    Taro.navigateTo({ url: '/pages/vehicle-manage/index' });
  };

  const handlePackageClick = (pkg: ServicePackage) => {
    console.log('[HomePage] 点击套餐:', pkg.id);
    Taro.navigateTo({ url: `/pages/package-detail/index?id=${pkg.id}` });
  };

  const handleMorePackages = () => {
    Taro.switchTab({ url: '/pages/service/index' });
  };

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  if (!isLoggedIn || !userInfo) {
    return (
      <View className={styles.page}>
        <View className={styles.topBar}>
          <View className={styles.location}>📍 {city}</View>
          <View className={styles.searchBox}>
            <Text className={styles.searchIcon}>🔍</Text>
            <Text className={styles.searchPlaceholder}>搜索服务、门店...</Text>
          </View>
          <Text className={styles.messageIcon}>🔔</Text>
        </View>

        <Swiper
          className={styles.banner}
          indicatorDots
          autoplay
          circular
          indicatorColor="rgba(255,255,255,0.4)"
          indicatorActiveColor="#ffffff"
        >
          {bannerImages.map((img, index) => (
            <SwiperItem key={index}>
              <Image className={styles.bannerImage} src={img} mode="aspectFill" />
            </SwiperItem>
          ))}
        </Swiper>

        <View className={styles.quickEntry}>
          {quickEntries.map(entry => (
            <View
              key={entry.key}
              className={styles.entryItem}
              onClick={() => handleQuickEntry(entry.key)}
            >
              <View className={classnames(styles.entryIcon, styles[entry.color])}>
                <Text>{entry.icon}</Text>
              </View>
              <Text className={styles.entryText}>{entry.text}</Text>
            </View>
          ))}
        </View>

        <View className={styles.emptyState}>
          <Text>请先登录以体验完整功能</Text>
          <View
            style={{ marginTop: 32 }}
            className="btn-primary"
            onClick={handleLogin}
          >
            立即登录
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.topBar}>
        <View className={styles.location}>📍 {city}</View>
        <View className={styles.searchBox}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索服务、门店..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
        <Text className={styles.messageIcon}>🔔</Text>
      </View>

      <Swiper
        className={styles.banner}
        indicatorDots
        autoplay
        circular
        indicatorColor="rgba(255,255,255,0.4)"
        indicatorActiveColor="#ffffff"
      >
        {bannerImages.map((img, index) => (
          <SwiperItem key={index}>
            <Image
              className={styles.bannerImage}
              src={img}
              mode="aspectFill"
              onError={(e) => console.error('[HomePage] Banner图片加载失败:', e)}
            />
          </SwiperItem>
        ))}
      </Swiper>

      <View className={styles.quickEntry}>
        {quickEntries.map(entry => (
          <View
            key={entry.key}
            className={styles.entryItem}
            onClick={() => handleQuickEntry(entry.key)}
          >
            <View className={classnames(styles.entryIcon, styles[entry.color])}>
              <Text>{entry.icon}</Text>
            </View>
            <Text className={styles.entryText}>{entry.text}</Text>
          </View>
        ))}
      </View>

      <View className={styles.section}>
        <MemberCard
          memberInfo={userInfo.memberInfo}
          onClick={handleMemberClick}
        />
      </View>

      <View className={styles.vehicleSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我的车辆</Text>
          <Text className={styles.moreLink} onClick={handleVehicleClick}>管理</Text>
        </View>
        {currentVehicle ? (
          <VehicleCard
            vehicle={currentVehicle}
            onClick={handleVehicleClick}
          />
        ) : (
          <View className={styles.emptyState}>
            <Text>暂无绑定车辆，点击绑定</Text>
            <View
              style={{ marginTop: 16 }}
              className="btn-primary"
              onClick={() => Taro.navigateTo({ url: '/pages/vehicle-bind/index' })}
            >
              绑定车辆
            </View>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>为您推荐</Text>
          <Text className={styles.moreLink} onClick={handleMorePackages}>更多</Text>
        </View>
        {loading ? (
          <View className={styles.loading}>
            <Text>加载中...</Text>
          </View>
        ) : recommendedPackages.length > 0 ? (
          <ScrollView className={styles.scrollContainer} scrollX>
            {recommendedPackages.map(pkg => (
              <View key={pkg.id} className={styles.packageCard}>
                <ServicePackageCard
                  pkg={pkg}
                  onClick={() => handlePackageClick(pkg)}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className={styles.emptyState}>
            <Text>暂无推荐服务</Text>
          </View>
        )}
      </View>

      <View className={styles.rescueEntry}>
        <View className={styles.rescueBtn} onClick={handleRescue}>
          <Text className={styles.rescueIcon}>🚨</Text>
          <Text>一键救援</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
