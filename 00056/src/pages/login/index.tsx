import React, { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { userService } from '@/services/userService';
import { useUserStore } from '@/store/useUserStore';

const LoginPage: React.FC = () => {
  const { login } = useUserStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    await userService.sendSmsCode(phone);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (!phone || !code) {
      Taro.showToast({ title: '请输入手机号和验证码', icon: 'none' });
      return;
    }
    try {
      const { token, refreshToken, user, member } = await userService.loginBySms(phone, code);
      console.log('[Login] 登录响应:', { token, refreshToken, user, member });
      login(token, refreshToken, user, member);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1000);
    } catch (error) {
      console.error('[Login] 登录失败:', error);
    }
  };

  return (
    <View className={styles.page}>
      <Text className={styles.icon}>🚗</Text>
      <Text className={styles.title}>欢迎来到车护达</Text>
      <Text className={styles.desc}>专业的汽车养护与救援平台{'\n'}为您的爱车保驾护航</Text>

      <View className={styles.form}>
        <View className={styles.inputItem}>
          <Input
            className={styles.input}
            type="number"
            maxlength={11}
            placeholder="请输入手机号"
            value={phone}
            onInput={(e) => setPhone(e.detail.value)}
          />
        </View>

        <View className={styles.inputItem} style={{ display: 'flex', gap: 16 }}>
          <Input
            className={styles.input}
            style={{ flex: 1 }}
            type="number"
            maxlength={6}
            placeholder="请输入验证码"
            value={code}
            onInput={(e) => setCode(e.detail.value)}
          />
          <View
            className="btn-outline"
            style={{ width: 200, height: 96 }}
            onClick={handleSendCode}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </View>
        </View>

        <View className={styles.button} onClick={handleLogin}>
          登录 / 注册
        </View>
      </View>
    </View>
  );
};

export default LoginPage;
