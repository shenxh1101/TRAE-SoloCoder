import { useStore } from '../../store/useAppStore';
import type { ModeType } from '../../types';

const TABS: { key: ModeType; label: string }[] = [
  { key: 'single', label: '单张处理' },
  { key: 'batch', label: '批量工坊' },
  { key: 'meme', label: '趣味表情' },
];

export default function TabNavigation() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <nav className="flex border-b-2 border-purple-500/20 bg-[#1a1a2e]">
      {TABS.map((tab) => {
        const isActive = mode === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className="relative flex-1 px-6 py-3 text-base tracking-wide transition-all"
            style={{
              fontFamily: '"VT323", monospace',
              color: isActive ? '#a855f7' : '#6b7280',
              backgroundColor: isActive ? 'rgba(168,85,247,0.08)' : 'transparent',
              borderBottom: isActive ? '3px solid #a855f7' : '3px solid transparent',
              boxShadow: isActive
                ? '0 2px 12px rgba(168,85,247,0.3), 0 -1px 4px rgba(168,85,247,0.1)'
                : 'none',
              textShadow: isActive ? '0 0 8px rgba(168,85,247,0.5)' : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
