import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { rescueService, CreateRescueParams } from '@/services/rescueService';
import { mapService } from '@/services/mapService';
import { useUserStore } from '@/store/useUserStore';
import { RescueRequest, RescueType, Location } from '@/types/rescue';
import { mockUser } from '@/data/mockUser';

const rescueTypes: { key: RescueType; icon: string; name: string; desc: string }[] = [
  { key: 'towing', icon: '🚚', name: '拖车服务', desc: '车辆无法行驶' },
  { key: 'battery', icon: '🔋', name: '电瓶搭电', desc: '亏电无法启动' },
  { key: 'tire', icon: '🛞', name: '换胎救援', desc: '爆胎/漏气' },
  { key: 'fuel', icon: '⛽', name: '紧急送油', desc: '燃油耗尽' },
  { key: 'lockout', icon: '🔐', name: '开锁服务', desc: '钥匙锁车内' },
  { key: 'other', icon: '🛟', name: '其他救援', desc: '其他紧急情况' }
];

const RescuePage: React.FC = () => {
  const { userInfo, isLoggedIn, currentVehicle, setUserInfo, setLoggedIn, updateMemberInfo } = useUserStore();
  const [selectedType, setSelectedType] = useState<RescueType>('towing');
  const [location, setLocation] = useState<Location | null>(null);
  const [currentRescue, setCurrentRescue] = useState<RescueRequest | null>(null);
  const [history, setHistory] = useState<RescueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState(0);
  const unsubscribeLocationRef = useRef<(() => void) | null>(null);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);

  const loadData = useCallback(async () => {
    console.log('[RescuePage] 加载救援页面数据');
    setLoading(true);
    try {
      if (!isLoggedIn || !userInfo) {
        console.log('[RescuePage] 未登录，使用mock数据');
        setUserInfo(mockUser);
        setLoggedIn(true);
        return;
      }

      console.log('[RescuePage] 检查定位权限');
      const authStatus = await mapService.checkLocationAuth();
      if (authStatus !== 'authorized') {
        console.log('[RescuePage] 定位权限未授权，请求权限');
        const granted = await mapService.requestLocationAuth();
        if (!granted) {
          Taro.showModal({
            title: '定位权限未开启',
            content: '请在设置中开启定位权限，以便使用救援服务',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                Taro.openSetting();
              }
            }
          });
          setLoading(false);
          Taro.stopPullDownRefresh();
          return;
        }
      }

      const loc = await rescueService.getCurrentLocation();
      setLocation(loc);
      console.log('[RescuePage] 获取位置成功:', loc.address);

      const activeRescues = await rescueService.getRescueRequests('dispatched');
      if (activeRescues.length > 0) {
        setCurrentRescue(activeRescues[0]);
        setEta(activeRescues[0].estimatedArrivalTime || 15);
      }

      const allRescues = await rescueService.getRescueRequests();
      setHistory(allRescues.filter(r => r.status === 'completed'));
    } catch (error) {
      console.error('[RescuePage] 加载数据失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [isLoggedIn, userInfo, setUserInfo, setLoggedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentRescue && currentRescue.status !== 'completed' && currentRescue.status !== 'cancelled') {
      console.log('[RescuePage] 订阅救援实时更新，救援ID:', currentRescue.id);

      rescueService.subscribeToRescueUpdates(currentRescue.id);

      unsubscribeLocationRef.current = rescueService.onRescueLocationUpdate(currentRescue.id, (data) => {
        console.log('[RescuePage] 收到位置更新，ETA:', data.eta);
        setEta(data.eta);
      });

      unsubscribeStatusRef.current = rescueService.onRescueStatusUpdate(currentRescue.id, (data) => {
        console.log('[RescuePage] 收到状态更新:', data.status);
        setCurrentRescue(prev => prev ? { ...prev, status: data.status as any, statusText: data.statusText } : null);
      });

      return () => {
        console.log('[RescuePage] 取消订阅救援更新');
        if (unsubscribeLocationRef.current) {
          unsubscribeLocationRef.current();
          unsubscribeLocationRef.current = null;
        }
        if (unsubscribeStatusRef.current) {
          unsubscribeStatusRef.current();
          unsubscribeStatusRef.current = null;
        }
        rescueService.unsubscribeFromRescueUpdates(currentRescue.id);
      };
    }
  }, [currentRescue]);

  useDidShow(() => {
    if (isLoggedIn) {
      loadData();
    }
  });

  usePullDownRefresh(() => {
    loadData();
  });

  const handleRescue = async () => {
    console.log('[RescuePage] 发起救援，类型:', selectedType);
    if (!currentVehicle) {
      Taro.showModal({
        title: '提示',
        content: '请先绑定车辆信息',
        confirmText: '去绑定',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({ url: '/pages/vehicle-bind/index' });
          }
        }
      });
      return;
    }

    Taro.showModal({
      title: '确认救援',
      content: `确认发起${rescueTypes.find(t => t.key === selectedType)?.name}救援？\n位置：${location?.address}`,
      confirmText: '立即救援',
      confirmColor: '#FF9800',
      success: async (res) => {
        if (res.confirm) {
          try {
            if (!location) return;
            const params: CreateRescueParams = {
              vehicleId: currentVehicle.id,
              plateNumber: currentVehicle.plateNumber,
              type: selectedType,
              description: `用户发起${rescueTypes.find(t => t.key === selectedType)?.name}`,
              location
            };
            console.log('[RescuePage] 创建救援请求参数:', params);
            const result = await rescueService.createRescueRequest(params);
            setCurrentRescue(result);
            setEta(result.estimatedArrivalTime || 15);
            updateMemberInfo(result.estimatedCost || 0, true);
            Taro.navigateTo({ url: `/pages/rescue-tracking/index?id=${result.id}` });
          } catch (error) {
            console.error('[RescuePage] 发起救援失败:', error);
            Taro.showToast({ title: '发起失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleCallDriver = (phone: string) => {
    console.log('[RescuePage] 拨打司机电话:', phone);
    Taro.makePhoneCall({ phoneNumber: phone });
  };

  const handleHistoryClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/rescue-tracking/index?id=${id}` });
  };

  const handleCancelRescue = () => {
    if (!currentRescue) return;
    Taro.showModal({
      title: '取消救援',
      content: '确定要取消当前救援吗？',
      confirmColor: '#F44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            await rescueService.cancelRescue(currentRescue.id);
            setCurrentRescue(null);
          } catch (error) {
            console.error('[RescuePage] 取消救援失败:', error);
          }
        }
      }
    });
  };

  if (!isLoggedIn) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text>请先登录以使用救援服务</Text>
          <View
            style={{ marginTop: 32 }}
            className="btn-primary"
            onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}
          >
            立即登录
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.locationCard}>
        <View className={styles.locationHeader}>
          <Text className={styles.locationIcon}>📍</Text>
          <Text className={styles.locationTitle}>当前位置</Text>
        </View>
        <Text className={styles.locationAddress}>
          {location?.address || '定位中...'}
        </Text>
        {location && (
          <Text className={styles.locationCoords}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      {currentRescue && currentRescue.status !== 'completed' && (
        <View className={styles.currentRescue}>
          <View className={styles.currentHeader}>
            <View>
              <Text className={styles.currentTitle}>
                {currentRescue.typeName}
              </Text>
              <Text style={{ fontSize: 24, opacity: 0.8, marginTop: 4 }}>
                车牌号：{currentRescue.plateNumber}
              </Text>
            </View>
            <View className={styles.statusBadge}>
              {rescueService.getRescueStatusText(currentRescue.status)}
            </View>
          </View>

          <View className={styles.etaSection}>
            <Text className={styles.etaValue}>{eta}</Text>
            <Text className={styles.etaLabel}>预计到达时间（分钟）</Text>
          </View>

          {currentRescue.rescueVehicle && (
            <View className={styles.driverInfo}>
              <View>
                <Text className={styles.driverName}>
                  {currentRescue.rescueVehicle.driverName} · {currentRescue.rescueVehicle.type}
                </Text>
                <Text className={styles.driverPhone}>
                  {currentRescue.rescueVehicle.plateNumber}
                </Text>
              </View>
              <View style={{ display: 'flex', gap: 16 }}>
                <View
                  className={styles.callBtn}
                  onClick={() => handleCallDriver(currentRescue.rescueVehicle!.driverPhone)}
                >
                  📞 联系
                </View>
                <View
                  className={styles.callBtn}
                  style={{ background: 'rgba(244, 67, 54, 0.3)' }}
                  onClick={handleCancelRescue}
                >
                  取消
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {!currentRescue && (
        <>
          <View className={styles.typeSection}>
            <Text className={styles.sectionTitle}>选择救援类型</Text>
            <View className={styles.typeGrid}>
              {rescueTypes.map(type => (
                <View
                  key={type.key}
                  className={classnames(styles.typeCard, { [styles.active]: selectedType === type.key })}
                  onClick={() => setSelectedType(type.key)}
                >
                  <Text className={styles.typeIcon}>{type.icon}</Text>
                  <Text className={styles.typeName}>{type.name}</Text>
                  <Text className={styles.typeDesc}>{type.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.rescueBtnSection}>
            <View className={styles.rescueBtn} onClick={handleRescue}>
              <Text className={styles.rescueBtnIcon}>🚨</Text>
              <Text className={styles.rescueBtnText}>一键救援</Text>
              <Text className={styles.rescueBtnSubText}>7×24小时服务</Text>
            </View>
          </View>

          <View className={styles.tips}>
            <Text className={styles.tipsTitle}>💡 温馨提示</Text>
            <Text className={styles.tipsText}>
              1. 请确保停放在安全区域，开启危险报警闪光灯{'\n'}
              2. 在车后150米处放置三角警示牌{'\n'}
              3. 人员撤离到安全地带，不要留在车内{'\n'}
              4. 保持电话畅通，便于救援人员联系
            </Text>
          </View>
        </>
      )}

      <View className={styles.historySection}>
        <View className={styles.historyHeader}>
          <Text className={styles.sectionTitle}>救援记录</Text>
          <Text className={styles.moreLink}>查看全部</Text>
        </View>

        {loading ? (
          <View className={styles.loading}>
            <Text>加载中...</Text>
          </View>
        ) : history.length > 0 ? (
          history.map(item => (
            <View
              key={item.id}
              className={styles.historyItem}
              onClick={() => handleHistoryClick(item.id)}
            >
              <View className={styles.historyTop}>
                <Text className={styles.historyType}>{item.typeName}</Text>
                <View className={classnames(styles.historyStatus, styles.completed)}>
                  {rescueService.getRescueStatusText(item.status)}
                </View>
              </View>
              <Text className={styles.historyAddress}>📍 {item.location.address}</Text>
              <View className={styles.historyBottom}>
                <Text className={styles.historyTime}>{item.createTime.slice(0, 16)}</Text>
                <Text className={styles.historyAmount}>¥{item.actualCost || item.estimatedCost}</Text>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text>暂无救援记录</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default RescuePage;
