import React, { useState } from 'react';
import { View, Text, Input, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '@/store/useUserStore';
import { userService } from '@/services/userService';
import { Vehicle } from '@/types/user';

const VehicleBindPage: React.FC = () => {
  const { addVehicle } = useUserStore();
  const [form, setForm] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    color: '',
    buyYear: new Date().getFullYear(),
    mileage: 0,
    engineNumber: '',
    frameNumber: '',
    isDefault: true
  });

  const handleChange = (key: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.plateNumber) {
      Taro.showToast({ title: '请输入车牌号', icon: 'none' });
      return;
    }
    if (!form.brand || !form.model) {
      Taro.showToast({ title: '请输入品牌型号', icon: 'none' });
      return;
    }

    try {
      const vehicleData: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        ...form,
        lastMaintenanceDate: new Date().toISOString().slice(0, 10),
        insuranceExpireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      };
      console.log('[VehicleBind] 提交绑定数据:', vehicleData);

      const newVehicle = await userService.bindVehicle(vehicleData);
      console.log('[VehicleBind] 绑定成功:', newVehicle);
      addVehicle(newVehicle);
      Taro.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (error) {
      console.error('[VehicleBind] 绑定失败:', error);
      Taro.showToast({ title: '绑定失败', icon: 'none' });
    }
  };

  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        <View className={styles.formItem}>
          <Text className={styles.label}>车牌号 *</Text>
          <Input
            className={styles.input}
            placeholder="请输入车牌号，如：京A12345"
            value={form.plateNumber}
            onInput={(e) => handleChange('plateNumber', e.detail.value.toUpperCase())}
          />
        </View>

        <View className={styles.row}>
          <View className={[styles.formItem, styles.rowItem]}>
            <Text className={styles.label}>品牌 *</Text>
            <Input
              className={styles.input}
              placeholder="如：宝马"
              value={form.brand}
              onInput={(e) => handleChange('brand', e.detail.value)}
            />
          </View>
          <View className={[styles.formItem, styles.rowItem]}>
            <Text className={styles.label}>型号 *</Text>
            <Input
              className={styles.input}
              placeholder="如：X5"
              value={form.model}
              onInput={(e) => handleChange('model', e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.row}>
          <View className={[styles.formItem, styles.rowItem]}>
            <Text className={styles.label}>颜色</Text>
            <Input
              className={styles.input}
              placeholder="如：矿石白"
              value={form.color}
              onInput={(e) => handleChange('color', e.detail.value)}
            />
          </View>
          <View className={[styles.formItem, styles.rowItem]}>
            <Text className={styles.label}>购车年份</Text>
            <Input
              className={styles.input}
              type="number"
              placeholder="如：2024"
              value={String(form.buyYear)}
              onInput={(e) => handleChange('buyYear', parseInt(e.detail.value) || 0)}
            />
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>当前里程（km）</Text>
          <Input
            className={styles.input}
            type="number"
            placeholder="请输入当前行驶里程"
            value={String(form.mileage)}
            onInput={(e) => handleChange('mileage', parseInt(e.detail.value) || 0)}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>发动机号</Text>
          <Input
            className={styles.input}
            placeholder="请输入发动机号"
            value={form.engineNumber}
            onInput={(e) => handleChange('engineNumber', e.detail.value)}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>车架号</Text>
          <Input
            className={styles.input}
            placeholder="请输入车架号"
            value={form.frameNumber}
            onInput={(e) => handleChange('frameNumber', e.detail.value)}
          />
        </View>

        <View className={styles.switchItem}>
          <Text className={styles.switchLabel}>设为默认车辆</Text>
          <Switch
            checked={form.isDefault}
            onChange={(e) => handleChange('isDefault', e.detail.value)}
            color="#1E88E5"
          />
        </View>
      </View>

      <View className={styles.footerBtn}>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          确认绑定
        </View>
      </View>
    </View>
  );
};

export default VehicleBindPage;
