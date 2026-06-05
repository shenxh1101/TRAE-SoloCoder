import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { userService, ViolationPayParams } from '@/services/userService';
import { ViolationRecord } from '@/types/user';
import { mockViolations } from '@/data/mockUser';

const ViolationPage: React.FC = () => {
  const { userInfo, currentVehicle } = useUserStore();
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay' | 'balance'>('wechat');

  useEffect(() => {
    if (currentVehicle) {
      setSelectedVehicleId(currentVehicle.id);
    }
  }, [currentVehicle]);

  const loadData = async () => {
    try {
      console.log('[Violation] 加载违章记录，车辆ID:', selectedVehicleId);
      const data = await userService.getViolations({ vehicleId: selectedVehicleId });
      console.log('[Violation] 违章记录数据:', data);
      setViolations(data);
    } catch (error) {
      console.error('[Violation] 加载违章记录失败:', error);
      setViolations(mockViolations.filter(v => !selectedVehicleId || v.vehicleId === selectedVehicleId));
    }
  };

  const handleRefresh = async () => {
    if (!selectedVehicleId) {
      Taro.showToast({ title: '请先选择车辆', icon: 'none' });
      return;
    }
    setRefreshing(true);
    try {
      console.log('[Violation] 实时刷新违章记录，车辆ID:', selectedVehicleId);
      const data = await userService.refreshViolations(selectedVehicleId);
      console.log('[Violation] 刷新后的违章记录:', data);
      setViolations(data);
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    } catch (error) {
      console.error('[Violation] 刷新违章记录失败:', error);
      Taro.showToast({ title: '刷新失败，请重试', icon: 'none' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userInfo) {
      loadData();
    }
  }, [userInfo, selectedVehicleId]);

  useDidShow(() => {
    if (userInfo) {
      loadData();
    }
  });

  const selectPayMethod = (): Promise<'wechat' | 'alipay' | 'balance'> => {
    return new Promise((resolve) => {
      Taro.showActionSheet({
        itemList: ['微信支付', '支付宝', '余额支付'],
        success: (res) => {
          const methods: ('wechat' | 'alipay' | 'balance')[] = ['wechat', 'alipay', 'balance'];
          resolve(methods[res.tapIndex]);
        },
        fail: () => {
          resolve('wechat');
        }
      });
    });
  };

  const handlePay = async (item: ViolationRecord) => {
    Taro.showModal({
      title: '确认代缴',
      content: `确定要代缴该违章吗？\n罚款：¥${item.fine}\n扣分：${item.points}分`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const selectedMethod = await selectPayMethod();
            const payParams: ViolationPayParams = {
              violationId: item.id,
              payAmount: item.fine,
              payMethod: selectedMethod
            };
            console.log('[Violation] 代缴参数:', payParams);
            const result = await userService.payViolation(payParams);
            console.log('[Violation] 代缴结果:', result);
            setViolations(prev => prev.map(v =>
              v.id === item.id ? { ...v, status: 'paid' as const } : v
            ));
            Taro.showToast({ title: '代缴成功', icon: 'success' });
          } catch (error) {
            console.error('[Violation] 代缴失败:', error);
          }
        }
      }
    });
  };

  const handlePayAll = async () => {
    const unpaid = violations.filter(v => v.status === 'unpaid');
    if (unpaid.length === 0) return;

    const totalFine = unpaid.reduce((sum, v) => sum + v.fine, 0);
    const totalPoints = unpaid.reduce((sum, v) => sum + v.points, 0);

    Taro.showModal({
      title: '确认代缴全部',
      content: `共 ${unpaid.length} 条违章待处理\n罚款合计：¥${totalFine}\n扣分合计：${totalPoints}分`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const selectedMethod = await selectPayMethod();
            console.log('[Violation] 批量代缴，支付方式:', selectedMethod);
            await Promise.all(unpaid.map(v => {
              const payParams: ViolationPayParams = {
                violationId: v.id,
                payAmount: v.fine,
                payMethod: selectedMethod
              };
              return userService.payViolation(payParams);
            }));
            setViolations(prev => prev.map(v =>
              v.status === 'unpaid' ? { ...v, status: 'paid' as const } : v
            ));
            Taro.showToast({ title: '代缴成功', icon: 'success' });
          } catch (error) {
            console.error('[Violation] 批量代缴失败:', error);
          }
        }
      }
    });
  };

  const handleVehicleChange = () => {
    if (!userInfo) return;
    Taro.showActionSheet({
      itemList: userInfo.vehicles.map(v => `${v.plateNumber} ${v.brand} ${v.model}`),
      success: (res) => {
        setSelectedVehicleId(userInfo.vehicles[res.tapIndex].id);
      }
    });
  };

  const unpaidCount = violations.filter(v => v.status === 'unpaid').length;
  const totalFine = violations.filter(v => v.status === 'unpaid').reduce((sum, v) => sum + v.fine, 0);
  const totalPoints = violations.filter(v => v.status === 'unpaid').reduce((sum, v) => sum + v.points, 0);

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
      <View className={styles.vehicleSelector} onClick={handleVehicleChange}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, color: '#86909C' }}>当前查询车辆</Text>
            <Text style={{ fontSize: 34, fontWeight: 600, color: '#1E88E5', marginTop: 4 }}>
              {userInfo.vehicles.find(v => v.id === selectedVehicleId)?.plateNumber || '全部车辆'}
            </Text>
          </View>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View
              style={{
                padding: '8px 16px',
                backgroundColor: refreshing ? '#E3F2FD' : '#1E88E5',
                borderRadius: 8,
                marginRight: 16
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
            >
              <Text style={{ color: refreshing ? '#1E88E5' : '#fff', fontSize: 24 }}>
                {refreshing ? '刷新中...' : '🔄 刷新'}
              </Text>
            </View>
            <Text style={{ color: '#86909C', fontSize: 28 }}>切换车辆 ›</Text>
          </View>
        </View>
      </View>

      <View className={styles.summaryCard}>
        <View className={styles.summaryRow}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{unpaidCount}</Text>
            <Text className={styles.summaryLabel}>待处理</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>¥{totalFine}</Text>
            <Text className={styles.summaryLabel}>待缴罚款</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{totalPoints}</Text>
            <Text className={styles.summaryLabel}>待扣分数</Text>
          </View>
        </View>
      </View>

      <ScrollView className={styles.violationList} scrollY>
        {violations.length > 0 ? (
          violations.map(item => (
            <View
              key={item.id}
              className={classnames(styles.violationCard, styles[item.status])}
            >
              <View className={styles.violationTop}>
                <Text className={styles.violationReason}>{item.reason}</Text>
                <View className={classnames(styles.statusTag, styles[item.status])}>
                  {item.status === 'unpaid' ? '待缴款' : item.status === 'paid' ? '已缴款' : '处理中'}
                </View>
              </View>
              <Text className={styles.violationInfo}>📍 {item.location}</Text>
              <Text className={styles.violationInfo}>🕐 {item.time}</Text>
              <Text className={styles.violationInfo}>🚗 {item.plateNumber}</Text>
              <View className={styles.violationBottom}>
                <Text className={styles.violationTime}>罚款 ¥{item.fine} · 扣{item.points}分</Text>
                {item.status === 'unpaid' && (
                  <View className={styles.payBtn} onClick={() => handlePay(item)}>
                    立即代缴
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text>暂无违章记录，保持良好驾驶习惯！</Text>
          </View>
        )}
      </ScrollView>

      {unpaidCount > 0 && (
        <View className={styles.footer}>
          <View className={styles.payAllBtn} onClick={handlePayAll}>
            一键代缴全部（¥{totalFine}）
          </View>
        </View>
      )}
    </View>
  );
};

export default ViolationPage;
