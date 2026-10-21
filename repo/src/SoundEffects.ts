// High-performance procedural sci-fi audio effects using Web Audio API

class SoundEffectsController {
  private _ctx: AudioContext | null = null;
  private _volume = 0.8;
  private _isMuted = false;

  private _ensureContext(): AudioContext | null {
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this._ctx = new AudioCtx();
      }
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  public setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this._volume;
  }

  public setMuted(muted: boolean): void {
    this._isMuted = muted;
  }

  public isMuted(): boolean {
    return this._isMuted;
  }

  public playClick(): void {
    if (this._isMuted || this._volume <= 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

      const peak = 0.18 * this._volume;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playWhoosh(): void {
    if (this._isMuted || this._volume <= 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      const peak = 0.14 * this._volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  public playPreview(): void {
    if (this._isMuted || this._volume <= 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);

      const peak = 0.15 * this._volume;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }
}

export const SFX = new SoundEffectsController();
