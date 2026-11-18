import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile the pure editing module; no browser or dependency installation is needed.
const source = await readFile(new URL('./directorEditing.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { editClipRange, offsetReference } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const clip = (patch = {}) => ({ id: 'clip', sceneId: 'ROOM-I', trackId: 'V2', kind: 'image', start: { type: 'scene', offset: 10 }, duration: 5, ...patch });

test('moving a word-bound clip preserves its anchor and leaves the source untouched', () => {
  const original = clip({ start: { type: 'word', utteranceId: 'u1', wordIndex: 4, edge: 'start', offset: .25 }, end: { type: 'utterance', utteranceId: 'u1', edge: 'end', offset: .2 } });
  const edited = editClipRange(original, { start: 12, end: 18 }, 'move', 1.5);
  assert.deepEqual(edited.start, { type: 'word', utteranceId: 'u1', wordIndex: 4, edge: 'start', offset: 1.75 });
  assert.equal(edited.end.offset, 1.7);
  assert.equal(original.start.offset, .25);
});

test('moving a selection cannot place a clip before the scene', () => {
  assert.equal(editClipRange(clip(), { start: 10, end: 15 }, 'move', -99).start.offset, 0);
});

test('left audio trim cannot reveal negative source time', () => {
  const edited = editClipRange(clip({ kind: 'voice', trackId: 'A1', sourceIn: 0 }), { start: 10, end: 15 }, 'left', -4, 5);
  assert.equal(edited.start.offset, 10);
  assert.equal(edited.sourceIn, 0);
  assert.equal(edited.sourceOut, 5);
  assert.equal(edited.duration, 5);
});

test('extending a trimmed voice to the left restores only existing source samples', () => {
  const edited = editClipRange(clip({ kind: 'voice', trackId: 'A1', sourceIn: 2, sourceOut: 7 }), { start: 10, end: 15 }, 'left', -9, 10);
  assert.equal(edited.start.offset, 8);
  assert.equal(edited.sourceIn, 0);
  assert.equal(edited.sourceOut, 7);
  assert.equal(edited.duration, 7);
});

test('right audio trim never stretches audio beyond the original duration', () => {
  const edited = editClipRange(clip({ kind: 'voice', trackId: 'A1', sourceIn: 2 }), { start: 10, end: 15 }, 'right', 99, 10);
  assert.equal(edited.duration, 8);
  assert.equal(edited.sourceOut, 10);
});

test('trimming an anchored end updates only its relative offset', () => {
  const edited = editClipRange(clip({ end: { type: 'word', utteranceId: 'u', wordIndex: 2, edge: 'end', offset: 0 } }), { start: 10, end: 15 }, 'right', -2);
  assert.deepEqual(edited.end, { type: 'word', utteranceId: 'u', wordIndex: 2, edge: 'end', offset: -2 });
});

test('a looping bed can extend without stretching its source audio', () => {
  const edited = editClipRange(clip({ kind: 'audio', trackId: 'A5', loop: true, sourceOut: 1 }), { start: 10, end: 15 }, 'right', 25, 1);
  assert.equal(edited.duration, 30);
  assert.equal(edited.sourceOut, 1);
});

test('a live/game marker has no invented trim duration', () => {
  const original = clip({ kind: 'interactive', trackId: 'I1', duration: 0 });
  assert.deepEqual(editClipRange(original, { start: 10, end: 10 }, 'right', 60), original);
});

test('over-trimming a voice retains a finite non-negative source interval', () => {
  const edited = editClipRange(clip({ kind: 'voice', sourceIn: 2, sourceOut: 7 }), { start: 10, end: 15 }, 'left', 100, 10);
  assert.equal(edited.duration, .02);
  assert.equal(edited.sourceIn, 6.98);
  assert.equal(edited.sourceOut, 7);
});

test('invalid pointer deltas do not alter the clip', () => {
  const original = clip();
  assert.deepEqual(editClipRange(original, { start: 10, end: 15 }, 'move', NaN), original);
  assert.deepEqual(offsetReference({ type: 'scene', offset: .1 }, .2), { type: 'scene', offset: .3 });
});
