import React from 'react';
import { useMineStore } from '../../store/useMineStore';

type AlertType = 'gas' | 'dust' | 'temperature' | 'equipment' | 'worker' | 'emergency';
type AlertLevel = 'info' | 'warning' | 'danger';

export const AlertPanel: React.FC = () => {
  const { alerts, acknowledgeAlert } = useMineStore();

  const getAlertIcon = (type: AlertType) => {
    const icons: Record<string, string> = {
      gas: '💨',
      dust: '🌫️',
      temperature: '🌡️',
      equipment: '⚙️',
      worker: '👷',
      emergency: '🚨',
    };
    return icons[type] || '⚠️';
  };

  const getAlertLevelStyle = (level: AlertLevel) => {
    switch (level) {
      case 'danger':
        return 'border-mine-red bg-red-900/30';
      case 'warning':
        return 'border-mine-yellow bg-yellow-900/30';
      default:
        return 'border-mine-blue bg-blue-900/30';
    }
  };

  const getAlertLevelText = (level: AlertLevel) => {
    switch (level) {
      case 'danger':
        return '危险';
      case 'warning':
        return '警告';
      default:
        return '信息';
    }
  };

  return (
    <div className="glass-panel rounded-lg p-4 w-80 max-h-96 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-mine-blue flex items-center gap-2">
          <span>🔔</span> 实时预警
        </h2>
        <span className="bg-mine-red text-white text-xs px-2 py-1 rounded-full">
          {alerts.filter(a => !a.acknowledged).length} 未处理
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {alerts.slice(0, 10).map((alert) => (
          <div
            key={alert.id}
            className={`rounded p-3 border-l-2 transition-all ${getAlertLevelStyle(alert.level)} ${
              alert.acknowledged ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getAlertIcon(alert.type)}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    alert.level === 'danger' ? 'text-mine-red' :
                    alert.level === 'warning' ? 'text-mine-yellow' : 'text-mine-blue'
                  }`}>
                    {getAlertLevelText(alert.level)}
                  </span>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <div className="text-sm text-white mt-1">{alert.message}</div>
                <div className="text-xs text-gray-400 mt-1">来源: {alert.sourceName}</div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="mt-2 text-xs bg-mine-blue/30 text-mine-blue px-3 py-1 rounded hover:bg-mine-blue/50 transition-colors"
                  >
                    确认处理
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
