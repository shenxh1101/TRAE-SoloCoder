import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidHide } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { rescueService } from '@/services/rescueService';
import { RescueRequest, RescueStatus } from '@/types/rescue';
import { mockRescueRequests } from '@/data/mockOrders';

const statusSteps: Record<RescueStatus, string[]> = {
  pending: ['救援请求已提交'],
  dispatched: ['救援请求已提交', '救援车辆已派出'],
  arriving: ['救援请求已提交', '救援车辆已派出', '救援车即将到达'],
  in_progress: ['救援请求已提交', '救援车辆已派出', '救援车即将到达', '救援进行中'],
  completed: ['救援请求已提交', '救援车辆已派出', '救援车即将到达', '救援进行中', '救援已完成'],
  cancelled: ['救援请求已提交', '救援已取消']
};

const RescueTrackingPage: React.FC = () => {
  const router = useRouter();
  const [rescue, setRescue] = useState<RescueRequest | null>(null);
  const [eta, setEta] = useState(15);
  const unsubscribeLocationRef = useRef<(() => void) | null>(null);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);
  const rescueIdRef = useRef<string | null>(null);

  const cleanupSubscriptions = useCallback(() => {
    console.log('[RescueTracking] 清理WebSocket订阅');
    if (unsubscribeLocationRef.current) {
      unsubscribeLocationRef.current();
      unsubscribeLocationRef.current = null;
    }
    if (unsubscribeStatusRef.current) {
      unsubscribeStatusRef.current();
      unsubscribeStatusRef.current = null;
    }
    if (rescueIdRef.current) {
      rescueService.unsubscribeFromRescueUpdates(rescueIdRef.current);
      rescueIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    const id = router.params.id as string;
    if (id) {
      loadRescueDetail(id);
    } else {
      setRescue(mockRescueRequests[0]);
    }
    return () => {
      cleanupSubscriptions();
    };
  }, [router.params.id, cleanupSubscriptions]);

  useEffect(() => {
    if (rescue && rescue.status !== 'completed' && rescue.status !== 'cancelled') {
      console.log('[RescueTracking] 订阅救援实时更新，救援ID:', rescue.id);
      rescueIdRef.current = rescue.id;

      rescueService.subscribeToRescueUpdates(rescue.id);

      unsubscribeLocationRef.current = rescueService.onRescueLocationUpdate(rescue.id, (data) => {
        console.log('[RescueTracking] 收到位置更新，ETA:', data.eta);
        setEta(data.eta);
      });

      unsubscribeStatusRef.current = rescueService.onRescueStatusUpdate(rescue.id, (data) => {
        console.log('[RescueTracking] 收到状态更新:', data.status);
        setRescue(prev => prev ? { ...prev, status: data.status as any, statusText: data.statusText } : null);
      });
    } else {
      cleanupSubscriptions();
    }
  }, [rescue, cleanupSubscriptions]);

  useDidHide(() => {
    console.log('[RescueTracking] 页面隐藏，清理订阅');
    cleanupSubscriptions();
  });

  const loadRescueDetail = async (id: string) => {
    try {
      console.log('[RescueTracking] 加载救援详情，ID:', id);
      const data = await rescueService.getRescueDetail(id);
      if (data) {
        setRescue(data);
        setEta(data.estimatedArrivalTime || 15);
      } else {
        setRescue(mockRescueRequests[0]);
      }
    } catch (error) {
      console.error('[RescueTracking] 加载救援详情失败:', error);
      setRescue(mockRescueRequests[0]);
    }
  };

  const handleCallDriver = () => {
    if (rescue?.rescueVehicle?.driverPhone) {
      Taro.makePhoneCall({ phoneNumber: rescue.rescueVehicle.driverPhone });
    }
  };

  const handleCancel = () => {
    if (!rescue) return;
    Taro.showModal({
      title: '取消救援',
      content: '确定要取消当前救援吗？',
      confirmColor: '#F44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            await rescueService.cancelRescue(rescue.id);
            Taro.showToast({ title: '已取消', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 1000);
          } catch (error) {
            console.error('[RescueTracking] 取消失败:', error);
          }
        }
      }
    });
  };

  if (!rescue) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🚨</Text>
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  const steps = statusSteps[rescue.status] || statusSteps.pending;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.mapPlaceholder}>
        <View className={styles.userPin}>📍</View>
        <View className={styles.rescuePin}>🚨</View>
        <View className={styles.mapContent}>
          <Text className={styles.mapIcon}>🗺️</Text>
          <Text className={styles.mapText}>救援车辆实时位置追踪</Text>
        </View>
      </View>

      <View className={styles.detailCard}>
        <View className={styles.statusRow}>
          <View className={styles.typeInfo}>
            <Text className={styles.typeIcon}>🚨</Text>
            <View>
              <Text className={styles.typeName}>{rescue.typeName}</Text>
              <Text style={{ fontSize: 22, color: '#86909C' }}>{rescue.orderNo}</Text>
            </View>
          </View>
          <View className={styles.statusBadge}>
            {rescueService.getRescueStatusText(rescue.status)}
          </View>
        </View>

        {rescue.status !== 'completed' && rescue.status !== 'cancelled' && (
          <View className={styles.etaCard}>
            <Text className={styles.etaValue}>{eta}</Text>
            <Text className={styles.etaLabel}>预计到达时间（分钟）</Text>
          </View>
        )}

        <View className={styles.infoSection}>
          <Text className={styles.infoLabel}>救援位置</Text>
          <Text className={styles.infoValue}>📍 {rescue.location.address}</Text>
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoLabel}>问题描述</Text>
          <Text className={styles.infoValue}>{rescue.description}</Text>
        </View>

        {rescue.rescueVehicle && (
          <View className={styles.driverCard}>
            <View className={styles.driverAvatar}>👤</View>
            <View className={styles.driverInfo}>
              <Text className={styles.driverName}>
                {rescue.rescueVehicle.driverName}
              </Text>
              <Text className={styles.driverVehicle}>
                {rescue.rescueVehicle.type} · {rescue.rescueVehicle.plateNumber}
              </Text>
            </View>
          </View>
        )}

        {rescue.status !== 'completed' && rescue.status !== 'cancelled' && (
          <View className={styles.actionBtns}>
            <View className={[styles.actionBtn, styles.call]} onClick={handleCallDriver}>
              📞 联系司机
            </View>
            <View className={[styles.actionBtn, styles.cancel]} onClick={handleCancel}>
              取消救援
            </View>
          </View>
        )}

        <View style={{ marginTop: 32 }}>
          <Text className={styles.infoLabel} style={{ marginBottom: 16 }}>救援进度</Text>
          <View className={styles.timeline}>
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              const isCompleted = !isLast || rescue.status === 'completed';
              const isCurrent = isLast && rescue.status !== 'completed' && rescue.status !== 'cancelled';
              return (
                <View
                  key={index}
                  className={classnames(
                    styles.timelineItem,
                    { [styles.completed]: isCompleted, [styles.current]: isCurrent }
                  )}
                >
                  <View className={styles.timelineDot} />
                  <View className={styles.timelineContent}>
                    <Text className={styles.timelineTitle}>{step}</Text>
                    <Text className={styles.timelineTime}>
                      {index === 0 ? rescue.createTime.slice(11, 16) :
                       index === 1 && rescue.dispatchTime ? rescue.dispatchTime.slice(11, 16) : '--:--'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default RescueTrackingPage;
