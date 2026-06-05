import React, { useState } from 'react';
import { useMineStore } from '../../store/useMineStore';

type TabType = 'overview' | 'workers' | 'equipment' | 'transport';

export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { workFaces, workers, equipment, mineCarts, workOrders } = useMineStore();

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: '概览', icon: '📊' },
    { id: 'workers', label: '人员', icon: '👷' },
    { id: 'equipment', label: '设备', icon: '⚙️' },
    { id: 'transport', label: '运输', icon: '🚃' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <h3 className="text-mine-blue font-bold mb-3">采掘面概览</h3>
            {workFaces.map((wf) => (
              <div
                key={wf.id}
                className={`p-3 rounded cursor-pointer transition-all ${
                  wf.isWarning
                    ? 'bg-red-900/40 border border-mine-red'
                    : 'bg-mine-gray/50 hover:bg-mine-gray/70'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{wf.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      wf.isWarning
                        ? 'bg-mine-red text-white animate-pulse'
                        : 'bg-mine-green/30 text-mine-green'
                    }`}
                  >
                    {wf.isWarning ? '预警' : '正常'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-400">瓦斯:</span>
                    <span className={`ml-1 font-mono ${wf.isWarning ? 'text-mine-red' : 'text-mine-green'}`}>
                      {wf.gasConcentration.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">温度:</span>
                    <span className="ml-1 font-mono text-mine-blue">{wf.temperature.toFixed(1)}°C</span>
                  </div>
                  <div>
                    <span className="text-gray-400">进尺:</span>
                    <span className="ml-1 font-mono text-white">{wf.progress}m</span>
                  </div>
                  <div>
                    <span className="text-gray-400">产量:</span>
                    <span className="ml-1 font-mono text-mine-yellow">{wf.dailyOutput}吨</span>
                  </div>
                </div>
                {wf.ventilatorActive && (
                  <div className="mt-2 text-xs text-mine-green animate-pulse">
                    🌬️ 局部通风机运行中
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'workers':
        return (
          <div className="space-y-3">
            <h3 className="text-mine-blue font-bold mb-3">人员定位</h3>
            {workers.map((worker) => (
              <div
                key={worker.id}
                className={`p-3 rounded transition-all ${
                  worker.isInDangerZone
                    ? 'bg-orange-900/40 border border-orange-500'
                    : worker.status === 'evacuating'
                    ? 'bg-red-900/40 border border-mine-red animate-pulse'
                    : 'bg-mine-gray/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{worker.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      worker.isInDangerZone
                        ? 'bg-orange-500 text-white'
                        : worker.status === 'evacuating'
                        ? 'bg-mine-red text-white'
                        : 'bg-mine-green/30 text-mine-green'
                    }`}
                  >
                    {worker.isInDangerZone ? '危险区域' : worker.status === 'evacuating' ? '撤离中' : '正常'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-400">工种:</span>
                    <span className="ml-1 text-white">{worker.jobType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">时长:</span>
                    <span className="ml-1 font-mono text-mine-blue">{worker.workDuration.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'equipment':
        return (
          <div className="space-y-3">
            <h3 className="text-mine-blue font-bold mb-3">设备状态</h3>
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className={`p-3 rounded ${
                  eq.maintenanceWarning
                    ? 'bg-yellow-900/40 border border-yellow-500'
                    : 'bg-mine-gray/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{eq.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      eq.status === 'running'
                        ? 'bg-mine-green/30 text-mine-green'
                        : eq.status === 'maintenance'
                        ? 'bg-yellow-500/30 text-yellow-400'
                        : 'bg-gray-500/30 text-gray-400'
                    }`}
                  >
                    {eq.status === 'running' ? '运行中' : eq.status === 'maintenance' ? '检修中' : '已停止'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-400">运行:</span>
                    <span className="ml-1 font-mono text-white">{eq.runHours}h</span>
                  </div>
                  <div>
                    <span className="text-gray-400">下次检修:</span>
                    <span className="ml-1 font-mono text-mine-yellow">{eq.nextMaintenanceDue}h</span>
                  </div>
                </div>
                {eq.maintenanceWarning && (
                  <div className="mt-2 text-xs text-yellow-400">
                    ⚠️ 运行{Math.floor(eq.runHours / 100) * 100}小时，建议检修
                  </div>
                )}
              </div>
            ))}

            <h3 className="text-mine-blue font-bold mt-6 mb-3">检修工单</h3>
            {workOrders.map((wo) => (
              <div key={wo.id} className="p-3 rounded bg-mine-gray/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{wo.equipmentName}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      wo.status === 'pending'
                        ? 'bg-yellow-500/30 text-yellow-400'
                        : wo.status === 'in_progress'
                        ? 'bg-mine-blue/30 text-mine-blue'
                        : 'bg-mine-green/30 text-mine-green'
                    }`}
                  >
                    {wo.status === 'pending' ? '待处理' : wo.status === 'in_progress' ? '处理中' : '已完成'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{wo.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  分配: {wo.assignedTo} | {wo.createdAt}
                </div>
              </div>
            ))}
          </div>
        );

      case 'transport':
        return (
          <div className="space-y-3">
            <h3 className="text-mine-blue font-bold mb-3">矿车运输</h3>
            {mineCarts.map((cart) => (
              <div key={cart.id} className="p-3 rounded bg-mine-gray/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-mine-blue font-mono">{cart.number}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      cart.status === 'transporting'
                        ? 'bg-mine-blue/30 text-mine-blue'
                        : cart.status === 'loading'
                        ? 'bg-yellow-500/30 text-yellow-400'
                        : cart.status === 'unloading'
                        ? 'bg-orange-500/30 text-orange-400'
                        : 'bg-gray-500/30 text-gray-400'
                    }`}
                  >
                    {cart.status === 'transporting' ? '运输中' :
                     cart.status === 'loading' ? '装载中' :
                     cart.status === 'unloading' ? '卸载中' : '空闲'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-400">载重:</span>
                    <span className="ml-1 font-mono text-white">{cart.load}/{cart.maxLoad}吨</span>
                  </div>
                </div>
                {cart.currentTask && (
                  <div className="mt-2 text-xs text-gray-400">
                    📦 {cart.currentTask.from} → {cart.currentTask.to}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-panel w-80 h-full flex flex-col">
      <div className="flex border-b border-mine-blue/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'text-mine-blue border-b-2 border-mine-blue bg-mine-blue/10'
                : 'text-gray-400 hover:text-white hover:bg-mine-gray/50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {renderContent()}
      </div>
    </div>
  );
};
