import { DataSource, Repository } from 'typeorm';
import WebSocket from 'ws';
import { AppDataSource } from '../config/database';
import { ColdStorage } from '../entities/ColdStorage';
import { SystemAlert } from '../entities/SystemAlert';
import { WS_PORT, TEMPERATURE_UPDATE_INTERVAL, MIN_TEMP, MAX_TEMP } from '../config';
import { generateId, formatDateTime } from '../utils/dateUtils';
import type { AlertSeverity } from '../types';

export class TemperatureSensor {
  private dataSource: DataSource;
  private wss: WebSocket.Server;
  private timer: NodeJS.Timeout | null = null;
  private coldStorageRepository: Repository<ColdStorage>;
  private systemAlertRepository: Repository<SystemAlert>;

  constructor(dataSource: DataSource, wss: WebSocket.Server) {
    this.dataSource = dataSource;
    this.wss = wss;
    this.coldStorageRepository = dataSource.getRepository(ColdStorage);
    this.systemAlertRepository = dataSource.getRepository(SystemAlert);
  }

  start(): void {
    if (this.timer) {
      return;
    }
    console.log('温度传感器服务已启动');
    this.timer = setInterval(() => {
      this.simulateTemperatureChange();
    }, TEMPERATURE_UPDATE_INTERVAL);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('温度传感器服务已停止');
    }
  }

  async simulateTemperatureChange(): Promise<void> {
    try {
      const coldStorage = await this.coldStorageRepository.findOne({
        where: {},
      });

      if (!coldStorage) {
        return;
      }

      const fluctuation = (Math.random() - 0.5) * 1.5;
      let newTemp = coldStorage.currentTemperature + fluctuation;

      if (Math.random() < 0.05) {
        newTemp = MAX_TEMP + Math.random() * 3 + 1;
      }

      if (Math.random() < 0.03) {
        newTemp = MIN_TEMP - Math.random() * 2 - 1;
      }

      if (coldStorage.isBackupCoolingActive) {
        newTemp = newTemp - 1.5;
        if (newTemp <= MAX_TEMP) {
          coldStorage.isBackupCoolingActive = false;
          console.log('温度恢复正常，备用制冷系统已关闭');
        }
      }

      newTemp = Math.round(newTemp * 10) / 10;

      coldStorage.currentTemperature = newTemp;
      coldStorage.lastUpdate = formatDateTime(new Date());

      const alertResult = this.checkTemperatureAlert(newTemp);
      coldStorage.status = alertResult.status;

      await this.coldStorageRepository.save(coldStorage);

      if (alertResult.shouldCreateAlert) {
        const existingAlert = await this.systemAlertRepository.findOne({
          where: {
            type: 'temperature',
            acknowledged: false,
          },
        });

        if (!existingAlert) {
          const alert = new SystemAlert();
          alert.id = generateId('alert');
          alert.type = 'temperature';
          alert.severity = alertResult.severity;
          alert.title = alertResult.title;
          alert.message = alertResult.message;
          alert.acknowledged = false;
          alert.createdAt = formatDateTime(new Date());
          alert.details = {
            temperature: newTemp,
            coldStorageId: coldStorage.id,
            coldStorageName: coldStorage.name,
          };
          await this.systemAlertRepository.save(alert);
        }
      }

      if (alertResult.severity === 'critical' && !coldStorage.isBackupCoolingActive) {
        this.activateBackupCooling(coldStorage);
      }

      const alerts = await this.systemAlertRepository.find({
        where: {
          type: 'temperature',
          acknowledged: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.broadcastTemperature({
        coldStorage,
        alerts,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('模拟温度变化失败:', error);
    }
  }

  private checkTemperatureAlert(temp: number): {
    status: 'normal' | 'warning' | 'critical';
    shouldCreateAlert: boolean;
    severity: AlertSeverity;
    title: string;
    message: string;
  } {
    if (temp > MAX_TEMP + 2 || temp < MIN_TEMP - 2) {
      return {
        status: 'critical',
        shouldCreateAlert: true,
        severity: 'critical',
        title: '温度严重异常',
        message: `冷库温度${temp > MAX_TEMP ? '过高' : '过低'}，当前温度: ${temp}℃，已超出安全范围！`,
      };
    }

    if (temp > MAX_TEMP || temp < MIN_TEMP) {
      return {
        status: 'warning',
        shouldCreateAlert: true,
        severity: 'high',
        title: '温度异常警告',
        message: `冷库温度${temp > MAX_TEMP ? '偏高' : '偏低'}，当前温度: ${temp}℃，请检查制冷系统。`,
      };
    }

    return {
      status: 'normal',
      shouldCreateAlert: false,
      severity: 'low',
      title: '',
      message: '',
    };
  }

  private async activateBackupCooling(coldStorage: ColdStorage): Promise<void> {
    try {
      coldStorage.isBackupCoolingActive = true;
      await this.coldStorageRepository.save(coldStorage);
      console.log('备用制冷系统已启动');

      const alert = new SystemAlert();
      alert.id = generateId('alert');
      alert.type = 'system';
      alert.severity = 'high';
      alert.title = '备用制冷系统已启动';
      alert.message = '由于温度严重异常，备用制冷系统已自动启动。';
      alert.acknowledged = false;
      alert.createdAt = formatDateTime(new Date());
      alert.details = {
        coldStorageId: coldStorage.id,
        coldStorageName: coldStorage.name,
      };
      await this.systemAlertRepository.save(alert);
    } catch (error) {
      console.error('启动备用制冷系统失败:', error);
    }
  }

  private broadcastTemperature(data: {
    coldStorage: ColdStorage;
    alerts: SystemAlert[];
    timestamp: number;
  }): void {
    const message = JSON.stringify({
      type: 'temperature',
      data,
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}
