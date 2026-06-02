import { Building2, Ruler } from 'lucide-react';
import { usePagodaStore, calculatePagodaHeight } from '@/store/usePagodaStore';

export default function InfoBar() {
  const { config } = usePagodaStore();
  const height = calculatePagodaHeight(config.floors);

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-xl">
        <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
          <Building2 size={18} />
          宝塔信息
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Building2 size={14} />
              层数
            </span>
            <span className="text-white font-medium">{config.floors} 层</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Ruler size={14} />
              总高度
            </span>
            <span className="text-white font-medium">{height.toFixed(1)} 米</span>
          </div>
        </div>
      </div>
    </div>
  );
}
