import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const timeline = url(compile(await readFile(new URL('./timeline.ts', import.meta.url), 'utf8')));
const source = compile(await readFile(new URL('./audioMixer.ts', import.meta.url), 'utf8')).replace(/from ['"]\.\/timeline['"]/g, `from '${timeline}'`);
const { AudioMixer } = await import(url(source));
let now = 0;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });

class FakeAudio {
  static instances = [];
  static ready = 4;
  handlers = new Map();
  added = new Map();
  paused = true;
  ended = false;
  duration = 100;
  currentTime = 0;
  volume = 1;
  plays = 0;
  loop = false;
  constructor(url) { this.src = url; this.readyState = FakeAudio.ready; FakeAudio.instances.push(this); }
  addEventListener(name, fn) { const callbacks = this.handlers.get(name) || new Set(); callbacks.add(fn); this.handlers.set(name, callbacks); this.added.set(name, (this.added.get(name) || 0) + 1); }
  removeEventListener(name, fn) { this.handlers.get(name)?.delete(fn); }
  emit(name) { for (const fn of [...(this.handlers.get(name) || [])]) fn(); }
  play() { this.paused = false; this.plays++; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
}
globalThis.Audio = FakeAudio;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('a late animation frame never rewinds playing speech; the sample clock remains authoritative',async()=>{
  const f=fixture(audioClip({id:'voice',kind:'voice',trackId:'A1',utteranceId:'u'}));
  f.mixer.sync(f.p,[f.clip],0,true,'owner');await flush();
  f.audio.currentTime=5;f.mixer.sync(f.p,[f.clip],.2,true,'owner');
  assert.equal(f.audio.currentTime,5);assert.equal(f.mixer.voiceTime('u'),5);
  f.mixer.sync(f.p,[f.clip],2,true,'owner',true);assert.equal(f.audio.currentTime,2);
});
test('sample clock accounts for trims and maps a physical MP3 end to the authored endpoint',async()=>{
  const f=fixture(audioClip({id:'voice',kind:'voice',trackId:'A1',utteranceId:'u',start:{type:'scene',offset:3},sourceIn:2,sourceOut:6}));
  f.mixer.sync(f.p,[f.clip],3,true,'owner');await flush();f.audio.currentTime=4.5;
  assert.equal(f.mixer.voiceTime('u'),5.5);f.audio.currentTime=5.98;f.audio.ended=true;assert.equal(f.mixer.voiceTime('u'),7);
});
test('pause and play resume the same speech sample without an implicit seek',async()=>{
  const f=fixture(audioClip({id:'voice',kind:'voice',trackId:'A1',utteranceId:'u'}));
  f.mixer.sync(f.p,[f.clip],0,true,'owner');await flush();const audio=f.audio;audio.currentTime=3.2;
  f.mixer.sync(f.p,[f.clip],3.2,false,'owner');assert.equal(audio.paused,true);
  f.mixer.sync(f.p,[f.clip],3.2,true,'owner');await flush();assert.equal(audio.paused,false);assert.equal(audio.currentTime,3.2);assert.equal(f.audio,audio);
});
const audioClip = (patch = {}) => ({ id: 'cue', sceneId: 'scene', trackId: 'A6', kind: 'sfx', assetId: 'asset', start: { type: 'scene', offset: 0 }, duration: 10, ...patch });
function project(clip, trackPatch = {}) {
  return { schemaVersion: 1, id: 'p', title: 'P', tracks: [{ id: clip.trackId, kind: clip.kind, label: 'Track', order: 1, ...trackPatch }], assets: [{ id: clip.assetId, kind: 'audio', duration: 10 }], utterances: [], scenes: [{ id: 'scene', title: 'Scene', kind: 'room', duration: 10, utteranceIds: [] }], clips: [clip], stops: [], sequence: [] };
}
function fixture(clip = audioClip(), trackPatch = {}) {
  now = 0; FakeAudio.instances = []; FakeAudio.ready = 4;
  const p = project(clip, trackPatch), mixer = new AudioMixer(() => '/audio.mp3');
  return { p, mixer, clip, get audio() { return FakeAudio.instances.at(-1); } };
}

test('pause/resume preserves a playing SFX and resumes the same audio object', async () => {
  const f = fixture();
  f.mixer.sync(f.p, [f.clip], .6, true, 'owner'); await flush();
  const audio = f.audio;
  f.mixer.sync(f.p, [f.clip], .6, false, 'owner');
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '/audio.mp3');
  f.mixer.sync(f.p, [f.clip], .6, true, 'owner'); await flush();
  assert.equal(f.audio, audio);
  assert.equal(audio.paused, false);
  assert.equal(audio.plays, 2);
  assert.equal(audio.currentTime, .6);
});

test('paused initial render does not consume an SFX', async () => {
  const f = fixture();
  f.mixer.sync(f.p, [f.clip], 0, false, 'owner');
  assert.equal(FakeAudio.instances.length, 0);
  f.mixer.sync(f.p, [f.clip], 0, true, 'owner'); await flush();
  assert.equal(FakeAudio.instances.length, 1);
  assert.equal(f.audio.plays, 1);
});

test('explicit seek suppresses a one-shot until a deliberate reset or new owner', () => {
  const f = fixture();
  f.mixer.sync(f.p, [f.clip], 0, true, 'owner', true);
  f.mixer.sync(f.p, [f.clip], .2, true, 'owner');
  assert.equal(FakeAudio.instances.length, 0);
  f.mixer.resetSfx(); f.mixer.sync(f.p, [f.clip], .3, true, 'owner');
  assert.equal(FakeAudio.instances.length, 1);
  f.mixer.sync(f.p, [f.clip], .3, true, 'new-owner');
  assert.equal(FakeAudio.instances.length, 2);
});

test('an error queued by a released voice cannot affect the next owner', () => {
  const f = fixture(audioClip({ kind: 'voice', trackId: 'A1' })); const errors = [];
  f.mixer.onAudioError = (...args) => errors.push(args);
  f.mixer.sync(f.p, [f.clip], 0, true, 'owner');
  const staleHandler = [...f.audio.handlers.get('error')][0];
  f.mixer.stop(); staleHandler();
  assert.deepEqual(errors, []);
});

test('only the current voice reports a queue error and only once', () => {
  const f = fixture(audioClip({ kind: 'voice', trackId: 'A1' })); const errors = [];
  f.mixer.onAudioError = (...args) => errors.push(args);
  f.mixer.sync(f.p, [f.clip], 0, true, 'owner');
  f.audio.emit('error'); f.audio.emit('error');
  assert.deepEqual(errors, [['cue', 'voice']]);
  assert.equal(f.mixer.buffering, false);
});

test('music or SFX failure cannot advance the spoken queue', () => {
  for (const kind of ['audio', 'sfx']) {
    const f = fixture(audioClip({ kind })); let errors = 0;
    f.mixer.onAudioError = () => errors++;
    f.mixer.sync(f.p, [f.clip], 0, true, 'owner'); f.audio.emit('error');
    assert.equal(errors, 0);
  }
});

test('metadata uses one listener and seeks to the latest requested position', () => {
  const f = fixture(audioClip({ kind: 'voice', trackId: 'A1', sourceIn: 2 })); FakeAudio.ready = 0;
  f.mixer.sync(f.p, [f.clip], 0, true, 'owner');
  f.mixer.sync(f.p, [f.clip], 1, true, 'owner');
  f.mixer.sync(f.p, [f.clip], 2, true, 'owner');
  assert.equal(f.audio.added.get('loadedmetadata'), 1);
  f.audio.readyState = 4; f.audio.emit('loadedmetadata');
  assert.equal(f.audio.currentTime, 4);
});

test('trimmed non-loop audio ends at sourceOut even with a stale longer display interval', () => {
  const f = fixture(audioClip({ kind: 'voice', trackId: 'A1', sourceIn: 1, sourceOut: 2, duration: 10 }));
  f.mixer.sync(f.p, [f.clip], .5, true, 'owner'); const audio = f.audio;
  assert.equal(audio.currentTime, 1.5);
  f.mixer.sync(f.p, [f.clip], 1.1, true, 'owner');
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
});

test('a custom source loop remains inside sourceIn/sourceOut', () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A2', sourceIn: 1, sourceOut: 3, loop: true }));
  f.mixer.sync(f.p, [f.clip], 3.5, true, 'owner');
  assert.equal(f.audio.currentTime, 2.5);
});

test('bed survives pauses, repeated configuration and reaction/seek clock changes', async () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 0, loop: true }), { channel: 'GAME_THINK' });
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p);
  f.mixer.sync(f.p, [], 50, true, 'owner'); await flush();
  const audio = f.audio; audio.currentTime = .8; now = 800;
  f.mixer.sync(f.p, [], 50, false, 'owner');
  assert.equal(audio.paused, true);
  now = 5800; f.mixer.setGameBed('asset', .2, false, { ...f.clip }, f.p);
  f.mixer.sync(f.p, [], 999, true, 'owner', true); await flush();
  assert.equal(f.audio, audio);
  assert.equal(audio.currentTime, .8);
  assert.equal(audio.paused, false);
  assert.equal(FakeAudio.instances.length, 1);
});

test('bed respects track mute/hidden and clip enabled without recreating media', async () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 0, loop: true }), { channel: 'GAME_THINK' });
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); f.mixer.sync(f.p, [], 0, true, 'owner'); await flush(); const audio = f.audio;
  for (const patch of [{ muted: true }, { hidden: true }]) {
    const muted = { ...f.p, tracks: [{ ...f.p.tracks[0], ...patch }] };
    f.mixer.setGameBed('asset', .2, false, f.clip, muted);
    assert.equal(audio.volume, 0); assert.equal(audio.paused, true);
    f.mixer.setGameBed('asset', .2, false, f.clip, f.p); await flush();
    assert.equal(audio.paused, false);
  }
  f.mixer.setGameBed('asset', .2, false, { ...f.clip, enabled: false }, f.p);
  assert.equal(audio.paused, true); assert.equal(audio.volume, 0);
  assert.equal(FakeAudio.instances.length, 1);
});

test('bed follows clip loop settings, while the ChGK signal remains once', () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 0, loop: true }));
  f.mixer.setGameBed('asset', .2, true, f.clip, f.p);
  assert.equal(f.audio.loop, false);
  f.mixer.setGameBed('asset', .2, false, { ...f.clip, loop: false }, f.p);
  assert.equal(f.audio.loop, false);
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p);
  assert.equal(f.audio.loop, true);
});

test('bed gain, fade, envelope and voice ducking are taken from its authored clip', async () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 10, loop: true, gain: .8, fadeIn: 2, fadeOut: 2, envelope: [{ time: 0, value: 1 }, { time: 10, value: .5 }] })); f.mixer.musicVolume = 1;
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); f.mixer.sync(f.p, [], 0, true, 'owner'); await flush();
  const bed = f.audio; assert.equal(bed.volume, 0);
  now = 1000; f.mixer.sync(f.p, [], 0, true, 'owner');
  assert.ok(Math.abs(bed.volume - .38) < .0001);
  const voice = audioClip({ id: 'voice', kind: 'voice', trackId: 'A1' });
  f.mixer.sync(f.p, [voice], 0, true, 'owner');
  assert.ok(Math.abs(bed.volume - .095) < .0001);
  now = 9000; f.mixer.sync(f.p, [], 0, true, 'owner');
  assert.ok(Math.abs(bed.volume - .22) < .0001);
  now = 10000; f.mixer.sync(f.p, [], 0, true, 'owner');
  assert.equal(bed.paused, true);
});

test('owned waiting is indefinite even if the next branch has a later montage position', async () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 0, loop: true, end: { type: 'scene', offset: 2 } }));
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); f.mixer.sync(f.p, [], 0, true, 'owner'); await flush();
  now = 5000; f.mixer.sync(f.p, [], 0, true, 'owner');
  assert.equal(f.audio.paused, false);
});

test('the newest dramatic cue replaces an older peace cue regardless of track order', () => {
  now = 0; FakeAudio.instances = []; FakeAudio.ready = 4;
  const dread = audioClip({ id: 'dread', kind: 'audio', trackId: 'A3', assetId: 'dread', start: { type: 'scene', offset: 5 } });
  const peace = audioClip({ id: 'peace', kind: 'audio', trackId: 'A4', assetId: 'peace' });
  const p = { ...project(dread), tracks: [{ id: 'A3', channel: 'DREAD' }, { id: 'A4', channel: 'PEACE' }], assets: [{ id: 'dread', duration: 20 }, { id: 'peace', duration: 20 }], clips: [dread, peace] };
  new AudioMixer(id => '/' + id + '.mp3').sync(p, [dread, peace], 6, true, 'owner');
  assert.equal(FakeAudio.instances.length, 1);
  assert.equal(FakeAudio.instances[0].src, '/dread.mp3');
});

test('owned bed is not duplicated by a GAME_THINK timeline clip', () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'custom-bed', duration: 10, loop: true }), { channel: 'GAME_THINK' });
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); f.mixer.sync(f.p, [f.clip], 0, true, 'owner');
  assert.equal(FakeAudio.instances.length, 1);
});

test('missing current voice URL falls back once and a cancelled owner is ignored', async () => {
  const clip = audioClip({ kind: 'voice', trackId: 'A1' }), p = project(clip), mixer = new AudioMixer(() => undefined), errors = [];
  mixer.onAudioError = (...args) => errors.push(args);
  mixer.sync(p, [clip], 0, true, 'owner'); mixer.stop(); await flush();
  assert.equal(errors.length, 0);
  mixer.sync(p, [clip], 0, true, 'next'); await flush(); mixer.sync(p, [clip], .1, true, 'next'); await flush();
  assert.deepEqual(errors, [['cue', 'voice']]);
});

function layeredFixture(cuePatch = {}, basePatch = {}) {
  now = 0; FakeAudio.instances = []; FakeAudio.ready = 4;
  const base = audioClip({ id: 'base', assetId: 'base', kind: 'audio', trackId: 'A2', gain: .3, loop: true, duration: 20, ...basePatch });
  const cue = audioClip({ id: 'dread', assetId: 'dread', kind: 'audio', trackId: 'A3', gain: .28, start: { type: 'scene', offset: 2 }, duration: 2, duckBaseTo: .005, ...cuePatch });
  const p = { ...project(base), tracks: [{ id: 'A2', channel: 'BASE' }, { id: 'A3', channel: 'DREAD' }, { id: 'A4', channel: 'PEACE' }, { id: 'A6', channel: 'SFX' }], assets: [{ id: 'base', duration: 30 }, { id: 'dread', duration: 10 }, { id: 'peace', duration: 10 }], clips: [base, cue] };
  const mixer = new AudioMixer(id => '/' + id + '.mp3');
  return { base, cue, p, mixer, media: id => FakeAudio.instances.find(a => a.src === '/' + id + '.mp3') };
}

test('DREAD uses its explicit BASE gain ceiling, not an unconditional mute or extra multiplier', () => {
  const f = layeredFixture();
  f.mixer.sync(f.p, [f.base, f.cue], 3, true, 'owner');
  assert.equal(f.media('base').volume, .005 * .5);
  assert.equal(f.media('base').paused, false);
  assert.equal(f.media('dread').volume, .28 * (.5/.85));
});

test('an explicit zero silences BASE while an omitted duck value preserves the old mix', () => {
  const zero = layeredFixture({ id: 'peace', assetId: 'peace', trackId: 'A4', duckBaseTo: 0 });
  zero.mixer.sync(zero.p, [zero.base, zero.cue], 3, true, 'owner');
  assert.equal(zero.media('base').volume, 0);
  assert.equal(zero.media('base').paused, false);
  const normal = layeredFixture({ duckBaseTo: undefined });
  normal.mixer.sync(normal.p, [normal.base, normal.cue], 3, true, 'owner');
  assert.equal(normal.media('base').volume, .3 * .5);
});

test('the newest DREAD/PEACE cue owns the ceiling and an older zero does not remain sticky', () => {
  const f = layeredFixture({ duckBaseTo: .025 });
  const peace = audioClip({ id: 'peace', assetId: 'peace', kind: 'audio', trackId: 'A4', duckBaseTo: 0, duration: 10 });
  f.p.clips.push(peace);
  f.mixer.sync(f.p, [f.base, f.cue, peace], 3, true, 'owner');
  assert.equal(f.media('base').volume, .025 * .5);
  f.mixer.sync(f.p, [f.base, { ...f.cue, duckBaseTo: undefined }, peace], 3, true, 'owner');
  assert.equal(f.media('base').volume, .3 * .5);
});

test('BASE recovers its authored gain after the cue without restarting its media', () => {
  const f = layeredFixture();
  f.mixer.sync(f.p, [f.base], 1, true, 'owner'); const baseAudio = f.media('base');
  f.mixer.sync(f.p, [f.base, f.cue], 3, true, 'owner');
  assert.equal(baseAudio.volume, .005 * .5);
  f.mixer.sync(f.p, [f.base, f.cue], 5, true, 'owner');
  assert.equal(baseAudio.volume, .3 * .5);
  assert.equal(f.media('base'), baseAudio);
  assert.equal(baseAudio.plays, 1);
});

test('ducking cannot raise an already quieter BASE and preserves its envelope', () => {
  const quiet = layeredFixture({}, { gain: .001 });
  quiet.mixer.sync(quiet.p, [quiet.base, quiet.cue], 3, true, 'owner');
  assert.equal(quiet.media('base').volume, .001 * .5);
  const shaped = layeredFixture({}, { envelope: [{ time: 0, value: .5 }] });
  shaped.mixer.sync(shaped.p, [shaped.base, shaped.cue], 3, true, 'owner');
  assert.equal(shaped.media('base').volume, .005 * .5 * .5);
});

test('muted, disabled, unavailable or failed cues do not hold BASE ducking', () => {
  const muted = layeredFixture(); muted.p.tracks[1].muted = true;
  muted.mixer.sync(muted.p, [muted.base, muted.cue], 3, true, 'owner');
  assert.equal(muted.media('base').volume, .3 * .5);
  const disabled = layeredFixture({ enabled: false });
  disabled.mixer.sync(disabled.p, [disabled.base, disabled.cue], 3, true, 'owner');
  assert.equal(disabled.media('base').volume, .3 * .5);
  const missing = layeredFixture(); missing.mixer = new AudioMixer(id => id === 'base' ? '/base.mp3' : undefined);
  missing.mixer.sync(missing.p, [missing.base, missing.cue], 3, true, 'owner');
  assert.equal(missing.media('base').volume, .3 * .5);
  const failed = layeredFixture();
  failed.mixer.sync(failed.p, [failed.base, failed.cue], 3, true, 'owner'); failed.media('dread').emit('error');
  for (let i = 0; i < 3; i++) failed.mixer.sync(failed.p, [failed.base, failed.cue], 3.1 + i * .1, true, 'owner');
  assert.equal(failed.media('base').volume, .3 * .5);
  assert.equal(FakeAudio.instances.length, 2);
});

test('ordinary SFX do not duck BASE; an authored SFX ceiling is temporary and seek-safe', () => {
  const f = layeredFixture({ kind: 'sfx', trackId: 'A6' });
  f.mixer.sync(f.p, [f.base, { ...f.cue, duckBaseTo: undefined }], 3, true, 'owner');
  assert.equal(f.media('base').volume, .3 * .5);
  f.mixer.sync(f.p, [f.base, f.cue], 3.1, true, 'owner');
  assert.equal(f.media('base').volume, .005 * .5);
  f.mixer.sync(f.p, [f.base, f.cue], 3.2, true, 'owner', true);
  assert.equal(f.media('base').volume, .3 * .5);
});

const controlClip = (target, action = 'duck', patch = {}) => audioClip({ id: `command.${target}`, kind: 'audio', assetId: undefined, trackId: 'A2', start: { type: 'scene', offset: 2 }, duration: 2, audioCommand: { action, channel: target }, ...patch });

test('asset-less BASE duck defaults to .05 and keeps the source running at its current position', () => {
  const f = layeredFixture(), command = controlClip('BASE', 'duck', { gain: 0 });
  f.p.clips.push(command); f.mixer.musicVolume = 1;
  f.mixer.sync(f.p, [f.base], 1, true, 'owner'); const audio = f.media('base');
  audio.currentTime = 2.5;
  f.mixer.sync(f.p, [f.base, command], 2.5, true, 'owner');
  assert.equal(audio.volume, .05); assert.equal(audio.currentTime, 2.5);
  assert.equal(audio.paused, false); assert.equal(audio.plays, 1); assert.equal(f.media('base'), audio);
});

test('a PEACE silence controls that music channel without disposing its media', () => {
  const f = layeredFixture({ id: 'peace', assetId: 'peace', trackId: 'A4', duration: 10, start: { type: 'scene', offset: 0 }, duckBaseTo: undefined });
  const command = controlClip('PEACE', 'silence'); f.p.clips.push(command);
  f.mixer.sync(f.p, [f.base, f.cue], 1, true, 'owner'); const peace = f.media('peace');
  f.mixer.sync(f.p, [f.base, f.cue, command], 3, true, 'owner');
  assert.equal(peace.volume, 0); assert.equal(peace.paused, false); assert.equal(peace.src, '/peace.mp3');
  assert.equal(f.media('base').volume, .3 * .5);
});

test('ALL_MUSIC controls music while preserving voice and SFX', () => {
  const f = layeredFixture({ duckBaseTo: undefined });
  const voice = audioClip({ id: 'voice', assetId: 'voice', kind: 'voice', trackId: 'A1' });
  const sfx = audioClip({ id: 'effect', assetId: 'effect' });
  const command = controlClip('ALL_MUSIC', 'silence');
  f.p.assets.push({ id: 'voice', duration: 10 }, { id: 'effect', duration: 10 }); f.p.clips.push(voice, sfx, command);
  f.mixer.sync(f.p, [f.base, f.cue, voice, sfx, command], 3, true, 'owner');
  assert.equal(f.media('base').volume, 0); assert.equal(f.media('dread').volume, 0);
  assert.equal(f.media('voice').volume, 1); assert.equal(f.media('effect').volume, .5);
});

test('a later source reopens its channel after an older ALL_MUSIC stop', () => {
  const f = layeredFixture(), command = controlClip('ALL_MUSIC', 'silence', { duration: 8 });
  const reopened = { ...f.base, id: 'reopened', assetId: 'reopened', start: { type: 'scene', offset: 4 } };
  f.p.assets.push({ id: 'reopened', duration: 30 }); f.p.clips.push(command, reopened);
  f.mixer.sync(f.p, [f.base, command], 3, true, 'owner'); assert.equal(f.media('base').volume, 0);
  f.mixer.sync(f.p, [reopened, command], 5, true, 'owner');
  assert.equal(f.media('reopened').volume, .3 * .5); assert.equal(f.media('reopened').currentTime, 1);
});

test('the latest relevant command wins until its end, then authored gain resumes on the same source', () => {
  const f = layeredFixture(), stop = controlClip('BASE', 'silence', { duration: 1 });
  const duck = controlClip('ALL_MUSIC', 'duck', { id: 'newer.duck', start: { type: 'scene', offset: 2.5 }, duration: 1, audioCommand: { action: 'duck', channel: 'ALL_MUSIC', gain: .08 } });
  f.p.clips.push(stop, duck);
  f.mixer.sync(f.p, [f.base, stop, duck], 2.2, true, 'owner'); const audio = f.media('base'); assert.equal(audio.volume, 0);
  f.mixer.sync(f.p, [f.base, stop, duck], 2.8, true, 'owner'); assert.equal(audio.volume, .08 * .5);
  f.mixer.sync(f.p, [f.base, stop, duck], 3.5, true, 'owner'); assert.equal(audio.volume, .3 * .5);
  assert.equal(audio.plays, 1); assert.equal(f.media('base'), audio);
});

test('explicit duck replaces automatic speech ducking rather than multiplying it', () => {
  const f = layeredFixture(), voice = audioClip({ id: 'voice', kind: 'voice', trackId: 'A1' });
  const command = controlClip('BASE', 'duck', { audioCommand: { action: 'duck', channel: 'BASE', gain: .05 } });
  f.p.clips.push(voice, command);
  f.mixer.sync(f.p, [f.base, voice, command], 3, true, 'owner');
  assert.equal(f.media('base').volume, .05 * .5);
});

test('owned indefinite bed obeys GAME_THINK and ALL_MUSIC commands without restart or double voice duck', async () => {
  const f = fixture(audioClip({ kind: 'audio', trackId: 'A5', duration: 0, loop: true, gain: .8, start: { type: 'scene', offset: 1 } })); f.mixer.musicVolume = 1;
  const voice = audioClip({ id: 'voice', kind: 'voice', trackId: 'A1' });
  const oldStop = controlClip('ALL_MUSIC', 'silence', { id: 'older.stop', start: { type: 'scene', offset: 0 }, duration: 10, trackId: 'A5' });
  const duck = controlClip('GAME_THINK', 'duck', { trackId: 'A5' });
  const stop = controlClip('ALL_MUSIC', 'silence', { start: { type: 'scene', offset: 5 }, duration: 1, trackId: 'A5' });
  f.p.clips.push(voice, oldStop, duck, stop);
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); const bed = f.audio;
  f.mixer.sync(f.p, [voice, oldStop], 1.5, true, 'owner'); await flush(); assert.equal(bed.volume, .8 * .25);
  now = 1000; bed.currentTime = 1;
  f.mixer.sync(f.p, [voice, oldStop, duck], 2.5, true, 'owner'); assert.equal(bed.volume, .05);
  f.mixer.setGameBed('asset', .2, false, f.clip, f.p); assert.equal(bed.volume, .05); assert.equal(bed.currentTime, 1);
  f.mixer.sync(f.p, [voice, oldStop, duck], 2.5, false, 'owner'); assert.equal(bed.paused, true);
  f.mixer.sync(f.p, [voice, oldStop, duck], 2.5, true, 'owner'); await flush(); assert.equal(bed.volume, .05);
  f.mixer.sync(f.p, [voice, oldStop, duck], 4, true, 'owner'); assert.equal(bed.volume, .8 * .25);
  f.mixer.sync(f.p, [voice, oldStop, stop], 5.5, true, 'owner'); assert.equal(bed.volume, 0);
  f.mixer.sync(f.p, [voice, oldStop, stop], 6, true, 'owner'); assert.equal(bed.volume, .8 * .25);
  assert.equal(bed.src, '/audio.mp3'); assert.equal(bed.plays, 2); assert.equal(FakeAudio.instances.length, 2);
});

test('disabled and muted commands do not affect a source', () => {
  const f = layeredFixture(), disabled = controlClip('ALL_MUSIC', 'silence', { enabled: false });
  f.p.clips.push(disabled); f.mixer.sync(f.p, [f.base, disabled], 3, true, 'owner');
  assert.equal(f.media('base').volume, .3 * .5);
  const muted = { ...disabled, id: 'muted', enabled: true, trackId: 'control-track' };
  f.p.tracks.push({ id: 'control-track', kind: 'audio', label: 'Control', muted: true });
  f.p.clips.push(muted); f.mixer.sync(f.p, [f.base, muted], 3, true, 'owner');
  assert.equal(f.media('base').volume, .3 * .5);
});

test('a background fade rises and falls smoothly on the same audio source',async()=>{
  const f=fixture(audioClip({kind:'audio',trackId:'A2',loop:true,gain:.5,fadeIn:2.5,fadeOut:2.5}));f.mixer.musicVolume=1;
  f.mixer.sync(f.p,[f.clip],0,true,'owner');await flush();const audio=f.audio;assert.equal(audio.volume,0);
  for(const [at,gain] of [[1.25,.25],[2.5,.5],[7.5,.5],[8.75,.25]]){f.mixer.sync(f.p,[f.clip],at,true,'owner');assert.ok(Math.abs(audio.volume-gain)<1e-8);assert.equal(f.audio,audio);}
  assert.equal(audio.plays,1);
});


test('dramatic music retains original calibration beneath voice, while silence commands still win',()=>{
  for(const channel of ['DREAD','PEACE']){
    const f=fixture(audioClip({id:'dramatic',kind:'audio',trackId:'A3',gain:.3}),{channel});
    const voice=audioClip({id:'voice',kind:'voice',trackId:'A1',assetId:'voice',utteranceId:'u'});f.p.tracks.push({id:'A1',kind:'voice',order:0});f.p.assets.push({id:'voice',kind:'audio',duration:10});f.p.clips.push(voice);
    f.mixer.sync(f.p,[f.clip,voice],1,true,'owner');const cue=FakeAudio.instances[0];assert.ok(Math.abs(cue.volume-.3*(.5/.85)*.45)<1e-8);
    const stop=controlClip(channel,'silence');f.p.clips.push(stop);f.mixer.sync(f.p,[f.clip,voice,stop],3,true,'owner');assert.equal(cue.volume,0);assert.equal(cue.paused,false);
  }
});


test('every authored DREAD and PEACE cue starts audibly at its speech anchor',async()=>{
  const {activeClips,clipRange}=await import(timeline);
  const markdown=await readFile(new URL('./default-project.md',import.meta.url),'utf8');const p=JSON.parse(markdown.replaceAll('\r\n','\n').split('```chronicles-config\n')[1].split('\n```')[0]);
  const cues=p.clips.filter(c=>c.kind==='audio'&&c.assetId&&['DREAD','PEACE'].includes(p.tracks.find(t=>t.id===c.trackId)?.channel));assert.ok(cues.length>=15);
  for(const cue of cues){
    FakeAudio.instances=[];const mixer=new AudioMixer(id=>'/'+id);const range=clipRange(p,cue),at=range.start+.75;const clips=activeClips(p,cue.sceneId,at,cue.event);mixer.sync(p,clips,at,true,'cue-check');
    const audio=FakeAudio.instances.find(a=>a.src==='/'+cue.assetId);assert.ok(audio,`${cue.id}: no source`);assert.ok(audio.volume>.02,`${cue.id}: inaudible ${audio.volume}`);assert.equal(audio.paused,false);mixer.stop();
  }
});
