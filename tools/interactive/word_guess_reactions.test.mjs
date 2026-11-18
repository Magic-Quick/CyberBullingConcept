import test from 'node:test';
import assert from 'node:assert/strict';
import { ReactionPicker } from '../../repo/src/interactive/reactionPicker.ts';

test('a randomly chosen starting reaction rotates through all three before repeating', () => {
  const picker = new ReactionPicker(() => .5);
  const lines = Array.from({ length: 4 }, () => picker.pick('word_wrong', 'base', ['first', 'second']));
  assert.deepEqual(lines.map(line => line.id), ['word_wrong_alt_1', 'word_wrong_alt_2', 'word_wrong', 'word_wrong_alt_1']);
  assert.deepEqual(lines.map(line => line.text), ['first', 'second', 'base', 'first']);
});

test('different kinds of mistakes have independent rotations and keep the original fallback', () => {
  const picker = new ReactionPicker(() => 0);
  assert.deepEqual(picker.pick('letter_wrong', 'letter', ['alternative']), { id: 'letter_wrong', text: 'letter' });
  assert.deepEqual(picker.pick('word_wrong', 'word', ['other']), { id: 'word_wrong', text: 'word' });
  assert.equal(picker.pick('letter_wrong', 'letter', ['alternative']).text, 'alternative');
  assert.deepEqual(picker.pick('letter_correct', 'correct'), { id: 'letter_correct', text: 'correct' });
});
