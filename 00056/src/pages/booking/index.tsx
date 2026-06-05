import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { serviceService, CreateBookingParams, StoreQueryParams } from '@/services/serviceService';
import { Store, BookingTimeSlot, ServicePackage } from '@/types/service';
import dayjs from 'dayjs';

const BookingPage: React.FC = () => {
  const router = useRouter();
  const { userInfo, currentVehicle, updateMemberInfo } = useUserStore();

  const packageId = router.params.packageId as string;
  const packageName = decodeURIComponent(router.params.packageName as string || '');

  const [selectedVehicle, setSelectedVehicle] = useState(currentVehicle);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<BookingTimeSlot[]>([]);
  const [remark, setRemark] = useState('');
  const [packageInfo, setPackageInfo] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().add(i, 'day');
    return {
      day: i === 0 ? '今天' : i === 1 ? '明天' : date.format('MM/DD'),
      date: date.format('YYYY-MM-DD'),
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.day()]
    };
  });

  const loadStores = useCallback(async () => {
    console.log('[Booking] 加载门店列表');
    try {
      const params: StoreQueryParams = {
        page: 1,
        pageSize: 20,
        sortBy: 'distance'
      };
      const data = await serviceService.getStores(params);
      console.log('[Booking] 获取门店列表成功:', data);
      setStores(data);
      if (data.length > 0) {
        setSelectedStore(data[0]);
      }
    } catch (error) {
      console.error('[Booking] 加载门店失败:', error);
      Taro.showToast({ title: '加载门店失败', icon: 'none' });
    }
  }, []);

  const loadTimeSlots = useCallback(async () => {
    const date = dates[selectedDate]?.date || dates[0].date;
    if (!selectedStore?.id) return;

    console.log('[Booking] 加载可用时间段，门店:', selectedStore.id, '日期:', date, '套餐:', packageId);
    try {
      const slots = await serviceService.getAvailableTimeSlots(selectedStore.id, date, packageId);
      console.log('[Booking] 获取可用时间段成功:', slots);
      setTimeSlots(slots);
    } catch (error) {
      console.error('[Booking] 加载时间段失败:', error);
      Taro.showToast({ title: '加载时间段失败', icon: 'none' });
    }
  }, [selectedDate, dates, selectedStore, packageId]);

  const loadPackageInfo = useCallback(async () => {
    if (!packageId) return;
    console.log('[Booking] 加载套餐信息:', packageId);
    try {
      const pkg = await serviceService.getPackageDetail(packageId);
      console.log('[Booking] 获取套餐信息成功:', pkg);
      setPackageInfo(pkg);
    } catch (error) {
      console.error('[Booking] 加载套餐信息失败:', error);
    }
  }, [packageId]);

  useEffect(() => {
    loadStores();
    loadPackageInfo();
  }, [packageId, loadStores, loadPackageInfo]);

  useEffect(() => {
    loadTimeSlots();
  }, [selectedDate, selectedStore, loadTimeSlots]);

  useDidShow(() => {
    if (currentVehicle) {
      setSelectedVehicle(currentVehicle);
    }
  });

  const handleVehicleSelect = () => {
    if (!userInfo) return;
    Taro.showActionSheet({
      itemList: userInfo.vehicles.map(v => `${v.plateNumber} ${v.brand} ${v.model}`),
      success: (res) => {
        setSelectedVehicle(userInfo.vehicles[res.tapIndex]);
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) {
      Taro.showToast({ title: '请选择车辆', icon: 'none' });
      return;
    }
    if (!selectedStore) {
      Taro.showToast({ title: '请选择门店', icon: 'none' });
      return;
    }
    if (!selectedTime) {
      Taro.showToast({ title: '请选择时间', icon: 'none' });
      return;
    }
    if (!packageInfo) {
      Taro.showToast({ title: '套餐信息加载中，请稍候', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      const discount = userInfo?.memberInfo.benefits.maintenanceDiscount || 1;
      const finalPrice = Math.round(packageInfo.price * discount);

      const bookingParams: CreateBookingParams = {
        packageId: packageId,
        storeId: selectedStore.id,
        vehicleId: selectedVehicle.id,
        bookingDate: dates[selectedDate].date,
        bookingTime: selectedTime,
        contactName: userInfo?.nickname || userInfo?.phone || '',
        contactPhone: userInfo?.phone || '',
        remark
      };

      console.log('[Booking] 创建预约参数:', bookingParams);
      const booking = await serviceService.createBooking(bookingParams);
      console.log('[Booking] 预约成功:', booking);

      updateMemberInfo(finalPrice, false);

      Taro.showModal({
        title: '预约成功',
        content: `预约时间：${dates[selectedDate].date} ${selectedTime}\n门店：${selectedStore.name}`,
        showCancel: false,
        success: () => {
          Taro.switchTab({ url: '/pages/service/index' });
        }
      });
    } catch (error) {
      console.error('[Booking] 预约失败:', error);
      Taro.showToast({ title: '预约失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const memberDiscount = userInfo?.memberInfo.benefits.maintenanceDiscount || 1;
  const packagePrice = packageInfo?.price || 0;
  const finalPrice = Math.round(packagePrice * memberDiscount);

  if (!userInfo) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>请先登录</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择车辆</Text>
          <View className={styles.card}>
            {selectedVehicle ? (
              <View className={styles.vehicleSelector} onClick={handleVehicleSelect}>
                <View className={styles.vehicleInfo}>
                  <Text className={styles.plate}>{selectedVehicle.plateNumber}</Text>
                  <Text className={styles.model}>{selectedVehicle.brand} {selectedVehicle.model}</Text>
                </View>
                <Text className={styles.arrow}>›</Text>
              </View>
            ) : (
              <View
                className="btn-primary"
                onClick={() => Taro.navigateTo({ url: '/pages/vehicle-bind/index' })}
              >
                绑定车辆
              </View>
            )}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务项目</Text>
          <View className={styles.card}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 30, fontWeight: 600 }}>{packageName || '小保养套餐'}</Text>
                <Text style={{ fontSize: 24, color: '#86909C', marginTop: 4 }}>
                  会员{memberDiscount < 1 ? `享${(memberDiscount * 10).toFixed(1)}折优惠` : '无折扣'}
                </Text>
              </View>
              <Text style={{ fontSize: 32, color: '#F44336', fontWeight: 600 }}>¥{finalPrice}</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择门店</Text>
          <ScrollView className={styles.dateSelector} scrollX>
            {stores.slice(0, 3).map((store, index) => (
              <View
                key={store.id}
                className={classnames(styles.storeOption, { [styles.active]: selectedStore?.id === store.id })}
                onClick={() => setSelectedStore(store)}
              >
                <Text className={styles.storeName}>{store.name.slice(0, 6)}...</Text>
                <Text className={styles.storeDistance}>{store.distance}km</Text>
              </View>
            ))}
          </ScrollView>
          {selectedStore && (
            <View style={{ marginTop: 16, padding: 16, background: 'rgba(30, 136, 229, 0.05)', borderRadius: 12 }}>
              <Text style={{ fontSize: 26, color: '#1E88E5', fontWeight: 500 }}>{selectedStore.name}</Text>
              <Text style={{ fontSize: 24, color: '#86909C', marginTop: 4 }}>📍 {selectedStore.address}</Text>
              <Text style={{ fontSize: 24, color: '#86909C', marginTop: 4 }}>🕐 {selectedStore.businessHours}</Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择日期</Text>
          <ScrollView className={styles.dateSelector} scrollX>
            {dates.map((date, index) => (
              <View
                key={date.date}
                className={classnames(styles.dateOption, { [styles.active]: selectedDate === index })}
                onClick={() => setSelectedDate(index)}
              >
                <Text className={styles.dateDay}>{date.day}</Text>
                <Text className={styles.dateDate}>{date.weekday}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择时间</Text>
          <View className={styles.card}>
            <View className={styles.timeGrid}>
              {timeSlots.map(slot => (
                <View
                  key={slot.id}
                  className={classnames(
                    styles.timeOption,
                    { [styles.active]: selectedTime === slot.time, [styles.disabled]: !slot.available }
                  )}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                >
                  <Text className={styles.timeText}>{slot.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注信息</Text>
          <Input
            className={styles.remarkInput}
            placeholder="请输入备注信息（选填）"
            value={remark}
            onInput={(e) => setRemark(e.detail.value)}
          />
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>费用明细</Text>
          <View className={styles.card}>
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>服务套餐</Text>
              <Text className={styles.summaryValue}>¥{packagePrice}</Text>
            </View>
            {memberDiscount < 1 && (
              <View className={styles.summaryRow}>
                <Text className={styles.summaryLabel}>会员折扣</Text>
                <Text className={styles.summaryValue} style={{ color: '#4CAF50' }}>
                  -¥{packagePrice - finalPrice}
                </Text>
              </View>
            )}
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>合计</Text>
              <Text className={styles.totalPrice}>¥{finalPrice}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className={styles.footer}>
        <View className={styles.priceInfo}>
          <Text className={styles.priceLabel}>应付金额</Text>
          <Text className={styles.priceValue}>¥{finalPrice}</Text>
        </View>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          确认预约
        </View>
      </View>
    </View>
  );
};

export default BookingPage;
