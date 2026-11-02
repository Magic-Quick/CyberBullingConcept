// High-performance audio controller using Web Audio API
// Powered by real keyboard keystroke samples + procedural audio fallbacks.
import { KEYBOARD_CLICKS_BASE64 } from './keyboardAudioData';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const commaIdx = base64.indexOf(',');
  const raw = commaIdx >= 0 ? base64.slice(commaIdx + 1) : base64;
  const binaryString = window.atob(raw);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

class SoundEffectsController {
  private _ctx: AudioContext | null = null;
  private _volume = 0.85;
  private _isMuted = false;
  private _keyBuffers: AudioBuffer[] = [];
  private _isDecodingKeys = false;
  private _lastKeyIndex = -1;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this._ctx && this._ctx.state === 'suspended') {
          this._ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

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
    if (this._ctx && this._keyBuffers.length === 0 && !this._isDecodingKeys) {
      this._loadKeyBuffers();
    }
    return this._ctx;
  }

  private _loadKeyBuffers(): void {
    if (!this._ctx || this._isDecodingKeys || this._keyBuffers.length > 0) return;
    this._isDecodingKeys = true;
    const ctx = this._ctx;

    for (let i = 0; i < KEYBOARD_CLICKS_BASE64.length; i++) {
      try {
        const ab = base64ToArrayBuffer(KEYBOARD_CLICKS_BASE64[i]);
        ctx.decodeAudioData(
          ab,
          (buf) => {
            this._keyBuffers.push(buf);
          },
          () => {}
        );
      } catch {}
    }
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

  /**
   * Plays one of the 7 real recorded keyboard sounds with pitch variation.
   */
  public playKeyClick(volumeMul = 0.85, pitchVariation = 0.05): void {
    if (this._isMuted || this._volume <= 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    if (this._keyBuffers.length === 0) {
      this._playProceduralClick();
      return;
    }

    // Pick a different key sound than the last one for natural acoustic variety
    let idx = Math.floor(Math.random() * this._keyBuffers.length);
    if (this._keyBuffers.length > 1 && idx === this._lastKeyIndex) {
      idx = (idx + 1) % this._keyBuffers.length;
    }
    this._lastKeyIndex = idx;

    const source = ctx.createBufferSource();
    source.buffer = this._keyBuffers[idx];

    // Subtle natural pitch variance
    const rate = 1.0 + (Math.random() * 2 - 1) * pitchVariation;
    source.playbackRate.value = Math.max(0.7, Math.min(1.4, rate));

    const gain = ctx.createGain();
    const finalVol = Math.max(0.01, Math.min(1.0, this._volume * volumeMul));
    gain.gain.setValueAtTime(finalVol, ctx.currentTime);

    source.connect(gain);
    gain.connect(ctx.destination);

    source.start(0);
  }

  /**
   * Standard UI button click: uses real keyboard keypress audio (gentle, tactile)!
   */
  public playClick(): void {
    this.playKeyClick(0.35, 0.04);
  }

  /**
   * Typewriter teletype click: soft, comfortable background cadence.
   */
  public playTypewriterTick(): void {
    this.playKeyClick(0.20, 0.08);
  }

  private _playProceduralClick(): void {
    const ctx = this._ctx;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
      const peak = 0.12 * this._volume;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
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
