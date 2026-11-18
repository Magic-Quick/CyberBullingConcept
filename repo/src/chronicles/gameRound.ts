import type { Game } from './model';
import { WordGuessRound } from '../interactive/wordGuessModel';
import { WordGuessDraft } from '../interactive/wordGuessDraft';

export type AnswerEvent = 'empty'|'invalid'|'invalid_word'|'incomplete'|'too_long'|'repeat'|'letter_correct'|'letter_misplaced'|'letter_wrong'|'word_wrong'|'correct'|'wrong'|'exhausted'|'reveal_all';
export interface AnswerResult { event: AnswerEvent; final: boolean; optionId?: string; }
export const normalizeAnswer = (s: string): string => s.normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gu,' ').trim();

export class GameRound {
  readonly letters?: WordGuessRound;
  readonly draft?: WordGuessDraft;
  readonly attempted = new Set<string>();
  wrong = 0;
  finished = false;
  constructor(readonly game: Game) {
    if (game.kind==='word') { this.letters=new WordGuessRound(game.answer!); this.draft=new WordGuessDraft(game.answer!.length); }
  }
  submit(raw: string): AnswerResult {
    if (this.finished) return {event:'repeat',final:true};
    if (!raw.trim()) return {event:'empty',final:false};
    if (this.game.kind==='choice') {
      const option=this.game.options?.find(o=>o.id.toUpperCase()===raw.trim().toUpperCase());
      if (!option) return {event:'invalid',final:false};
      if (this.game.revealAll) {this.finished=true;return {event:'reveal_all',final:true,optionId:option.id};}
      if (this.attempted.has(option.id)) return {event:'repeat',final:false,optionId:option.id};
      this.attempted.add(option.id);
      if (option.correct) {this.finished=true;return {event:'correct',final:true,optionId:option.id};}
      return {...this.fail('wrong'),optionId:option.id};
    }
    if (this.game.kind==='free') {
      const value=normalizeAnswer(raw); if (!value) return {event:'invalid',final:false};
      this.finished=true;
      const accepted=[this.game.answer!,...this.game.acceptedAnswers??[]].map(normalizeAnswer);
      return {event:accepted.includes(value)?'correct':'wrong',final:true};
    }
    const board=this.letters!, submission=this.draft!.submission(board.cells);
    const value=raw.normalize('NFC').trim().toLocaleUpperCase('ru');
    if (!/^[А-ЯЁ]+$/u.test(value)) return {event:value.length===1?'invalid':'invalid_word',final:false};
    if (value.length>board.answer.length) return {event:'too_long',final:false};
    if (value.length>1 && (submission.incomplete || value.length<board.answer.length)) return {event:'incomplete',final:false};
    const result=board.guessAutomatic(value);this.draft!.clear();
    if (result==='word_correct') {this.finished=true;return {event:'correct',final:true};}
    if (result==='word_wrong'||result==='letter_wrong') return this.fail(result);
    if (result==='repeat_letter') return {event:'repeat',final:false};
    if (result==='letter_correct') return {event:board.answer[submission.index]===value?'letter_correct':'letter_misplaced',final:false};
    return {event:result as AnswerEvent,final:false};
  }
  private fail(event: AnswerEvent): AnswerResult { this.wrong++; if(this.wrong >= (this.game.maxWrong??3)){this.finished=true;return {event:'exhausted',final:true};} return {event,final:false}; }
}

const SUFFIXES: Record<AnswerEvent,string[]> = {
  empty:['ПУСТО','ВВОД.ПУСТО'], invalid:['ВВОД.НЕКОРРЕКТНАЯ_БУКВА','НЕКОРРЕКТНО','НЕКОРРЕКТНЫЙ_ВВОД'],
  invalid_word:['ВВОД.НЕКОРРЕКТНОЕ_СЛОВО'], incomplete:['ВВОД.НЕЗАВЕРШЕНО'], too_long:['ВВОД.СЛИШКОМ_ДЛИННО'], repeat:['ПОВТОР'],
  letter_correct:['БУКВА.ВЕРНО'],letter_misplaced:['БУКВА.ДРУГОЕ_МЕСТО'],letter_wrong:['БУКВА.НЕВЕРНО'],word_wrong:['СЛОВО.НЕВЕРНО'],
  correct:['ВЕРНО','ПОБЕДА'],wrong:['НЕВЕРНО','ОШИБКА'],exhausted:['COMMON.ЛИМИТ'],reveal_all:['ПЕРВЫЙ_ВЫБОР'],
};
export function reactionCandidates(game: Game, result: AnswerResult): string[] {
  if(result.event==='wrong'&&result.optionId&&game.reactions['wrong.'+result.optionId]?.length)return game.reactions['wrong.'+result.optionId];
  const direct=game.reactions[result.event==='reveal_all'?'first_choice':result.event];if(direct?.length)return direct;
  const all=[...new Set(Object.values(game.reactions).flat())];if(result.event==='exhausted')return ['COMMON.ЛИМИТ'];
  for(const suffix of SUFFIXES[result.event]){const prefix=`${game.id}.${suffix}`, found=all.filter(id=>id===prefix||id.startsWith(prefix+'.'));if(found.length)return found;}
  return [];
}
