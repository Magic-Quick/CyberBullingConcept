/** Unsubmitted letters belong to board cells, independently of the current input run. */
export class WordGuessDraft {
  readonly cells: string[];
  private anchor = 0;
  private runLength = 0;
  private raw = '';

  constructor(length: number) { this.cells = Array<string>(length).fill(''); }

  startAt(index: number): void {
    this.anchor = index;
    this.runLength = 0;
    this.raw = '';
  }

  update(raw: string): void {
    this.raw = raw.normalize('NFC').trim().toLocaleUpperCase('ru');
    for (let offset = 0; offset < this.runLength; offset++) {
      if (this.anchor + offset < this.cells.length) this.cells[this.anchor + offset] = '';
    }
    Array.from(this.raw).forEach((letter, offset) => {
      if (this.anchor + offset < this.cells.length) this.cells[this.anchor + offset] = letter;
    });
    this.runLength = this.raw.length;
  }

  erase(index: number): void { this.cells[index] = ''; }

  submission(known: readonly string[]): { value: string; index: number; incomplete: boolean; filled: number; overflow: boolean } {
    const typed = this.cells.flatMap((letter, index) => letter ? [{ letter, index }] : []);
    const combined = this.cells.map((letter, index) => letter || known[index]);
    const overflow = this.anchor + this.raw.length > this.cells.length;
    const invalid = typed.some(({ letter }) => !/^[А-ЯЁ]$/u.test(letter));
    return {
      value: overflow ? this.raw : typed.length === 0 ? '' : typed.length === 1 ? typed[0].letter : combined.join(''),
      index: typed.length === 1 ? typed[0].index : this.anchor,
      incomplete: typed.length > 1 && combined.some(letter => !letter) && !invalid && !overflow,
      filled: combined.filter(Boolean).length,
      overflow,
    };
  }

  clear(): void { this.cells.fill(''); this.startAt(0); }
}
