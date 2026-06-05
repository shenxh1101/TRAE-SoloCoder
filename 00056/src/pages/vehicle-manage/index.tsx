import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '@/store/useUserStore';
import { userService } from '@/services/userService';
import VehicleCard from '@/components/VehicleCard';
import { Vehicle } from '@/types/user';

const VehicleManagePage: React.FC = () => {
  const { currentVehicle, setCurrentVehicle, removeVehicle, addVehicle, setUserInfo } = useUserStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[VehicleManage] 开始加载车辆列表');
      const vehicleList = await userService.getVehicleList();
      console.log('[VehicleManage] 车辆列表加载成功:', vehicleList);
      setVehicles(vehicleList);

      const defaultVehicle = vehicleList.find(v => v.isDefault);
      if (defaultVehicle) {
        setCurrentVehicle(defaultVehicle);
      }
    } catch (error) {
      console.error('[VehicleManage] 加载车辆列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [setCurrentVehicle]);

  const loadUserInfo = useCallback(async () => {
    try {
      console.log('[VehicleManage] 加载用户信息');
      const userInfo = await userService.getUserInfo();
      console.log('[VehicleManage] 用户信息加载成功:', userInfo);
      setUserInfo(userInfo);
    } catch (error) {
      console.error('[VehicleManage] 加载用户信息失败:', error);
    }
  }, [setUserInfo]);

  useEffect(() => {
    loadUserInfo();
    loadVehicles();
  }, [loadUserInfo, loadVehicles]);

  useDidShow(() => {
    loadVehicles();
  });

  const handleSetDefault = async (vehicle: Vehicle) => {
    try {
      console.log('[VehicleManage] 设置默认车辆:', vehicle.id);
      await userService.setDefaultVehicle(vehicle.id);
      console.log('[VehicleManage] 设置默认车辆成功');

      setVehicles(prev => prev.map(v => ({
        ...v,
        isDefault: v.id === vehicle.id
      })));

      const updatedVehicle = { ...vehicle, isDefault: true };
      removeVehicle(vehicle.id);
      addVehicle(updatedVehicle);
      setCurrentVehicle(updatedVehicle);

      Taro.showToast({ title: '设置成功', icon: 'success' });
    } catch (error) {
      console.error('[VehicleManage] 设置默认车辆失败:', error);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除车辆 ${vehicle.plateNumber} 吗？`,
      confirmColor: '#F44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            console.log('[VehicleManage] 删除车辆:', vehicle.id);
            await userService.deleteVehicle(vehicle.id);
            console.log('[VehicleManage] 删除车辆成功');
            removeVehicle(vehicle.id);
            setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
            Taro.showToast({ title: '删除成功', icon: 'success' });
          } catch (error) {
            console.error('[VehicleManage] 删除车辆失败:', error);
          }
        }
      }
    });
  };

  const handleAddVehicle = () => {
    Taro.navigateTo({ url: '/pages/vehicle-bind/index' });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      {loading ? (
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      ) : vehicles.length > 0 ? (
        vehicles.map(vehicle => (
          <View key={vehicle.id} style={{ marginBottom: 24, position: 'relative' }}>
            <VehicleCard
              vehicle={vehicle}
              onClick={() => Taro.showActionSheet({
                itemList: ['设为默认车辆', '删除车辆'],
                success: (res) => {
                  if (res.tapIndex === 0) handleSetDefault(vehicle);
                  if (res.tapIndex === 1) handleDelete(vehicle);
                }
              })}
            />
            {vehicle.isDefault && (
              <View style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: '4rpx 16rpx',
                background: 'rgba(30, 136, 229, 0.1)',
                color: '#1E88E5',
                borderRadius: 8,
                fontSize: 22,
                fontWeight: 500
              }}>
                默认
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🚗</Text>
          <Text style={{ color: '#86909C', fontSize: 28 }}>暂无绑定车辆</Text>
        </View>
      )}

      <View className={styles.addBtn} onClick={handleAddVehicle}>
        + 添加车辆
      </View>
    </ScrollView>
  );
};

export default VehicleManagePage;
