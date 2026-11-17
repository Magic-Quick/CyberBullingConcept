import test from 'node:test';
import assert from 'node:assert/strict';
import { WordGuessRound } from '../../repo/src/interactive/wordGuessModel.ts';

test('eight hidden letters and repeated Л reveal together',()=>{
  const round=new WordGuessRound('демоблил');
  assert.equal(round.cells.length,8);
  assert.ok(round.cells.every(x=>x===''));
  assert.equal(round.guess('л','letter'),'letter_correct');
  assert.deepEqual(round.cells,['','','','','','Л','','Л']);
  assert.equal(round.guess('Л','letter'),'repeat_letter');
});
test('errors do not reveal the answer; the whole word accepts case and whitespace',()=>{
  const round=new WordGuessRound('демоблил');
  assert.equal(round.guess('я','letter'),'letter_wrong');
  assert.equal(round.guess('демобил','word'),'word_wrong');
  assert.ok(round.cells.every(x=>x===''));
  assert.equal(round.guess('  ДЕМОБЛИЛ  ','word'),'word_correct');
  assert.equal(round.solved,true);
  assert.equal(round.cells.join(''),'ДЕМОБЛИЛ');
});
test('invalid inputs do not count as a guessed letter',()=>{
  const round=new WordGuessRound('демоблил');
  for(const value of ['abc','12','?','аб']) assert.equal(round.guess(value,'letter'),'invalid');
  assert.equal(round.guess('','letter'),'empty');
  assert.equal(round.tried.size,0);
});
test('opening the final missing letter completes the round',()=>{
  const round=new WordGuessRound('демоблил');
  let result;
  for(const letter of new Set('демоблил')) result=round.guess(letter,'letter');
  assert.equal(result,'word_correct');
  assert.equal(round.cells.join(''),'ДЕМОБЛИЛ');
});
