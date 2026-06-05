import { AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import type { Alert } from '../types';
import { getTimeAgo } from '../utils/calculations';

interface AlertPanelProps {
  alerts: Alert[];
  onResolve: (alertId: string) => void;
}

const alertTypeLabels: Record<Alert['type'], string> = {
  waiting_time: '候诊超时',
  saturation: '饱和度预警',
  underperformance: '效率低下',
  schedule_mismatch: '排班不符',
};

export default function AlertPanel({ alerts, onResolve }: AlertPanelProps) {
  const unresolvedAlerts = alerts.filter(a => !a.resolved).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const resolvedAlerts = alerts.filter(a => a.resolved).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'waiting_time': return '⏰';
      case 'saturation': return '📊';
      case 'underperformance': return '📉';
      case 'schedule_mismatch': return '📅';
      default: return '⚠️';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">实时预警中心</h3>
          <p className="text-sm text-gray-500 mt-1">
            共 <span className="font-medium text-gray-900">{unresolvedAlerts.length}</span> 条待处理预警
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center text-sm text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
            实时监控中
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {unresolvedAlerts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              待处理预警
            </h4>
            {unresolvedAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border mb-3 ${
                  alert.level === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.level === 'danger'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {alertTypeLabels[alert.type]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {alert.departmentName}
                          {alert.doctorName && ` · ${alert.doctorName}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(alert.timestamp)}
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          已通知: {alert.notifiedTo.join('、')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors text-gray-400 hover:text-green-600"
                    title="标记为已处理"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {resolvedAlerts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              已处理预警
            </h4>
            {resolvedAlerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                className="p-4 rounded-lg border border-gray-100 bg-gray-50 opacity-75"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-xl opacity-50">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        {alertTypeLabels[alert.type]}
                      </span>
                      <span className="text-sm text-gray-600">{alert.departmentName}</span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{getTimeAgo(alert.timestamp)}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        )}

        {unresolvedAlerts.length === 0 && resolvedAlerts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-500">暂无预警信息</p>
            <p className="text-sm text-gray-400 mt-1">系统运行正常</p>
          </div>
        )}
      </div>
    </div>
  );
}
