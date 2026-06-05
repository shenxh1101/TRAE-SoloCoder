import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useRouter, useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { serviceService, StoreQueryParams } from '@/services/serviceService';
import { Store } from '@/types/service';
import StoreCard from '@/components/StoreCard';

const sortOptions = [
  { key: 'distance', text: '距离最近' },
  { key: 'rating', text: '评分最高' },
  { key: 'sales', text: '销量优先' }
];

const StoreListPage: React.FC = () => {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [activeSort, setActiveSort] = useState('distance');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<string>('');

  useEffect(() => {
    const type = router.params.type as string;
    if (type) {
      setServiceType(type);
    }
  }, [router.params.type]);

  const loadStores = useCallback(async () => {
    console.log('[StoreList] 加载门店列表，类型:', serviceType, '排序:', activeSort);
    setLoading(true);
    try {
      const params: StoreQueryParams = {
        serviceType: serviceType || undefined,
        sortBy: activeSort as 'distance' | 'rating' | 'sales',
        page: 1,
        pageSize: 50
      };

      let data = await serviceService.getStores(params);
      console.log('[StoreList] 获取门店列表成功:', data);

      if (searchText) {
        const keyword = searchText.toLowerCase();
        data = data.filter(s =>
          s.name.toLowerCase().includes(keyword) ||
          s.address.toLowerCase().includes(keyword)
        );
      }

      setStores(data);
    } catch (error) {
      console.error('[StoreList] 加载门店失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [serviceType, activeSort, searchText]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  usePullDownRefresh(() => {
    loadStores();
  });

  useDidShow(() => {
    loadStores();
  });

  const handleStoreClick = (store: Store) => {
    console.log('[StoreList] 点击门店:', store.id);
    Taro.showModal({
      title: store.name,
      content: `地址：${store.address}\n电话：${store.phone}\n营业时间：${store.businessHours}`,
      confirmText: '导航前往',
      success: (res) => {
        if (res.confirm) {
          Taro.openLocation({
            latitude: 39.9042,
            longitude: 116.4074,
            name: store.name,
            address: store.address
          });
        }
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <View className={styles.searchBox}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索门店名称或地址"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      <ScrollView className={styles.filterBar} scrollX>
        {sortOptions.map(opt => (
          <View
            key={opt.key}
            className={classnames(styles.filterItem, { [styles.active]: activeSort === opt.key })}
            onClick={() => setActiveSort(opt.key)}
          >
            {opt.text}
          </View>
        ))}
      </ScrollView>

      <ScrollView className={styles.list} scrollY>
        {loading ? (
          <View style={{ textAlign: 'center', padding: 100 }}>
            <Text style={{ color: '#86909C' }}>加载中...</Text>
          </View>
        ) : stores.length > 0 ? (
          stores.map(store => (
            <StoreCard
              key={store.id}
              store={store}
              onClick={() => handleStoreClick(store)}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📍</Text>
            <Text>暂无符合条件的门店</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StoreListPage;
