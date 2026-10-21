// Ambient Manager with Continuous Playback Position Memory & Smooth Crossfading
import { getAudioUrl } from './assetsManager';
import { AudioController } from './AudioController';
import { AudioTrackAnalyzer } from './AudioTrackAnalyzer';

export type AmbientTrackKey = 'desolate_cry' | 'titan_forge' | 'rust_and_bone' | 'absolute_blackout';

export const AMBIENT_TITLES: Record<AmbientTrackKey, string> = {
  desolate_cry: 'Desolate Cry in the Distortion',
  titan_forge: 'Titan Forge',
  rust_and_bone: 'Rust and Bone (1)',
  absolute_blackout: 'Absolute Blackout (эффекты)',
};

export const AVAILABLE_INTRO_TRACKS: ('desolate_cry' | 'titan_forge')[] = ['desolate_cry', 'titan_forge'];

export function getRandomIntroTrack(): 'desolate_cry' | 'titan_forge' {
  const idx = Math.floor(Math.random() * AVAILABLE_INTRO_TRACKS.length);
  return AVAILABLE_INTRO_TRACKS[idx];
}

interface FadingTrack {
  audio: HTMLAudioElement;
  key: string;
  startVol: number;
  targetVol: number;
  elapsed: number;
  duration: number;
  pauseOnEnd: boolean;
}

interface TransitionWait {
  targetDropTime: number;
  maxTimeoutSec: number;
  elapsed: number;
  onReady: () => void;
  trackKey: AmbientTrackKey | null;
}

class AmbientManagerService {
  private _audioCache: Map<string, HTMLAudioElement> = new Map();
  private _savedPositions: Map<string, number> = new Map();
  private _fadingTracks: FadingTrack[] = [];
  private _activeWait: TransitionWait | null = null;

  private _currentTrackKey: AmbientTrackKey | null = null;
  private _currentAudio: HTMLAudioElement | null = null;
  private _currentDuckFactor = 1.0;

  // Random selection between available intro tracks on startup
  private _introTrackKey: 'desolate_cry' | 'titan_forge' = getRandomIntroTrack();
  private _musicVolume = 0.85;
  private _isMuted = false;

  constructor() {
    this._isMuted = AudioController.isMuted();
  }

  public resetRandomIntroTrack(): 'desolate_cry' | 'titan_forge' {
    this._introTrackKey = getRandomIntroTrack();
    return this._introTrackKey;
  }

  private _getOrCreateAudio(key: AmbientTrackKey): HTMLAudioElement | null {
    if (this._audioCache.has(key)) {
      return this._audioCache.get(key)!;
    }
    const url = getAudioUrl(key);
    if (!url) {
      console.warn(`[AmbientManager] Audio URL not found for key: ${key}`);
      return null;
    }
    const audio = new Audio(url);
    audio.loop = true;
    audio.muted = this._isMuted;
    audio.volume = 0;
    this._audioCache.set(key, audio);
    return audio;
  }

  public getTrackForAct(actIndex: number, actId?: string): { key: AmbientTrackKey | null; duckFactor: number } {
    // Act 0: Intro (uses randomly selected intro track, full volume 1.0)
    if (actIndex === 0 || actId === 'intro_playbox') {
      return { key: this._introTrackKey, duckFactor: 1.0 };
    }
    // Song Act (act_7_song / Act 10): STRICTLY ZERO AMBIENT
    if (actId === 'act_7_song' || actIndex === 10) {
      return { key: null, duckFactor: 0.0 };
    }
    // Balance: 60% quieter than previous 0.35 (0.35 * 0.40 = 0.14) so narration sits prominently in front
    switch (actIndex) {
      case 1: return { key: 'rust_and_bone', duckFactor: 0.14 };      // Prologue
      case 2: return { key: 'absolute_blackout', duckFactor: 0.14 };  // Act 1: Convent
      case 3: return { key: 'desolate_cry', duckFactor: 0.14 };       // Act 2: Sarcophagus
      case 4: return { key: 'rust_and_bone', duckFactor: 0.14 };      // Act 3: Time Machine
      case 5: return { key: 'absolute_blackout', duckFactor: 0.14 };  // Act 4: Engine
      case 6: return { key: 'desolate_cry', duckFactor: 0.14 };       // Act 5: Clientarchs
      case 7: return { key: 'rust_and_bone', duckFactor: 0.14 };      // Act 6: Punishment
      case 8: return { key: 'absolute_blackout', duckFactor: 0.14 };  // Act 6: Reward
      case 9: return { key: 'desolate_cry', duckFactor: 0.14 };       // Act 8: Outro
      case 10: return { key: null, duckFactor: 0.0 };                 // Act 7: Song (ZERO AMBIENT)
      default: return { key: 'desolate_cry', duckFactor: 0.14 };
    }
  }

  public transitionToAct(actIndex: number, crossfadeSec?: number, actId?: string): void {
    this.cancelWait();
    const { key, duckFactor } = this.getTrackForAct(actIndex, actId);
    this._currentDuckFactor = duckFactor;
    const isSong = actId === 'act_7_song' || actIndex === 10;
    const effectiveSec = crossfadeSec ?? (isSong ? 0.5 : (actIndex === 1 ? 4.5 : 3.0));
    this.playTrack(key, duckFactor, effectiveSec);
  }

  public playTrack(key: AmbientTrackKey | null, duckFactor = 0.35, crossfadeSec = 2.0): void {
    this._currentDuckFactor = duckFactor;
    const targetVol = this._musicVolume * duckFactor;

    // If key is null and nothing is playing, nothing to do
    if (!key && !this._currentTrackKey) return;

    // Same track already playing: just adjust volume target smoothly
    if (key && key === this._currentTrackKey && this._currentAudio) {
      this._fadingTracks = this._fadingTracks.filter((f) => f.key !== key);
      this._fadingTracks.push({
        audio: this._currentAudio,
        key: key,
        startVol: this._currentAudio.volume,
        targetVol: targetVol,
        elapsed: 0,
        duration: Math.max(0.4, crossfadeSec),
        pauseOnEnd: false,
      });
      return;
    }

    // 1. Fade out current active track and remember its position
    if (this._currentAudio && this._currentTrackKey) {
      const oldKey = this._currentTrackKey;
      const oldAudio = this._currentAudio;

      // Save position immediately
      this._savedPositions.set(oldKey, oldAudio.currentTime);

      this._fadingTracks = this._fadingTracks.filter((f) => f.key !== oldKey);
      this._fadingTracks.push({
        audio: oldAudio,
        key: oldKey,
        startVol: oldAudio.volume,
        targetVol: 0,
        elapsed: 0,
        duration: Math.max(0.5, crossfadeSec),
        pauseOnEnd: true,
      });
    }

    // 2. Fade in new track
    if (key) {
      const newAudio = this._getOrCreateAudio(key);
      if (newAudio) {
        // Restore saved position where it last finished!
        const savedPos = this._savedPositions.get(key) || 0;
        newAudio.currentTime = savedPos;
        newAudio.muted = this._isMuted;
        newAudio.volume = 0;

        newAudio.play().catch((err) => {
          console.warn(`[AmbientManager] Autoplay prevented for '${key}':`, err);
        });

        this._currentTrackKey = key;
        this._currentAudio = newAudio;

        this._fadingTracks = this._fadingTracks.filter((f) => f.key !== key);
        this._fadingTracks.push({
          audio: newAudio,
          key: key,
          startVol: 0,
          targetVol: targetVol,
          elapsed: 0,
          duration: Math.max(0.5, crossfadeSec),
          pauseOnEnd: false,
        });
      }
    } else {
      this._currentTrackKey = null;
      this._currentAudio = null;
    }
  }

  public update(dt: number): void {
    // 1. Process Musical Intensity Drop Director for act handover
    if (this._activeWait) {
      this._activeWait.elapsed += dt;
      const curTime = this._currentAudio && Number.isFinite(this._currentAudio.currentTime)
        ? this._currentAudio.currentTime
        : this._activeWait.targetDropTime;

      const reachedTargetTime = curTime >= this._activeWait.targetDropTime;
      const reachedMaxTimeout = this._activeWait.elapsed >= this._activeWait.maxTimeoutSec;

      if (reachedTargetTime || reachedMaxTimeout) {
        const cb = this._activeWait.onReady;
        this._activeWait = null;
        cb();
      }
    }

    if (this._fadingTracks.length === 0) return;

    for (let i = this._fadingTracks.length - 1; i >= 0; i--) {
      const f = this._fadingTracks[i];
      f.elapsed += dt;
      const progress = Math.min(1.0, f.elapsed / Math.max(0.01, f.duration));
      
      // Smooth sinusoidal / easeInOut curve for equal-power crossfade
      const easeVal = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const curVol = f.startVol + (f.targetVol - f.startVol) * easeVal;
      f.audio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, curVol));

      if (progress >= 1.0) {
        if (f.pauseOnEnd) {
          f.audio.pause();
          this._savedPositions.set(f.key, f.audio.currentTime);
        }
        this._fadingTracks.splice(i, 1);
      }
    }
  }

  /**
   * Universal Musical Intensity Director:
   * Holds the act transition until the ambient audio reaches a natural decay valley / lull,
   * guaranteeing that a scene or voice change never cuts off during an emotional crest or swell.
   */
  public waitForIntensityDrop(options: { minWaitSec?: number; maxWaitSec?: number; onReady: () => void }): void {
    const minWait = options.minWaitSec ?? 1.6;
    const maxWait = options.maxWaitSec ?? 5.5;

    // If no ambient is playing or ambient is muted/ducked to 0 (e.g. song act), fire after minimal breathing pause
    if (!this._currentAudio || !this._currentTrackKey || this._currentDuckFactor <= 0) {
      setTimeout(() => {
        options.onReady();
      }, minWait * 1000);
      return;
    }

    const curTime = Number.isFinite(this._currentAudio.currentTime) ? this._currentAudio.currentTime : 0;
    const res = AudioTrackAnalyzer.findNextIntensityDrop(this._currentTrackKey, curTime, minWait, maxWait);

    this._activeWait = {
      targetDropTime: res.dropTime,
      maxTimeoutSec: maxWait,
      elapsed: 0,
      onReady: options.onReady,
      trackKey: this._currentTrackKey,
    };
  }

  public cancelWait(): void {
    this._activeWait = null;
  }

  public setMusicVolume(vol: number): void {
    this._musicVolume = Math.max(0, Math.min(1, vol));
    const targetVol = this._musicVolume * this._currentDuckFactor;

    if (this._currentAudio) {
      this._currentAudio.volume = this._isMuted ? 0 : targetVol;
    }
    for (const f of this._fadingTracks) {
      if (!f.pauseOnEnd) {
        f.targetVol = targetVol;
      }
    }
  }

  public setMuted(muted: boolean): void {
    this._isMuted = muted;
    for (const audio of this._audioCache.values()) {
      audio.muted = muted;
    }
  }

  public setIntroTrack(key: 'desolate_cry' | 'titan_forge', inIntro = false): void {
    this._introTrackKey = key;
    if (inIntro) {
      this.playTrack(key, 1.0, 1.5);
    }
  }

  public getIntroTrack(): 'desolate_cry' | 'titan_forge' {
    return this._introTrackKey;
  }

  public getCurrentTrackKey(): AmbientTrackKey | null {
    return this._currentTrackKey;
  }

  public getCurrentAudio(): HTMLAudioElement | null {
    return this._currentAudio;
  }

  public pauseAll(): void {
    this.cancelWait();
    if (this._currentAudio && this._currentTrackKey) {
      this._savedPositions.set(this._currentTrackKey, this._currentAudio.currentTime);
    }
    for (const audio of this._audioCache.values()) {
      audio.pause();
    }
  }

  public resumeCurrent(): void {
    if (this._currentAudio && this._currentTrackKey && this._currentDuckFactor > 0) {
      this._currentAudio.play().catch(() => {});
    }
  }

  public seekCurrent(targetTime: number): void {
    if (this._currentAudio) {
      this._currentAudio.currentTime = targetTime;
    }
    if (this._currentTrackKey) {
      this._savedPositions.set(this._currentTrackKey, targetTime);
    }
  }

  public restartIntro(): void {
    this._savedPositions.set(this._introTrackKey, 0);
    if (this._currentAudio) {
      this._currentAudio.currentTime = 0;
      this._currentAudio.play().catch(() => {});
    }
  }
}

export const AmbientManager = new AmbientManagerService();
