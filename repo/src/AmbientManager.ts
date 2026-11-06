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



// Automatic Audio Normalization & Anti-Blast Protection (EBU R128 Calibrated)

// Narrator voice is mastered at RMS -23.36 dBFS. Cues are calibrated so their effective RMS

// sits at -24.5 to -25.5 dBFS (-1.5 to -2.0 dB under speech), preserving 100% speech intelligibility.

export const CUE_NORMALIZATION_MAP: Record<string, CueNormalizationConfig> = {

  // Harsh Dread / Terror Drops: Calibrated with deep speech ducking and lowered ceiling so dialogue is 100% intelligible
  dread_03_predator_instant_terror_drop_25s: { targetVol: 0.28, fadeInSec: 0.30, duckAmbientTo: 0.005 },
  dread_04_predator_chittering_nightmare_25s: { targetVol: 0.26, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  dread_05_rust_and_bone_maximum_grimdark_25s: { targetVol: 0.26, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  dread_11_morlock_war_march_climax_50s: { targetVol: 0.28, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  dread_10_predator_nightmare_drop_52s: { targetVol: 0.28, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  dread_12_predator_digital_drug_28s: { targetVol: 0.28, fadeInSec: 0.25, duckAmbientTo: 0.005 },

  // Specialized Cinematic Trailer / Tension Cues & Braams (Anti-Masking & Calibrated Speech Intelligibility)
  braam_analog_synth_pitch_drop: { targetVol: 0.30, fadeInSec: 0.25, duckAmbientTo: 0.005 },
  trailer_tension_riser_to_brutal_cut: { targetVol: 0.32, fadeInSec: 0.30, duckAmbientTo: 0.005 },
  trailer_reese_bass_distortion_hit: { targetVol: 0.30, fadeInSec: 0.15, duckAmbientTo: 0.005 },
  trailer_braam_sub_drop: { targetVol: 0.30, fadeInSec: 0.20, duckAmbientTo: 0.005 },
  braam_titan_warhorn_doom: { targetVol: 0.28, fadeInSec: 0.25, duckAmbientTo: 0.005 },
  braam_reactor_turbine_overdrive: { targetVol: 0.30, fadeInSec: 0.30, duckAmbientTo: 0.005 },
  trailer_dissonant_warp_stinger: { targetVol: 0.30, fadeInSec: 0.15, duckAmbientTo: 0.005 },
  trailer_industrial_anvil_slam: { targetVol: 0.30, fadeInSec: 0.10, duckAmbientTo: 0.005 },
  trailer_pneumatic_gate_crush: { targetVol: 0.30, fadeInSec: 0.15, duckAmbientTo: 0.005 },
  braam_seismic_tectonic_rumble: { targetVol: 0.30, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  braam_triple_pulse_staccato: { targetVol: 0.28, fadeInSec: 0.20, duckAmbientTo: 0.005 },
  braam_choir_infernal_drone: { targetVol: 0.30, fadeInSec: 0.40, duckAmbientTo: 0.005 },
  melodic_tension_dark_cello_bend_braam: { targetVol: 0.32, fadeInSec: 0.30, duckAmbientTo: 0.005 },
  melodic_tension_french_horn_minor_swell: { targetVol: 0.34, fadeInSec: 0.35, duckAmbientTo: 0.005 },
  melodic_tension_blade_runner_synth_drop: { targetVol: 0.34, fadeInSec: 0.30, duckAmbientTo: 0.005 },
  melodic_tension_mournful_vocal_drone: { targetVol: 0.32, fadeInSec: 0.40, duckAmbientTo: 0.005 },
  melodic_tension_cathedral_bell_drone: { targetVol: 0.32, fadeInSec: 0.40, duckAmbientTo: 0.005 },
  melodic_tension_piano_decay_sub_swell: { targetVol: 0.32, fadeInSec: 0.35, duckAmbientTo: 0.005 },



  // Peace / Calm Moments: Gentle warm pads & vocalise (strictly zero background ambient clashing!)

  peace_01_pin_drop_silence_pure_calm_25s: { targetVol: 0.26, fadeInSec: 0.40, duckAmbientTo: 0.0 },

  peace_02_pin_drop_silence_warm_melody_30s: { targetVol: 0.26, fadeInSec: 0.40, duckAmbientTo: 0.0 },

  peace_03_pin_drop_silence_gentle_resolution_25s: { targetVol: 0.26, fadeInSec: 0.40, duckAmbientTo: 0.0 },

  peace_04_chronicles_playbox_heavenly_vocalise_30s: { targetVol: 0.28, fadeInSec: 0.35, duckAmbientTo: 0.0 },

  peace_05_chronicles_playbox_uplifting_pads_30s: { targetVol: 0.26, fadeInSec: 0.40, duckAmbientTo: 0.0 },

  peace_06_chronicles_playbox_warm_culmination_25s: { targetVol: 0.26, fadeInSec: 0.40, duckAmbientTo: 0.0 },

  peace_08_pin_drop_silence_reward_grace_60s: { targetVol: 0.28, fadeInSec: 1.50, duckAmbientTo: 0.0 },



  // Crowd & Audience SFX: Calibrated to sit comfortably behind vocals with zero masking

  '03_crowd_drop1_accent': { targetVol: 0.15, fadeInSec: 0.08, duckAmbientTo: 0.0 },

  '01_crowd_intro_establishing': { targetVol: 0.18, fadeInSec: 0.10, duckAmbientTo: 0.0 },

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
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const mode = window.localStorage.getItem('cyberbulling_intro_mode');
      if (mode === 'random') {
        return Math.random() < 0.5 ? 'desolate_cry' : 'titan_forge';
      }
      const saved = window.localStorage.getItem('cyberbulling_intro_track');
      if (saved === 'desolate_cry' || saved === 'titan_forge') return saved;
    }
  } catch {}
  return 'titan_forge'; // Default to Titan Forge per user's preference
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
  public static readonly TRACK_GAIN: Record<AmbientTrackKey, number> = {
    titan_forge: 1.0,
    desolate_cry: 1.05,
    rust_and_bone: 1.15, // Balanced calibration: smooth, rich, never drowns dialogue
    absolute_blackout: 1.1,
    chronicles_ambient: 1.0,
  };

  public getEffectiveAmbientVolume(): number {
    const trackGain = this._currentTrackKey ? (AmbientManagerService.TRACK_GAIN[this._currentTrackKey] ?? 1.0) : 1.0;
    return Math.min(1.0, this._musicVolume * this._currentDuckFactor * trackGain);
  }


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
  private _screamerAudioCache: Map<string, HTMLAudioElement> = new Map();

  private _cueTargetVol = 0.22;

  private _cueStartVol = 0.0;

  private _cueFadeElapsed = 0.0;

  private _cueFadeDuration = 0.4;

  private _cueIsFading = false;

  private _cuePauseOnEnd = false;
  private _cueMaxDuration = 0;
  private _cuePlayElapsed = 0.0;
  private _fadingCues: {
    audio: HTMLAudioElement;
    startVol: number;
    targetVol: number;
    duration: number;
    elapsed: number;
  }[] = [];



  // Real-time Voice Presence Sidechain Ducking Layer

  private _isVoiceActive = false;

  private _voiceDuckingFactor = 1.0;

  private _voiceHoldTimer = 0.0;

  // Track Mute States (Dread, Peace, Ambient) for Studio Direction
  private _isMutedDread = false;
  private _isMutedPeace = false;
  private _isMutedAmbient = false;
  private _dreadVolumeMultiplier: number = 1.25;
  private _peaceVolumeMultiplier: number = 1.0;
  private _ambientVolumeMultiplier: number = 1.0;
  private _currentCueCustomGain: number = 1.0;
  private _isMutedScreamer = false;
  private _screamerVolumeMultiplier: number = 1.25;
  private _screamerAudio: HTMLAudioElement | null = null;
  private _screamerTrackKey: string | null = null;
  private _screamerCustomGain: number = 1.0;
  private _screamerTargetVol: number = 0.50;

  constructor() {
    this._isMuted = AudioController.isMuted();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedDread = window.localStorage.getItem('playbox_track_vol_dread');
        if (savedDread) this._dreadVolumeMultiplier = parseFloat(savedDread) || 1.25;
        const savedPeace = window.localStorage.getItem('playbox_track_vol_peace');
        if (savedPeace) this._peaceVolumeMultiplier = parseFloat(savedPeace) || 1.0;
        const savedAmb = window.localStorage.getItem('playbox_track_vol_ambient');
        if (savedAmb) this._ambientVolumeMultiplier = parseFloat(savedAmb) || 1.0;
        const savedScreamer = window.localStorage.getItem('playbox_track_vol_screamer');
        if (savedScreamer) this._screamerVolumeMultiplier = parseFloat(savedScreamer) || 1.25;
      }
    } catch {}

  }



  public unlockAudio(): void {
    if (this._isPaused) return;
    if (this._currentAudio) {
      if (this._currentAudio.paused && this._currentDuckFactor > 0) {
        this._currentAudio.play().catch(() => {});
      }
    } else if (this._currentTrackKey) {
      this.playTrack(this._currentTrackKey, this._currentDuckFactor, 0.4);
    } else {
      this.playTrack(this.getIntroTrack(), 1.0, 1.5);
    }
  }

  public isCategoryMuted(category: 'dread' | 'peace' | 'ambient' | 'screamer'): boolean {
    if (category === 'dread') return this._isMutedDread;
    if (category === 'peace') return this._isMutedPeace;
    if (category === 'ambient') return this._isMutedAmbient;
    if (category === 'screamer') return this._isMutedScreamer;
    return false;
  }

  public setCategoryMuted(category: 'dread' | 'peace' | 'ambient' | 'screamer', muted: boolean): void {
    if (category === 'dread') this._isMutedDread = muted;
    if (category === 'peace') this._isMutedPeace = muted;
    if (category === 'ambient') this._isMutedAmbient = muted;
    if (category === 'screamer') this._isMutedScreamer = muted;
    this.syncMuteVolumes();
  }

  public getCategoryVolume(category: 'dread' | 'peace' | 'ambient' | 'screamer'): number {
    if (category === 'dread') return this._dreadVolumeMultiplier;
    if (category === 'peace') return this._peaceVolumeMultiplier;
    if (category === 'ambient') return this._ambientVolumeMultiplier;
    if (category === 'screamer') return this._screamerVolumeMultiplier;
    return 1.0;
  }

  public setCategoryVolume(category: 'dread' | 'peace' | 'ambient' | 'screamer', mult: number): void {
    const clamped = Math.max(0.0, Math.min(2.5, mult));
    if (category === 'dread') this._dreadVolumeMultiplier = clamped;
    if (category === 'peace') this._peaceVolumeMultiplier = clamped;
    if (category === 'ambient') this._ambientVolumeMultiplier = clamped;
    if (category === 'screamer') this._screamerVolumeMultiplier = clamped;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`playbox_track_vol_${category}`, clamped.toFixed(2));
      }
    } catch {}
    this.syncMuteVolumes();
  }

  public syncMuteVolumes(): void {
    if (this._currentAudio) {
      if (this._isMutedAmbient || this._isMuted) {
        this._currentAudio.volume = 0;
      } else {
        const baseVol = this.getEffectiveAmbientVolume();
        const ambientDuck = this._isVoiceActive ? 0.50 : 1.0;
        this._currentAudio.volume = Math.max(0, Math.min(1, baseVol * this._ambientVolumeMultiplier * ambientDuck));
      }
    }

    if (this._cueAudio && this._cueTrackKey) {
      const isPeace = this._cueTrackKey.startsWith('peace_');
      const isDread = !isPeace && this._cueTrackKey !== 'stop';
      if ((isDread && this._isMutedDread) || (isPeace && this._isMutedPeace) || this._isMuted) {
        this._cueAudio.volume = 0;
      } else {
        const catMult = isDread ? this._dreadVolumeMultiplier : (isPeace ? this._peaceVolumeMultiplier : 1.0);
        const cfg = CUE_NORMALIZATION_MAP[this._cueTrackKey] ?? { targetVol: 0.28 };
        const baseVol = Math.min(1.0, cfg.targetVol * catMult * this._currentCueCustomGain * (this._musicVolume / 0.85));
        this._cueTargetVol = baseVol;
        this._cueAudio.volume = Math.max(0, Math.min(1, baseVol * this._voiceDuckingFactor));
      }
    }

    if (this._screamerAudio && this._screamerTrackKey) {
      if (this._isMutedScreamer || this._isMuted) {
        this._screamerAudio.volume = 0;
      } else {
        const cfg = CUE_NORMALIZATION_MAP[this._screamerTrackKey] ?? { targetVol: 0.40 };
        const baseVol = Math.min(1.0, cfg.targetVol * this._screamerVolumeMultiplier * this._screamerCustomGain * (this._musicVolume / 0.85));
        this._screamerTargetVol = baseVol;
        this._screamerAudio.volume = Math.max(0, Math.min(1, baseVol * this._voiceDuckingFactor));
      }
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

  private _getOrCreateScreamerAudio(key: string): HTMLAudioElement | null {
    if (this._screamerAudioCache.has(key)) {
      return this._screamerAudioCache.get(key)!;
    }
    const url = getAudioUrl(key);
    if (!url) {
      console.warn('[AmbientManager] Screamer audio URL not found for key: ' + key);
      return null;
    }
    const audio = new Audio(url);
    audio.loop = false;
    audio.muted = this._isMuted || this._isMutedScreamer;
    this._screamerAudioCache.set(key, audio);
    return audio;
  }



  public getDisclaimerTrack(): { key: AmbientTrackKey | null; duckFactor: number } {

    return { key: null, duckFactor: 0.0 };

  }



  public getLockedTrackForAct(actKey: string): AmbientTrackKey | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('cyberbulling_ambient_locks');
        if (raw) {
          const map = JSON.parse(raw);
          if (map && map[actKey]) return map[actKey];
        }
      }
    } catch {}
    return null;
  }

  public setLockedTrackForAct(actKey: string, track: AmbientTrackKey): void {
    if (actKey === 'act_7_song' || actKey.includes('song')) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('cyberbulling_ambient_locks');
        const map = raw ? JSON.parse(raw) : {};
        delete map['act_7_song'];
        delete map['act_10'];
        map[actKey] = track;
        window.localStorage.setItem('cyberbulling_ambient_locks', JSON.stringify(map));
      }
    } catch {}
  }

  public getTrackForAct(actIndex: number, actId?: string, actTime?: number): { key: AmbientTrackKey | null; duckFactor: number } {
    // Act 10: Song Act (act_7_song or any song category) - STRICTLY ZERO AMBIENT ALWAYS
    if (actId === 'act_7_song' || actIndex === 10 || (actId && actId.includes('song'))) {
      return { key: null, duckFactor: 0.0 };
    }

    const actKey = actId || `act_${actIndex}`;
    const locked = this.getLockedTrackForAct(actKey);
    if (locked) {
      return { key: locked, duckFactor: (actKey === 'intro_playbox' || actIndex === 0) ? 1.0 : 0.28 };
    }
    // Act 0: Intro (uses randomly selected intro track, full volume 1.0)
    if (actId === 'intro_playbox' || actIndex === 0) {
      return { key: this._introTrackKey, duckFactor: 1.0 };
    }

    // Act 1: Prologue Space (Intro score carries through until Ark visual emerges at 18.5s)
    if (actId === 'prologue_space' || actIndex === 1) {
      if (actTime !== undefined && actTime >= 18.5) {
        return { key: 'rust_and_bone', duckFactor: 0.28 };
      }
      return { key: this._introTrackKey, duckFactor: 0.28 };
    }

    // Act 2: Act 1 Convent & Manufactorum
    if (actId === 'act_1_convent' || actIndex === 2) {
      return { key: 'absolute_blackout', duckFactor: 0.25 };
    }

    // Act 3: Act 2 Sarcophagus (Danial)
    if (actId === 'act_2_sarcophagus' || actIndex === 3) {
      return { key: 'desolate_cry', duckFactor: 0.28 };
    }

    // Act 4: Act 3 Timemachine (Gorin)
    if (actId === 'act_3_timemachine' || actIndex === 4) {
      return { key: 'rust_and_bone', duckFactor: 0.28 };
    }

    // Act 5: Act 4 Engine mutation (22GB)
    if (actId === 'act_4_engine' || actIndex === 5) {
      return { key: 'titan_forge', duckFactor: 0.28 };
    }

    // Act 5 Clientarchs siege (Zynga) - Tense, heavy grimdark rust & bone
    if (actId === 'act_5_clientarchs' || actIndex === 6) {
      return { key: 'rust_and_bone', duckFactor: 0.28 };
    }

    // Act 7: Act 6 Supreme Punishment (Высшая Кара) - Deep grimdark Rust and Bone
    if (actId === 'act_6_punishment' || actIndex === 7) {
      return { key: 'rust_and_bone', duckFactor: 0.28 };
    }

    // Act 8: Act 6 Supreme Reward (Печенька Благодати) - Peaceful Chronicles ambient
    if (actId === 'act_6_reward' || actIndex === 8) {
      return { key: 'chronicles_ambient', duckFactor: 0.28 };
    }

    // Act 9: Act 8 Outro scoreboard
    if (actId === 'act_8_outro' || actIndex === 9) {
      return { key: 'desolate_cry', duckFactor: 0.28 };
    }

    return { key: 'rust_and_bone', duckFactor: 0.28 };
  }



  public stopAllAmbientImmediately(): void {
    this.cancelWait();
    this.stopCinematicCue(0);
    this.stopScreamerCue(0);
    this._currentTrackKey = null;
    if (this._currentAudio) {
      try {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
        this._currentAudio.volume = 0;
      } catch (_) {}
      this._currentAudio = null;
    }
    for (const audio of this._audioCache.values()) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } catch (_) {}
    }
    for (const f of this._fadingTracks) {
      try {
        f.audio.pause();
        f.audio.volume = 0;
      } catch (_) {}
    }
    this._fadingTracks = [];
    this._currentDuckFactor = 0.0;
  }

  public transitionToAct(actIndex: number, crossfadeSec?: number, actId?: string): void {
    this.cancelWait();
    this.stopCinematicCue(0);
    this.stopScreamerCue(0);

    const isSong = actId === 'act_7_song' || actIndex === 10 || (actId && actId.includes('song'));
    if (isSong) {
      this.stopAllAmbientImmediately();
      return;
    }

    const { key, duckFactor } = this.getTrackForAct(actIndex, actId);
    this._currentDuckFactor = duckFactor;
    const effectiveSec = crossfadeSec !== undefined ? crossfadeSec : 0;
    this.playTrack(key, duckFactor, effectiveSec);
  }

    public playTrack(key: AmbientTrackKey | null, duckFactor = 0.35, crossfadeSec = 2.0, startOffsetSec?: number): void {

    this._currentDuckFactor = duckFactor;

    const trackGain = key ? (AmbientManagerService.TRACK_GAIN[key] ?? 1.0) : 1.0;
    const targetVol = Math.min(1.0, this._musicVolume * duckFactor * trackGain);



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

        if (f.key !== this._cueTrackKey) {

          f.audio.pause();

          f.audio.volume = 0;

        }

      }

      this._fadingTracks = this._fadingTracks.filter((f) => f.key === this._cueTrackKey);



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

        // Restore saved position or use requested startOffsetSec (e.g. 15.0s for rust_and_bone)
        const savedPos = startOffsetSec !== undefined ? startOffsetSec : (this._savedPositions.get(key) || 0);
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



        // 2. Real-time Voice Presence Ducking Interpolation
    // Hold ducking for 0.9s after voice pause so breathing/micro-gaps never cause music to violently pump back up
    if (this._isVoiceActive) {
      this._voiceHoldTimer = 0.9;
    } else if (this._voiceHoldTimer > 0) {
      this._voiceHoldTimer -= dt;
    }

    const isEffectivelySpeaking = this._isVoiceActive || this._voiceHoldTimer > 0;
    // Professional -7 dB ducking depth (0.45 factor): narration is crystal clear, music breathes dynamically
    const targetVoiceDuck = isEffectivelySpeaking ? 0.45 : 1.0;
    // Fast attack (12.0), smooth musical release (2.0)
    const voiceDuckRate = isEffectivelySpeaking ? 12.0 : 2.0;

    this._voiceDuckingFactor += (targetVoiceDuck - this._voiceDuckingFactor) * Math.min(1.0, dt * voiceDuckRate);



    // 3. Dedicated Cinematic Cue Fading Layer (Smooth sinusoidal volume, zero ambient collision)
    if (this._cueAudio && this._cueIsFading) {
      this._cueFadeElapsed += dt;
      const progress = Math.min(1.0, this._cueFadeElapsed / Math.max(0.01, this._cueFadeDuration));
      const easeVal = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const curVol = this._cueStartVol + (this._cueTargetVol - this._cueStartVol) * easeVal;
      const isCueMuted1 = (this._cueTrackKey?.startsWith('peace_') ? this._isMutedPeace : this._isMutedDread) || this._isMuted;
      this._cueAudio.volume = isCueMuted1 ? 0 : Math.max(0, Math.min(1, curVol * this._voiceDuckingFactor));
      if (progress >= 1.0) {
        this._cueIsFading = false;
        if (this._cuePauseOnEnd) {
          this._cueAudio.pause();
          this._cueAudio.currentTime = 0;
          this._cueAudio = null;
          this._cueTrackKey = null;
        }
      }
    } else if (this._cueAudio && !this._cueIsFading) {
      const isCueMuted2 = (this._cueTrackKey?.startsWith('peace_') ? this._isMutedPeace : this._isMutedDread) || this._isMuted;
      this._cueAudio.volume = isCueMuted2 ? 0 : Math.max(0, Math.min(1, this._cueTargetVol * this._voiceDuckingFactor));

      // Auto-fadeout before audio file or duration expires: guarantees music never ends abruptly!
      this._cuePlayElapsed += dt;
      const remainingFile = this._cueAudio.duration - this._cueAudio.currentTime;
      const hasFileRemaining = Number.isFinite(remainingFile) && remainingFile > 0;
      const isNearFileEnd = hasFileRemaining && remainingFile <= 3.5;
      const isNearDurationEnd = this._cueMaxDuration > 0 && (this._cueMaxDuration - this._cuePlayElapsed <= 3.5);

      if (isNearFileEnd || isNearDurationEnd) {
        const fadeTime = Math.min(3.0, Math.max(1.5, hasFileRemaining ? remainingFile : 3.0));
        this.stopCinematicCue(fadeTime);
      }
    }

    // Process all smoothly fading out cues (Zero abrupt termination, gentle equal-power decay)
    for (let i = this._fadingCues.length - 1; i >= 0; i--) {
      const f = this._fadingCues[i];
      f.elapsed += dt;
      const progress = Math.min(1.0, f.elapsed / Math.max(0.01, f.duration));
      const easeVal = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const curVol = f.startVol + (f.targetVol - f.startVol) * easeVal;
      const ambientFadeDuck = isEffectivelySpeaking ? 0.50 : 1.0;
      f.audio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, curVol * ambientFadeDuck));

      if (progress >= 1.0) {
        f.audio.pause();
        f.audio.currentTime = 0;
        this._fadingCues.splice(i, 1);
      }
    }

    // 4. Background Ambient Volume sync with Voice-Ducking factor

    if (this._currentAudio && this._fadingTracks.length === 0) {

      const baseVol = this.getEffectiveAmbientVolume();

      const ambientMuted = this._isMutedAmbient || this._isMuted;
      // Ambient duck: -6 dB (0.50 factor) during dialogue so narration is 100% dominant, swells up when voice pauses
      const ambientDuck = isEffectivelySpeaking ? 0.50 : 1.0;
      this._currentAudio.volume = ambientMuted ? 0 : Math.max(0, Math.min(1, baseVol * ambientDuck));

    }



    if (this._fadingTracks.length === 0) return;



    for (let i = this._fadingTracks.length - 1; i >= 0; i--) {

      const f = this._fadingTracks[i];

      f.elapsed += dt;

      const progress = Math.min(1.0, f.elapsed / Math.max(0.01, f.duration));

      

      // Smooth sinusoidal / easeInOut curve for equal-power crossfade

      const easeVal = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      const curVol = f.startVol + (f.targetVol - f.startVol) * easeVal;

      f.audio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, curVol * this._voiceDuckingFactor));



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



  public setVoiceActive(active: boolean): void {

    this._isVoiceActive = active;

  }



  public setMusicVolume(vol: number): void {

    this._musicVolume = Math.max(0, Math.min(1, vol));

    const trackGain = this._currentTrackKey ? (AmbientManagerService.TRACK_GAIN[this._currentTrackKey] ?? 1.0) : 1.0;
    const targetVol = Math.min(1.0, this._musicVolume * this._currentDuckFactor * trackGain);



    if (this._currentAudio) {

      const ambientDuck = this._isVoiceActive ? 0.50 : 1.0;
      this._currentAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, targetVol * ambientDuck));

    }

    if (this._cueAudio && this._cueTrackKey) {

      const cfg = CUE_NORMALIZATION_MAP[this._cueTrackKey] ?? { targetVol: 0.18 };

      this._cueTargetVol = cfg.targetVol * (this._musicVolume / 0.85);

      this._cueAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, this._cueTargetVol * this._voiceDuckingFactor));

    }

    for (const f of this._fadingTracks) {

      if (!f.pauseOnEnd) {

        f.targetVol = targetVol;

        f.audio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, f.targetVol * this._voiceDuckingFactor));

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

    for (const audio of this._screamerAudioCache.values()) {
      audio.muted = muted || this._isMutedScreamer;
    }
    if (this._screamerAudio) {
      this._screamerAudio.muted = muted || this._isMutedScreamer;
    }

  }



  public isIntroRandom(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('cyberbulling_intro_mode') === 'random';
      }
    } catch {}
    return false;
  }

  public setIntroRandomMode(isRandom: boolean, inIntro = false): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cyberbulling_intro_mode', isRandom ? 'random' : 'fixed');
      }
    } catch {}
    if (isRandom) {
      const chosen = Math.random() < 0.5 ? 'desolate_cry' : 'titan_forge';
      this._introTrackKey = chosen;
      if (inIntro) {
        this.playTrack(chosen, 1.0, 1.5);
      }
    }
  }

  public setIntroTrack(key: 'desolate_cry' | 'titan_forge', inIntro = false): void {

    this._introTrackKey = key;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cyberbulling_intro_track', key);
        window.localStorage.setItem('cyberbulling_intro_mode', 'fixed');
      }
    } catch {}

    if (inIntro) {

      this.playTrack(key, 1.0, 1.5);

    }

  }



  public getIntroTrack(): 'desolate_cry' | 'titan_forge' {

    return this._introTrackKey;

  }



  public getCueTrackKey(): string | null {
    return this._cueTrackKey;
  }

  public getCueAudio(): HTMLAudioElement | null {
    return this._cueAudio;
  }

  public isCuePlaying(): boolean {
    return Boolean(this._cueAudio && !this._cueAudio.paused && !this._cueAudio.ended);
  }

  public getCurrentTrackKey(): AmbientTrackKey | null {

    return this._currentTrackKey;

  }



  public getCurrentAudio(): HTMLAudioElement | null {

    return this._currentAudio;

  }

  public getAudioElementForCue(key: string): HTMLAudioElement | null {
    return this._getOrCreateCueAudio(key) || this._getOrCreateAudio(key as any);
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

    if (this._screamerAudio) {
      this._screamerAudio.pause();
    }
    for (const audio of this._screamerAudioCache.values()) {
      audio.pause();
    }

    if (this._currentAudio && this._currentTrackKey) {

      this._savedPositions.set(this._currentTrackKey, this._currentAudio.currentTime);

    }

    for (const audio of this._audioCache.values()) {

      audio.pause();

    }

    this._fadingTracks = [];
    this._fadingCues = [];

  }



  public resumeCurrent(): void {
    this._isPaused = false;
    // CRITICAL: If no ambient track is assigned (e.g. Song Act), NEVER play or resume background ambient!
    if (!this._currentTrackKey || !this._currentAudio) {
      return;
    }

    if (this._currentAudio && this._currentTrackKey) {

      if (this._isCueDucking) {
        const targetVol = this.getEffectiveAmbientVolume();
        this._currentAudio.volume = this._isMuted ? 0 : targetVol;
        if (this._currentDuckFactor > 0) {
          this._currentAudio.play().catch(() => {});
        } else {
          this._currentAudio.pause();
        }
      } else {
        if (this._currentDuckFactor <= 0) {
          this._currentDuckFactor = 0.28;
        }
        this._currentAudio.volume = this._isMuted ? 0 : this.getEffectiveAmbientVolume();
        this._currentAudio.play().catch(() => {});
      }

    }

    if (this._cueAudio && this._cueTrackKey) {

      this._cueAudio.volume = this._isMuted ? 0 : this._cueTargetVol;

      this._cueAudio.play().catch(() => {});

    }

    if (this._screamerAudio && this._screamerTrackKey) {
      const isMuted = this._isMutedScreamer || this._isMuted;
      this._screamerAudio.volume = isMuted ? 0 : Math.max(0, Math.min(1, this._screamerTargetVol * this._voiceDuckingFactor));
      this._screamerAudio.play().catch(() => {});
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
      const dur = this._currentAudio.duration;
      const safeTime = (Number.isFinite(dur) && dur > 0) ? (targetTime % dur) : targetTime;
      try {
        this._currentAudio.currentTime = Math.max(0, safeTime);
      } catch (e) {
        console.warn('[AmbientManager] seekCurrent error:', e);
      }
      if (this._isPaused) {
        this._currentAudio.pause();
      }
    }
    if (this._currentTrackKey) {
      this._savedPositions.set(this._currentTrackKey, targetTime);
    }
  }





  public syncCinematicCue(cueKey: string, offsetSec: number, isPlaying: boolean, customGain: number = 1.0): void {

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

    const isPeace = normKey.startsWith('peace_');
    const isDread = !isPeace && normKey !== 'stop';
    const isCatMuted = (isDread && this._isMutedDread) || (isPeace && this._isMutedPeace);
    const catMult = isDread ? this._dreadVolumeMultiplier : (isPeace ? this._peaceVolumeMultiplier : 1.0);
    this._currentCueCustomGain = customGain ?? 1.0;
    const targetVolume = (isCatMuted || this._isMuted) ? 0 : Math.min(1.0, cfg.targetVol * catMult * this._currentCueCustomGain * (this._musicVolume / 0.85));

    this._cueTargetVol = targetVolume;



    // Case 1: Same cue is already active

    if (this._cueTrackKey === normKey && this._cueAudio) {

      (this._cueAudio as any)._targetOffset = Math.max(0, offsetSec);

      try {

        this._cueAudio.currentTime = Math.max(0, offsetSec);

      } catch (err) {

        console.warn('[AmbientManager] Error seeking cue ' + normKey + ':', err);

      }

      this._cueAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, targetVolume * this._voiceDuckingFactor));

      if (isPlaying && !this._isPaused) {

        this._cueAudio.play().catch(() => {});

      } else {

        this._cueAudio.pause();

      }



      if (!this._isCueDucking) {

        this._isCueDucking = true;

        this._savedDuckFactorBeforeCue = this._currentDuckFactor;

      }

      this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 0.0);

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

    audio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, targetVolume * this._voiceDuckingFactor));



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

    }

    this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 0.0);



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
      this.stopCinematicCue(2.5);
      return;
    }

    const normKey = cueKey.toLowerCase();

    // If seeking while paused or same cue is active, sync seamlessly without glitching
    if (this._cueTrackKey === normKey && this._cueAudio) {
      this.syncCinematicCue(normKey, startOffsetSec, !this._isPaused);
      return;
    }

    const cfg = CUE_NORMALIZATION_MAP[normKey] ?? {
      targetVol: normKey.startsWith('peace_') ? 0.55 : 0.20,
      fadeInSec: 0.35,
      duckAmbientTo: 0.01,
    };

    // Smoothly and swiftly fade out previous cue (Zero audio clash, 0.4s fast musical transition!)
    if (this._cueAudio && this._cueAudio !== this._cueAudioCache.get(normKey)) {
      const oldAudio = this._cueAudio;
      for (const f of this._fadingCues) {
        f.audio.pause();
        f.audio.currentTime = 0;
      }
      this._fadingCues = [];
      this._fadingCues.push({
        audio: oldAudio,
        startVol: oldAudio.volume,
        targetVol: 0.0,
        duration: 0.4,
        elapsed: 0.0,
      });
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
    }

    const audio = this._getOrCreateCueAudio(normKey);
    if (!audio) return;

    audio.loop = false;
    audio.muted = this._isMuted;
    audio.currentTime = 0;

    const isPeace = normKey.startsWith('peace_');
    const isDread = !isPeace && normKey !== 'stop';
    const isCatMuted = (isDread && this._isMutedDread) || (isPeace && this._isMutedPeace);
    const normalizedCeiling = cfg.targetVol * customVolFactor;
    const targetVolume = (isCatMuted || this._isMuted) ? 0 : Math.min(0.85, normalizedCeiling * (this._musicVolume / 0.85));
    this._cueTargetVol = targetVolume;
    this._cueStartVol = 0.0;
    this._cueFadeElapsed = 0.0;
    this._cueFadeDuration = Math.max(0.35, cfg.fadeInSec);
    this._cueIsFading = true;
    this._cuePauseOnEnd = false;

    // Detect duration encoded in key (e.g. dread_03_predator_instant_terror_drop_25s -> 25)
    const durMatch = normKey.match(/_(\d+)s/);
    this._cueMaxDuration = durMatch ? parseInt(durMatch[1], 10) : 0;
    this._cuePlayElapsed = startOffsetSec;

    // Start at 0 for anti-pop smooth micro-ramp
    audio.volume = 0;

    this._cueAudio = audio;
    this._cueTrackKey = normKey;

    // Auto-duck background ambient to 0.01 so cue sits clean with zero frequency clash
    if (!this._isCueDucking) {
      this._isCueDucking = true;
      this._savedDuckFactorBeforeCue = this._currentDuckFactor;
      this.playTrack(this._currentTrackKey, cfg.duckAmbientTo, 1.2);
    }

    audio.onended = () => {
      this.stopCinematicCue(2.5);
    };

    if (!this._isPaused) {
      audio.play().catch((err) => {
        console.warn('[AmbientManager] Cue play failed: ' + normKey, err);
      });
    }
  }

    public syncScreamerCue(cueKey: string, offsetSec: number, isPlaying: boolean, customGain: number = 1.0): void {
    if (!cueKey || cueKey === 'stop') {
      this.stopScreamerCue(0.2);
      return;
    }
    const normKey = cueKey.toLowerCase();
    const cfg = CUE_NORMALIZATION_MAP[normKey] ?? {
      targetVol: 0.40,
      fadeInSec: 0.1,
      duckAmbientTo: 1.0, // Screamers NEVER duck ambient
    };
    const isCatMuted = this._isMutedScreamer || this._isMuted;
    this._screamerCustomGain = customGain ?? 1.0;
    const targetVolume = isCatMuted ? 0 : Math.min(1.0, cfg.targetVol * this._screamerVolumeMultiplier * this._screamerCustomGain * (this._musicVolume / 0.85));
    this._screamerTargetVol = targetVolume;

    if (this._screamerTrackKey === normKey && this._screamerAudio) {
      try {
        if (Math.abs(this._screamerAudio.currentTime - offsetSec) > 0.3) {
          this._screamerAudio.currentTime = Math.max(0, offsetSec);
        }
      } catch (err) {}
      this._screamerAudio.volume = isCatMuted ? 0 : Math.max(0, Math.min(1, targetVolume * this._voiceDuckingFactor));
      if (isPlaying && !this._isPaused) {
        this._screamerAudio.play().catch(() => {});
      } else {
        this._screamerAudio.pause();
      }
      return;
    }

    if (this._screamerAudio) {
      try {
        this._screamerAudio.pause();
      } catch (_) {}
      this._screamerAudio = null;
    }

    this._screamerTrackKey = normKey;
    const audio = this._getOrCreateScreamerAudio(normKey);
    if (!audio) return;
    this._screamerAudio = audio;
    try {
      audio.currentTime = Math.max(0, offsetSec);
    } catch (_) {}
    audio.volume = isCatMuted ? 0 : Math.max(0, Math.min(1, targetVolume * this._voiceDuckingFactor));
    // CRITICAL: Isolated onended that NEVER calls stopCinematicCue or touches ambient ducking!
    audio.onended = () => {
      this.stopScreamerCue(0.1);
    };
    if (isPlaying && !this._isPaused) {
      audio.play().catch(() => {});
    }
  }

  public stopScreamerCue(fadeSec: number = 0.2): void {
    if (this._screamerAudio) {
      try {
        this._screamerAudio.pause();
      } catch (_) {}
      this._screamerAudio = null;
    }
    this._screamerTrackKey = null;
  }

  public stopCinematicCue(fadeSec: number = 0.5): void {
    if (this._cueAudio) {
      const oldAudio = this._cueAudio;
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
      this._cueMaxDuration = 0;
      this._cuePlayElapsed = 0.0;

      if (fadeSec <= 0) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      } else {
        for (const f of this._fadingCues) {
          f.audio.pause();
          f.audio.currentTime = 0;
        }
        this._fadingCues = [];
        this._fadingCues.push({
          audio: oldAudio,
          startVol: oldAudio.volume,
          targetVol: 0.0,
          duration: Math.max(0.2, fadeSec),
          elapsed: 0.0,
        });
      }
    }

    if (this._isCueDucking) {
      this._isCueDucking = false;
      this.playTrack(this._currentTrackKey, this._savedDuckFactorBeforeCue, Math.max(1.0, fadeSec));
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

// Global unlock on first user gesture for browser Autoplay policy conformance
if (typeof window !== 'undefined') {
  const unlock = () => {
    AmbientManager.unlockAudio();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}

