import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import type { Alert, AlertLevel } from '../../types';

const levelConfig: Record<AlertLevel, { label: string; bgColor: string; textColor: string; icon: string }> = {
  red: {
    label: '严重',
    bgColor: 'bg-acoustic-danger/10',
    textColor: 'text-acoustic-danger',
    icon: '🔴',
  },
  orange: {
    label: '警告',
    bgColor: 'bg-acoustic-warning/10',
    textColor: 'text-acoustic-warning',
    icon: '🟠',
  },
  yellow: {
    label: '注意',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    icon: '🟡',
  },
};

interface RecentAlertsProps {
  alerts: Alert[];
}

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  const recentAlerts = alerts
    .filter(a => a.status === 'pending')
    .slice(0, 5);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <AlertTriangle className="w-5 h-5 text-acoustic-warning mr-2" />
          待处理预警
        </h3>
        <span className="text-xs font-mono text-acoustic-danger bg-acoustic-danger/10 px-3 py-1 rounded-full animate-pulse-slow">
          {recentAlerts.length} 条待处理
        </span>
      </div>

      <div className="space-y-3">
        {recentAlerts.map((alert) => {
          const config = levelConfig[alert.alertLevel];
          
          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${config.bgColor} border-current/20 
                       hover:border-current/40 transition-all duration-200 cursor-pointer group`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{config.icon}</span>
                  <span className={`text-sm font-semibold ${config.textColor}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {alert.alertType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(alert.triggeredAt).toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-300 mb-2">
                房间：<span className="font-medium text-white">{alert.roomName}</span> · 
                任务：<span className="font-medium text-white">{alert.taskName}</span>
              </p>

              <div className="flex items-center justify-between text-xs">
                <div className="font-mono">
                  <span className="text-gray-400">阈值:</span>{' '}
                  <span className={config.textColor}>{alert.thresholdValue}</span>
                  {' · '}
                  <span className="text-gray-400">实际:</span>{' '}
                  <span className={`${config.textColor} font-bold`}>{alert.actualValue}</span>
                </div>
                
                <button className={`opacity-0 group-hover:opacity-100 flex items-center ${config.textColor} transition-opacity`}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  查看详情
                </button>
              </div>
            </div>
          );
        })}

        {recentAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50 text-acoustic-success" />
            <p className="text-sm">暂无预警信息</p>
            <p className="text-xs mt-1 text-gray-600">所有系统运行正常</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { CheckCircle2 } from 'lucide-react';
