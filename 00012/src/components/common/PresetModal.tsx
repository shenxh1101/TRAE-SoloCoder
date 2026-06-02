import { useState, useEffect } from 'react';
import { useStore } from '../../store/useAppStore';
import type { Preset } from '../../types';
import { X, Save, Trash2, Check } from 'lucide-react';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PresetModal({ isOpen, onClose }: PresetModalProps) {
  const { presets, loadPresets, savePreset, deletePreset, applyPreset, settings } = useStore();
  const [presetName, setPresetName] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setPresetName('');
      setAppliedId(null);
    }
  }, [isOpen, loadPresets]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    savePreset(trimmed);
    setPresetName('');
  };

  const handleApply = (preset: Preset) => {
    applyPreset(preset.id);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 1000);
  };

  const handleDelete = (id: string) => {
    deletePreset(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-none border-4 border-[#a855f7] bg-[#1a1a2e] p-5 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#a855f7]">预设管理</h2>
          <button
            onClick={onClose}
            className="rounded border border-[#a855f7]/30 p-1 text-[#a855f7]/60 transition-colors hover:border-[#a855f7] hover:text-[#a855f7]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入预设名称..."
            className="flex-1 rounded-none border-2 border-[#a855f7]/30 bg-[#0f0f23] px-3 py-2 text-sm text-white placeholder-[#a855f7]/30 outline-none transition-colors focus:border-[#a855f7]"
          />
          <button
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="flex items-center gap-1 rounded-none border-2 border-[#22c55e] bg-[#22c55e]/10 px-3 py-2 text-sm font-bold text-[#22c55e] transition-colors hover:bg-[#22c55e]/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Save size={14} />
            保存
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {presets.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#a855f7]/40">
              暂无预设
            </div>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between rounded-none border-2 border-[#a855f7]/15 bg-[#0f0f23] px-3 py-2.5 transition-colors hover:border-[#a855f7]/40"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{preset.name}</div>
                  <div className="mt-0.5 text-[10px] text-[#a855f7]/50">
                    像素: {preset.settings.blockSize}px · 色调: {preset.settings.tone}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleApply(preset)}
                    className="rounded border border-[#22c55e]/40 p-1.5 text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
                    title="应用预设"
                  >
                    {appliedId === preset.id ? <Check size={14} /> : <Check size={14} className="opacity-50" />}
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="rounded border border-red-500/40 p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                    title="删除预设"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
