import React from 'react';
import { useMineStore } from '../../store/useMineStore';
import { exportDailyReport } from '../../utils/exportExcel';

export const StatusBar: React.FC = () => {
  const {
    currentTime,
    totalOutput,
    workFaces,
    workers,
    equipment,
    emergencyActive,
    emergencyType,
    triggerEmergency,
    clearEmergency,
    dailyReports,
  } = useMineStore();

  const warningCount = workFaces.filter(wf => wf.isWarning).length;
  const runningEquipment = equipment.filter(eq => eq.status === 'running').length;
  const workersInDanger = workers.filter(w => w.isInDangerZone).length;

  return (
    <div className="glass-panel px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-mine-blue text-xl">⛏️</span>
          <span className="text-white font-bold text-lg">智慧矿山管控平台</span>
        </div>

        <div className="h-8 w-px bg-mine-blue/30" />

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-gray-400 text-xs">当前时间</div>
            <div className="text-white font-mono text-sm">{currentTime}</div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs">今日产量</div>
            <div className="text-mine-yellow font-bold font-mono">
              {totalOutput.toLocaleString()} <span className="text-xs">吨</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs">采掘面状态</div>
            <div className="flex items-center gap-1">
              <span className="text-mine-green font-mono">{workFaces.length - warningCount}</span>
              <span className="text-gray-500">/</span>
              <span className="text-white font-mono">{workFaces.length}</span>
              {warningCount > 0 && (
                <span className="text-mine-red text-xs ml-1 animate-pulse">
                  ({warningCount}预警)
                </span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs">下井人员</div>
            <div className="flex items-center gap-1">
              <span className="text-white font-mono">{workers.length}</span>
              <span className="text-gray-500 text-xs">人</span>
              {workersInDanger > 0 && (
                <span className="text-mine-red text-xs animate-pulse">
                  ({workersInDanger}危险)
                </span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs">设备运行</div>
            <div className="flex items-center gap-1">
              <span className="text-mine-green font-mono">{runningEquipment}</span>
              <span className="text-gray-500">/</span>
              <span className="text-white font-mono">{equipment.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {emergencyActive ? (
          <button
            onClick={clearEmergency}
            className="bg-mine-green text-white px-4 py-2 rounded font-bold text-sm hover:bg-green-600 transition-colors"
          >
            ✅ 解除应急
          </button>
        ) : (
          <>
            <button
              onClick={() => triggerEmergency('collapse')}
              className="bg-mine-red text-white px-3 py-2 rounded font-bold text-sm hover:bg-red-600 transition-colors"
            >
              🚨 冒顶演练
            </button>
            <button
              onClick={() => triggerEmergency('flood')}
              className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              💧 透水演练
            </button>
          </>
        )}

        <button
          onClick={() => dailyReports.length > 0 && exportDailyReport(dailyReports[0])}
          className="bg-mine-blue text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          📊 导出日报
        </button>
      </div>

      {emergencyActive && (
        <div className="absolute top-full left-0 right-0 bg-mine-red text-white text-center py-2 font-bold animate-pulse">
          ⚠️ {emergencyType === 'collapse' ? '冒顶事故' : '透水事故'}应急响应中！请所有人员立即撤离！
        </div>
      )}
    </div>
  );
};
