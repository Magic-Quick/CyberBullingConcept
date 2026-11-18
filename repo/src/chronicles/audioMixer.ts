import type { Clip, Project } from './model';
import { clipRange, resolveTime } from './timeline';

interface Sound {
  audio: HTMLAudioElement; clip: Clip; url: string; failed: boolean; target: number;
  pendingPlay: boolean; audible: boolean; metadata: () => void; error: () => void; timelineStart:number; timelineEnd:number;
}
interface Bed extends Sound {
  identity: string; gain: number; once: boolean; project?: Project; ownedClip?: Clip;
  elapsed: number; lastClock: number; active: boolean; commandStart: number;
}
interface AudioControl { clip: Clip; start: number; }
const AUDIO_KINDS = new Set(['voice', 'audio', 'sfx']);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function trackAllowed(project: Project | undefined, clip: Clip | undefined): boolean {
  if (!clip) return true;
  const track = project?.tracks.find(t => t.id === clip.trackId);
  return clip.enabled !== false && !track?.hidden && !track?.muted;
}
function channel(project: Project | undefined, clip: Clip): string | undefined {
  return (project?.tracks.find(t => t.id === clip.trackId)?.channel || ({ A2: 'BASE', A3: 'DREAD', A4: 'PEACE', A5: 'GAME_THINK' } as Record<string, string>)[clip.trackId])?.trim().toUpperCase();
}
/** BASE gain ceiling before envelope/master/voice duck; absent preserves the normal mix. */
function baseCeiling(clip: Clip | undefined): number | undefined {
  const value = clip?.duckBaseTo;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}
function sourceLength(project: Project | undefined, clip: Clip | undefined, audio?: HTMLAudioElement): number | undefined {
  const start = clip?.sourceIn || 0;
  const asset = project?.assets.find(a => a.id === clip?.assetId);
  const utterance = project?.utterances.find(u => u.id === clip?.utteranceId);
  const actual = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined;
  const ends = [clip?.sourceOut, asset?.duration, utterance?.duration, actual].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return ends.length ? Math.max(0, Math.min(...ends) - start) : undefined;
}
function envelope(clip: Clip | undefined, local: number): number {
  const points = clip?.envelope?.filter(p => Number.isFinite(p.time) && Number.isFinite(p.value)).slice().sort((a, b) => a.time - b.time);
  if (!points?.length) return 1;
  if (local <= points[0].time) return points[0].value;
  for (let i = 1; i < points.length; i++) {
    const left = points[i - 1], right = points[i];
    if (local < right.time) return left.value + (right.value - left.value) * (local - left.time) / Math.max(.0001, right.time - left.time);
  }
  return points[points.length - 1].value;
}

/** One owner per sound; the director and public player execute identical clip parameters. */
export class AudioMixer {
  private sounds = new Map<string, Sound>();
  private bed: Bed | null = null;
  private paused = true;
  private playedSfx = new Set<string>();
  private missingVoice = new Set<string>();
  private failedKeys = new Set<string>();
  private epoch = '';
  private activeKeys = new Set<string>();
  private controls: AudioControl[] = [];
  private controlTime = 0;
  private voiceActive = false;
  voiceVolume = 1; musicVolume = .5; effectsVolume = .5; muted = false;
  onAudioError: (id: string, kind?: Clip['kind']) => void = () => {};
  constructor(private readonly url: (id: string) => string | undefined) {}

  get buffering(): boolean { return [...this.sounds.values()].some(s => s.clip.kind === 'voice' && s.audible && !s.failed && s.audio.readyState < 3); }

  /** The sample clock drives speech, including an MP3's physical end/padding. */
  voiceTime(utteranceId:string|undefined):number|null{return this.sampleTime([...this.sounds.values()].find(s=>s.clip.kind==='voice'&&s.clip.utteranceId===utteranceId));}
  clipTime(clipId:string):number|null{return this.sampleTime([...this.sounds.values()].find(s=>s.clip.id===clipId));}
  private sampleTime(sound:Sound|undefined):number|null{if(!sound||sound.failed||!sound.audible||sound.audio.readyState<2)return null;return sound.audio.ended?sound.timelineEnd:Math.min(sound.timelineEnd,sound.timelineStart+Math.max(0,sound.audio.currentTime-(sound.clip.sourceIn??0)));}

  private release(sound: Sound): void {
    // Clearing src may itself dispatch events; remove listeners and owner before doing it.
    sound.audio.removeEventListener('loadedmetadata', sound.metadata);
    sound.audio.removeEventListener('error', sound.error);
    sound.audio.pause(); sound.audio.removeAttribute('src'); sound.audio.load();
  }
  private seek(sound: Sound): void {
    if (sound.audio.readyState < 1) return;
    try { sound.audio.currentTime = Math.max(0, sound.target); } catch { /* The sole metadata listener retries the latest target. */ }
  }
  private createSound(clip: Clip, url: string, current: (sound: Sound) => boolean): Sound {
    const audio = new Audio(url); audio.preload = 'auto';
    const sound: Sound = { audio, clip, url, failed: false, target: clip.sourceIn || 0, pendingPlay: false, audible: false, metadata: () => {}, error: () => {},timelineStart:0,timelineEnd:Infinity };
    sound.metadata = () => { if (current(sound)) this.seek(sound); };
    sound.error = () => {
      if (!current(sound) || sound.failed) return;
      sound.failed = true;
      this.failedKeys.add(`${this.epoch}:${sound.clip.id}`);
      if (sound.clip.kind === 'voice') this.onAudioError(sound.clip.id, 'voice');
    };
    audio.addEventListener('loadedmetadata', sound.metadata);
    audio.addEventListener('error', sound.error);
    return sound;
  }
  private transport(sound: Sound, playing: boolean, current: () => boolean): void {
    if (!playing) { sound.audio.pause(); return; }
    if (sound.failed || sound.pendingPlay || !sound.audio.paused || sound.audio.ended) return;
    sound.pendingPlay = true;
    void sound.audio.play().catch((error: unknown) => {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      if (!aborted && current() && !this.paused) sound.error();
    }).finally(() => { sound.pendingPlay = false; });
  }

  /** Commands change gain, never ownership or source position. A later source reopens its channel. */
  private commandCeiling(clip: Clip, project?: Project, fallbackStart = 0): number | undefined {
    if (clip.kind !== 'audio') return undefined;
    const sourceStart = project && clip.sceneId ? resolveTime(project, clip.sceneId, clip.start) ?? fallbackStart : fallbackStart;
    const sourceChannel = channel(project, clip);
    let latest: AudioControl | undefined;
    for (const control of this.controls) {
      if (clip.sceneId && control.clip.sceneId !== clip.sceneId || control.start < sourceStart) continue;
      const command = control.clip.audioCommand!;
      const target = command.channel.trim().toUpperCase();
      if (target !== 'ALL_MUSIC' && target !== sourceChannel) continue;
      if (!latest || control.start >= latest.start) latest = control;
    }
    if (!latest) return undefined;
    const command = latest.clip.audioCommand!;
    return command.action === 'silence' ? 0 : typeof command.gain === 'number' && Number.isFinite(command.gain) ? clamp(command.gain) : .05;
  }

  sync(project: Project, clips: Clip[], time: number, playing: boolean, epoch: string, seek = false): void {
    this.paused = !playing;
    if (this.epoch !== epoch) {
      const old = [...this.sounds.values()]; this.sounds.clear(); old.forEach(s => this.release(s));
      this.playedSfx.clear(); this.missingVoice.clear(); this.failedKeys.clear(); this.epoch = epoch;
    }
    const keep = new Set<string>();
    const eligible = clips.filter(c => AUDIO_KINDS.has(c.kind) && trackAllowed(project, c));
    this.controlTime = time;
    this.controls = eligible.flatMap(clip => {
      if (clip.kind !== 'audio' || clip.assetId || !clip.audioCommand || !['silence', 'duck'].includes(clip.audioCommand.action)) return [];
      const range = clipRange(project, clip);
      return range && time >= range.start && time < range.end ? [{ clip, start: range.start }] : [];
    });
    this.activeKeys = new Set(eligible.map(c => `${epoch}:${c.id}`));
    const audibleAt = (c: Clip): boolean => {
      if (!c.assetId || !this.url(c.assetId) || this.failedKeys.has(`${epoch}:${c.id}`)) return false;
      const range = clipRange(project, c), length = sourceLength(project, c, this.sounds.get(`${epoch}:${c.id}`)?.audio);
      return Boolean(range && time >= range.start && time < Math.min(range.end, !c.loop && length !== undefined ? range.start + length : Infinity));
    };
    const voiceActive = eligible.some(c => c.kind === 'voice' && audibleAt(c));
    this.voiceActive = voiceActive;
    const willPlaySfx = (c: Clip): boolean => c.kind !== 'sfx' || !seek && (!this.playedSfx.has(`${epoch}:${c.id}`) || this.sounds.has(`${epoch}:${c.id}`));
    const dramatic = eligible.filter(c => ['DREAD', 'PEACE'].includes(channel(project, c) || '') && audibleAt(c) && willPlaySfx(c));
    // The newest cue wins, independently of the visual/audio track ordering.
    const chosenDramatic = dramatic.reduce<Clip | undefined>((latest, cue) => !latest || (clipRange(project, cue)?.start ?? -Infinity) >= (clipRange(project, latest)?.start ?? -Infinity) ? cue : latest, undefined);
    // A one-shot may explicitly request temporary ducking; ordinary SFX never add it.
    const duckingSfx = eligible.filter(c => c.kind === 'sfx' && baseCeiling(c) !== undefined && audibleAt(c) && willPlaySfx(c));
    const chosenSfx = duckingSfx.reduce<Clip | undefined>((latest, cue) => !latest || (clipRange(project, cue)?.start ?? -Infinity) >= (clipRange(project, latest)?.start ?? -Infinity) ? cue : latest, undefined);
    const ceilings = [baseCeiling(chosenDramatic), baseCeiling(chosenSfx)].filter((value): value is number => value !== undefined);
    const duckBaseTo = ceilings.length ? Math.min(...ceilings) : undefined;
    for (const clip of eligible) {
      if (!clip.assetId) continue;
      const cueChannel = channel(project, clip);
      if (['DREAD', 'PEACE'].includes(cueChannel || '') && chosenDramatic?.id !== clip.id) continue;
      if (cueChannel === 'GAME_THINK' && this.bed) continue;
      const key = `${epoch}:${clip.id}`;
      if (this.failedKeys.has(key)) continue;
      let sound = this.sounds.get(key);
      if (clip.kind === 'sfx') {
        if (seek) { this.playedSfx.add(key); continue; }
        // Pause keeps an existing one-shot. A not-yet-started one-shot is not consumed.
        if (!sound && (!playing || this.playedSfx.has(key))) continue;
      }
      const url = this.url(clip.assetId);
      if (!url) {
        if (clip.kind === 'voice' && !this.missingVoice.has(key)) {
          this.missingVoice.add(key);
          queueMicrotask(() => { if (this.epoch === epoch && this.activeKeys.has(key)) this.onAudioError(clip.id, 'voice'); });
        }
        continue;
      }
      const range = clipRange(project, clip);
      if (!range || time < range.start) continue;
      const local = Math.max(0, time - range.start), source = clip.sourceIn || 0;
      const length = sourceLength(project, clip, sound?.audio);
      const end = !clip.loop && length !== undefined ? Math.min(range.end, range.start + length) : range.end;
      if (time >= end || end <= range.start) continue;
      if (sound && sound.url !== url) { this.sounds.delete(key); this.release(sound); sound = undefined; }
      const initialSound=!sound;
      if (!sound) {
        sound = this.createSound(clip, url, candidate => this.epoch === epoch && this.sounds.get(key) === candidate);
        this.sounds.set(key, sound); if (clip.kind === 'sfx') this.playedSfx.add(key);
      }
      keep.add(key); sound.clip = clip; sound.audible = true; sound.timelineStart=range.start;sound.timelineEnd=end;
      const audio = sound.audio; audio.loop = Boolean(clip.loop);
      sound.target = source + (clip.loop && length && length > 0 ? local % length : local);
      const outsideSource = audio.currentTime < source - .02 || length !== undefined && audio.currentTime >= source + length;
      // A delayed animation frame must not rewind speech repeatedly. Explicit
      // seeking still applies; normal playback follows the audio sample clock.
      if (seek || outsideSource || initialSound) this.seek(sound);
      let gain = clip.gain ?? 1;
      if (cueChannel === 'BASE' && duckBaseTo !== undefined) gain = Math.min(gain, duckBaseTo);
      const commandGain = this.commandCeiling(clip, project);
      if (commandGain !== undefined) gain = Math.min(gain, commandGain);
      gain *= envelope(clip, local);
      if (clip.fadeIn) gain *= Math.min(1, local / clip.fadeIn);
      if (clip.fadeOut) gain *= Math.min(1, Math.max(0, (end - time) / clip.fadeOut));
      const master = clip.kind === 'voice' ? this.voiceVolume : clip.kind === 'sfx' ? this.effectsVolume : this.musicVolume;
      audio.volume = this.muted ? 0 : clamp(gain * master * (clip.kind === 'audio' && voiceActive && commandGain === undefined ? .2 : 1));
      this.transport(sound, playing, () => this.epoch === epoch && this.sounds.get(key) === sound);
    }
    for (const [key, sound] of this.sounds) if (!keep.has(key)) { this.sounds.delete(key); this.release(sound); }
    this.syncBed(playing, voiceActive);
  }

  /** The game state owns its bed across waiting and reactions, independently of branch time. */
  setGameBed(id: string | undefined, gain = .2, once = false, clip?: Clip, project?: Project): void {
    if (!id) { this.clearBed(); return; }
    const url = this.url(id); if (!url) { this.clearBed(); return; }
    const identity = `${clip?.id || id}:${id}`;
    if (!this.bed || this.bed.identity !== identity || this.bed.url !== url) {
      this.clearBed();
      const ownerClip: Clip = clip || { id: `bed:${id}`, sceneId: '', trackId: 'A5', kind: 'audio', assetId: id, start: { type: 'scene', offset: 0 } };
      const base = this.createSound(ownerClip, url, candidate => this.bed === candidate);
      this.bed = Object.assign(base, { identity, gain, once, project, ownedClip: clip, elapsed: 0, lastClock: performance.now(), active: false, commandStart: this.controlTime });
    }
    const bed = this.bed;
    bed.clip = clip || bed.clip; bed.ownedClip = clip; bed.project = project; bed.gain = gain; bed.once = once;
    bed.audio.loop = once ? false : clip?.loop ?? true;
    this.syncBed(!this.paused, this.voiceActive);
  }
  private syncBed(playing: boolean, voiceActive: boolean): void {
    const bed = this.bed; if (!bed) return;
    const clip = bed.ownedClip, source = clip?.sourceIn || 0;
    const length = sourceLength(bed.project, clip, bed.audio), loop = bed.audio.loop;
    const now = performance.now();
    if (bed.active && !bed.audio.paused && !bed.failed && bed.audio.readyState >= 3) bed.elapsed += Math.max(0, (now - bed.lastClock) / 1000);
    bed.lastClock = now;
    const allowed = trackAllowed(bed.project, clip);
    let end = clip?.duration !== undefined && clip.duration > 0 ? clip.duration : undefined;
    if (end === undefined && clip?.duration !== 0 && clip?.end && bed.project) { const r = clipRange(bed.project, clip); if (r && r.end > r.start) end = r.end - r.start; }
    if (!loop && length !== undefined) end = end === undefined ? length : Math.min(end, length);
    const complete = end !== undefined && bed.elapsed >= end || bed.audio.ended && !loop;
    bed.active = playing && allowed && !complete;
    bed.audible = allowed;
    bed.target = source + (loop && length && length > 0 ? bed.elapsed % length : bed.elapsed);
    const outsideSource = bed.audio.currentTime < source - .02 || length !== undefined && bed.audio.currentTime >= source + length;
    if (outsideSource || bed.elapsed === 0 && Math.abs(bed.audio.currentTime - source) > .02) this.seek(bed);
    const commandGain = this.commandCeiling(clip || bed.clip, bed.project, bed.commandStart);
    let gain = clip?.gain ?? bed.gain;
    if (commandGain !== undefined) gain = Math.min(gain, commandGain);
    gain *= envelope(clip, bed.elapsed);
    if (clip?.fadeIn) gain *= Math.min(1, bed.elapsed / clip.fadeIn);
    if (clip?.fadeOut && end !== undefined) gain *= Math.min(1, Math.max(0, (end - bed.elapsed) / clip.fadeOut));
    bed.audio.volume = this.muted || !allowed ? 0 : clamp(gain * this.musicVolume * (voiceActive && commandGain === undefined ? .25 : 1));
    this.transport(bed, bed.active, () => this.bed === bed);
  }
  clearBed(): void { const old = this.bed; this.bed = null; if (old) this.release(old); }
  stop(): void {
    const old = [...this.sounds.values()]; this.sounds.clear(); this.activeKeys.clear();
    old.forEach(sound => this.release(sound)); this.clearBed();
    this.paused = true; this.playedSfx.clear(); this.missingVoice.clear(); this.failedKeys.clear(); this.epoch = '';
    this.controls = []; this.controlTime = 0; this.voiceActive = false;
  }
  resetSfx(): void { this.playedSfx.clear(); }
}
