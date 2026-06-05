import React from 'react';
import type { WorkFace } from '../../data/types';
import { useMineStore } from '../../store/useMineStore';
import { GasChart } from '../charts/GasChart';

interface WorkFaceDetailPanelProps {
  workFace: WorkFace;
}

export const WorkFaceDetailPanel: React.FC<WorkFaceDetailPanelProps> = ({ workFace }) => {
  const setSelectedWorkFace = useMineStore((state) => state.setSelectedWorkFace);

  const getStatusColor = (value: number, threshold: number) => {
    return value >= threshold ? 'text-mine-red' : 'text-mine-green';
  };

  return (
    <div className="glass-panel rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto scrollbar-thin">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-mine-blue text-glow-blue">
          {workFace.name}
        </h2>
        <button
          onClick={() => setSelectedWorkFace(null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {workFace.isWarning && (
        <div className="bg-red-900/50 border border-mine-red rounded p-3 mb-4 warning-border">
          <div className="flex items-center gap-2 text-mine-red">
            <span className="text-xl">⚠️</span>
            <span className="font-bold">瓦斯浓度超标！已自动启动通风机</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-mine-gray/50 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">当前进尺</div>
          <div className="text-xl font-bold text-white font-mono">
            {workFace.progress}
            <span className="text-sm text-gray-400 ml-1">m</span>
          </div>
        </div>
        <div className="bg-mine-gray/50 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">日产量</div>
          <div className="text-xl font-bold text-mine-yellow font-mono">
            {workFace.dailyOutput}
            <span className="text-sm text-gray-400 ml-1">吨</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="bg-mine-gray/50 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">瓦斯浓度</span>
            <span className={`font-bold font-mono ${getStatusColor(workFace.gasConcentration, 0.8)}`}>
              {workFace.gasConcentration.toFixed(2)}%
            </span>
          </div>
          <div className="h-2 bg-mine-dark rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${workFace.gasConcentration >= 0.8 ? 'bg-mine-red' : 'bg-mine-green'}`}
              style={{ width: `${(workFace.gasConcentration / 1.2) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="text-mine-red">预警阈值 0.8%</span>
            <span>1.2%</span>
          </div>
        </div>

        <div className="bg-mine-gray/50 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">粉尘浓度</span>
            <span className={`font-bold font-mono ${getStatusColor(workFace.dustConcentration, 10)}`}>
              {workFace.dustConcentration.toFixed(1)} mg/m³
            </span>
          </div>
          <div className="h-2 bg-mine-dark rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${workFace.dustConcentration >= 10 ? 'bg-mine-yellow' : 'bg-mine-blue'}`}
              style={{ width: `${(workFace.dustConcentration / 20) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-mine-gray/50 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">温度</span>
            <span className={`font-bold font-mono ${getStatusColor(workFace.temperature, 30)}`}>
              {workFace.temperature.toFixed(1)}°C
            </span>
          </div>
          <div className="h-2 bg-mine-dark rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${workFace.temperature >= 30 ? 'bg-mine-red' : 'bg-mine-blue'}`}
              style={{ width: `${((workFace.temperature - 20) / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <GasChart data={workFace.gasHistory} name={workFace.name} />
      </div>

      <div>
        <h3 className="text-mine-blue font-bold mb-2">支护记录</h3>
        <div className="space-y-2">
          {workFace.supportRecords.map((record) => (
            <div key={record.id} className="bg-mine-gray/50 rounded p-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">{record.date}</span>
                <span className="text-mine-blue">{record.type}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>数量: {record.quantity}根</span>
                <span>操作员: {record.operator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
