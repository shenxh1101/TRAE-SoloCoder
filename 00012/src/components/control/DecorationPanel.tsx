import { Plus, Trash2, Move, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '../../store/useAppStore';
import type { PlacedDecoration } from '../../types';
import { decorations, getDecorationById } from '../../utils/decorations';

function PixelPreview({ pixels, colors }: { pixels: number[][]; colors: string[] }) {
  const cols = pixels[0]?.length ?? 0;
  const pixelSize = 4;

  return (
    <div
      className="inline-grid gap-px"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
      }}
    >
      {pixels.flat().map((colorIndex, i) => (
        <div
          key={i}
          style={{
            width: pixelSize,
            height: pixelSize,
            backgroundColor: colorIndex === 0 ? 'transparent' : (colors[colorIndex - 1] || 'transparent'),
          }}
        />
      ))}
    </div>
  );
}

export default function DecorationPanel() {
  const addDecoration = useStore((s) => s.addDecoration);
  const removeDecoration = useStore((s) => s.removeDecoration);
  const updateDecoration = useStore((s) => s.updateDecoration);
  const placedDecorations = useStore((s) => s.placedDecorations);
  const selectedDecorationId = useStore((s) => s.selectedDecorationId);
  const setSelectedDecorationId = useStore((s) => s.setSelectedDecorationId);

  const handleAdd = (decorationId: string) => {
    const deco = decorations.find(d => d.id === decorationId);
    if (!deco) return;

    useStore.getState().addDecoration(
      decorationId,
      { x: deco.defaultX, y: deco.defaultY },
      deco.defaultScale
    );
  };

  const getPlacedDecorationName = (placed: PlacedDecoration) => {
    const decoration = getDecorationById(placed.decorationId);
    return decoration?.name ?? placed.decorationId;
  };

  const selectedDeco = placedDecorations.find(d => d.id === selectedDecorationId);

  const moveSelected = (dx: number, dy: number) => {
    if (!selectedDecorationId) return;
    const deco = placedDecorations.find(d => d.id === selectedDecorationId);
    if (!deco) return;
    useStore.getState().updateDecoration(selectedDecorationId, {
      x: Math.max(0, Math.min(100, deco.x + dx)),
      y: Math.max(0, Math.min(100, deco.y + dy))
    });
  };

  const scaleSelected = (delta: number) => {
    if (!selectedDecorationId) return;
    const deco = placedDecorations.find(d => d.id === selectedDecorationId);
    if (!deco) return;
    useStore.getState().updateDecoration(selectedDecorationId, {
      scale: Math.max(0.3, Math.min(3, deco.scale + delta))
    });
  };

  const handleRemove = (id: string) => {
    useStore.getState().removeDecoration(id);
  };

  return (
    <div className="space-y-3">
      <label className="font-pixel text-xs text-purple-400">装饰</label>

      <div className="grid grid-cols-3 gap-2">
        {decorations.map((deco) => (
          <button
            key={deco.id}
            onClick={() => handleAdd(deco.id)}
            className="flex flex-col items-center gap-1.5 border border-purple-500/20 bg-black/20 p-2 transition-all duration-150 hover:border-purple-500/50 hover:bg-purple-500/10"
          >
            <div className="flex h-8 items-center justify-center">
              <PixelPreview pixels={deco.pixels} colors={deco.colors} />
            </div>
            <span className="w-full truncate text-center font-vt text-[10px] text-gray-400">
              {deco.name}
            </span>
            <Plus className="h-3 w-3 text-purple-400" />
          </button>
        ))}
      </div>

      {placedDecorations.length > 0 && (
        <div className="space-y-2">
          <span className="font-pixel text-[10px] text-purple-400">已放置装饰</span>

          <div className="space-y-1">
            {placedDecorations.map((placed) => {
              const isActive = selectedDecorationId === placed.id;
              return (
                <div
                  key={placed.id}
                  onClick={() => setSelectedDecorationId(isActive ? null : placed.id)}
                  className="flex cursor-pointer items-center justify-between border px-2 py-1.5 transition-all duration-150"
                  style={{
                    borderColor: isActive ? '#a855f7' : 'rgba(168,85,247,0.15)',
                    backgroundColor: isActive ? 'rgba(168,85,247,0.1)' : 'transparent',
                    boxShadow: isActive ? '0 0 8px rgba(168,85,247,0.3)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Move className="h-3 w-3 text-purple-400" />
                    <span className="font-vt text-xs text-gray-300">
                      {getPlacedDecorationName(placed)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(placed.id);
                    }}
                    className="text-gray-500 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {selectedDeco && (
            <div className="border border-purple-500/20 bg-black/20 p-3 space-y-2">
              <span className="font-vt text-xs text-purple-300">调整位置和大小</span>

              <div className="grid grid-cols-3 grid-rows-3 gap-1 w-fit mx-auto">
                <div />
                <button onClick={() => moveSelected(0, -5)} className="border border-purple-500/30 bg-purple-500/10 p-1 text-purple-300 hover:bg-purple-500/20">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <div />
                <button onClick={() => moveSelected(-5, 0)} className="border border-purple-500/30 bg-purple-500/10 p-1 text-purple-300 hover:bg-purple-500/20">
                  <Move className="h-3 w-3" />
                </button>
                <div className="border border-purple-500/30 bg-black/30 p-1 flex items-center justify-center">
                  <span className="font-vt text-[8px] text-purple-300/60">{selectedDeco.x},{selectedDeco.y}</span>
                </div>
                <button onClick={() => moveSelected(5, 0)} className="border border-purple-500/30 bg-purple-500/10 p-1 text-purple-300 hover:bg-purple-500/20">
                  <Move className="h-3 w-3 rotate-180" />
                </button>
                <div />
                <button onClick={() => moveSelected(0, 5)} className="border border-purple-500/30 bg-purple-500/10 p-1 text-purple-300 hover:bg-purple-500/20">
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div />
              </div>

              <div className="flex items-center justify-center gap-2">
                <button onClick={() => scaleSelected(-0.1)} className="border border-purple-500/30 bg-purple-500/10 p-1.5 text-purple-300 hover:bg-purple-500/20">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-vt text-xs text-gray-400 w-12 text-center">{selectedDeco.scale.toFixed(1)}x</span>
                <button onClick={() => scaleSelected(0.1)} className="border border-purple-500/30 bg-purple-500/10 p-1.5 text-purple-300 hover:bg-purple-500/20">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
