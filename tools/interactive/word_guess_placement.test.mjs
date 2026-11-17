import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY_ACTS } from '../../repo/src/storyData.ts';

const scene = JSON.parse(readFileSync(new URL('../../media/interactive/scenes/protocol_gate.json', import.meta.url), 'utf8'));

test('quiz opens at the start of the act containing the first mention of its answer', () => {
  const gateIndex = STORY_ACTS.findIndex(act => act.id === scene.targetActId);
  const revealIndex = STORY_ACTS.findIndex(act => act.cues.some(cue => cue.text.toLowerCase().includes(scene.answer)));
  assert.ok(gateIndex >= 0, 'quiz entry must be an existing act');
  assert.equal(gateIndex, revealIndex, 'quiz must precede the act that reveals the answer');
  const firstReveal = STORY_ACTS[revealIndex].cues.find(cue => cue.text.toLowerCase().includes(scene.answer));
  assert.ok(firstReveal.start > 0, 'quiz at act time zero must precede the reveal cue');
});
