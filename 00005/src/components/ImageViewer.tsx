import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { useSceneStore } from '../store/useSceneStore';

const AUTO_CLOSE_MS = 5000;

export const ImageViewer = () => {
  const isOpen = useSceneStore((state) => state.isViewerOpen);
  const selectedId = useSceneStore((state) => state.selectedFragmentId);
  const fragments = useSceneStore((state) => state.config.fragments);
  const closeViewer = useSceneStore((state) => state.closeViewer);
  const selectFragment = useSceneStore((state) => state.selectFragment);

  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedFragment = fragments.find((f) => f.id === selectedId);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setTimeout(() => {
      closeViewer();
      selectFragment(null);
    }, 300);
  }, [closeViewer, selectFragment]);

  useEffect(() => {
    if (isOpen && selectedId) {
      setImageLoaded(false);
      setProgress(0);
      requestAnimationFrame(() => setIsVisible(true));

      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);

      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min(1, elapsed / AUTO_CLOSE_MS));
      }, 50);

      timerRef.current = setTimeout(() => {
        handleClose();
      }, AUTO_CLOSE_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isOpen, selectedId, handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !selectedFragment) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-all duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative max-w-4xl max-h-[85vh] w-full mx-6 transition-all duration-500 ease-out ${
          isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/70">
          <ImageIcon className="w-4 h-4" />
          <span className="text-sm font-serif">{selectedFragment.imageName}</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          )}

          <img
            src={selectedFragment.imageData}
            alt={selectedFragment.imageName}
            className={`w-full h-auto max-h-[80vh] object-contain bg-gradient-to-br from-slate-900 to-purple-900 transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl text-white/80 hover:text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-xs">
          点击任意位置或按 ESC 关闭 · {Math.ceil((AUTO_CLOSE_MS - progress * AUTO_CLOSE_MS) / 1000)}秒后自动返回
        </div>
      </div>
    </div>
  );
};
