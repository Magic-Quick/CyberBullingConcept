import test from 'node:test';
import assert from 'node:assert/strict';
import { WordGuessDraft } from '../../repo/src/interactive/wordGuessDraft.ts';
import { WordGuessRound } from '../../repo/src/interactive/wordGuessModel.ts';

test('typing several letters from the second cell preserves the first cell', () => {
  const draft = new WordGuessDraft(8);
  draft.update('д');
  draft.startAt(1);
  draft.update('емо');
  assert.deepEqual(draft.cells, ['Д', 'Е', 'М', 'О', '', '', '', '']);
  assert.equal(draft.submission(Array(8).fill('')).incomplete, true);
});

test('the remaining seven letters combine with a revealed first letter into the answer', () => {
  const round = new WordGuessRound('демоблил');
  round.guessAutomatic('д');
  const draft = new WordGuessDraft(8);
  assert.equal(draft.submission(round.cells).value, '');
  draft.startAt(1);
  draft.update('емоблил');
  const answer = draft.submission(round.cells);
  assert.equal(answer.value, 'ДЕМОБЛИЛ');
  assert.equal(answer.incomplete, false);
  assert.equal(round.guessAutomatic(answer.value), 'word_correct');
});

test('editing a middle cell and deleting the new run leaves other drafted letters in place', () => {
  const draft = new WordGuessDraft(8);
  draft.update('демобилд');
  draft.startAt(5);
  draft.update('л');
  assert.equal(draft.cells.join(''), 'ДЕМОБЛЛД');
  draft.update('');
  assert.deepEqual(draft.cells, ['Д', 'Е', 'М', 'О', 'Б', '', 'Л', 'Д']);
  draft.erase(6);
  assert.equal(draft.cells[0], 'Д');
  assert.equal(draft.cells[6], '');
});

test('a single letter remembers its chosen cell and overflow is not silently truncated into an answer', () => {
  const draft = new WordGuessDraft(8);
  draft.startAt(2);
  draft.update('л');
  assert.equal(draft.submission(Array(8).fill('')).index, 2);
  draft.update('демоблил');
  assert.equal(draft.submission(Array(8).fill('')).overflow, true);
});
