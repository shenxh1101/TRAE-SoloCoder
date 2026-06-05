import { DataSource, Repository, LessThan } from 'typeorm';
import WebSocket from 'ws';
import { TransportTask } from '../entities/TransportTask';
import { InventoryAlert } from '../entities/InventoryAlert';
import { BloodBag } from '../entities/BloodBag';
import { formatDateTime, generateId } from '../utils/dateUtils';
import type { AlertSeverity } from '../types';

const OVERDUE_CHECK_INTERVAL = 60000;
const INVENTORY_CHECK_INTERVAL = 300000;
const DELIVERY_TIMEOUT_MINUTES = 30;
const LOW_STOCK_THRESHOLD = 5;
const CRITICAL_STOCK_THRESHOLD = 2;

export class TaskScheduler {
  private dataSource: DataSource;
  private wss: WebSocket.Server;
  private overdueTimer: NodeJS.Timeout | null = null;
  private inventoryTimer: NodeJS.Timeout | null = null;
  private transportTaskRepository: Repository<TransportTask>;
  private inventoryAlertRepository: Repository<InventoryAlert>;
  private bloodBagRepository: Repository<BloodBag>;

  constructor(dataSource: DataSource, wss: WebSocket.Server) {
    this.dataSource = dataSource;
    this.wss = wss;
    this.transportTaskRepository = dataSource.getRepository(TransportTask);
    this.inventoryAlertRepository = dataSource.getRepository(InventoryAlert);
    this.bloodBagRepository = dataSource.getRepository(BloodBag);
  }

  start(): void {
    this.checkOverdueTasks();
    this.checkInventoryAlerts();

    this.overdueTimer = setInterval(() => {
      this.checkOverdueTasks();
    }, OVERDUE_CHECK_INTERVAL);

    this.inventoryTimer = setInterval(() => {
      this.checkInventoryAlerts();
    }, INVENTORY_CHECK_INTERVAL);

    console.log('任务调度服务已启动');
  }

  stop(): void {
    if (this.overdueTimer) {
      clearInterval(this.overdueTimer);
      this.overdueTimer = null;
    }
    if (this.inventoryTimer) {
      clearInterval(this.inventoryTimer);
      this.inventoryTimer = null;
    }
    console.log('任务调度服务已停止');
  }

  async checkOverdueTasks(): Promise<void> {
    try {
      const now = new Date();
      const thresholdTime = new Date(now.getTime() - DELIVERY_TIMEOUT_MINUTES * 60 * 1000);
      const thresholdTimeStr = formatDateTime(thresholdTime);

      const overdueTasks = await this.transportTaskRepository.find({
        where: {
          status: 'delivered',
        },
      });

      const actuallyOverdue = overdueTasks.filter((task) => {
        if (!task.nurseConfirmation) {
          const estimatedArrival = new Date(task.estimatedArrival);
          return estimatedArrival < thresholdTime;
        }
        return false;
      });

      for (const task of actuallyOverdue) {
        const timeDiff = Math.floor(
          (now.getTime() - new Date(task.estimatedArrival).getTime()) / 60000
        );

        this.broadcastNotification({
          type: 'task_update',
          data: {
            taskId: task.id,
            requestId: task.requestId,
            message: `运输任务已送达${timeDiff}分钟，尚未签收，请护士尽快处理！`,
            level: 'warning',
            destinationWard: task.destinationWard,
          },
        });

        this.broadcastNotification({
          type: 'notification',
          data: {
            title: '运输任务催办',
            message: `运输任务 ${task.id.substring(0, 8)} 已送达${timeDiff}分钟未签收`,
            level: 'warning',
            taskId: task.id,
          },
        });
      }
    } catch (error) {
      console.error('检查超时任务失败:', error);
    }
  }

  async checkInventoryAlerts(): Promise<void> {
    try {
      const bloodBags = await this.bloodBagRepository.find({
        where: {
          status: 'available',
        },
      });

      const stats: Record<string, Record<string, number>> = {};
      const bloodTypes = ['A', 'B', 'AB', 'O'] as const;
      const components = ['whole_blood', 'plasma', 'platelet'] as const;

      bloodTypes.forEach((bt) => {
        stats[bt] = {};
        components.forEach((comp) => {
          stats[bt][comp] = 0;
        });
      });

      bloodBags.forEach((bag) => {
        if (stats[bag.bloodType] && stats[bag.bloodType][bag.component] !== undefined) {
          stats[bag.bloodType][bag.component]++;
        }
      });

      for (const bloodType of bloodTypes) {
        for (const component of components) {
          const count = stats[bloodType][component];

          const existingAlert = await this.inventoryAlertRepository.findOne({
            where: {
              bloodType,
              component,
              acknowledged: false,
            },
          });

          if (count <= CRITICAL_STOCK_THRESHOLD) {
            if (!existingAlert || existingAlert.severity !== 'critical') {
              await this.createInventoryAlert(
                bloodType,
                component,
                count,
                CRITICAL_STOCK_THRESHOLD,
                'critical'
              );
            }
          } else if (count <= LOW_STOCK_THRESHOLD) {
            if (!existingAlert || existingAlert.severity !== 'high') {
              await this.createInventoryAlert(
                bloodType,
                component,
                count,
                LOW_STOCK_THRESHOLD,
                'high'
              );
            }
          } else if (existingAlert && count > LOW_STOCK_THRESHOLD) {
            existingAlert.acknowledged = true;
            await this.inventoryAlertRepository.save(existingAlert);
          }
        }
      }

      const activeAlerts = await this.inventoryAlertRepository.find({
        where: {
          acknowledged: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (activeAlerts.length > 0) {
        this.broadcastNotification({
          type: 'alert',
          data: {
            title: '库存预警',
            message: `有 ${activeAlerts.length} 个库存预警需要处理`,
            alerts: activeAlerts,
          },
        });
      }
    } catch (error) {
      console.error('检查库存预警失败:', error);
    }
  }

  private async createInventoryAlert(
    bloodType: string,
    component: string,
    currentStock: number,
    threshold: number,
    severity: AlertSeverity
  ): Promise<void> {
    const daysOfSupply = currentStock * 7;

    const alert = new InventoryAlert();
    alert.id = generateId('inv_alert');
    alert.bloodType = bloodType as any;
    alert.component = component as any;
    alert.currentStock = currentStock;
    alert.threshold = threshold;
    alert.daysOfSupply = daysOfSupply;
    alert.severity = severity;
    alert.acknowledged = false;
    alert.createdAt = formatDateTime(new Date());

    await this.inventoryAlertRepository.save(alert);

    console.log(
      `库存预警已创建: ${bloodType} ${component} - 当前库存: ${currentStock}, 阈值: ${threshold}`
    );
  }

  private broadcastNotification(message: {
    type: string;
    data: Record<string, any>;
  }): void {
    const fullMessage = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(fullMessage);
      }
    });
  }
}
