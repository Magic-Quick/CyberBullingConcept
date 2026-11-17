import script from '../../../media/interactive/scenes/protocol_gate.json';
import tileUrl from '../../../media/interactive/pole_chudes/graphics/tile_blank.svg?url';
import thinkingUrl from '../../../media/interactive/pole_chudes/audio/02_think_60s_pole_cudes-60-seconds.mp3?url';
import correctUrl from '../../../media/interactive/pole_chudes/audio/01_letter_correct_pole_letter_correct.mp3?url';
import wrongUrl from '../../../media/interactive/pole_chudes/audio/07_letter_wrong_pole_letter_wrong.mp3?url';
import winUrl from '../../../media/interactive/pole_chudes/audio/32_word_correct_pole_word_1996.mp3?url';
import introVoice from '../../../media/interactive/scenes/protocol_gate_voice/intro.mp3?url';
import misplacedVoice from '../../../media/interactive/scenes/protocol_gate_voice/letter_misplaced.mp3?url';
import correctVoice from '../../../media/interactive/scenes/protocol_gate_voice/letter_correct.mp3?url';
import wrongVoice from '../../../media/interactive/scenes/protocol_gate_voice/letter_wrong.mp3?url';
import wordCorrectVoice from '../../../media/interactive/scenes/protocol_gate_voice/word_correct.mp3?url';
import wordWrongVoice from '../../../media/interactive/scenes/protocol_gate_voice/word_wrong.mp3?url';
import repeatVoice from '../../../media/interactive/scenes/protocol_gate_voice/repeat_letter.mp3?url';
import css from './wordGuessGate.css?inline';
import { WordGuessRound, type AutomaticGuessResult } from './wordGuessModel';
import { GameAttemptBudget } from './gameAttemptBudget';
import { COMMON_GAME_RULES } from './gameRules';

export const WORD_GATE_ACT_ID = script.targetActId;
const VOICES = { intro: introVoice, letter_misplaced: misplacedVoice, letter_correct: correctVoice,
  letter_wrong: wrongVoice, word_correct: wordCorrectVoice, word_wrong: wordWrongVoice, repeat_letter: repeatVoice,
  attempts_exhausted: COMMON_GAME_RULES.exhaustedVoiceUrl };

interface GateOptions {
  onComplete: () => void;
  volume?: () => number;
  voiceVolume?: () => number;
  cleanEntranceMs?: number;
}

/** One native input renders into the tiles, preserving paste, IME and keyboard editing. */
export class WordGuessGate {
  private readonly round = new WordGuessRound(script.answer);
  private readonly attempts = new GameAttemptBudget(COMMON_GAME_RULES.maxWrongAnswers);
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly sound = new Audio();
  private readonly music = new Audio(thinkingUrl);
  private readonly voice = new Audio();
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private entranceTimer: ReturnType<typeof setTimeout>;
  private anchor = 0;
  private arriving: number[] = [];
  private ready = false;
  private busy = false;
  private disposed = false;
  private pendingIntro = false;
  private voiceRequest = 0;
  private voiceDone: (() => void) | undefined;
  private resumeVoice = false;
  private musicFinished = false;
  private musicFadeFrame: number | undefined;
  private readonly visibilityHandler = () => {
    if (document.hidden) {
      this.resumeVoice = !this.voice.paused && !this.voice.ended;
      this.sound.pause(); this.music.pause(); this.voice.pause();
    } else if (!this.disposed) {
      this.startMusic();
      if (this.resumeVoice) { this.resumeVoice = false; this.voice.play().catch(() => this.finishVoice()); }
    }
  };

  constructor(private readonly options: GateOptions) {
    this.host.id = 'protocol-word-gate';
    this.host.style.cssText = 'position:fixed;inset:0;z-index:100000;';
    const style = document.createElement('style');
    style.textContent = css;
    this.sound.dataset.channel = 'game';
    this.music.dataset.channel = 'thinking';
    this.music.loop = true;
    this.voice.dataset.channel = 'lord';
    this.shadow.append(style, this.music, this.sound, this.voice);
    this.voice.onplay = () => this.syncSoundVolume();
    this.voice.onpause = () => this.syncSoundVolume();
    this.voice.onended = () => { this.syncSoundVolume(); this.finishVoice(); };
    this.voice.onerror = () => this.finishVoice();
    const scene = document.createElement('section');
    scene.className = 'scene';
    scene.setAttribute('role', 'dialog');
    scene.setAttribute('aria-modal', 'true');
    scene.setAttribute('aria-labelledby', 'gate-question');
    scene.style.setProperty('--tile', `url("${tileUrl}")`);
    scene.innerHTML = `
      <main>
        <h1 id="gate-question"><button class="repeat-intro" type="button" title="Повторить вступление"></button></h1><p class="context"></p>
        <form autocomplete="off">
          <div class="board">
            <input id="guess-input" name="guess" aria-label="Буква или слово" aria-describedby="input-help" maxlength="32" spellcheck="false" autocapitalize="characters" autocomplete="off" />
            <div class="cells" role="group" aria-label="Загаданное слово"></div>
          </div>
          <div class="actions" id="input-help"><span>Буква или слово</span><button class="check" type="submit" aria-label="Проверить ответ, Enter">[ ENTER ]</button></div>
        </form>
        <p class="feedback" role="status" aria-live="polite"></p>
        <button class="continue" type="button" aria-label="Продолжить акт" hidden>[ ПРОДОЛЖИТЬ АКТ ]</button>
      </main>`;
    this.shadow.append(scene);
    this.element('.repeat-intro').textContent = script.question;
    this.element<HTMLButtonElement>('.repeat-intro').onclick = () => this.speak('intro');
    this.element('.context').textContent = `[ ${script.hint} ]`;
    const cells = this.element('.cells');
    this.round.cells.forEach((_, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.tabIndex = -1;
      tile.className = 'tile';
      tile.innerHTML = '<span class="letter"></span>';
      tile.onclick = () => {
        if (!this.ready || this.round.solved || this.attempts.exhausted || this.busy) return;
        this.anchor = index;
        this.input.focus({ preventScroll: true });
        if (this.draft.length > 1) {
          const position = Math.min(index, this.input.value.length);
          this.input.setSelectionRange(position, Math.min(position + 1, this.input.value.length));
        }
        this.renderBoard();
      };
      cells.append(tile);
    });
    this.element<HTMLFormElement>('form').onsubmit = event => { event.preventDefault(); void this.submit(); };
    this.input.addEventListener('input', () => {
      this.element('.feedback').textContent = '';
      this.renderBoard();
    });
    this.input.addEventListener('keydown', event => {
      if (event.isComposing && event.key === 'Enter') { event.preventDefault(); return; }
      if (this.draft.length <= 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        this.anchor = (this.anchor + (event.key === 'ArrowLeft' ? this.round.answer.length - 1 : 1)) % this.round.answer.length;
        this.renderBoard();
      }
    });
    this.input.addEventListener('keyup', () => this.renderBoard());
    this.input.addEventListener('focus', () => this.renderBoard());
    this.input.addEventListener('blur', () => this.renderBoard());
    this.element<HTMLButtonElement>('.continue').onclick = () => {
      if (!this.round.solved) return;
      this.complete();
    };
    // Keep movie playback shortcuts inside the modal.
    this.host.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') event.preventDefault();
      if (event.key === 'Tab') this.trapFocus(event);
    });
    // Some browsers require a gesture before the first spoken line.
    const retryIntro = () => {
      this.startMusic();
      if (this.pendingIntro && !this.round.solved && !this.attempts.exhausted) this.speak('intro');
    };
    this.host.addEventListener('pointerdown', retryIntro, { capture: true });
    this.host.addEventListener('keydown', retryIntro, { capture: true });
    document.body.append(this.host);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.renderBoard();
    this.entranceTimer = setTimeout(() => {
      if (this.disposed) return;
      this.ready = true;
      this.host.dataset.dialogue = 'intro';
      this.startMusic();
      this.speak('intro');
      this.input.focus({ preventScroll: true });
    }, options.cleanEntranceMs ?? script.cleanEntranceMs);
  }

  private element<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) throw new Error(`Missing word gate element: ${selector}`);
    return element;
  }

  private get input(): HTMLInputElement { return this.element<HTMLInputElement>('input'); }
  private get draft(): string { return this.input.value.normalize('NFC').trim().toLocaleUpperCase('ru'); }
  private get tiles(): HTMLButtonElement[] { return Array.from(this.shadow.querySelectorAll<HTMLButtonElement>('.tile')); }

  private async submit(): Promise<void> {
    if (!this.ready || this.busy || this.round.solved || this.attempts.exhausted) return;
    const draft = this.draft;
    const source = this.tiles[this.anchor].getBoundingClientRect();
    const previous = this.round.cells;
    const result = this.round.guessAutomatic(draft);
    const correct = result === 'letter_correct' || result === 'word_correct';
    if (this.round.solved) this.stopThinkingMusic();
    const misplaced = correct && draft.length === 1 && this.round.answer[this.anchor] !== draft;
    const reaction = misplaced ? 'letter_misplaced' : result;
    this.host.dataset.dialogue = reaction;
    const feedback: Record<AutomaticGuessResult, string> = {
      empty: 'Введите букву или слово',
      incomplete: `В слове ${this.round.answer.length} букв. Продолжайте ввод.`,
      invalid: 'Введите русскую букву или слово из восьми букв',
      letter_correct: script.dialogue.letter_correct,
      letter_wrong: 'Такой буквы нет',
      repeat_letter: 'Эту букву уже проверяли',
      word_wrong: 'Не то слово. Попробуйте ещё',
      word_correct: 'Верно',
    };
    this.element('.feedback').textContent = misplaced ? script.dialogue.letter_misplaced : feedback[result];
    if (result === 'incomplete' || result === 'invalid' || result === 'empty') {
      this.input.focus({ preventScroll: true });
      return;
    }
    if ((result === 'letter_wrong' || result === 'word_wrong') && this.attempts.recordWrongAnswer()) {
      this.skipAfterFailures();
      return;
    }
    this.input.value = '';
    if (reaction in VOICES) this.speak(reaction as keyof typeof VOICES);
    if (correct) this.playSound(result === 'word_correct' ? winUrl : correctUrl);
    else if (result === 'letter_wrong' || result === 'word_wrong') this.playSound(wrongUrl);
    this.arriving = draft.length === 1 && correct
      ? this.round.cells.flatMap((char, index) => char && !previous[index] ? [index] : []) : [];
    this.busy = this.arriving.length > 0;
    this.input.readOnly = this.busy;
    this.renderBoard();
    if (this.arriving.length) await this.flyLetter(draft, source, this.arriving);
    if (this.disposed) return;
    this.busy = false;
    this.arriving = [];
    this.input.readOnly = false;
    this.renderBoard();
    if (this.round.solved) {
      this.element('.scene').classList.add('solved');
      this.input.disabled = true;
      this.element('.actions').hidden = true;
      this.element('.continue').hidden = false;
      this.element<HTMLButtonElement>('.continue').focus({ preventScroll: true });
    } else this.input.focus({ preventScroll: true });
  }

  private renderBoard(): void {
    const draft = this.draft;
    const active = draft.length <= 1 ? this.anchor : Math.min(this.input.selectionStart ?? draft.length, this.round.answer.length - 1);
    this.tiles.forEach((tile, index) => {
      const typed = draft.length === 1 ? (index === this.anchor ? draft : '') : draft[index] ?? '';
      const known = this.round.cells[index];
      const char = typed || known;
      tile.querySelector('.letter')!.textContent = char;
      tile.classList.toggle('revealed', Boolean(known));
      tile.classList.toggle('draft', Boolean(typed));
      tile.classList.toggle('arriving', this.arriving.includes(index));
      tile.classList.toggle('active', !this.busy && !this.round.solved && !this.attempts.exhausted && this.shadow.activeElement === this.input && active === index);
      tile.setAttribute('aria-label', `Буква ${index + 1}: ${char || 'пусто'}`);
      tile.disabled = this.round.solved || this.attempts.exhausted;
    });
  }

  private async flyLetter(letter: string, source: DOMRect, indices: number[]): Promise<void> {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    await Promise.all(indices.map(async index => {
      const target = this.tiles[index].getBoundingClientRect();
      const flying = document.createElement('span');
      flying.className = 'flying-letter';
      flying.textContent = letter;
      flying.setAttribute('aria-hidden', 'true');
      flying.style.cssText = `left:${source.left}px;top:${source.top}px;width:${source.width}px;height:${source.height}px;`;
      this.element('.scene').append(flying);
      const animation = flying.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${(target.left - source.left) / 2}px,-24px) scale(1.08)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${target.left - source.left}px,${target.top - source.top}px) scale(1)`, opacity: 1 },
      ], { duration: 360, easing: 'ease-in-out' });
      try { await animation.finished; } catch { /* Removing the overlay cancels the flight. */ }
      flying.remove();
    }));
  }

  private playSound(url: string): void {
    this.sound.pause();
    this.sound.src = url;
    this.syncSoundVolume();
    this.sound.play().catch(() => { /* Keyboard entry stays available if autoplay is blocked. */ });
  }

  private startMusic(): void {
    if (!this.ready || this.disposed || this.musicFinished || this.round.solved || this.attempts.exhausted || document.hidden || !this.music.paused) return;
    this.syncSoundVolume();
    this.music.play().catch(() => { /* Retry at the next user gesture if autoplay is blocked. */ });
  }

  private syncSoundVolume(): void {
    const level = Math.min(1, Math.max(0, this.options.volume?.() ?? 0.35));
    const speech = !this.voice.paused && !this.voice.ended;
    this.sound.volume = level * (speech ? 0.35 : 1);
    if (!this.musicFinished) this.music.volume = level * 0.65 * (speech ? 0.2 : 1);
  }

  private stopThinkingMusic(): void {
    if (this.musicFinished) return;
    this.musicFinished = true;
    const initialVolume = this.music.volume;
    const started = performance.now();
    const fade = (now: number) => {
      if (this.disposed) return;
      const progress = this.music.paused ? 1 : Math.min(1, (now - started) / 220);
      this.music.volume = initialVolume * (1 - progress);
      if (progress < 1) this.musicFadeFrame = requestAnimationFrame(fade);
      else {
        this.music.pause();
        this.music.currentTime = 0;
        this.musicFadeFrame = undefined;
      }
    };
    this.musicFadeFrame = requestAnimationFrame(fade);
  }

  private speak(event: keyof typeof VOICES, onComplete?: () => void): void {
    if (this.disposed) return;
    if (this.attempts.exhausted && event !== 'attempts_exhausted') return;
    this.pendingIntro = false;
    const request = ++this.voiceRequest;
    this.voice.pause();
    this.voiceDone = onComplete;
    this.voice.src = VOICES[event];
    this.voice.volume = Math.min(1, Math.max(0, this.options.voiceVolume?.() ?? 1));
    this.voice.play().catch(() => {
      if (event === 'intro' && request === this.voiceRequest && !this.disposed) this.pendingIntro = true;
      if (request === this.voiceRequest) this.finishVoice();
    });
  }

  private finishVoice(): void {
    const done = this.voiceDone;
    this.voiceDone = undefined;
    done?.();
  }

  private skipAfterFailures(): void {
    this.stopThinkingMusic();
    this.input.value = '';
    this.input.disabled = true;
    this.busy = true;
    this.pendingIntro = false;
    this.host.dataset.dialogue = 'attempts_exhausted';
    this.element('.actions').hidden = true;
    this.element<HTMLButtonElement>('.repeat-intro').disabled = true;
    this.element('.feedback').textContent = 'Продолжаем';
    this.renderBoard();
    this.playSound(wrongUrl);
    this.speak('attempts_exhausted', () => this.complete());
  }

  private complete(): void {
    if (this.disposed) return;
    this.destroy();
    this.options.onComplete();
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(this.shadow.querySelectorAll<HTMLElement>('button, input')).filter(element =>
      element.tabIndex >= 0 && !element.closest('[hidden]') && !(element as HTMLButtonElement).disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.shadow.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && this.shadow.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.entranceTimer);
    if (this.musicFadeFrame !== undefined) cancelAnimationFrame(this.musicFadeFrame);
    this.sound.pause();
    this.sound.removeAttribute('src');
    this.music.pause();
    this.music.removeAttribute('src');
    this.voiceDone = undefined;
    this.voice.pause();
    this.voice.removeAttribute('src');
    this.shadow.getAnimations().forEach(animation => animation.cancel());
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.host.remove();
    this.previousFocus?.focus({ preventScroll: true });
  }
}
