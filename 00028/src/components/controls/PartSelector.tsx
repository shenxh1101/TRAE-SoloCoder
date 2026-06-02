import { Box, Circle, Cylinder, Hexagon } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { PartType, PART_TYPES, PART_COLORS } from '@/types/part';

const partIcons: Record<PartType, React.ReactNode> = {
  cube: <Box className="w-4 h-4" />,
  cylinder: <Cylinder className="w-4 h-4" />,
  sphere: <Circle className="w-4 h-4" />,
  gear: <Hexagon className="w-4 h-4" />,
};

const partLabels: Record<PartType, string> = {
  cube: '立方体',
  cylinder: '圆柱体',
  sphere: '球体',
  gear: '齿轮',
};

const PartSelector = () => {
  const selectedPartType = useSceneStore((state) => state.selectedPartType);
  const setSelectedPartType = useSceneStore((state) => state.setSelectedPartType);

  return (
    <div className="mb-4 p-3 rounded-lg border border-industrial-border bg-industrial-panel backdrop-blur-sm">
      <div className="text-xs text-gray-400 font-display mb-3">零件类型</div>
      <div className="grid grid-cols-2 gap-2">
        {PART_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedPartType(type)}
            className={`flex items-center gap-2 p-2 rounded border transition-all duration-200 ${
              selectedPartType === type
                ? 'border-industrial-accent bg-industrial-accent/10 text-industrial-accent'
                : 'border-industrial-border/50 text-gray-400 hover:border-industrial-accent/50 hover:text-white'
            }`}
            style={{
              boxShadow:
                selectedPartType === type
                  ? `0 0 10px ${PART_COLORS[type]}40`
                  : 'none',
            }}
          >
            <span
              style={{
                color:
                  selectedPartType === type ? PART_COLORS[type] : undefined,
              }}
            >
              {partIcons[type]}
            </span>
            <span className="text-xs font-display">{partLabels[type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PartSelector;
