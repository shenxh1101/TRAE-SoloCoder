import { useState } from 'react';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import ArmControlPanel from './ArmControlPanel';
import PartSelector from './PartSelector';

const ControlPanel = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-72'
      }`}
    >
      <div
        className={`h-full bg-industrial-panel/95 backdrop-blur-md border-r border-industrial-border overflow-hidden transition-all duration-300 ${
          isCollapsed ? 'opacity-50 hover:opacity-100' : ''
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-industrial-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-industrial-accent" />
              <span className="text-sm font-display text-white">控制面板</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-3 overflow-y-auto h-[calc(100%-52px)]">
            <PartSelector />

            <div className="text-xs text-gray-400 font-display mb-2 mt-4">
              机械臂控制
            </div>

            <ArmControlPanel armId="arm-1" />
            <ArmControlPanel armId="arm-2" />
            <ArmControlPanel armId="arm-3" />

            <div className="mt-4 p-3 rounded-lg border border-industrial-border/30 bg-industrial-bg/30">
              <div className="text-xs text-gray-500 font-display mb-2">
                使用说明
              </div>
              <ul className="text-[11px] text-gray-500 space-y-1 font-mono">
                <li>• 拖动滑块调节速度和幅度</li>
                <li>• 提高幅度可能导致碰撞</li>
                <li>• 红色高亮表示碰撞干涉</li>
                <li>• 使用鼠标旋转缩放视角</li>
                <li>• 附着模式跟随机械臂运动</li>
              </ul>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="p-3 flex flex-col items-center gap-4 mt-4">
            <div className="w-2 h-2 rounded-full bg-industrial-accent animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-industrial-accent/70" />
            <div className="w-2 h-2 rounded-full bg-industrial-accent/40" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
