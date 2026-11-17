import test from 'node:test';
import assert from 'node:assert/strict';
import { WordGuessRound } from '../../repo/src/interactive/wordGuessModel.ts';
import { GameAttemptBudget } from '../../repo/src/interactive/gameAttemptBudget.ts';

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
test('Enter distinguishes one letter from a complete word without a mode switch',()=>{
  const round=new WordGuessRound('демоблил');
  assert.equal(round.guessAutomatic(' л '),'letter_correct');
  assert.deepEqual(round.cells,['','','','','','Л','','Л']);
  assert.equal(round.guessAutomatic('ДЕМОБЛИЛ'),'word_correct');
  assert.equal(round.solved,true);
});
test('an unfinished word consumes no guesses and does not reveal its letters',()=>{
  const round=new WordGuessRound('демоблил');
  for(const draft of ['де','дем','демо','демоб','демобл','демобли']) {
    assert.equal(round.guessAutomatic(draft),'incomplete');
    assert.equal(round.tried.size,0);
    assert.ok(round.cells.every(x=>x===''));
    assert.equal(round.solved,false);
  }
});
test('automatic input rejects invalid or overlong drafts and preserves revealed letters after a wrong word',()=>{
  const round=new WordGuessRound('демоблил');
  assert.equal(round.guessAutomatic(''),'empty');
  for(const draft of ['abc','1','демо бли','демоблили']) assert.equal(round.guessAutomatic(draft),'invalid');
  assert.equal(round.tried.size,0);
  assert.equal(round.guessAutomatic('л'),'letter_correct');
  assert.equal(round.guessAutomatic('демобилд'),'word_wrong');
  assert.deepEqual(round.cells,['','','','','','Л','','Л']);
  assert.equal(round.solved,false);
});
test('three wrong guesses exhaust one game; correct, repeat and incomplete answers do not consume attempts',()=>{
  const round=new WordGuessRound('демоблил');
  const budget=new GameAttemptBudget(3);
  for(const value of ['я','л','л','дем','демобилд']) {
    const result=round.guessAutomatic(value);
    if(result==='letter_wrong'||result==='word_wrong') budget.recordWrongAnswer();
  }
  assert.equal(budget.wrongAnswers,2);
  assert.equal(budget.exhausted,false);
  assert.equal(round.guessAutomatic('ю'),'letter_wrong');
  assert.equal(budget.recordWrongAnswer(),true);
  assert.equal(budget.wrongAnswers,3);
  assert.equal(round.solved,false);
  assert.deepEqual(round.cells,['','','','','','Л','','Л']);
  assert.equal(new GameAttemptBudget(3).wrongAnswers,0);
});
