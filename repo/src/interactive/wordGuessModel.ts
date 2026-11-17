export type GuessResult = 'letter_correct' | 'letter_wrong' | 'repeat_letter' | 'word_correct' | 'word_wrong' | 'invalid' | 'empty';
export type GuessMode = 'letter' | 'word';

export class WordGuessRound {
  readonly answer: string;
  readonly tried = new Set<string>();
  solved = false;

  constructor(answer: string) {
    this.answer = answer.normalize('NFC').trim().toLocaleUpperCase('ru');
    if (!/^[А-ЯЁ]+$/u.test(this.answer)) throw new Error('The answer must be a Cyrillic word');
  }

  get cells(): string[] {
    return Array.from(this.answer, char => this.solved || this.tried.has(char) ? char : '');
  }

  guess(raw: string, mode: GuessMode): GuessResult {
    if (this.solved) return 'word_correct';
    const value = raw.normalize('NFC').trim().toLocaleUpperCase('ru');
    if (!value) return 'empty';
    if (!/^[А-ЯЁ]+$/u.test(value) || (mode === 'letter' && Array.from(value).length !== 1)) return 'invalid';
    if (mode === 'word') {
      if (value !== this.answer) return 'word_wrong';
      this.solved = true;
      return 'word_correct';
    }
    if (this.tried.has(value)) return 'repeat_letter';
    this.tried.add(value);
    if (!this.answer.includes(value)) return 'letter_wrong';
    if (Array.from(this.answer).every(char => this.tried.has(char))) {
      this.solved = true;
      return 'word_correct';
    }
    return 'letter_correct';
  }
}
