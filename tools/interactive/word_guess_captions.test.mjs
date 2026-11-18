import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const scenes = new URL('../../media/interactive/scenes/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('protocol_gate_voice/manifest.json', scenes), 'utf8'));
const captions = JSON.parse(readFileSync(new URL('protocol_gate_captions.json', scenes), 'utf8'));
const script = JSON.parse(readFileSync(new URL('protocol_gate.json', scenes), 'utf8'));

test('every alternative reaction has its own matching recording and captions', () => {
  for (const [event, alternatives] of Object.entries(script.dialogueVariants)) {
    assert.equal(alternatives.length, 2, event);
    for (const [index, text] of [script.dialogue[event], ...alternatives].entries()) {
      const id = index ? `${event}_alt_${index}` : event;
      assert.equal(manifest.clips[id]?.text, text, id);
      assert.ok(captions[id]?.cues.length, id);
    }
  }
});

test('every recorded line has captions for the actual audio and authored text', () => {
  assert.deepEqual(Object.keys(captions).sort(), Object.keys(manifest.clips).sort());
  for (const [event, clip] of Object.entries(manifest.clips)) {
    const line = captions[event];
    assert.equal(line.audio_sha256, createHash('sha256').update(readFileSync(new URL(clip.file, scenes))).digest('hex'), event);
    assert.equal(line.text_sha256, clip.text_sha256, event);
    assert.equal(line.cues.map(cue => cue.text).join(' '), clip.text, event);
  }
});

test('caption timing is ordered, bounded by the clip and does not reveal later phrases early', () => {
  for (const [event, line] of Object.entries(captions)) {
    let previousEnd = 0;
    for (const cue of line.cues) {
      assert.ok(cue.start >= previousEnd - .02, event);
      assert.ok(cue.end > cue.start, event);
      assert.ok(cue.end <= manifest.clips[event].duration_seconds_rounded + .1, event);
      previousEnd = cue.end;
    }
  }
});
