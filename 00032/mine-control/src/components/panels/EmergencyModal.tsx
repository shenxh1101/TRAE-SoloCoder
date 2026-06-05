import React from 'react';
import { useMineStore } from '../../store/useMineStore';

export const EmergencyModal: React.FC = () => {
  const { emergencyActive, emergencyType, clearEmergency, workers } = useMineStore();

  if (!emergencyActive) return null;

  const isCollapse = emergencyType === 'collapse';
  const title = isCollapse ? '🚨 冒顶事故应急响应' : '💧 透水事故应急响应';
  const description = isCollapse
    ? '井下发生冒顶事故，请所有人员立即按照避灾路线撤离！'
    : '井下发生透水事故，请所有人员立即按照避灾路线撤离至高处！';
  const borderColor = isCollapse ? '#FF3B3B' : '#3B82F6';
  const titleColor = isCollapse ? '#FF3B3B' : '#3B82F6';

  const workersInDanger = workers.filter(w => w.isInDangerZone).length;
  const workersEvacuating = workers.filter(w => w.status === 'evacuating').length;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div 
        className="glass-panel rounded-xl p-8 max-w-2xl w-full mx-4 animate-pulse"
        style={{ border: `2px solid ${borderColor}` }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: titleColor }}>
            {title}
          </h1>
          
          <p className="text-xl text-white mb-6">
            {description}
          </p>

          <div className="bg-mine-gray/50 rounded-lg p-4 mb-6">
            <h3 className="text-mine-blue font-bold mb-3 text-left">📋 应急预案</h3>
            <div className="text-left text-sm text-gray-300 space-y-2">
              {isCollapse ? (
                <>
                  <p>1. 保持冷静，立即停止作业，撤离至安全区域</p>
                  <p>2. 检查自身安全，佩戴自救器</p>
                  <p>3. 按照红色避灾箭头指示方向撤离</p>
                  <p>4. 严禁通过冒顶区域，选择备用路线</p>
                  <p>5. 到达安全地点后立即报告调度中心</p>
                </>
              ) : (
                <>
                  <p>1. 保持冷静，立即向高处撤离</p>
                  <p>2. 佩戴自救器，避免吸入有害气体</p>
                  <p>3. 按照红色避灾箭头指示方向撤离</p>
                  <p>4. 严禁涉水通过淹没区域</p>
                  <p>5. 到达安全地点后立即报告调度中心</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-mine-gray/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-mine-red">{workers.length}</div>
              <div className="text-xs text-gray-400">井下人员</div>
            </div>
            <div className="bg-mine-gray/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-400">{workersInDanger}</div>
              <div className="text-xs text-gray-400">危险区域</div>
            </div>
            <div className="bg-mine-gray/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{workersEvacuating}</div>
              <div className="text-xs text-gray-400">撤离中</div>
            </div>
          </div>

          <div className="bg-mine-gray/50 rounded-lg p-4 mb-6">
            <h3 className="text-mine-blue font-bold mb-2">📄 应急预案PDF</h3>
            <div className="flex items-center justify-between bg-mine-dark/50 rounded p-2 mb-2">
              <span className="text-sm text-white">
                {isCollapse ? '冒顶事故应急预案_v2026.pdf' : '透水事故应急预案_v2026.pdf'}
              </span>
              <button 
                className="text-mine-blue text-sm hover:underline"
                onClick={() => {
                  const pdfContent = isCollapse
                    ? '冒顶事故应急预案\n1. 立即停止作业\n2. 撤离至安全区域\n3. 按避灾路线撤离\n4. 报告调度中心'
                    : '透水事故应急预案\n1. 立即向高处撤离\n2. 佩戴自救器\n3. 严禁涉水\n4. 报告调度中心';
                  const blob = new Blob([pdfContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
              >
                打开查看
              </button>
            </div>
            <div className="flex items-center justify-between bg-mine-dark/50 rounded p-2">
              <span className="text-sm text-white">矿山综合应急救援预案_v2026.pdf</span>
              <button 
                className="text-mine-blue text-sm hover:underline"
                onClick={() => {
                  const pdfContent = '矿山综合应急救援预案\n\n一、冒顶事故应急\n1. 立即停止作业，撤离至安全区域\n2. 佩戴自救器，按避灾路线撤离\n3. 报告调度中心\n\n二、透水事故应急\n1. 立即向高处撤离\n2. 严禁涉水通过淹没区域\n3. 报告调度中心\n\n三、瓦斯事故应急\n1. 立即切断电源\n2. 佩戴自救器撤离\n3. 报告调度中心';
                  const blob = new Blob([pdfContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
              >
                打开查看
              </button>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={clearEmergency}
              className="bg-mine-green text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
            >
              ✅ 解除应急状态
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
