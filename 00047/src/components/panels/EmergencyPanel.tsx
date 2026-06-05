import { useState } from 'react';
import { Truck, Ambulance, Flame, MapPin, Navigation, Zap, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleType } from '@/types';
import { mockVehicles, mockEmergencyRoutes, mockPoliceOfficers } from '@/data/mockData';

interface EmergencyPanelProps {
  onDispatchPolice?: (officerId: string) => void;
  onActivateGreenWave?: (routeId: string) => void;
}

const vehicleTypeIcons: Record<VehicleType, typeof Truck> = {
  car: Truck,
  bus: Truck,
  fire: Flame,
  ambulance: Ambulance,
};

const vehicleTypeNames: Record<VehicleType, string> = {
  car: '社会车辆',
  bus: '公交车辆',
  fire: '消防车',
  ambulance: '救护车',
};

const vehicleTypeColors: Record<VehicleType, string> = {
  car: 'text-cyan-400',
  bus: 'text-yellow-400',
  fire: 'text-red-400',
  ambulance: 'text-green-400',
};

const vehicleTypeBgs: Record<VehicleType, string> = {
  car: 'bg-cyan-500/10 border-cyan-500/30',
  bus: 'bg-yellow-500/10 border-yellow-500/30',
  fire: 'bg-red-500/10 border-red-500/30',
  ambulance: 'bg-green-500/10 border-green-500/30',
};

export default function EmergencyPanel({
  onDispatchPolice,
  onActivateGreenWave,
}: EmergencyPanelProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [greenWaveSpeed, setGreenWaveSpeed] = useState(50);
  const [priorityLevel, setPriorityLevel] = useState(1);

  const emergencyVehicles = mockVehicles.filter(
    (v) => v.type === 'fire' || v.type === 'ambulance'
  );

  const activeRoutes = mockEmergencyRoutes.filter((r) => r.active);

  const handleDispatch = (officer: typeof mockPoliceOfficers[0]) => {
    if (officer.status === 'available') {
      onDispatchPolice?.(officer.id);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-bold text-cyan-300 font-display tracking-wide">应急调度中心</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10">
          <div className="text-xs text-red-400/70 mb-1">出动消防车</div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {emergencyVehicles.filter((v) => v.type === 'fire').length}
          </div>
        </div>
        <div className="p-3 rounded border border-green-500/30 bg-green-500/10">
          <div className="text-xs text-green-400/70 mb-1">出动救护车</div>
          <div className="text-2xl font-bold font-mono text-green-400">
            {emergencyVehicles.filter((v) => v.type === 'ambulance').length}
          </div>
        </div>
      </div>

      <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
        <h4 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          特种车辆列表
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {emergencyVehicles.length > 0 ? (
            emergencyVehicles.map((vehicle) => {
              const Icon = vehicleTypeIcons[vehicle.type];
              const hasActiveRoute = activeRoutes.some((r) => r.vehicleId === vehicle.id);

              return (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={cn(
                    "p-3 rounded border cursor-pointer transition-all duration-300",
                    "flex items-center justify-between",
                    selectedVehicle?.id === vehicle.id
                      ? "border-cyan-500/50 bg-cyan-500/15 shadow-cyber"
                      : `${vehicleTypeBgs[vehicle.type]} hover:border-cyan-500/40`
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded", vehicleTypeBgs[vehicle.type])}>
                      <Icon className={cn("w-5 h-5", vehicleTypeColors[vehicle.type])} />
                    </div>
                    <div>
                      <div className={cn("text-sm font-medium", vehicleTypeColors[vehicle.type])}>
                        {vehicleTypeNames[vehicle.type]}
                      </div>
                      <div className="text-xs font-mono text-cyan-500/70">
                        {vehicle.plateNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasActiveRoute && (
                      <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        绿波开启
                      </span>
                    )}
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      hasActiveRoute ? 'bg-green-400' : 'bg-yellow-400'
                    )} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-cyan-500/50 text-sm">
              当前无特种车辆任务
            </div>
          )}
        </div>
      </div>

      {selectedVehicle && (
        <div className="p-4 rounded border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              车辆详情 - {selectedVehicle.plateNumber}
            </h4>
            <button
              onClick={() => onActivateGreenWave?.(selectedVehicle.id)}
              className="flex items-center gap-2 px-4 py-2 rounded bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all duration-300 font-medium shadow-cyber-red"
            >
              <Zap className="w-4 h-4" />
              一键派警
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-xs text-cyan-500/70">
              车速: <span className="text-cyan-300 font-mono">{selectedVehicle.speed.toFixed(0)} km/h</span>
            </div>
            <div className="text-xs text-cyan-500/70">
              线路: <span className="text-cyan-300 font-mono">{selectedVehicle.route}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-cyan-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  绿波车速
                </label>
                <span className="text-xs font-mono text-cyan-300">{greenWaveSpeed} km/h</span>
              </div>
              <input
                type="range"
                min="30"
                max="80"
                value={greenWaveSpeed}
                onChange={(e) => setGreenWaveSpeed(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500"
                style={{
                  background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${((greenWaveSpeed - 30) / 50) * 100}%, rgba(56, 139, 253, 0.2) ${((greenWaveSpeed - 30) / 50) * 100}%, rgba(56, 139, 253, 0.2) 100%)`
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-cyan-400 flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  优先级
                </label>
                <span className="text-xs font-mono text-yellow-300">
                  {priorityLevel === 1 ? '一般' : priorityLevel === 2 ? '紧急' : '特级'}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    onClick={() => setPriorityLevel(level)}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded border transition-all duration-300",
                      priorityLevel === level
                        ? level === 1
                          ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                          : level === 2
                          ? "bg-yellow-500/30 border-yellow-400 text-yellow-200"
                          : "bg-red-500/30 border-red-400 text-red-200"
                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-500/70 hover:bg-cyan-500/20"
                    )}
                  >
                    {level === 1 ? '一般' : level === 2 ? '紧急' : '特级'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
        <h4 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          沿途绿波控制状态
        </h4>
        <div className="space-y-2">
          {activeRoutes.length > 0 ? (
            activeRoutes.map((route) => (
              <div
                key={route.id}
                className="p-3 rounded border border-green-500/30 bg-green-500/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-sm text-green-300">绿波带已激活</span>
                  </div>
                  <span className="text-xs font-mono text-cyan-500/70">
                    {route.startTime.toLocaleTimeString('zh-CN')}
                  </span>
                </div>
                <div className="text-xs text-cyan-500/70">
                  途径路口: {route.waypoints.length + 2} 个
                </div>
                <div className="mt-2 h-1 bg-cyber-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full animate-pulse" style={{ width: '65%' }} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-cyan-500/50 text-sm">
              当前无激活的绿波带
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded border border-cyber-border bg-cyber-bg/30">
        <h4 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          可调度警力
        </h4>
        <div className="space-y-2">
          {mockPoliceOfficers.map((officer) => (
            <div
              key={officer.id}
              className="p-3 rounded border border-cyber-border bg-cyber-bg/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-cyber-bg font-bold text-sm">
                  {officer.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm text-cyan-200">{officer.name}</div>
                  <div className={cn(
                    "text-xs",
                    officer.status === 'available' ? 'text-green-400' : 'text-yellow-400'
                  )}>
                    {officer.status === 'available' ? '在岗待命' : '执行任务中'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDispatch(officer)}
                disabled={officer.status !== 'available'}
                className={cn(
                  "px-3 py-1.5 text-xs rounded border transition-all duration-300",
                  officer.status === 'available'
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30"
                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 cursor-not-allowed"
                )}
              >
                派警
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
