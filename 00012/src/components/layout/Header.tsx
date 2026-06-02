import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from '../../store/useAppStore';
import PresetModal from '../../components/common/PresetModal';

export default function Header() {
  const [showPresetModal, setShowPresetModal] = useState(false);

  return (
    <header className="relative border-b-2 border-purple-500/30 bg-[#1a1a2e] px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Zap className="h-8 w-8 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
          <div>
            <h1
              className="text-2xl tracking-wider text-purple-400"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                textShadow: '0 0 10px rgba(168,85,247,0.8), 0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.2)',
              }}
            >
              PIXEL FORGE
            </h1>
            <p
              className="mt-1 text-lg text-purple-300/70"
              style={{ fontFamily: '"VT323", monospace' }}
            >
              像素风头像生成工坊
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPresetModal(true)}
          className="border-2 border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition-all hover:border-purple-400 hover:bg-purple-500/20 hover:text-purple-200"
          style={{ fontFamily: '"VT323", monospace' }}
        >
          预设方案
        </button>
      </div>

      <PresetModal isOpen={showPresetModal} onClose={() => setShowPresetModal(false)} />
    </header>
  );
}
