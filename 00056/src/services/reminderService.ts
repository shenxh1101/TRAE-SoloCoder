import Taro from '@tarojs/taro';
import { userService } from '@/services/userService';
import { wsService } from '@/services/wsService';
import { InsuranceInfo } from '@/types/user';
import { isDev } from '@/config/env';

// 提醒配置
export interface ReminderConfig {
  insuranceExpiryDays: number[]; // 保险到期提醒天数，如 [30, 15, 7, 3, 1]
  maintenanceMileageThreshold: number; // 保养里程提醒阈值，如 500
  violationCheckInterval: number; // 违章检查间隔（小时）
  pushEnabled: boolean;
  smsEnabled: boolean;
}

// 提醒记录
export interface ReminderRecord {
  id: string;
  type: 'insurance' | 'maintenance' | 'violation' | 'service' | 'rescue';
  title: string;
  content: string;
  relatedId?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

// 默认配置
const DEFAULT_CONFIG: ReminderConfig = {
  insuranceExpiryDays: [30, 15, 7, 3, 1],
  maintenanceMileageThreshold: 500,
  violationCheckInterval: 24,
  pushEnabled: true,
  smsEnabled: false
};

class ReminderService {
  private config: ReminderConfig = DEFAULT_CONFIG;
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastCheckTime: Map<string, number> = new Map();
  private isInitialized: boolean = false;
  private reminderRecords: ReminderRecord[] = [];

  constructor() {
    this.loadConfig();
  }

  // 初始化提醒服务
  init(): void {
    if (this.isInitialized) return;

    isDev && console.log('[ReminderService] 初始化提醒服务');

    this.isInitialized = true;

    // 启动定时检查任务
    this.startScheduledChecks();

    // 订阅WebSocket推送
    this.subscribeToPushNotifications();

    // 检查一次保险到期
    this.checkInsuranceExpiry();
  }

  // 销毁服务
  destroy(): void {
    isDev && console.log('[ReminderService] 销毁提醒服务');

    // 清除所有定时器
    this.timers.forEach((timer) => {
      clearInterval(timer);
    });
    this.timers.clear();

    this.isInitialized = false;
  }

  // 加载配置
  private async loadConfig(): Promise<void> {
    try {
      const settings = await userService.getNotificationSettings();
      this.config = {
        ...this.config,
        pushEnabled: settings.pushEnabled,
        smsEnabled: settings.smsEnabled,
        insuranceExpiryDays: settings.insuranceReminder ? [30, 15, 7, 3, 1] : []
      };
      isDev && console.log('[ReminderService] 配置已加载:', this.config);
    } catch (error) {
      console.warn('[ReminderService] 加载配置失败，使用默认配置');
    }
  }

  // 更新配置
  updateConfig(config: Partial<ReminderConfig>): void {
    this.config = { ...this.config, ...config };
    Taro.setStorageSync('reminder_config', this.config);
  }

  // 获取配置
  getConfig(): ReminderConfig {
    return { ...this.config };
  }

  // 启动定时检查
  private startScheduledChecks(): void {
    // 保险到期检查 - 每天8点检查一次
    this.timers.set('insurance', setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8) {
        this.checkInsuranceExpiry();
      }
    }, 60 * 60 * 1000)); // 每小时检查一次时间

    // 违章检查 - 按配置间隔
    const violationInterval = this.config.violationCheckInterval * 60 * 60 * 1000;
    this.timers.set('violation', setInterval(() => {
      this.checkNewViolations();
    }, violationInterval));

    // 保养提醒 - 每次进入首页检查
    this.timers.set('maintenance', setInterval(() => {
      this.checkMaintenanceDue();
    }, 4 * 60 * 60 * 1000)); // 每4小时检查一次

    isDev && console.log('[ReminderService] 定时检查已启动');
  }

  // ============ 保险到期提醒 ============

  // 检查保险到期
  async checkInsuranceExpiry(): Promise<InsuranceInfo[]> {
    isDev && console.log('[ReminderService] 检查保险到期');

    try {
      const insurances = await userService.checkInsuranceReminders();
      const now = new Date();

      const expiringInsurances: InsuranceInfo[] = [];

      for (const insurance of insurances) {
        const daysRemaining = this.getDaysRemaining(insurance.endDate, now);

        // 检查是否在提醒天数内
        if (this.config.insuranceExpiryDays.includes(daysRemaining)) {
          expiringInsurances.push(insurance);
          this.sendInsuranceReminder(insurance, daysRemaining);
        }
      }

      this.lastCheckTime.set('insurance', Date.now());
      return expiringInsurances;

    } catch (error) {
      console.error('[ReminderService] 检查保险到期失败:', error);
      return [];
    }
  }

  // 发送保险到期提醒
  private sendInsuranceReminder(insurance: InsuranceInfo, daysRemaining: number): void {
    const title = '保险即将到期';
    let content = '';

    if (daysRemaining === 0) {
      content = `您的${insurance.insuranceType}保险今天到期，请及时续保！`;
    } else if (daysRemaining <= 3) {
      content = `紧急提醒：您的${insurance.insuranceType}保险还有${daysRemaining}天到期！`;
    } else {
      content = `您的${insurance.insuranceType}保险还有${daysRemaining}天到期，建议及时续保。`;
    }

    // 创建提醒记录
    this.addReminderRecord({
      type: 'insurance',
      title,
      content,
      relatedId: insurance.id,
      actionUrl: '/pages/insurance/index'
    });

    // 发送推送通知
    if (this.config.pushEnabled) {
      this.sendLocalNotification(title, content, {
        page: '/pages/insurance/index'
      });
    }

    // 发送短信
    if (this.config.smsEnabled && daysRemaining <= 3) {
      this.sendSmsReminder(insurance);
    }

    isDev && console.log('[ReminderService] 保险提醒已发送:', daysRemaining, '天');
  }

  // 发送短信提醒（调用后端API）
  private async sendSmsReminder(insurance: InsuranceInfo): Promise<void> {
    try {
      // 后端应提供发送短信的API
      await Taro.request({
        url: '/api/v1/notification/sms',
        method: 'POST',
        data: {
          type: 'insurance_expiry',
          insuranceId: insurance.id,
          daysRemaining: this.getDaysRemaining(insurance.endDate, new Date())
        }
      });
    } catch (error) {
      console.error('[ReminderService] 发送短信失败:', error);
    }
  }

  // ============ 违章提醒 ============

  // 检查新违章
  async checkNewViolations(): Promise<void> {
    isDev && console.log('[ReminderService] 检查新违章');

    try {
      const vehicles = await userService.getVehicleList();

      for (const vehicle of vehicles) {
        try {
          const newViolations = await userService.refreshViolations(vehicle.id);

          if (newViolations && newViolations.length > 0) {
            this.sendViolationReminder(vehicle.plateNumber, newViolations.length);
          }
        } catch (error) {
          console.warn(`[ReminderService] 检查车辆${vehicle.plateNumber}违章失败:`, error);
        }
      }

      this.lastCheckTime.set('violation', Date.now());

    } catch (error) {
      console.error('[ReminderService] 检查新违章失败:', error);
    }
  }

  // 发送违章提醒
  private sendViolationReminder(plateNumber: string, count: number): void {
    const title = '新违章提醒';
    const content = `您的车辆${plateNumber}新增${count}条违章记录，请及时处理。`;

    this.addReminderRecord({
      type: 'violation',
      title,
      content,
      actionUrl: '/pages/violation/index'
    });

    if (this.config.pushEnabled) {
      this.sendLocalNotification(title, content, {
        page: '/pages/violation/index'
      });
    }
  }

  // ============ 保养提醒 ============

  // 检查保养到期
  async checkMaintenanceDue(): Promise<void> {
    isDev && console.log('[ReminderService] 检查保养到期');

    try {
      const vehicles = await userService.getVehicleList();

      for (const vehicle of vehicles) {
        // 根据车型里程计算下次保养里程
        const nextMaintenanceMileage = this.calculateNextMaintenanceMileage(vehicle.mileage);
        const distanceToNext = nextMaintenanceMileage - vehicle.mileage;

        if (distanceToNext <= this.config.maintenanceMileageThreshold && distanceToNext > 0) {
          this.sendMaintenanceReminder(vehicle.plateNumber, distanceToNext);
        } else if (distanceToNext <= 0) {
          this.sendMaintenanceOverdueReminder(vehicle.plateNumber, Math.abs(distanceToNext));
        }
      }

      this.lastCheckTime.set('maintenance', Date.now());

    } catch (error) {
      console.error('[ReminderService] 检查保养到期失败:', error);
    }
  }

  // 计算下次保养里程
  private calculateNextMaintenanceMileage(currentMileage: number): number {
    const intervals = [5000, 10000, 15000, 20000, 30000, 40000, 60000, 80000, 100000];

    for (const interval of intervals) {
      if (interval > currentMileage) {
        return interval;
      }
    }

    // 如果超过10万公里，每1万公里保养
    return Math.ceil(currentMileage / 10000) * 10000;
  }

  // 发送保养提醒
  private sendMaintenanceReminder(plateNumber: string, distanceToNext: number): void {
    const title = '保养提醒';
    const content = `您的车辆${plateNumber}还剩${distanceToNext}公里需要保养，建议提前预约。`;

    this.addReminderRecord({
      type: 'maintenance',
      title,
      content,
      actionUrl: '/pages/service/index'
    });

    if (this.config.pushEnabled) {
      this.sendLocalNotification(title, content, {
        page: '/pages/service/index'
      });
    }
  }

  // 发送保养逾期提醒
  private sendMaintenanceOverdueReminder(plateNumber: string, overdue: number): void {
    const title = '保养逾期提醒';
    const content = `您的车辆${plateNumber}已超过保养里程${overdue}公里，请尽快保养！`;

    this.addReminderRecord({
      type: 'maintenance',
      title,
      content,
      actionUrl: '/pages/service/index'
    });

    if (this.config.pushEnabled) {
      this.sendLocalNotification(title, content, {
        page: '/pages/service/index'
      });
    }
  }

  // ============ 服务提醒 ============

  // 预约提醒（服务前1小时）
  async sendBookingReminder(booking: any): Promise<void> {
    const title = '服务预约提醒';
    const content = `您预约的${booking.packageName}服务将在1小时后开始，请准时到达${booking.storeName}。`;

    this.addReminderRecord({
      type: 'service',
      title,
      content,
      relatedId: booking.id,
      actionUrl: '/pages/booking/index'
    });

    if (this.config.pushEnabled) {
      this.sendLocalNotification(title, content, {
        page: '/pages/order-list/index'
      });
    }
  }

  // ============ 提醒记录管理 ============

  // 添加提醒记录
  addReminderRecord(record: Omit<ReminderRecord, 'id' | 'createdAt' | 'read'>): void {
    const newRecord: ReminderRecord = {
      ...record,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      read: false
    };

    this.reminderRecords.unshift(newRecord);

    // 最多保存100条
    if (this.reminderRecords.length > 100) {
      this.reminderRecords = this.reminderRecords.slice(0, 100);
    }

    // 保存到本地
    Taro.setStorageSync('reminder_records', this.reminderRecords);
  }

  // 获取提醒记录
  getReminderRecords(type?: string): ReminderRecord[] {
    // 从本地加载
    if (this.reminderRecords.length === 0) {
      const saved = Taro.getStorageSync('reminder_records');
      if (saved) {
        this.reminderRecords = saved;
      }
    }

    if (type) {
      return this.reminderRecords.filter(r => r.type === type);
    }

    return this.reminderRecords;
  }

  // 标记为已读
  markAsRead(reminderId: string): void {
    const record = this.reminderRecords.find(r => r.id === reminderId);
    if (record) {
      record.read = true;
      Taro.setStorageSync('reminder_records', this.reminderRecords);
    }
  }

  // 全部标记为已读
  markAllAsRead(): void {
    this.reminderRecords.forEach(r => r.read = true);
    Taro.setStorageSync('reminder_records', this.reminderRecords);
  }

  // 获取未读数量
  getUnreadCount(): number {
    return this.reminderRecords.filter(r => !r.read).length;
  }

  // 删除提醒
  deleteReminder(reminderId: string): void {
    this.reminderRecords = this.reminderRecords.filter(r => r.id !== reminderId);
    Taro.setStorageSync('reminder_records', this.reminderRecords);
  }

  // ============ WebSocket推送订阅 ============

  private subscribeToPushNotifications(): void {
    wsService.connect();

    // 订阅系统通知
    wsService.subscribe('notification', (message) => {
      isDev && console.log('[ReminderService] 收到推送通知:', message);

      const data = message.data as {
        type: string;
        title: string;
        content: string;
        actionUrl?: string;
      };

      this.addReminderRecord({
        type: data.type as any,
        title: data.title,
        content: data.content,
        actionUrl: data.actionUrl
      });

      if (this.config.pushEnabled) {
        this.sendLocalNotification(data.title, data.content, {
          page: data.actionUrl
        });
      }
    });
  }

  // ============ 本地通知 ============

  private sendLocalNotification(
    title: string,
    content: string,
    options?: {
      page?: string;
      sound?: string;
      badge?: number;
    }
  ): void {
    isDev && console.log('[ReminderService] 发送本地通知:', title, content);

    // H5端使用系统通知
    if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: content,
            icon: '/favicon.png',
            data: options
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, {
                body: content,
                data: options
              });
            }
          });
        }
      }
      return;
    }

    // 小程序端使用Taro API
    if (typeof Taro.showTabBarRedDot === 'function') {
      // 设置红点
      Taro.showTabBarRedDot({ index: 3 }).catch(() => {});
    }
  }

  // ============ 工具方法 ============

  // 计算剩余天数
  private getDaysRemaining(dateStr: string, now: Date): number {
    const targetDate = new Date(dateStr);
    const timeDiff = targetDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  // 手动触发检查（用于下拉刷新等场景）
  async triggerCheck(checkType: 'insurance' | 'violation' | 'maintenance' | 'all'): Promise<void> {
    switch (checkType) {
      case 'insurance':
        await this.checkInsuranceExpiry();
        break;
      case 'violation':
        await this.checkNewViolations();
        break;
      case 'maintenance':
        await this.checkMaintenanceDue();
        break;
      case 'all':
        await Promise.all([
          this.checkInsuranceExpiry(),
          this.checkNewViolations(),
          this.checkMaintenanceDue()
        ]);
        break;
    }
  }
}

export const reminderService = new ReminderService();
export default reminderService;
