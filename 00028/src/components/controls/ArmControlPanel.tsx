import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import Slider from '@/components/ui/Slider';

interface ArmControlPanelProps {
  armId: string;
}

const ArmControlPanel = ({ armId }: ArmControlPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const arm = useSceneStore((state) => state.arms.find((a) => a.id === armId));
  const setArmSpeed = useSceneStore((state) => state.setArmSpeed);
  const setArmAmplitude = useSceneStore((state) => state.setArmAmplitude);

  if (!arm) return null;

  return (
    <div className="mb-3 rounded-lg border border-industrial-border bg-industrial-panel backdrop-blur-sm overflow-hidden transition-all duration-300">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              arm.isColliding
                ? 'bg-industrial-danger animate-pulse'
                : 'bg-industrial-accent'
            }`}
          />
          <Cpu className="w-4 h-4 text-industrial-accent" />
          <span className="text-sm font-display text-white">{arm.name}</span>
          <span className="text-xs text-gray-500 font-mono">
            周期: {arm.cycleCount}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 border-t border-industrial-border/50">
          <Slider
            label="运动速度"
            value={arm.speed}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => setArmSpeed(armId, v)}
            unit="x"
          />
          <Slider
            label="运动幅度"
            value={arm.amplitude}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => setArmAmplitude(armId, v)}
          />

          <div className="mt-3 pt-3 border-t border-industrial-border/30">
            <div className="text-xs text-gray-500 mb-2 font-display">关节状态</div>
            <div className="grid grid-cols-5 gap-1">
              {arm.joints.map((joint, index) => (
                <div
                  key={index}
                  className={`text-center p-1 rounded ${
                    arm.collidingJoints.includes(index)
                      ? 'bg-industrial-danger/20 border border-industrial-danger'
                      : 'bg-industrial-bg/50'
                  }`}
                >
                  <div className="text-[10px] text-gray-500">J{index + 1}</div>
                  <div
                    className={`text-[10px] font-mono ${
                      arm.collidingJoints.includes(index)
                        ? 'text-industrial-danger'
                        : 'text-industrial-accent'
                    }`}
                  >
                    {((joint.angle * 180) / Math.PI).toFixed(0)}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArmControlPanel;
