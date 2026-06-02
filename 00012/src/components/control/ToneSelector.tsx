import { useStore } from '../../store/useAppStore';
import type { ToneType } from '../../types';

const TONE_OPTIONS: { value: ToneType; label: string; color: string }[] = [
  { value: 'original', label: '原色', color: '#e5e7eb' },
  { value: 'retro-green', label: '复古绿', color: '#4ade80' },
  { value: 'warm-brown', label: '暖棕', color: '#d97706' },
  { value: 'cyber-purple', label: '赛博紫', color: '#c084fc' },
];

export default function ToneSelector() {
  const tone = useStore((s) => s.settings.tone);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold tracking-wider text-purple-300 uppercase"
        style={{ fontFamily: 'monospace' }}>
        色调
      </label>

      <div className="grid grid-cols-2 gap-2">
        {TONE_OPTIONS.map((opt) => {
          const isActive = tone === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSettings({ tone: opt.value })}
              className="flex items-center gap-2 rounded-sm border px-3 py-2 transition-all duration-150"
              style={{
                borderColor: isActive ? opt.color : 'rgba(168,85,247,0.2)',
                backgroundColor: isActive ? `${opt.color}15` : 'transparent',
                boxShadow: isActive ? `0 0 12px ${opt.color}40, inset 0 0 8px ${opt.color}20` : 'none',
                fontFamily: 'monospace',
              }}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm border"
                style={{
                  backgroundColor: opt.color,
                  borderColor: isActive ? opt.color : 'transparent',
                }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: isActive ? opt.color : '#9ca3af' }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
