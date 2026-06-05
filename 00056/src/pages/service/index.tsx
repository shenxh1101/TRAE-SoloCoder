import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { serviceService, PackageQueryParams, StoreQueryParams } from '@/services/serviceService';
import { ServicePackage, Store } from '@/types/service';
import { PaginatedResponse } from '@/services/userService';
import ServicePackageCard from '@/components/ServicePackageCard';
import StoreCard from '@/components/StoreCard';

const categories = [
  { key: 'all', text: '全部' },
  { key: 'car_wash', text: '洗车' },
  { key: 'maintenance', text: '保养' },
  { key: 'repair', text: '维修' }
];

const sortOptions = [
  { key: 'default', text: '智能排序' },
  { key: 'price_asc', text: '价格↑' },
  { key: 'price_desc', text: '价格↓' },
  { key: 'sales', text: '销量优先' }
];

type ViewType = 'packages' | 'stores';

const ServicePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSort, setActiveSort] = useState('default');
  const [viewType, setViewType] = useState<ViewType>('packages');
  const [searchText, setSearchText] = useState('');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPackages = useCallback(async () => {
    console.log('[ServicePage] 加载套餐列表，分类:', activeCategory, '排序:', activeSort);
    setLoading(true);
    try {
      const params: PackageQueryParams = {
        type: activeCategory === 'all' ? undefined : activeCategory,
        page: 1,
        pageSize: 50
      };

      if (activeSort === 'price_asc') {
        params.sortBy = 'price';
        params.sortOrder = 'asc';
      } else if (activeSort === 'price_desc') {
        params.sortBy = 'price';
        params.sortOrder = 'desc';
      } else if (activeSort === 'sales') {
        params.sortBy = 'sales';
        params.sortOrder = 'desc';
      }

      if (searchText) {
        const keyword = searchText.toLowerCase();
        const response = await serviceService.getPackageList(params);
        console.log('[ServicePage] 获取套餐列表成功:', response);
        let data = response.list.filter(p =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword)
        );
        setPackages(data);
      } else {
        const response = await serviceService.getPackageList(params);
        console.log('[ServicePage] 获取套餐列表成功:', response);
        setPackages(response.list);
      }
    } catch (error) {
      console.error('[ServicePage] 加载套餐失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  }, [activeCategory, activeSort, searchText]);

  const loadStores = useCallback(async () => {
    console.log('[ServicePage] 加载门店列表，分类:', activeCategory);
    setLoading(true);
    try {
      const params: StoreQueryParams = {
        serviceType: activeCategory === 'all' ? undefined : activeCategory,
        sortBy: 'distance',
        page: 1,
        pageSize: 50
      };
      const data = await serviceService.getStores(params);
      console.log('[ServicePage] 获取门店列表成功:', data);

      if (searchText) {
        const keyword = searchText.toLowerCase();
        setStores(data.filter(s =>
          s.name.toLowerCase().includes(keyword) ||
          s.address.toLowerCase().includes(keyword)
        ));
      } else {
        setStores(data);
      }
    } catch (error) {
      console.error('[ServicePage] 加载门店失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchText]);

  useEffect(() => {
    if (viewType === 'packages') {
      loadPackages();
    } else {
      loadStores();
    }
  }, [viewType, activeCategory, activeSort, searchText, loadPackages, loadStores]);

  usePullDownRefresh(() => {
    if (viewType === 'packages') {
      loadPackages();
    } else {
      loadStores();
    }
  });

  useDidShow(() => {
    if (viewType === 'packages') {
      loadPackages();
    } else {
      loadStores();
    }
  });

  const handlePackageClick = (pkg: ServicePackage) => {
    console.log('[ServicePage] 点击套餐:', pkg.id);
    Taro.navigateTo({ url: `/pages/package-detail/index?id=${pkg.id}` });
  };

  const handleStoreClick = (store: Store) => {
    console.log('[ServicePage] 点击门店:', store.id);
    Taro.navigateTo({ url: `/pages/store-list/index?id=${store.id}` });
  };

  const handleBooking = () => {
    Taro.navigateTo({ url: '/pages/booking/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <View className={styles.searchBox}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索服务、套餐..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      <ScrollView className={styles.categoryTabs} scrollX>
        {categories.map(cat => (
          <View
            key={cat.key}
            className={classnames(styles.tabItem, { [styles.active]: activeCategory === cat.key })}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.text}
          </View>
        ))}
      </ScrollView>

      <View className={styles.filterBar}>
        {sortOptions.map(opt => (
          <View
            key={opt.key}
            className={classnames(styles.filterItem, { [styles.active]: activeSort === opt.key })}
            onClick={() => setActiveSort(opt.key)}
          >
            {opt.text}
          </View>
        ))}
      </View>

      <View className={styles.viewSwitch}>
        <View
          className={classnames(styles.switchBtn, { [styles.active]: viewType === 'packages' })}
          onClick={() => setViewType('packages')}
        >
          套餐
        </View>
        <View
          className={classnames(styles.switchBtn, { [styles.active]: viewType === 'stores' })}
          onClick={() => setViewType('stores')}
        >
          门店
        </View>
      </View>

      {loading ? (
        <View className={styles.loading}>
          <Text>加载中...</Text>
        </View>
      ) : viewType === 'packages' ? (
        <ScrollView className={styles.packageList} scrollY>
          {packages.length > 0 ? (
            packages.map(pkg => (
              <View key={pkg.id} style={{ marginBottom: 24 }}>
                <ServicePackageCard
                  pkg={pkg}
                  onClick={() => handlePackageClick(pkg)}
                />
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text>暂无相关套餐</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView className={styles.storeList} scrollY>
          {stores.length > 0 ? (
            stores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                onClick={() => handleStoreClick(store)}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text>暂无相关门店</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default ServicePage;
