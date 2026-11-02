// Ambient Manager with Continuous Playback Position Memory & Smooth Crossfading
import { getAudioUrl } from './assetsManager';
import { AudioController } from './AudioController';
import { AudioTrackAnalyzer } from './AudioTrackAnalyzer';

export type AmbientTrackKey = 'desolate_cry' | 'titan_forge' | 'rust_and_bone' | 'absolute_blackout' | 'chronicles_ambient';


export interface CueNormalizationConfig {
  targetVol: number;
  fadeInSec: number;
  duckAmbientTo: number;
}

// Automatic Audio Normalization & Anti-Blast Protection (EBU R128 Aligned)
// Keeps speech (Voice at 1.0) 100% intelligible, with cues strictly sitting underneath
export const CUE_NORMALIZATION_MAP: Record<string, CueNormalizationConfig> = {
  // Harsh Dread / Terror Drops: High-impact cinematic tension (0.32 - 0.35), smooth 300ms anti-blast attack
  dread_03_predator_instant_terror_drop_25s: { targetVol: 0.35, fadeInSec: 0.28, duckAmbientTo: 0.08 },
  dread_04_predator_chittering_nightmare_25s: { targetVol: 0.32, fadeInSec: 0.32, duckAmbientTo: 0.08 },
  dread_05_rust_and_bone_maximum_grimdark_25s: { targetVol: 0.35, fadeInSec: 0.30, duckAmbientTo: 0.08 },
  dread_07_titan_forge_instant_colossus_strike_25s: { targetVol: 0.36, fadeInSec: 0.25, duckAmbientTo: 0.08 },

  // Peace / Calm Moments: Gentle warm pads & vocalise
  peace_01_pin_drop_silence_pure_calm_25s: { targetVol: 0.28, fadeInSec: 0.40, duckAmbientTo: 0.06 },
  peace_03_pin_drop_silence_gentle_resolution_25s: { targetVol: 0.28, fadeInSec: 0.38, duckAmbientTo: 0.06 },
  peace_04_chronicles_playbox_heavenly_vocalise_30s: { targetVol: 0.30, fadeInSec: 0.35, duckAmbientTo: 0.06 },
};

export const AMBIENT_TITLES: Record<AmbientTrackKey, string> = {
  desolate_cry: 'Desolate Cry in the Distortion',
  titan_forge: 'Titan Forge',
  rust_and_bone: 'Rust and Bone (1)',
  absolute_blackout: 'Absolute Blackout (эффекты)',
  chronicles_ambient: 'Chronicles Ambient (Дисклеймер)',
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
  private _isPaused = false;

  // Cinematic Cue Layer (Harsh Tension & Peace Cues)
  private _cueAudio: HTMLAudioElement | null = null;
  private _cueTrackKey: string | null = null;
  private _isCueDucking = false;
  private _savedDuckFactorBeforeCue = 1.0;
  private _cueAudioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this._isMuted = AudioController.isMuted();
  }

  public unlockAudio(): void {
    if (this._isPaused) return;
    if (this._currentAudio) {
      if (this._currentAudio.paused && this._currentDuckFactor > 0) {
        this._currentAudio.play().catch(() => {});
      }
    } else if (this._currentTrackKey) {
      this.playTrack(this._currentTrackKey, this._currentDuckFactor, 0.4);
    }
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

  private _getOrCreateCueAudio(key: string): HTMLAudioElement | null {
    if (this._cueAudioCache.has(key)) {
      return this._cueAudioCache.get(key)!;
    }
    const url = getAudioUrl(key);
    if (!url) {
      console.warn('[AmbientManager] Cinematic cue URL not found for key: ' + key);
      return null;
    }
    const audio = new Audio(url);
    audio.loop = false;
    audio.muted = this._isMuted;
    this._cueAudioCache.set(key, audio);
    return audio;
  }

  public getDisclaimerTrack(): { key: AmbientTrackKey | null; duckFactor: number } {
    return { key: null, duckFactor: 0.0 };
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
      case 1: return { key: 'rust_and_bone', duckFactor: 0.26 };      // Prologue
      case 2: return { key: 'absolute_blackout', duckFactor: 0.24 };  // Act 1: Convent
      case 3: return { key: 'desolate_cry', duckFactor: 0.26 };       // Act 2: Sarcophagus
      case 4: return { key: 'rust_and_bone', duckFactor: 0.26 };      // Act 3: Time Machine
      case 5: return { key: 'absolute_blackout', duckFactor: 0.24 };  // Act 4: Engine
      case 6: return { key: 'desolate_cry', duckFactor: 0.26 };       // Act 5: Clientarchs
      case 7: return { key: 'rust_and_bone', duckFactor: 0.26 };      // Act 6: Punishment
      case 8: return { key: 'chronicles_ambient', duckFactor: 0.22 }; // Act 6: Reward
      case 9: return { key: 'desolate_cry', duckFactor: 0.26 };       // Act 8: Outro
      case 10: return { key: null, duckFactor: 0.0 };                 // Act 7: Song (ZERO AMBIENT)
      default: return { key: 'desolate_cry', duckFactor: 0.26 };
    }
  }

  public transitionToAct(actIndex: number, crossfadeSec?: number, actId?: string): void {
    this.cancelWait();
    const { key, duckFactor } = this.getTrackForAct(actIndex, actId);
    this._currentDuckFactor = duckFactor;
    // Hard instantaneous snap (0 crossfade) per user request: "при перемотке пусть не будет бленда музыки... резко все перескакивает"
    const effectiveSec = crossfadeSec !== undefined ? crossfadeSec : 0;
    this.playTrack(key, duckFactor, effectiveSec);
  }

  public playTrack(key: AmbientTrackKey | null, duckFactor = 0.35, crossfadeSec = 2.0): void {
    this._currentDuckFactor = duckFactor;
    const targetVol = this._musicVolume * duckFactor;

    // If key is null and nothing is playing, nothing to do
    if (!key && !this._currentTrackKey) return;

    // Instant YouTube cut mode (0 crossfade): Stop old audio immediately, no audio blending!
    if (crossfadeSec <= 0) {
      if (this._currentAudio && this._currentTrackKey) {
        this._savedPositions.set(this._currentTrackKey, this._currentAudio.currentTime);
        this._currentAudio.pause();
        this._currentAudio.volume = 0;
      }
      for (const f of this._fadingTracks) {
        f.audio.pause();
        f.audio.volume = 0;
      }
      this._fadingTracks = [];

      if (key) {
        const newAudio = this._getOrCreateAudio(key);
        if (newAudio) {
          const savedPos = this._savedPositions.get(key) || 0;
          newAudio.currentTime = savedPos;
          newAudio.muted = this._isMuted;
          newAudio.volume = this._isMuted ? 0 : targetVol;

          if (!this._isPaused) {
            newAudio.play().catch((err) => {
              console.warn(`[AmbientManager] Autoplay prevented for '${key}':`, err);
            });
          } else {
            newAudio.pause();
          }

          this._currentTrackKey = key;
          this._currentAudio = newAudio;
        }
      } else {
        this._currentTrackKey = null;
        this._currentAudio = null;
      }
      return;
    }

    // Same track already playing: just adjust volume target smoothly
    if (key && key === this._currentTrackKey && this._currentAudio) {
      if (this._isPaused) {
        this._currentAudio.pause();
        return;
      }
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

        if (!this._isPaused) {
          newAudio.play().catch((err) => {
            console.warn(`[AmbientManager] Autoplay prevented for '${key}':`, err);
          });
        } else {
          newAudio.pause();
        }

        this._currentTrackKey = key;
        this._currentAudio = newAudio;

        this._fadingTracks = this._fadingTracks.filter((f) => f.key !== key);
        if (!this._isPaused) {
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
      }
    } else {
      this._currentTrackKey = null;
      this._currentAudio = null;
    }
  }

  public update(dt: number): void {
    if (this._isPaused) {
      return;
    }

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
    if (this._cueAudio && this._cueTrackKey) {
      const cfg = CUE_NORMALIZATION_MAP[this._cueTrackKey] ?? { targetVol: 0.20 };
      this._cueAudio.volume = this._isMuted ? 0 : Math.min(0.40, cfg.targetVol * (this._musicVolume / 0.85));
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
    for (const audio of this._cueAudioCache.values()) {
      audio.muted = muted;
    }
    if (this._cueAudio) {
      this._cueAudio.muted = muted;
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
    this._isPaused = true;
    this.cancelWait();
    if (this._cueAudio) {
      this._cueAudio.pause();
    }
    for (const audio of this._cueAudioCache.values()) {
      audio.pause();
    }
    if (this._currentAudio && this._currentTrackKey) {
      this._savedPositions.set(this._currentTrackKey, this._currentAudio.currentTime);
    }
    for (const audio of this._audioCache.values()) {
      audio.pause();
    }
    this._fadingTracks = [];
  }

  public resumeCurrent(): void {
    this._isPaused = false;
    if (this._currentAudio && this._currentTrackKey && this._currentDuckFactor > 0) {
      this._currentAudio.play().catch(() => {});
    }
    if (this._cueAudio && this._cueTrackKey) {
      this._cueAudio.play().catch(() => {});
    }
  }

  public setPaused(paused: boolean): void {
    this._isPaused = paused;
    if (paused) {
      this.pauseAll();
    } else {
      this.resumeCurrent();
    }
  }

  public isPaused(): boolean {
    return this._isPaused;
  }

  public seekCurrent(targetTime: number): void {
    if (this._currentAudio) {
      this._currentAudio.currentTime = targetTime;
      if (this._isPaused) {
        this._currentAudio.pause();
      }
    }
    if (this._currentTrackKey) {
      this._savedPositions.set(this._currentTrackKey, targetTime);
    }
  }


  public syncCinematicCue(cueKey: string, offsetSec: number, isPlaying: boolean): void {
    if (!cueKey || cueKey === 'stop') {
      this.stopCinematicCue(0.2);
      return;
    }

    const normKey = cueKey.toLowerCase();
    const cfg = CUE_NORMALIZATION_MAP[normKey] ?? {
      targetVol: normKey.startsWith('peace_') ? 0.15 : 0.20,
      fadeInSec: 0.2,
      duckAmbientTo: 0.04,
    };
    const targetVolume = Math.min(0.40, cfg.targetVol * (this._musicVolume / 0.85));

    // Case 1: Same cue is already active
    if (this._cueTrackKey === normKey && this._cueAudio) {
      (this._cueAudio as any)._targetOffset = Math.max(0, offsetSec);
      try {
        this._cueAudio.currentTime = Math.max(0, offsetSec);
      } catch (err) {
        console.warn('[AmbientManager] Error seeking cue ' + normKey + ':', err);
      }
      this._cueAudio.volume = this._isMuted ? 0 : targetVolume;
      if (isPlaying && !this._isPaused) {
        this._cueAudio.play().catch(() => {});
      } else {
        this._cueAudio.pause();
      }

      if (!this._isCueDucking) {
        this._isCueDucking = true;
        this._savedDuckFactorBeforeCue = this._currentDuckFactor;
        this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 0.2);
      }
      return;
    }

    // Case 2: New cue or switching cues during seek
    if (this._cueAudio) {
      this._cueAudio.pause();
      this._cueAudio.currentTime = 0;
      this._cueAudio = null;
    }
    this._fadingTracks = this._fadingTracks.filter((f) => f.key !== this._cueTrackKey);

    const audio = this._getOrCreateCueAudio(normKey);
    if (!audio) return;

    audio.loop = false;
    audio.muted = this._isMuted;
    audio.volume = this._isMuted ? 0 : targetVolume;

    const safeOffset = Math.max(0, offsetSec);
    (audio as any)._targetOffset = safeOffset;
    const applyOffset = () => {
      try {
        const target = (audio as any)._targetOffset;
        if (typeof target === 'number' && Math.abs(audio.currentTime - target) > 0.05) {
          audio.currentTime = target;
        }
      } catch {}
    };

    applyOffset();
    audio.addEventListener('loadedmetadata', applyOffset, { once: true });
    audio.addEventListener('canplay', applyOffset, { once: true });
    audio.addEventListener('loadeddata', applyOffset, { once: true });
    if (audio.readyState < 1 && typeof audio.load === 'function') {
      try { audio.load(); } catch {}
    }

    this._cueAudio = audio;
    this._cueTrackKey = normKey;

    if (!this._isCueDucking) {
      this._isCueDucking = true;
      this._savedDuckFactorBeforeCue = this._currentDuckFactor;
      this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 0.2);
    }

    audio.onended = () => {
      this.stopCinematicCue(1.0);
    };

    if (isPlaying && !this._isPaused) {
      audio.play().catch((err) => {
        console.warn('[AmbientManager] Cue play failed on sync: ' + normKey, err);
      });
    } else {
      audio.pause();
    }
  }

  public playCinematicCue(cueKey: string, customVolFactor: number = 1.0, startOffsetSec: number = 0): void {
    if (!cueKey || cueKey === 'stop') {
      this.stopCinematicCue(0.6);
      return;
    }

    const normKey = cueKey.toLowerCase();
    if (this._cueTrackKey === normKey && this._cueAudio && !this._cueAudio.paused) {
      return;
    }

    if (startOffsetSec > 0) {
      this.syncCinematicCue(normKey, startOffsetSec, !this._isPaused);
      return;
    }

    const cfg = CUE_NORMALIZATION_MAP[normKey] ?? {
      targetVol: normKey.startsWith('peace_') ? 0.15 : 0.20,
      fadeInSec: 0.2,
      duckAmbientTo: 0.04,
    };

    // Stop previous cue with quick fade
    if (this._cueAudio) {
      this._cueAudio.pause();
      this._cueAudio.currentTime = 0;
      this._cueAudio = null;
    }

    const audio = this._getOrCreateCueAudio(normKey);
    if (!audio) return;

    audio.loop = false;
    audio.muted = this._isMuted;
    audio.currentTime = 0;

    const normalizedCeiling = cfg.targetVol * customVolFactor;
    const targetVolume = Math.min(0.40, normalizedCeiling * (this._musicVolume / 0.85));
    audio.volume = 0; // Start at 0 for anti-pop smooth micro-ramp

    this._cueAudio = audio;
    this._cueTrackKey = normKey;

    // Smooth ramp into target volume
    this._fadingTracks = this._fadingTracks.filter((f) => f.key !== normKey);
    this._fadingTracks.push({
      audio: audio,
      key: normKey,
      startVol: 0,
      targetVol: targetVolume,
      elapsed: 0,
      duration: Math.max(0.20, cfg.fadeInSec),
      pauseOnEnd: false,
    });

    // Auto-duck background ambient so cue sits clearly without clutter
    if (!this._isCueDucking) {
      this._isCueDucking = true;
      this._savedDuckFactorBeforeCue = this._currentDuckFactor;
      this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 0.4);
    }

    audio.onended = () => {
      this.stopCinematicCue(1.0);
    };

    if (!this._isPaused) {
      audio.play().catch((err) => {
        console.warn('[AmbientManager] Cue play failed: ' + normKey, err);
      });
    }
  }

  public stopCinematicCue(fadeSec: number = 0.8): void {
    if (this._cueAudio) {
      const curCue = this._cueAudio;
      if (fadeSec <= 0) {
        curCue.pause();
        curCue.volume = 0;
      } else {
        this._fadingTracks = this._fadingTracks.filter((f) => f.key !== this._cueTrackKey);
        this._fadingTracks.push({
          audio: curCue,
          key: this._cueTrackKey || 'cue',
          startVol: curCue.volume,
          targetVol: 0,
          elapsed: 0,
          duration: fadeSec,
          pauseOnEnd: true,
        });
      }
      this._cueAudio = null;
      this._cueTrackKey = null;
    }

    if (this._isCueDucking) {
      this._isCueDucking = false;
      this.playTrack(this._currentTrackKey, this._savedDuckFactorBeforeCue, fadeSec);
    }
  }

  public restartIntro(): void {
    this._savedPositions.set(this._introTrackKey, 0);
    if (this._currentAudio) {
      this._currentAudio.currentTime = 0;
      if (!this._isPaused) {
        this._currentAudio.play().catch(() => {});
      } else {
        this._currentAudio.pause();
      }
    }
  }
}

export const AmbientManager = new AmbientManagerService();
