import React from 'react';
import { Droplets, Package, ArrowUpRight, ArrowDownRight, Thermometer, AlertTriangle, TrendingUp } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { StatCard } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useBloodBankStore } from '@/store';
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS, BLOOD_TYPE_COLORS } from '@/types';
import { get3DayThreshold, getDaysOfSupply, calculateInventoryStats } from '@/utils/bloodTypeUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export const LeftPanel: React.FC = () => {
  const { bloodBags, coldStorage, transfusionRequests, inventoryAlerts } = useBloodBankStore();
  
  const stats = calculateInventoryStats(bloodBags);
  const bloodTypes: ('A' | 'B' | 'AB' | 'O')[] = ['A', 'B', 'AB', 'O'];
  const components: ('whole_blood' | 'plasma' | 'platelet')[] = ['whole_blood', 'plasma', 'platelet'];
  
  const totalAvailable = Object.values(stats).reduce((sum, bt) => 
    sum + Object.values(bt).reduce((s, c) => s + c.available, 0), 0
  );
  
  const totalAllocated = Object.values(stats).reduce((sum, bt) => 
    sum + Object.values(bt).reduce((s, c) => s + (c.total - c.available), 0), 0
  );
  
  const today = new Date().toISOString().split('T')[0];
  const todayIn = bloodBags.filter(b => b.collectionDate === today).length;
  const todayOut = bloodBags.filter(b => b.status === 'used' || b.status === 'allocated').length;
  
  const pendingRequests = transfusionRequests.filter(r => 
    r.status === 'doctor_approved' || r.status === 'director_approved'
  ).length;
  
  const activeAlerts = inventoryAlerts.filter(a => !a.acknowledged).length;

  const chartData = bloodTypes.map(bt => ({
    name: bt,
    全血: stats[bt].whole_blood.available,
    全血阈值: get3DayThreshold(bt, 'whole_blood'),
    血浆: stats[bt].plasma.available,
    血浆阈值: get3DayThreshold(bt, 'plasma'),
    血小板: stats[bt].platelet.available,
    血小板阈值: get3DayThreshold(bt, 'platelet')
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-slate-200 text-sm font-medium mb-2">{label}型</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value} 袋
              {entry.name.includes('阈值') ? ' (3天用量)' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-80 space-y-4 p-4 overflow-y-auto h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="库存总量"
          value={totalAvailable}
          icon={<Package size={18} />}
          color="blue"
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          label="已分配"
          value={totalAllocated}
          icon={<Droplets size={18} />}
          color="purple"
        />
        <StatCard
          label="今日入库"
          value={todayIn}
          icon={<ArrowDownRight size={18} />}
          color="green"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          label="今日出库"
          value={todayOut}
          icon={<ArrowUpRight size={18} />}
          color="yellow"
        />
      </div>
      
      <Panel title="冷库温度监控" icon={<Thermometer size={16} />}>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold font-mono" style={{ 
                color: coldStorage.alertStatus === 'critical' ? '#F53F3F' : 
                       coldStorage.alertStatus === 'warning' ? '#FF7D00' : '#00B42A' 
              }}>
                {coldStorage.currentTemperature.toFixed(1)}℃
              </p>
              <p className="text-xs text-slate-400">当前温度</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">2-6℃</p>
              <p className="text-xs text-slate-400">正常范围</p>
            </div>
          </div>
          
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500" 
                 style={{ width: '100%', opacity: 0.3 }} />
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ 
                left: `${((coldStorage.currentTemperature - 1) / 7) * 100}%`,
                boxShadow: '0 0 10px rgba(255,255,255,0.8)'
              }} 
            />
            <div className="absolute top-0 bottom-0 left-[14%] w-px bg-green-500/50" />
            <div className="absolute top-0 bottom-0 left-[71%] w-px bg-green-500/50" />
          </div>
          
          <div className="flex justify-between text-xs text-slate-500">
            <span>1℃</span>
            <span className="text-green-400">2℃</span>
            <span>4℃</span>
            <span className="text-green-400">6℃</span>
            <span>8℃</span>
          </div>
          
          {coldStorage.backupCoolingActive && (
            <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
              <AlertTriangle size={16} className="text-red-400 animate-pulse" />
              <div>
                <p className="text-xs font-medium text-red-400">备用制冷已启动</p>
                <p className="text-xs text-slate-400">温度正在恢复中...</p>
              </div>
            </div>
          )}
        </div>
      </Panel>
      
      <Panel title="库存统计" icon={<TrendingUp size={16} />} collapsible defaultCollapsed>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="全血" fill="#165DFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="血浆" fill="#00B42A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="血小板" fill="#722ED1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      
      <Panel title="各血型库存详情" icon={<Droplets size={16} />} collapsible defaultCollapsed>
        <div className="space-y-3">
          {bloodTypes.map(bt => (
            <div key={bt} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: BLOOD_TYPE_COLORS[bt] }}
                  >
                    {bt}
                  </div>
                  <span className="text-sm font-medium text-slate-200">{BLOOD_TYPE_LABELS[bt]}</span>
                </div>
                <Badge variant={totalAvailable < get3DayThreshold(bt, 'whole_blood') ? 'warning' : 'success'}>
                  {getDaysOfSupply(bt, 'whole_blood', stats[bt].whole_blood.available).toFixed(1)}天
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                {components.map(comp => {
                  const available = stats[bt][comp].available;
                  const threshold = get3DayThreshold(bt, comp);
                  const isLow = available < threshold;
                  
                  return (
                    <div key={comp} className="text-center">
                      <p className="text-slate-400">{COMPONENT_LABELS[comp]}</p>
                      <p className={cn(
                        'font-bold font-mono',
                        isLow ? 'text-yellow-400' : 'text-slate-200'
                      )}>
                        {available}/{threshold}
                      </p>
                      <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={cn('h-full rounded-full', isLow ? 'bg-yellow-500' : 'bg-green-500')}
                          style={{ width: `${Math.min((available / threshold) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
