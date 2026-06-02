import { useState, useEffect } from 'react';
import { Scene, type GlWithRefs } from '@/components/Scene';
import { Toolbar } from '@/components/Toolbar';
import { ImageViewer } from '@/components/ImageViewer';
import '@/utils/test-large-config';

export default function Home() {
  const [gl, setGl] = useState<GlWithRefs | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#0a0e27]">
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Scene onGlReady={setGl} />
      </div>

      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0a0e27]/40 via-transparent to-transparent transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <Toolbar gl={gl} />
      <ImageViewer />

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs font-serif tracking-wider pointer-events-none">
        拖拽旋转视角 · 点击碎片查看详情 · 梦境中悬浮的记忆
      </div>
    </div>
  );
}
