import { useCallback, useRef } from 'react';

export const useWaterDropSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const play = useCallback(() => {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(600, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

      gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.3);
    }, 150);
  }, [getContext]);

  return play;
};
