// Cinematic Audio Track Analyzer for Intro Score & Universal Musical Intensity Synchronization
import { AMBIENT_ENVELOPES } from './audioEnvelopes';

export interface IntroTimingProfile {
  trackKey: 'desolate_cry' | 'titan_forge';
  trackTitle: string;
  logoDisperseTime: number;     // 15.5s / 17.5s - alien dispersion begins
  logoFadeOutTime: number;      // 19.5s / 21.5s - logo completely dissolves into void
  theatricalPauseStart: number; // Start of cosmic silence / tension pause
  valleyTime: number;           // Deepest audio valley (minimum energy in pause)
  crescendoStartTime: number;   // Musical swell start
  titleDropTime: number;        // Exact dramatic title strike / drop
  titleFadeOutTime: number;     // Title dissolves into void
  cycleStartTime: number;       // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" appears in center after main logo vanishes
  cycleFadeOutTime: number;     // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void
  introEndTime: number;         // Transition handover to Prologue (intensity drop)
  valleyEnergy: number;
  dropEnergy: number;
  isLiveAnalyzed: boolean;
}

export interface IntensityDropResult {
  dropTime: number;
  waitDelay: number;
  currentRms: number;
  dropRms: number;
  isDropFound: boolean;
}

class AudioTrackAnalyzerService {
  private _profiles: Record<'desolate_cry' | 'titan_forge', IntroTimingProfile> = {
    desolate_cry: {
      trackKey: 'desolate_cry',
      trackTitle: 'Desolate Cry in the Distortion',
      logoDisperseTime: 17.5,
      logoFadeOutTime: 21.5,
      theatricalPauseStart: 21.5,
      valleyTime: 24.5,
      crescendoStartTime: 25.5,
      titleDropTime: 27.0,      // Slow atmospheric emergence begins at 27.0s
      titleFadeOutTime: 33.5,   // Main logo dissolves into void
      cycleStartTime: 35.5,     // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" appears in center after main logo dissolves
      cycleFadeOutTime: 40.5,   // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void
      introEndTime: 45.5,       // Ambient plays out to quiet valley at 45.5s
      valleyEnergy: 0.116,
      dropEnergy: 0.362,
      isLiveAnalyzed: false,
    },
    titan_forge: {
      trackKey: 'titan_forge',
      trackTitle: 'Titan Forge',
      logoDisperseTime: 15.5,
      logoFadeOutTime: 19.5,
      theatricalPauseStart: 19.5,
      valleyTime: 21.0,
      crescendoStartTime: 22.8,
      titleDropTime: 24.0,      // Heavy percussive drum impact drops title at 24.0s
      titleFadeOutTime: 30.5,   // Main logo dissolves into void
      cycleStartTime: 32.5,     // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" appears in center after main logo dissolves
      cycleFadeOutTime: 39.5,   // "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void
      introEndTime: 45.5,       // Drum section concludes and intensity drops to calm valley at 45.5s
      valleyEnergy: 0.080,
      dropEnergy: 0.371,
      isLiveAnalyzed: false,
    },
  };

  private _analyzing = new Set<string>();

  public getProfile(trackKey: 'desolate_cry' | 'titan_forge'): IntroTimingProfile {
    return this._profiles[trackKey] || this._profiles.desolate_cry;
  }

  /**
   * Retrieves RMS intensity at a given timestamp for any ambient track.
   */
  public getIntensity(trackKey: string | null, time: number): number {
    if (!trackKey) return 0;
    const env = AMBIENT_ENVELOPES[trackKey];
    if (!env || !env.rms.length) return 0;
    const totalDuration = env.rms.length * env.hopSec;
    const wrappedTime = totalDuration > 0 ? (time % totalDuration) : time;
    const idx = Math.min(env.rms.length - 1, Math.max(0, Math.floor(wrappedTime / env.hopSec)));
    return env.rms[idx];
  }

  /**
   * Universal Musical Intensity Director:
   * Finds the ideal transition timestamp where musical intensity is falling/decaying
   * rather than cutting during an emotional swell or crescendo.
   */
  public findNextIntensityDrop(
    trackKey: string | null,
    currentTime: number,
    minWaitSec = 1.6,
    maxWaitSec = 5.5
  ): IntensityDropResult {
    const fallbackTime = currentTime + minWaitSec;
    if (!trackKey) {
      return {
        dropTime: fallbackTime,
        waitDelay: minWaitSec,
        currentRms: 0,
        dropRms: 0,
        isDropFound: false,
      };
    }

    const env = AMBIENT_ENVELOPES[trackKey];
    if (!env || !env.rms.length) {
      return {
        dropTime: fallbackTime,
        waitDelay: minWaitSec,
        currentRms: 0,
        dropRms: 0,
        isDropFound: false,
      };
    }

    const hop = env.hopSec;
    const totalDuration = env.rms.length * hop;
    const wrappedCurTime = totalDuration > 0 ? (currentTime % totalDuration) : currentTime;
    const curRms = this.getIntensity(trackKey, wrappedCurTime);

    const startIdx = Math.floor((wrappedCurTime + minWaitSec) / hop);
    const endIdx = Math.floor((wrappedCurTime + maxWaitSec) / hop);

    let bestIdx = startIdx;
    let bestScore = Infinity;

    for (let i = startIdx; i <= endIdx; i++) {
      const wrappedIdx = i % env.rms.length;
      const val = env.rms[wrappedIdx];

      // Slope over next 0.5s (2 hops)
      const lookaheadIdx = (wrappedIdx + 2) % env.rms.length;
      const slope = env.rms[lookaheadIdx] - val;

      // Heavy penalty for transitioning during an emotional rise / crescendo
      const risingPenalty = Math.max(0, slope) * 10.0;

      // Local valley bonus (quiet pocket)
      const prevIdx = (wrappedIdx - 1 + env.rms.length) % env.rms.length;
      const nextIdx = (wrappedIdx + 1) % env.rms.length;
      const isValley = val <= env.rms[prevIdx] && val <= env.rms[nextIdx];
      const valleyBonus = isValley ? -0.04 : 0;

      const score = val + risingPenalty + valleyBonus;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const waitDelay = (bestIdx - (wrappedCurTime / hop)) * hop;
    const targetDropTime = currentTime + waitDelay;
    const dropRms = env.rms[bestIdx % env.rms.length];

    console.log(
      `[IntensityDirector] Act handover on '${trackKey}': delay=${waitDelay.toFixed(2)}s (t=${targetDropTime.toFixed(1)}s), RMS ${curRms.toFixed(3)} -> ${dropRms.toFixed(3)}`
    );

    return {
      dropTime: targetDropTime,
      waitDelay: Math.max(minWaitSec, waitDelay),
      currentRms: curRms,
      dropRms: dropRms,
      isDropFound: true,
    };
  }

  public async analyzeTrack(trackKey: 'desolate_cry' | 'titan_forge', audioUrl: string): Promise<IntroTimingProfile> {
    if (this._profiles[trackKey].isLiveAnalyzed || this._analyzing.has(trackKey)) {
      return this._profiles[trackKey];
    }
    this._analyzing.add(trackKey);

    try {
      const resp = await fetch(audioUrl);
      const arrayBuf = await resp.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        this._analyzing.delete(trackKey);
        return this._profiles[trackKey];
      }

      const ctx = new AudioCtx();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const channelData = audioBuf.getChannelData(0);
      const sampleRate = audioBuf.sampleRate;

      // Analyze energy envelope in 50ms windows between 20.0s and 45.0s
      const windowSec = 0.05;
      const windowSamples = Math.floor(sampleRate * windowSec);
      const startSec = 20.0;
      const endSec = Math.min(50.0, audioBuf.duration);
      const startSample = Math.floor(startSec * sampleRate);
      const endSample = Math.floor(endSec * sampleRate);

      const rmsEntries: { time: number; rms: number }[] = [];
      for (let s = startSample; s < endSample - windowSamples; s += windowSamples) {
        let sumSq = 0;
        for (let i = 0; i < windowSamples; i++) {
          const val = channelData[s + i];
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / windowSamples);
        rmsEntries.push({ time: s / sampleRate, rms });
      }

      // 1. Locate the tension valley (minimum energy in the theatrical pause [19.0s .. 24.5s])
      const pauseEntries = rmsEntries.filter((r) => r.time >= 19.0 && r.time <= 24.5);
      let minEntry = pauseEntries[0] || { time: 21.0, rms: 0.1 };
      for (const p of pauseEntries) {
        if (p.rms < minEntry.rms) minEntry = p;
      }
      const valleyTime = minEntry.time;
      const valleyEnergy = minEntry.rms;

      // 2. Locate the swelling crescendo onset
      const afterValley = rmsEntries.filter((r) => r.time >= valleyTime);
      let detectedCrescendoStart = valleyTime + 1.0;
      let dropEnergy = valleyEnergy;

      for (let i = 1; i < afterValley.length; i++) {
        if (afterValley[i].rms > valleyEnergy * 1.35 && detectedCrescendoStart === valleyTime + 1.0) {
          detectedCrescendoStart = afterValley[i].time;
          dropEnergy = afterValley[i].rms;
        }
      }

      // Calibrated target timings:
      // Titan Forge: heavy drum impact strike on 24.0s
      // Desolate Cry: slow atmospheric emergence begins at 27.0s
      // Main logo dissolves, followed by "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" in the center of the screen
      // Both tracks resolve their movement into a quiet calm valley at 45.5s
      const targetDrop = trackKey === 'titan_forge' ? 24.0 : 27.0;
      const targetFadeOut = trackKey === 'titan_forge' ? 30.5 : 33.5;
      const cycleStart = trackKey === 'titan_forge' ? 32.5 : 35.5;
      const cycleFadeOut = trackKey === 'titan_forge' ? 39.5 : 40.5;
      const targetEnd = 45.5;

      this._profiles[trackKey] = {
        ...this._profiles[trackKey],
        valleyTime,
        crescendoStartTime: detectedCrescendoStart,
        titleDropTime: targetDrop,
        titleFadeOutTime: targetFadeOut,
        cycleStartTime: cycleStart,
        cycleFadeOutTime: cycleFadeOut,
        introEndTime: targetEnd,
        valleyEnergy,
        dropEnergy,
        isLiveAnalyzed: true,
      };

      console.log(`[AudioTrackAnalyzer] Calibrated '${trackKey}': valley=${valleyTime.toFixed(2)}s, drop=${targetDrop.toFixed(2)}s, dropValleyEnd=${targetEnd.toFixed(2)}s`);
    } catch (err) {
      console.warn(`[AudioTrackAnalyzer] Live analysis fallback for '${trackKey}':`, err);
    } finally {
      this._analyzing.delete(trackKey);
    }

    return this._profiles[trackKey];
  }
}

export const AudioTrackAnalyzer = new AudioTrackAnalyzerService();
