import { useEffect } from 'react';
import { useStore } from './store/useAppStore';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import SingleMode from './pages/SingleMode';
import BatchMode from './pages/BatchMode';
import MemeMode from './pages/MemeMode';

export default function App() {
  const mode = useStore((s) => s.mode);
  const loadPresets = useStore((s) => s.loadPresets);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <Header />
      <TabNavigation />

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-float-up">
          {mode === 'single' && <SingleMode />}
          {mode === 'batch' && <BatchMode />}
          {mode === 'meme' && <MemeMode />}
        </div>
      </main>

      <footer className="border-t border-purple-500/20 px-6 py-4 text-center">
        <p className="font-vt text-sm text-purple-300/40">
          PIXEL FORGE · 像素风头像生成工坊 · 所有处理均在浏览器本地完成
        </p>
      </footer>
    </div>
  );
}
