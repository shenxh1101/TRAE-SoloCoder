import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { wsService } from '@/services/wsService';
import { reminderService } from '@/services/reminderService';
import { getToken } from '@/utils/request';
import { isDev } from '@/config/env';
import './app.scss';

function App(props: any) {
  // 初始化服务
  useEffect(() => {
    isDev && console.log('[App] 应用启动，初始化服务');

    initServices();

    // 监听登录状态变化
    const token = getToken();
    if (token) {
      onUserLoggedIn();
    }

    // 应用卸载时清理
    return () => {
      isDev && console.log('[App] 应用卸载，清理服务');
      wsService.destroy();
      reminderService.destroy();
    };
  }, []);

  // 对应 onShow
  useDidShow(() => {
    isDev && console.log('[App] 应用进入前台');

    // 检查WebSocket连接状态
    const token = getToken();
    if (token && wsService.getStatus() === 'disconnected') {
      isDev && console.log('[App] 重新连接WebSocket');
      wsService.connect();
    }

    // 检查提醒
    reminderService.triggerCheck('insurance');
  });

  // 对应 onHide
  useDidHide(() => {
    isDev && console.log('[App] 应用进入后台');
    // WebSocket在后台保持连接，继续接收推送
  });

  // 初始化服务
  const initServices = () => {
    try {
      // 初始化提醒服务
      reminderService.init();

      // 全局WebSocket状态监听
      wsService.onStatusChange((status) => {
        isDev && console.log('[App] WebSocket状态变化:', status);

        // 根据状态更新UI，例如显示连接状态
        if (status === 'connected') {
          // 连接成功，可以做一些处理
        }
      });

      // 全局消息监听（系统通知）
      wsService.subscribeAll((message) => {
        isDev && console.log('[App] 收到全局消息:', message.type);
      });

      isDev && console.log('[App] 服务初始化完成');
    } catch (error) {
      console.error('[App] 服务初始化失败:', error);
    }
  };

  // 用户登录后调用
  const onUserLoggedIn = () => {
    isDev && console.log('[App] 用户已登录，连接WebSocket');

    // 连接WebSocket
    wsService.connect();

    // 检查提醒
    setTimeout(() => {
      reminderService.triggerCheck('all');
    }, 1000);
  };

  // 全局错误处理
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // 上报错误到后端
      try {
        Taro.request({
          url: '/api/v1/log/error',
          method: 'POST',
          data: {
            message: args[0]?.toString() || 'Unknown error',
            stack: args[1]?.stack || '',
            timestamp: Date.now(),
            platform: process.env.TARO_ENV
          },
          header: {
            Authorization: `Bearer ${getToken()}`
          }
        }).catch(() => {});
      } catch (e) {
        // 忽略上报错误
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return props.children;
}

export default App;
