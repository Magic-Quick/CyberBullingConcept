/** A fresh budget belongs to each game, whatever its answer format. */
export class GameAttemptBudget {
  private failures = 0;
  readonly maxWrongAnswers: number;

  constructor(maxWrongAnswers: number) {
    if (!Number.isInteger(maxWrongAnswers) || maxWrongAnswers < 1) throw new Error('Invalid attempt limit');
    this.maxWrongAnswers = maxWrongAnswers;
  }

  get wrongAnswers(): number { return this.failures; }
  get exhausted(): boolean { return this.failures >= this.maxWrongAnswers; }

  recordWrongAnswer(): boolean {
    this.failures = Math.min(this.failures + 1, this.maxWrongAnswers);
    return this.exhausted;
  }
}
