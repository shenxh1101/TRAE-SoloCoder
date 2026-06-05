import React, { useState, useEffect } from 'react';
import { Droplets, Thermometer, Bell, Settings, Clock, AlertTriangle } from 'lucide-react';
import { useBloodBankStore } from '@/store';
import { Badge } from '../ui/Badge';
import { UserMenu } from '../UserMenu';
import { formatDateTime } from '@/utils/dateUtils';

interface StatusBarProps {
  onRoleSwitch?: () => void;
  onLogin?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onRoleSwitch, onLogin }) => {
  const { coldStorage, inventoryAlerts, systemAlerts, currentUser, triggerHighTemperature } = useBloodBankStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const unacknowledgedAlerts = [
    ...inventoryAlerts.filter(a => !a.acknowledged),
    ...systemAlerts.filter(a => !a.acknowledged)
  ];

  const getTemperatureColor = () => {
    if (coldStorage.alertStatus === 'critical') return 'text-red-400';
    if (coldStorage.alertStatus === 'warning') return 'text-yellow-400';
    return 'text-green-400';
  };

  const getTemperatureBg = () => {
    if (coldStorage.alertStatus === 'critical') return 'bg-red-500/20 border-red-500/50';
    if (coldStorage.alertStatus === 'warning') return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-green-500/20 border-green-500/50';
  };

  return (
    <div className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Droplets size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">智慧血库管理平台</h1>
            <p className="text-xs text-slate-400">3D可视化调度中心</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-slate-700 mx-2" />
        
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={14} />
          <span className="text-sm font-mono">{formatDateTime(currentTime)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getTemperatureBg()}`}>
          <Thermometer size={16} className={getTemperatureColor()} />
          <span className={`text-sm font-bold font-mono ${getTemperatureColor()}`}>
            {coldStorage.currentTemperature.toFixed(1)}℃
          </span>
          <span className="text-xs text-slate-400">/ 2-6℃</span>
          {coldStorage.backupCoolingActive && (
            <Badge variant="danger" pulse>备用制冷</Badge>
          )}
        </div>
        
        <button
          onClick={triggerHighTemperature}
          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
        >
          模拟超温
        </button>
        
        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Bell size={20} className="text-slate-400" />
          {unacknowledgedAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
              {unacknowledgedAlerts.length}
            </span>
          )}
        </button>
        
        <div className="h-8 w-px bg-slate-700" />
        
        <UserMenu onRoleSwitch={onRoleSwitch} onLogin={onLogin} />
        
        <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Settings size={20} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
};
