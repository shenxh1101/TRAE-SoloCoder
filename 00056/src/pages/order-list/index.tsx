import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { serviceService } from '@/services/serviceService';
import { PaginatedResponse } from '@/services/userService';
import { OrderRecord, ServiceStatus } from '@/types/service';
import OrderCard from '@/components/OrderCard';

const tabs = [
  { key: '', text: '全部' },
  { key: 'pending', text: '待确认' },
  { key: 'in_progress', text: '服务中' },
  { key: 'completed', text: '已完成' }
];

const OrderListPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(router.params.status || '');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const loadOrders = useCallback(async (isRefresh = false) => {
    const currentPage = isRefresh ? 1 : page;
    console.log('[OrderList] 加载订单列表，状态:', activeTab, '页码:', currentPage);

    if (isRefresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await serviceService.getOrderRecords({
        status: activeTab || undefined,
        page: currentPage,
        pageSize: pageSize
      });
      console.log('[OrderList] 获取订单列表成功:', response);

      if (isRefresh) {
        setOrders(response.list);
        setPage(1);
      } else {
        setOrders(prev => [...prev, ...response.list]);
        setPage(prev => prev + 1);
      }

      setHasMore(response.hasMore);
      setTotal(response.total);
    } catch (error) {
      console.error('[OrderList] 加载订单失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      Taro.stopPullDownRefresh();
    }
  }, [activeTab, page, pageSize]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    setHasMore(true);
    setOrders([]);
  };

  useEffect(() => {
    loadOrders(true);
  }, [activeTab]);

  useDidShow(() => {
    loadOrders(true);
  });

  usePullDownRefresh(() => {
    loadOrders(true);
  });

  useReachBottom(() => {
    if (hasMore && !loading && !loadingMore) {
      loadOrders(false);
    }
  });

  const handleOrderClick = (order: OrderRecord) => {
    console.log('[OrderList] 点击订单:', order.id);
    Taro.navigateTo({ url: `/pages/work-order/index?id=${order.id}` });
  };

  return (
    <View className={styles.page}>
      <ScrollView className={styles.tabs} scrollX>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, { [styles.active]: activeTab === tab.key })}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.text}
          </View>
        ))}
      </ScrollView>

      <ScrollView className={styles.list} scrollY>
        {loading ? (
          <View style={{ textAlign: 'center', padding: 100 }}>
            <Text style={{ color: '#86909C' }}>加载中...</Text>
          </View>
        ) : orders.length > 0 ? (
          <>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => handleOrderClick(order)}
              />
            ))}
            {loadingMore && (
              <View style={{ textAlign: 'center', padding: 20 }}>
                <Text style={{ color: '#86909C', fontSize: 24 }}>加载中...</Text>
              </View>
            )}
            {!hasMore && orders.length > 0 && (
              <View style={{ textAlign: 'center', padding: 20 }}>
                <Text style={{ color: '#86909C', fontSize: 24 }}>共 {total} 条记录，没有更多了</Text>
              </View>
            )}
          </>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text>暂无订单记录</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default OrderListPage;
