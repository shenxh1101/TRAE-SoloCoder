import { v4 as uuidv4 } from 'uuid';
import type { Alert, AlertLevel, AlertStatus, RealtimeMetrics } from '../../src/types/index';
import { taskService } from './taskService';

const THRESHOLDS = {
  MAX_SPL_DBA: 85,
  MAX_SWR: 3,
  MIN_UNIFORMITY: 80,
  MAX_RT60_DEVIATION: 0.3,
} as const;

interface AlertRule {
  type: Alert['alertType'];
  threshold: number;
  check: (metrics: AlertMetrics) => boolean;
  getLevel: (value: number) => AlertLevel;
  getMessage: (value: number) => string;
}

interface AlertMetrics {
  maxSpl: number;
  swr: number;
  uniformity: number;
  rt60Deviation: number;
}

interface AlertCreationParams {
  type: Alert['alertType'];
  level: AlertLevel;
  thresholdValue: number;
  actualValue: number;
}

const DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;

class AlertServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertServiceError';
  }
}

class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private recentAlerts: Map<string, Map<string, number>> = new Map();
  private rules: AlertRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  private initializeRules(): AlertRule[] {
    return [
      {
        type: 'spl_exceeded',
        threshold: THRESHOLDS.MAX_SPL_DBA,
        check: (metrics) => metrics.maxSpl > THRESHOLDS.MAX_SPL_DBA,
        getLevel: (value) =>
          value > 95 ? 'red' : 'orange',
        getMessage: (value) =>
          `SPL exceeded safe limit: ${value.toFixed(1)} dB > ${THRESHOLDS.MAX_SPL_DBA} dB`,
      },
      {
        type: 'swr_high',
        threshold: THRESHOLDS.MAX_SWR,
        check: (metrics) => metrics.swr > THRESHOLDS.MAX_SWR,
        getLevel: (value) =>
          value > 5 ? 'red' : 'orange',
       getMessage: (value) =>
          `Standing wave ratio too high: ${value.toFixed(2)} > ${THRESHOLDS.MAX_SWR}`,
      },
      {
        type: 'uniformity_low',
        threshold: THRESHOLDS.MIN_UNIFORMITY,
        check: (metrics) => metrics.uniformity < THRESHOLDS.MIN_UNIFORMITY,
        getLevel: (value) =>
          value < 60 ? 'red' : 'orange',
        getMessage: (value) =>
          `Uniformity below threshold: ${value.toFixed(1)}% < ${THRESHOLDS.MIN_UNIFORMITY.toFixed(0)}%`,
      },
      {
        type: 'rt60_deviation',
        threshold: THRESHOLDS.MAX_RT60_DEVIATION,
        check: (metrics) => metrics.rt60Deviation > THRESHOLDS.MAX_RT60_DEVIATION,
        getLevel: (value) =>
          value > 0.5 ? 'red' : 'orange',
        getMessage: (value) =>
          `RT60 deviation excessive: ${value.toFixed(3)}s > ${THRESHOLDS.MAX_RT60_DEVIATION}s`,
      },
    ];
  }

  async checkAndCreateAlerts(
    taskId: string,
    metrics: RealtimeMetrics & { rt60Deviation?: number },
  ): Promise<Alert[]> {
    const task = taskService.getTask(taskId);
    if (!task) {
      throw new AlertServiceError(`Task not found: ${taskId}`);
    }

    const alertMetrics: AlertMetrics = {
      maxSpl: metrics.maxSplDecibel,
      swr: metrics.standingWaveRatio,
      uniformity: metrics.uniformityScore,
      rt60Deviation: metrics.rt60Deviation ?? 0,
    };

    const violations: AlertCreationParams[] = [];

    for (const rule of this.rules) {
      if (rule.check(alertMetrics)) {
        const actualValue = alertMetrics[this.getMetricKey(rule.type)];
        violations.push({
          type: rule.type,
          level: rule.getLevel(actualValue),
          thresholdValue: rule.threshold,
          actualValue,
        });
      }
    }

    if (violations.length === 0) {
      return [];
    }

    return await this.batchCreate(taskId, task.roomName, violations);
  }

  async batchCreate(
    taskId: string,
    roomName: string,
    violations: AlertCreationParams[],
  ): Promise<Alert[]> {
    const createdAlerts: Alert[] = [];

    for (const violation of violations) {
      if (this.isDuplicated(taskId, violation.type)) {
        console.log(`[AlertService] Skipping duplicate alert for task ${taskId}, type ${violation.type}`);
        continue;
      }

      const alert = this.createSingleAlert(taskId, roomName, violation);
      this.alerts.set(alert.id, alert);
      createdAlerts.push(alert);

      this.recordAlertCreation(taskId, violation.type);
      this.sendNotification(alert);
    }

    return createdAlerts;
  }

  createSingleAlert(
    taskId: string,
    roomName: string,
    params: AlertCreationParams,
  ): Alert {
    const now = new Date().toISOString();
    
    return {
      id: uuidv4(),
      taskId,
      taskName: taskId,
      roomName,
      alertLevel: params.level,
      alertType: params.type,
      thresholdValue: params.thresholdValue,
      actualValue: params.actualValue,
      status: 'pending' as AlertStatus,
      triggeredAt: now,
    };
  }

  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) || null;
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  getAlertsByTask(taskId: string): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.taskId === taskId)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  getAlertsByStatus(status: AlertStatus): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.status === status)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  getAlertsByLevel(level: AlertLevel): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.alertLevel === level)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  reviewAlert(
    alertId: string,
    reviewerId: string,
    reviewerName: string,
    decision: 'resolved' | 'dismissed',
    comment?: string,
  ): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    if (alert.status !== 'pending') {
      throw new AlertServiceError(`Alert ${alertId} is not in pending status`);
    }

    const now = new Date().toISOString();
    const responseTimeSec = Math.round(
      (new Date(now).getTime() - new Date(alert.triggeredAt).getTime()) / 1000
    );

    alert.status = decision;
    alert.reviewerId = reviewerId;
    alert.reviewerName = reviewerName;
    alert.reviewComment = comment;
    alert.reviewedAt = now;
    alert.responseTimeSec = responseTimeSec;

    this.alerts.set(alertId, alert);
    return alert;
  }

  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  getPendingCount(): number {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.status === 'pending'
    ).length;
  }

  getStats(): {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
    byLevel: Record<AlertLevel, number>;
  } {
    const stats = {
      total: this.alerts.size,
      pending: 0,
      reviewing: 0,
      resolved: 0,
      dismissed: 0,
      byLevel: { red: 0, orange: 0, yellow: 0 } as Record<AlertLevel, number>,
    };

    this.alerts.forEach((alert) => {
      stats[alert.status]++;
      stats.byLevel[alert.alertLevel]++;
    });

    return stats;
  }

  private isDuplicated(taskId: string, alertType: Alert['alertType']): boolean {
    const taskAlerts = this.recentAlerts.get(taskId);
    if (!taskAlerts) return false;

    const lastTriggered = taskAlerts.get(alertType);
    if (!lastTriggered) return false;

    return Date.now() - lastTriggered < DEDUPLICATION_WINDOW_MS;
  }

  private recordAlertCreation(taskId: string, alertType: Alert['alertType']): void {
    if (!this.recentAlerts.has(taskId)) {
      this.recentAlerts.set(taskId, new Map());
    }

    this.recentAlerts.get(taskId)!.set(alertType, Date.now());

    setTimeout(() => {
      const taskAlerts = this.recentAlerts.get(taskId);
      if (taskAlerts) {
        taskAlerts.delete(alertType);
        if (taskAlerts.size === 0) {
          this.recentAlerts.delete(taskId);
        }
      }
    }, DEDUPLICATION_WINDOW_MS);
  }

  private sendNotification(alert: Alert): void {
    const timestamp = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    console.log(`\n🚨 [ALERT NOTIFICATION] ${timestamp}`);
    console.log(`   Level: ${alert.alertLevel.toUpperCase()}`);
    console.log(`   Type: ${alert.alertType}`);
    console.log(`   Task: ${alert.taskId}`);
    console.log(`   Room: ${alert.roomName}`);
    console.log(`   Threshold: ${alert.thresholdValue}`);
    console.log(`   Actual: ${alert.actualValue.toFixed(2)}`);
    console.log(`   Message: ${this.getRuleByType(alert.alertType)?.getMessage(alert.actualValue)}`);
    console.log('');

    // Simulate email/SMS notification
    this.simulateEmailNotification(alert);
    this.simulateSMSNotification(alert);
  }

  private simulateEmailNotification(alert: Alert): void {
    console.log(`[Email] Alert notification sent to engineering team`);
    console.log(`        Subject: [${alert.alertLevel.toUpperCase()}] Acoustic Alert - ${alert.alertType}`);
  }

  private simulateSMSNotification(alert: Alert): void {
    if (alert.alertLevel === 'red') {
      console.log(`[SMS] Urgent alert sent to on-call engineer`);
    }
  }

  private getRuleByType(type: Alert['alertType']): AlertRule | undefined {
    return this.rules.find((rule) => rule.type === type);
  }

  private getMetricKey(type: Alert['alertType']): keyof AlertMetrics {
    const keyMap: Record<Alert['alertType'], keyof AlertMetrics> = {
      spl_exceeded: 'maxSpl',
      swr_high: 'swr',
      uniformity_low: 'uniformity',
      rt60_deviation: 'rt60Deviation',
    };
    return keyMap[type];
  }

  clearAll(): void {
    this.alerts.clear();
    this.recentAlerts.clear();
  }
}

export const alertService = new AlertService();

export {
  AlertService,
  AlertServiceError,
  THRESHOLDS,
  DEDUPLICATION_WINDOW_MS,
};
export type { AlertRule, AlertMetrics, AlertCreationParams };
