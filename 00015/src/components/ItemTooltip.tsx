import { useGlassBallStore } from '@/store/useGlassBallStore';
import { X } from 'lucide-react';

export function ItemTooltip() {
  const showItemTooltip = useGlassBallStore((s) => s.showItemTooltip);
  const selectedItem = useGlassBallStore((s) => s.selectedItem);
  const setShowItemTooltip = useGlassBallStore((s) => s.setShowItemTooltip);
  const selectItem = useGlassBallStore((s) => s.selectItem);

  if (!showItemTooltip || !selectedItem) return null;

  const handleClose = () => {
    setShowItemTooltip(false);
    selectItem(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="max-w-sm bg-black/80 backdrop-blur-xl border rounded-xl p-6 shadow-2xl opacity-100 scale-100 transition-all duration-300"
        style={{ borderColor: 'rgba(201,169,110,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold" style={{ color: '#c9a96e' }}>
            {selectedItem.name}
          </h3>
          <button
            onClick={handleClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">
          {selectedItem.description}
        </p>
      </div>
    </div>
  );
}
