import { useState, useEffect, useCallback } from 'react';

let globalShowToast: ((msg: string) => void) | null = null;

export function showToast(msg: string) {
  if (globalShowToast) globalShowToast(msg);
}

export default function Toast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  useEffect(() => {
    globalShowToast = show;
    return () => { globalShowToast = null; };
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="px-5 py-3 rounded-xl bg-black/80 text-white text-sm font-medium shadow-2xl border border-white/10 backdrop-blur-md animate-bounce">
        {message}
      </div>
    </div>
  );
}
