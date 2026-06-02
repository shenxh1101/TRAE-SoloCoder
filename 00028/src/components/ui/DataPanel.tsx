import { Activity, Gauge, RotateCcw, AlertTriangle } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { radToDeg } from '@/utils/kinematics';

const DataPanel = () => {
  const arms = useSceneStore((state) => state.arms);
  const parts = useSceneStore((state) => state.parts);
  const hasCollision = arms.some((arm) => arm.isColliding);

  const totalCycles = arms.reduce((sum, arm) => sum + arm.cycleCount, 0);
  const assembledParts = parts.filter((p) => p.isAssembled).length;
  const activeParts = parts.filter((p) => !p.isAssembled).length;

  return (
    <div className="fixed right-4 top-20 w-72 z-40">
      <div className="rounded-lg border border-industrial-border bg-industrial-panel backdrop-blur-md overflow-hidden">
        <div className="p-3 border-b border-industrial-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-industrial-accent" />
            <span className="text-sm font-display text-white">实时数据</span>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {hasCollision && (
            <div className="flex items-center gap-2 p-2 rounded bg-industrial-danger/10 border border-industrial-danger/30 animate-pulse-glow">
              <AlertTriangle className="w-4 h-4 text-industrial-danger flex-shrink-0" />
              <span className="text-xs text-industrial-danger font-display">
                检测到碰撞干涉！
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-industrial-bg/50">
              <div className="text-[10px] text-gray-500 mb-1">总周期</div>
              <div className="text-lg font-mono text-industrial-accent">
                {totalCycles}
              </div>
            </div>
            <div className="text-center p-2 rounded bg-industrial-bg/50">
              <div className="text-[10px] text-gray-500 mb-1">已装配</div>
              <div className="text-lg font-mono text-industrial-success">
                {assembledParts}
              </div>
            </div>
            <div className="text-center p-2 rounded bg-industrial-bg/50">
              <div className="text-[10px] text-gray-500 mb-1">活动件</div>
              <div className="text-lg font-mono text-industrial-warning">
                {activeParts}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {arms.map((arm) => (
              <div
                key={arm.id}
                className={`p-2 rounded border ${
                  arm.isColliding
                    ? 'border-industrial-danger/50 bg-industrial-danger/5'
                    : 'border-industrial-border/30 bg-industrial-bg/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        arm.isColliding
                          ? 'bg-industrial-danger animate-pulse'
                          : 'bg-industrial-accent'
                      }`}
                    />
                    <span className="text-xs font-display text-white">
                      {arm.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <RotateCcw className="w-3 h-3" />
                    <span className="font-mono">{arm.cycleCount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {arm.joints.map((joint, index) => (
                    <div
                      key={index}
                      className={`text-center p-1 rounded ${
                        arm.collidingJoints.includes(index)
                          ? 'bg-industrial-danger/20'
                          : 'bg-black/20'
                      }`}
                    >
                      <div className="text-[9px] text-gray-600">J{index + 1}</div>
                      <div
                        className={`text-[10px] font-mono ${
                          arm.collidingJoints.includes(index)
                            ? 'text-industrial-danger'
                            : 'text-gray-400'
                        }`}
                      >
                        {radToDeg(joint.angle).toFixed(1)}°
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Gauge className="w-3 h-3 text-gray-500" />
                  <div className="flex-1">
                    <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-industrial-accent to-cyan-300"
                        style={{ width: `${(arm.speed / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {arm.speed.toFixed(1)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPanel;
