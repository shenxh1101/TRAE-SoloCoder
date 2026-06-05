import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow, useUnload } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { serviceService, WorkOrderPayParams } from '@/services/serviceService';
import { wsService } from '@/services/wsService';
import { useUserStore } from '@/store/useUserStore';
import { WorkOrder } from '@/types/service';

const WorkOrderPage: React.FC = () => {
  const router = useRouter();
  const { updateMemberInfo } = useUserStore();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const workOrderId = router.params.id as string;

  const setupWebSocket = useCallback(() => {
    if (!workOrderId) return;

    console.log('[WorkOrder] 建立WebSocket连接，订阅工单进度:', workOrderId);
    wsService.connect();

    const unsubscribe = wsService.subscribe(`workorder:${workOrderId}:progress`, (message) => {
      console.log('[WorkOrder] 收到工单进度更新:', message);
      const progressData = message.data;
      if (progressData) {
        setWorkOrder(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            progress: progressData.progress || prev.progress,
            progressSteps: progressData.progressSteps || prev.progressSteps,
            status: progressData.status || prev.status
          };
        });
      }
    });

    unsubscribeRef.current = unsubscribe;
  }, [workOrderId]);

  const loadData = useCallback(async () => {
    if (!workOrderId) {
      console.error('[WorkOrder] 缺少工单ID');
      Taro.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      console.log('[WorkOrder] 加载工单详情:', workOrderId);
      const data = await serviceService.getWorkOrder(workOrderId);
      console.log('[WorkOrder] 获取工单详情成功:', data);
      setWorkOrder(data);
      setupWebSocket();
    } catch (error) {
      console.error('[WorkOrder] 加载工单详情失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [workOrderId, setupWebSocket]);

  useEffect(() => {
    loadData();

    return () => {
      if (unsubscribeRef.current) {
        console.log('[WorkOrder] 取消WebSocket订阅');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [loadData]);

  useDidShow(() => {
    loadData();
  });

  useUnload(() => {
    if (unsubscribeRef.current) {
      console.log('[WorkOrder] 页面卸载，取消WebSocket订阅');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  });

  const handleConfirm = async () => {
    if (!workOrder) return;
    Taro.showModal({
      title: '确认报价',
      content: `确认工单报价 ¥${workOrder.totalPrice}？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            console.log('[WorkOrder] 确认工单:', workOrder.id);
            const result = await serviceService.confirmWorkOrder(workOrder.id);
            console.log('[WorkOrder] 确认成功:', result);
            setWorkOrder(result);
            Taro.showToast({ title: '已确认', icon: 'success' });
          } catch (error) {
            console.error('[WorkOrder] 确认失败:', error);
            Taro.showToast({ title: '确认失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handlePay = async () => {
    if (!workOrder) return;
    Taro.showModal({
      title: '确认支付',
      content: `确认支付 ¥${workOrder.totalPrice}？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const payParams: WorkOrderPayParams = {
              workOrderId: workOrder.id,
              amount: workOrder.totalPrice,
              payMethod: 'wechat'
            };
            console.log('[WorkOrder] 支付工单:', payParams);
            const result = await serviceService.payWorkOrder(payParams);
            console.log('[WorkOrder] 支付成功:', result);
            updateMemberInfo(workOrder.totalPrice, false);
            setWorkOrder(prev => prev ? { ...prev, paymentStatus: 'paid', status: 'in_progress' } : null);
            Taro.showToast({ title: '支付成功', icon: 'success' });
          } catch (error) {
            console.error('[WorkOrder] 支付失败:', error);
            Taro.showToast({ title: '支付失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleCall = () => {
    if (workOrder?.technician) {
      Taro.makePhoneCall({ phoneNumber: '13800138000' });
    }
  };

  if (loading || !workOrder) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  const statusText = serviceService.getStatusText(workOrder.status);

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        <View className={styles.header}>
          <Text className={styles.orderNo}>工单号：{workOrder.orderNo}</Text>
          <Text className={styles.status}>{statusText}</Text>
          <Text className={styles.statusDesc}>
            {workOrder.status === 'pending' ? '请确认报价后开始服务' :
             workOrder.status === 'confirmed' ? '已确认报价，请前往门店服务' :
             workOrder.status === 'in_progress' ? '服务进行中，请耐心等待' :
             workOrder.status === 'completed' ? '服务已完成，感谢您的使用' : '工单已取消'}
          </Text>
        </View>

        <View className={styles.progressSection}>
          <View className={styles.progressCard}>
            <View className={styles.progressSteps}>
              {workOrder.progressSteps.map((step, index) => (
                <View
                  key={index}
                  className={classnames(
                    styles.step,
                    { [styles.completed]: step.status === 'completed', [styles.current]: step.status === 'current' }
                  )}
                >
                  <View className={styles.stepDot}>
                    {step.status === 'completed' ? '✓' : index + 1}
                  </View>
                  <Text className={styles.stepName}>{step.name}</Text>
                  {step.time && <Text className={styles.stepTime}>{step.time}</Text>}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务技师</Text>
          <View className={styles.card}>
            <View className={styles.technicianCard}>
              <View className={styles.technicianAvatar}>👨‍🔧</View>
              <View className={styles.technicianInfo}>
                <Text className={styles.technicianName}>{workOrder.technician}</Text>
                <Text className={styles.technicianTitle}>高级技师 · 从业8年</Text>
              </View>
              <View className={styles.callBtn} onClick={handleCall}>
                📞 联系
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>工单内容</Text>
          <View className={styles.card}>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>服务类型</Text>
              <Text className={styles.infoValue}>汽车保养</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>创建时间</Text>
              <Text className={styles.infoValue}>{workOrder.createTime}</Text>
            </View>

            <View className={styles.itemsList}>
              {workOrder.items.map(item => (
                <View key={item.id} className={styles.itemRow}>
                  <Text className={styles.itemName}>{item.name}</Text>
                  <Text className={styles.itemQty}>×{item.quantity}{item.unit}</Text>
                  <Text className={styles.itemPrice}>¥{item.price * item.quantity}</Text>
                </View>
              ))}

              <View className={styles.totalRow}>
                <Text className={styles.totalLabel}>合计</Text>
                <Text className={styles.totalValue}>¥{workOrder.totalPrice}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {workOrder.status === 'pending' && (
        <View className={styles.footer}>
          <View className={[styles.footerBtn, styles.outline]}>
            联系客服
          </View>
          <View className={[styles.footerBtn, styles.confirm]} onClick={handleConfirm}>
            确认报价
          </View>
        </View>
      )}

      {workOrder.status === 'confirmed' && workOrder.paymentStatus === 'unpaid' && (
        <View className={styles.footer}>
          <View className={[styles.footerBtn, styles.outline]}>
            服务详情
          </View>
          <View className={[styles.footerBtn, styles.pay]} onClick={handlePay}>
            立即支付 ¥{workOrder.totalPrice}
          </View>
        </View>
      )}

      {workOrder.status === 'in_progress' && (
        <View className={styles.footer}>
          <View className={[styles.footerBtn, styles.outline]}>
            查看监控
          </View>
          <View className={[styles.footerBtn, styles.confirm]} onClick={handleCall}>
            联系技师
          </View>
        </View>
      )}

      {workOrder.status === 'completed' && (
        <View className={styles.footer}>
          <View className={[styles.footerBtn, styles.outline]}>
            再次预约
          </View>
          <View className={[styles.footerBtn, styles.confirm]}>
            评价服务
          </View>
        </View>
      )}
    </View>
  );
};

export default WorkOrderPage;
