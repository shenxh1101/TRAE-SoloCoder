import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { rescueService, DashboardQueryParams } from '@/services/rescueService';
import { AdminDashboardData } from '@/types/rescue';
import dayjs from 'dayjs';

const cities = ['全部城市', '北京市', '上海市', '广州市', '深圳市'];
const timeRanges = ['今日', '本周', '本月', '全年'];

const AdminDashboardPage: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState('全部城市');
  const [selectedTime, setSelectedTime] = useState('今日');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [storeRanking, setStoreRanking] = useState<any[]>([]);
  const [completionRateTrend, setCompletionRateTrend] = useState<any[]>([]);
  const [responseTimeDistribution, setResponseTimeDistribution] = useState<any[]>([]);

  const getDateRange = useCallback((timeRange: string): { startDate: string; endDate: string } => {
    const now = dayjs();
    switch (timeRange) {
      case '今日':
        return {
          startDate: now.format('YYYY-MM-DD'),
          endDate: now.format('YYYY-MM-DD')
        };
      case '本周':
        return {
          startDate: now.startOf('week').format('YYYY-MM-DD'),
          endDate: now.endOf('week').format('YYYY-MM-DD')
        };
      case '本月':
        return {
          startDate: now.startOf('month').format('YYYY-MM-DD'),
          endDate: now.endOf('month').format('YYYY-MM-DD')
        };
      case '全年':
        return {
          startDate: now.startOf('year').format('YYYY-MM-DD'),
          endDate: now.endOf('year').format('YYYY-MM-DD')
        };
      default:
        return {
          startDate: now.format('YYYY-MM-DD'),
          endDate: now.format('YYYY-MM-DD')
        };
    }
  }, []);

  const buildQueryParams = useCallback((): DashboardQueryParams => {
    const { startDate, endDate } = getDateRange(selectedTime);
    return {
      city: selectedCity === '全部城市' ? undefined : selectedCity,
      startDate,
      endDate
    };
  }, [selectedCity, selectedTime, getDateRange]);

  const loadData = useCallback(async () => {
    console.log('[AdminDashboard] 加载看板数据，城市:', selectedCity, '时间:', selectedTime);
    setLoading(true);
    try {
      const params = buildQueryParams();
      console.log('[AdminDashboard] 查询参数:', params);

      const [dashboard, realtime, ranking, trend, distribution] = await Promise.all([
        rescueService.getDashboardData(params),
        rescueService.getRealtimeStats({ city: params.city }),
        rescueService.getStoreRanking(params),
        rescueService.getCompletionRateTrend(params),
        rescueService.getResponseTimeDistribution(params)
      ]);

      console.log('[AdminDashboard] 看板数据:', dashboard);
      console.log('[AdminDashboard] 实时统计:', realtime);
      console.log('[AdminDashboard] 门店排名:', ranking);
      console.log('[AdminDashboard] 完成率趋势:', trend);
      console.log('[AdminDashboard] 响应时长分布:', distribution);

      setDashboardData(dashboard);
      setRealtimeStats(realtime);
      setStoreRanking(ranking);
      setCompletionRateTrend(trend);
      setResponseTimeDistribution(distribution);
    } catch (error) {
      console.error('[AdminDashboard] 加载数据失败:', error);
      Taro.showToast({ title: '数据加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [selectedCity, selectedTime, buildQueryParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePullDownRefresh(() => {
    loadData();
  });

  useDidShow(() => {
    loadData();
  });

  const getRateClass = (rate: number) => {
    if (rate >= 97) return 'high';
    if (rate >= 95) return 'medium';
    return 'low';
  };

  const handleCitySelect = () => {
    Taro.showActionSheet({
      itemList: cities,
      success: (res) => {
        setSelectedCity(cities[res.tapIndex]);
      }
    });
  };

  const handleTimeSelect = () => {
    Taro.showActionSheet({
      itemList: timeRanges,
      success: (res) => {
        setSelectedTime(timeRanges[res.tapIndex]);
      }
    });
  };

  if (!dashboardData) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.filterBar}>
        <View
          className={classnames(styles.filterItem, styles.active)}
          onClick={handleCitySelect}
        >
          📍 {selectedCity}
        </View>
        <View
          className={classnames(styles.filterItem, styles.active)}
          onClick={handleTimeSelect}
        >
          📅 {selectedTime}
        </View>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.orders]}>📋</View>
          <Text className={styles.statValue}>{dashboardData.totalOrders.toLocaleString()}</Text>
          <Text className={styles.statLabel}>总订单量</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 12.5%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.orders]}>📊</View>
          <Text className={styles.statValue}>{dashboardData.todayOrders}</Text>
          <Text className={styles.statLabel}>今日订单</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 8.3%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.rescues]}>🚨</View>
          <Text className={styles.statValue}>{dashboardData.totalRescues.toLocaleString()}</Text>
          <Text className={styles.statLabel}>总救援次数</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 5.2%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.rescues]}>🔥</View>
          <Text className={styles.statValue}>{dashboardData.todayRescues}</Text>
          <Text className={styles.statLabel}>今日救援</Text>
          <Text className={[styles.statTrend, styles.down]}>↓ 2.1%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.time]}>⏱️</View>
          <Text className={styles.statValue}>{dashboardData.avgResponseTime}分钟</Text>
          <Text className={styles.statLabel}>平均响应时长</Text>
          <Text className={[styles.statTrend, styles.up]}>优</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.rate]}>✅</View>
          <Text className={styles.statValue}>{dashboardData.orderCompletionRate}%</Text>
          <Text className={styles.statLabel}>工单完成率</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 1.2%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.revenue]}>💰</View>
          <Text className={styles.statValue}>¥{(dashboardData.totalRevenue / 10000).toFixed(0)}万</Text>
          <Text className={styles.statLabel}>总营收</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 15.6%</Text>
        </View>

        <View className={styles.statCard}>
          <View className={[styles.statIcon, styles.satisfaction]}>⭐</View>
          <Text className={styles.statValue}>{dashboardData.customerSatisfaction}</Text>
          <Text className={styles.statLabel}>客户满意度</Text>
          <Text className={[styles.statTrend, styles.up]}>↑ 0.2</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>门店排名</Text>
          <Text
            className={styles.moreLink}
            onClick={() => Taro.navigateTo({ url: '/pages/report-export/index' })}
          >
            导出报表
          </Text>
        </View>

        <View className={styles.tableCard}>
          <View className={styles.tableHeader}>
            <Text className={[styles.cell, styles.store]}>门店</Text>
            <Text className={[styles.cell, styles.orders]}>订单</Text>
            <Text className={[styles.cell, styles.rescues]}>救援</Text>
            <Text className={[styles.cell, styles.time]}>响应</Text>
            <Text className={[styles.cell, styles.rate]}>完成率</Text>
          </View>

          {dashboardData.storeStats.map((store, index) => (
            <View key={store.storeId} className={styles.tableRow}>
              <Text className={[styles.cell, styles.store]}>
                {index + 1}. {store.storeName}
              </Text>
              <Text className={[styles.cell, styles.orders]}>{store.orderCount}</Text>
              <Text className={[styles.cell, styles.rescues]}>{store.rescueCount}</Text>
              <Text className={[styles.cell, styles.time]}>{store.avgResponseTime}m</Text>
              <Text className={[styles.cell, styles.rate, styles[getRateClass(store.completionRate)]]}>
                {store.completionRate}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>近30天趋势</Text>
        </View>
        <View className={styles.chartPlaceholder}>
          <View className={styles.chartContent}>
            <Text className={styles.chartIcon}>📈</Text>
            <Text>订单与救援趋势图</Text>
            <Text style={{ fontSize: 20, marginTop: 8 }}>
              近30天：订单{dashboardData.timeStats.reduce((s, d) => s + d.orderCount, 0)} · 救援{dashboardData.timeStats.reduce((s, d) => s + d.rescueCount, 0)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminDashboardPage;
