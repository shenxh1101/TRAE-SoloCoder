import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '@/store/useUserStore';
import { userService } from '@/services/userService';
import { serviceService } from '@/services/serviceService';
import { reminderService, ReminderRecord } from '@/services/reminderService';
import MemberCard from '@/components/MemberCard';

const orderShortcuts = [
  { key: 'pending', icon: '⏳', text: '待确认', status: 'pending' },
  { key: 'in_progress', icon: '🔧', text: '服务中', status: 'in_progress' },
  { key: 'completed', icon: '✅', text: '已完成', status: 'completed' },
  { key: 'all', icon: '📋', text: '全部', status: '' }
];

const MinePage: React.FC = () => {
  const { userInfo, isLoggedIn, currentVehicle, setUserInfo, setLoggedIn, logout } = useUserStore();
  const [violationCount, setViolationCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminderRecords, setReminderRecords] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    console.log('[MinePage] 加载个人中心数据');
    setLoading(true);
    try {
      if (!isLoggedIn) {
        console.log('[MinePage] 未登录');
        setLoading(false);
        return;
      }

      console.log('[MinePage] 调用真实API获取数据');

      const [userData, memberData, violations, insurances, orders] = await Promise.all([
        userService.getUserInfo(),
        userService.getMemberInfo(),
        userService.getViolations(),
        userService.getInsuranceList(),
        serviceService.getOrderRecords()
      ]);

      console.log('[MinePage] 用户信息:', userData);
      console.log('[MinePage] 会员信息:', memberData);
      console.log('[MinePage] 违章记录:', violations);
      console.log('[MinePage] 保险信息:', insurances);
      console.log('[MinePage] 订单记录:', orders);

      const fullUserInfo = {
        ...userData,
        memberInfo: memberData
      };
      setUserInfo(fullUserInfo);
      setLoggedIn(true);

      setViolationCount(violations.filter(v => v.status === 'unpaid').length);
      setExpiringCount(insurances.filter(i => i.status === 'expiring' || i.status === 'expired').length);
      setPendingCount(orders.filter(o => o.status === 'pending').length);
      setInProgressCount(orders.filter(o => o.status === 'in_progress').length);

      const unread = reminderService.getUnreadCount();
      const records = reminderService.getReminderRecords();
      console.log('[MinePage] 未读消息数:', unread);
      console.log('[MinePage] 提醒记录:', records);
      setUnreadCount(unread);
      setReminderRecords(records);
    } catch (error) {
      console.error('[MinePage] 加载数据失败:', error);
      Taro.showToast({ title: '数据加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoggedIn]);

  useDidShow(() => {
    if (isLoggedIn) {
      loadData();
      const unread = reminderService.getUnreadCount();
      const records = reminderService.getReminderRecords();
      setUnreadCount(unread);
      setReminderRecords(records);
    }
  });

  const handleNavigate = (url: string) => {
    console.log('[MinePage] 跳转:', url);
    Taro.navigateTo({ url });
  };

  const handleOrderClick = (status?: string) => {
    const params = status ? `?status=${status}` : '';
    Taro.navigateTo({ url: `/pages/order-list/index${params}` });
  };

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  };

  if (!isLoggedIn || !userInfo) {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <View className={styles.userInfo} onClick={handleLogin}>
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 60,
                color: '#fff'
              }}
            >
              👤
            </View>
            <View className={styles.userDetail}>
              <Text className={styles.nickname}>点击登录</Text>
              <Text className={styles.phone}>登录后享受更多服务</Text>
            </View>
          </View>
        </View>

        <View className={styles.emptyState}>
          <Text>请先登录以查看个人信息</Text>
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
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <Image
            className={styles.avatar}
            src={userInfo.avatar}
            mode="aspectFill"
            onError={(e) => console.error('[MinePage] 头像加载失败:', e)}
          />
          <View className={styles.userDetail}>
            <Text className={styles.nickname}>{userInfo.nickname}</Text>
            <Text className={styles.phone}>{userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</Text>
            <View className={styles.memberBadge}>
              {userInfo.memberInfo.levelName}
            </View>
          </View>
          <View style={{ position: 'relative' }}>
            <Text className={styles.settingIcon}>⚙️</Text>
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#F44336',
                color: '#fff',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 5
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </View>
            )}
          </View>
        </View>
      </View>

      <View className={styles.memberSection}>
        <MemberCard
          memberInfo={userInfo.memberInfo}
          onClick={() => handleNavigate('/pages/member-center/index')}
        />
      </View>

      <View className={styles.menuSection}>
        <View className={styles.menuTitle}>我的订单</View>
        <View className={styles.orderShortcuts}>
          {orderShortcuts.map(item => (
            <View
              key={item.key}
              className={styles.orderShortcutItem}
              onClick={() => handleOrderClick(item.status)}
            >
              <View className={styles.orderShortcutIcon}>
                {item.icon}
                {((item.key === 'pending' && pendingCount > 0) ||
                  (item.key === 'in_progress' && inProgressCount > 0)) && (
                  <View className={styles.shortcutBadge}>
                    {item.key === 'pending' ? pendingCount : inProgressCount}
                  </View>
                )}
              </View>
              <Text className={styles.orderShortcutText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/message-center/index')}
        >
          <View className={[styles.menuIcon, styles.violation]}>
            <Text>🔔</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>消息通知</Text>
            <Text className={styles.menuDesc}>
              {reminderRecords.length > 0
                ? `最新：${reminderRecords[0]?.title || '暂无新消息'}`
                : '暂无新消息'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View className={styles.menuBadge}>{unreadCount}</View>
          )}
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>

        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/vehicle-manage/index')}
        >
          <View className={[styles.menuIcon, styles.vehicle]}>
            <Text>🚗</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>我的车辆</Text>
            <Text className={styles.menuDesc}>已绑定 {userInfo.vehicles.length} 辆车</Text>
          </View>
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>

        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/violation/index')}
        >
          <View className={[styles.menuIcon, styles.violation]}>
            <Text>📝</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>违章查询</Text>
            <Text className={styles.menuDesc}>查询违章记录并代缴</Text>
          </View>
          {violationCount > 0 && (
            <View className={styles.menuBadge}>{violationCount}</View>
          )}
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>

        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/insurance/index')}
        >
          <View className={[styles.menuIcon, styles.insurance]}>
            <Text>🛡️</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>保险提醒</Text>
            <Text className={styles.menuDesc}>查看保单和续保提醒</Text>
          </View>
          {expiringCount > 0 && (
            <View className={styles.menuBadge}>{expiringCount}</View>
          )}
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>
      </View>

      <View className={styles.menuSection}>
        <View className={styles.menuTitle}>管理员功能</View>
        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/admin-dashboard/index')}
        >
          <View className={[styles.menuIcon, styles.dashboard]}>
            <Text>📊</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>数据看板</Text>
            <Text className={styles.menuDesc}>实时查看门店运营数据</Text>
          </View>
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>

        <View
          className={styles.menuItem}
          onClick={() => handleNavigate('/pages/report-export/index')}
        >
          <View className={[styles.menuIcon, styles.report]}>
            <Text>📈</Text>
          </View>
          <View className={styles.menuContent}>
            <Text className={styles.menuText}>报表导出</Text>
            <Text className={styles.menuDesc}>导出月度运营报表</Text>
          </View>
          <Text className={styles.menuArrow}>&gt;</Text>
        </View>
      </View>

      <View className={styles.logoutSection}>
        <View className={styles.logoutBtn} onClick={handleLogout}>
          退出登录
        </View>
      </View>

      <Text className={styles.version}>车护达 v1.0.0</Text>
    </ScrollView>
  );
};

export default MinePage;
