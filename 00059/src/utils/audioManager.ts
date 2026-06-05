export class AudioManager {
  private audioContext: AudioContext | null = null;
  private musicVolume: number = 0.7;
  private sfxVolume: number = 0.5;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setVolume(musicVolume: number, sfxVolume: number): void {
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
  }

  playHit(frequency: number = 440, duration: number = 0.1): void {
    const ctx = this.ensureContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  playPerfect(): void {
    const ctx = this.ensureContext();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => this.playHit(freq, 0.15), i * 30);
    });
  }

  playGood(): void {
    this.playHit(440, 0.1);
  }

  playMiss(): void {
    const ctx = this.ensureContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  playCombo(combo: number): void {
    if (combo > 0 && combo % 10 === 0) {
      const baseFreq = 440 + Math.min(combo, 100) * 2;
      this.playHit(baseFreq, 0.15);
    }
  }

  playTick(): void {
    this.playHit(880, 0.05);
  }

  playCountdown(): void {
    this.playHit(660, 0.1);
  }

  playStart(): void {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      setTimeout(() => this.playHit(freq, 0.2), i * 100);
    });
  }

  playGameOver(): void {
    [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
      setTimeout(() => this.playHit(freq, 0.3), i * 150);
    });
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audioManager = new AudioManager();
