import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const timing = moduleUrl(transpile(await readFile(new URL('./timeline.ts', import.meta.url), 'utf8')));
const editing = moduleUrl(transpile(await readFile(new URL('./directorEditing.ts', import.meta.url), 'utf8')));
const source = transpile(await readFile(new URL('./DirectorPanel.ts', import.meta.url), 'utf8'))
  .replace(/from ['"]\.\/timeline['"]/g, `from '${timing}'`)
  .replace(/from ['"]\.\/directorEditing['"]/g, `from '${editing}'`)
  .replace(/import css from ['"]\.\/directorPanel\.css\?inline['"];?/, "const css = '';");
const { DirectorPanel } = await import(moduleUrl(source));

// Exercise the public editing API independently of DOM layout and media playback.
function fixture(locked = false) {
  let project = { schemaVersion: 1, id: 'test', title: 'Test', scenes: [{ id: 'scene', title: 'Scene', kind: 'room', utteranceIds: [], duration: 3 }], tracks: [{ id: 'V1', kind: 'frame', label: 'Frame', order: 1, locked }, { id: 'V2', kind: 'image', label: 'Image', order: 2, locked: true }], clips: [{ id: 'frame', sceneId: 'scene', trackId: 'V1', kind: 'frame', start: { type: 'scene', offset: 0 }, duration: 3, transform: { x: .5, y: .5, width: .8, opacity: .9 } }], assets: [], utterances: [], stops: [], sequence: [] };
  let changes = 0;
  const panel = Object.create(DirectorPanel.prototype);
  Object.assign(panel, { options: { getProject: () => project, onChange: value => { project = value; changes++; } }, history: [], future: [], selected: new Set(), visible: false, inform: () => {}, refresh: () => {} });
  return { panel, get project() { return project; }, get changes() { return changes; } };
}

test('preview selection does not mutate the project or create an undo operation', () => {
  const f = fixture();
  f.panel.selectClip('frame');
  assert.deepEqual([...f.panel.selected], ['frame']);
  assert.equal(f.panel.sceneId, 'scene');
  assert.equal(f.changes, 0);
  assert.equal(f.panel.history.length, 0);
});

test('preview move merges transforms and commits one reversible project edit', () => {
  const f = fixture(), before = f.project;
  f.panel.updateClip('frame', { transform: { x: .2, y: .3 } }, 'Move object');
  assert.notEqual(f.project, before);
  assert.deepEqual(f.project.clips[0].transform, { x: .2, y: .3, width: .8, opacity: .9 });
  assert.equal(before.clips[0].transform.x, .5);
  assert.equal(f.changes, 1);
  f.panel.undo();
  assert.equal(f.project.clips[0].transform.x, .5);
  f.panel.redo();
  assert.equal(f.project.clips[0].transform.x, .2);
});

test('a locked object cannot be changed through the preview API', () => {
  const f = fixture(true);
  f.panel.updateClip('frame', { transform: { x: .2 } }, 'Move locked object');
  assert.equal(f.changes, 0);
  assert.equal(f.project.clips[0].transform.x, .5);
});

test('moving to a locked or missing owner is rejected, and IDs remain stable', () => {
  const f = fixture();
  f.panel.updateClip('frame', { trackId: 'V2' }, 'Locked target');
  f.panel.updateClip('frame', { sceneId: 'missing' }, 'Missing target');
  assert.equal(f.changes, 0);
  f.panel.updateClip('frame', { id: 'replacement', label: 'Changed' }, 'Label');
  assert.equal(f.project.clips[0].id, 'frame');
  assert.equal(f.project.clips[0].label, 'Changed');
});

test('clean exposure and authored BASE ducking use the same reversible project model', () => {
  const f = fixture();
  f.panel.updateClip('frame', { cleanExposure: 3, duckBaseTo: .005 }, 'Presentation policy');
  assert.equal(f.project.clips[0].cleanExposure, 3);
  assert.equal(f.project.clips[0].duckBaseTo, .005);
  f.panel.undo();
  assert.equal(f.project.clips[0].cleanExposure, undefined);
  assert.equal(f.project.clips[0].duckBaseTo, undefined);
});

test('asset-less audio commands are persisted as one reversible value', () => {
  const f = fixture(), before = f.project;
  f.panel.updateClip('frame', { kind: 'audio', audioCommand: { action: 'duck', channel: 'GAME_THINK', gain: .05 } }, 'Music control');
  assert.deepEqual(f.project.clips[0].audioCommand, { action: 'duck', channel: 'GAME_THINK', gain: .05 });
  assert.equal(before.clips[0].audioCommand, undefined);
  f.panel.undo(); assert.equal(f.project.clips[0].audioCommand, undefined);
  f.panel.redo(); assert.equal(f.project.clips[0].audioCommand.gain, .05);
});
