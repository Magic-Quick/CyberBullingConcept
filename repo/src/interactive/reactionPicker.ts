export interface ReactionLine { id: string; text: string }

/** A random starting line, then a complete rotation without immediate repeats. */
export class ReactionPicker {
  private readonly next = new Map<string, number>();
  private readonly random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  pick(event: string, base: string, alternatives: readonly string[] = []): ReactionLine {
    const lines = [base, ...alternatives];
    const index = this.next.get(event) ?? Math.floor(this.random() * lines.length);
    this.next.set(event, (index + 1) % lines.length);
    return { id: index === 0 ? event : `${event}_alt_${index}`, text: lines[index] };
  }
}
