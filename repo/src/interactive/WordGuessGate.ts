import script from '../../../media/interactive/scenes/protocol_gate.json';
import tileUrl from '../../../media/interactive/pole_chudes/graphics/tile_blank.svg?url';
import themeUrl from '../../../media/interactive/pole_chudes/audio/04_theme_old_opening_old.mp3?url';
import correctUrl from '../../../media/interactive/pole_chudes/audio/01_letter_correct_pole_letter_correct.mp3?url';
import wrongUrl from '../../../media/interactive/pole_chudes/audio/07_letter_wrong_pole_letter_wrong.mp3?url';
import winUrl from '../../../media/interactive/pole_chudes/audio/32_word_correct_pole_word_1996.mp3?url';
import portraitUrl from '../assets/images/ai_lord_face_closeup_gemini_1080p.webp?url';
import css from './wordGuessGate.css?inline';
import { WordGuessRound, type GuessMode, type GuessResult } from './wordGuessModel';

export const WORD_GATE_ACT_ID = script.targetActId;

interface GateOptions {
  onComplete: () => void;
  volume?: () => number;
  cleanEntranceMs?: number;
}

/** Standalone DOM overlay: it freezes story playback before any image from the next act. */
export class WordGuessGate {
  private readonly round = new WordGuessRound(script.answer);
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly sound = new Audio();
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private entranceTimer: ReturnType<typeof setTimeout>;
  private soundTimer: ReturnType<typeof setTimeout> | undefined;
  private mode: GuessMode = 'letter';
  private ready = false;
  private disposed = false;
  private muted = false;
  private readonly visibilityHandler = () => { if (document.hidden) this.sound.pause(); };

  constructor(private readonly options: GateOptions) {
    this.host.id = 'protocol-word-gate';
    this.host.style.cssText = 'position:fixed;inset:0;z-index:100000;';
    const style = document.createElement('style');
    style.textContent = css;
    this.shadow.append(style);
    const scene = document.createElement('section');
    scene.className = 'scene entrance';
    scene.setAttribute('role', 'dialog');
    scene.setAttribute('aria-modal', 'true');
    scene.setAttribute('aria-label', script.title);
    scene.style.setProperty('--tile', `url("${tileUrl}")`);
    scene.innerHTML = `
      <img class="portrait" alt="ИИ-Лорд" />
      <div class="shade"></div>
      <div class="content">
        <header><span class="eyebrow"></span><button class="sound-toggle" type="button" aria-label="Выключить звук">Звук включён</button></header>
        <main>
          <p class="chapter"></p><h1></h1><p class="hint"></p>
          <div class="board" role="group" aria-label="Загаданное слово"></div>
          <div class="used"><span>НАЗВАННЫЕ БУКВЫ</span><div class="letters"></div></div>
          <div class="controls">
            <div class="mode-switch" role="group" aria-label="Способ ответа"><button type="button" data-mode="letter" aria-pressed="true">Назвать букву</button><button type="button" data-mode="word" aria-pressed="false">Слово целиком</button></div>
            <form autocomplete="off"><label for="guess-input">Ваша буква</label><div class="input-row"><input id="guess-input" name="guess" maxlength="1" placeholder="А" spellcheck="false" autocapitalize="characters" /><button class="submit" type="submit">Проверить</button></div></form>
          </div>
          <div class="success" hidden><p>ПРОТОКОЛ ВОССТАНОВЛЕН</p><button class="continue" type="button">Продолжить акт</button></div>
        </main>
        <footer><span class="speaker">ИИ-ЛОРД</span><p class="lord-line" aria-live="polite"></p><span class="status" aria-live="polite"></span></footer>
      </div>`;
    this.shadow.append(scene);
    this.element<HTMLImageElement>('.portrait').src = portraitUrl;
    this.element('.eyebrow').textContent = script.eyebrow;
    this.element('.chapter').textContent = script.title;
    this.element('h1').textContent = script.question;
    this.element('.hint').textContent = script.hint;
    this.renderBoard();
    this.shadow.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
      button.onclick = () => this.setMode(button.dataset.mode as GuessMode);
    });
    this.element<HTMLFormElement>('form').onsubmit = event => { event.preventDefault(); this.submit(); };
    this.input.addEventListener('input', () => {
      if (!this.ready || this.round.solved || !this.input.value.trim()) return;
      const prompt = this.mode === 'letter' ? 'letter_prompt' : 'word_prompt';
      if (this.host.dataset.dialogue !== prompt) this.say(prompt);
    });
    this.element<HTMLButtonElement>('.continue').onclick = () => {
      if (!this.round.solved) return;
      this.destroy();
      this.options.onComplete();
    };
    this.element<HTMLButtonElement>('.sound-toggle').onclick = () => {
      this.muted = !this.muted;
      this.sound.muted = this.muted;
      const button = this.element<HTMLButtonElement>('.sound-toggle');
      button.textContent = this.muted ? 'Звук выключен' : 'Звук включён';
      button.setAttribute('aria-label', this.muted ? 'Включить звук' : 'Выключить звук');
    };
    // Keep Space / arrows / Enter inside the overlay, away from movie hotkeys.
    this.host.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') event.preventDefault();
      if (event.key === 'Tab') this.trapFocus(event);
    });
    document.body.append(this.host);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.entranceTimer = setTimeout(() => {
      if (this.disposed) return;
      scene.classList.remove('entrance');
      this.ready = true;
      this.say('intro');
      this.playSound(themeUrl, 3.5);
      this.input.focus({ preventScroll: true });
    }, options.cleanEntranceMs ?? script.cleanEntranceMs);
  }

  private element<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) throw new Error(`Missing word gate element: ${selector}`);
    return element;
  }

  private get input(): HTMLInputElement { return this.element<HTMLInputElement>('input'); }

  private say(event: keyof typeof script.dialogue): void {
    this.element('.lord-line').textContent = script.dialogue[event];
    this.host.dataset.dialogue = event;
  }

  private setMode(mode: GuessMode): void {
    if (!this.ready || this.round.solved) return;
    this.mode = mode;
    this.shadow.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    this.input.maxLength = mode === 'letter' ? 1 : 32;
    this.input.value = '';
    this.input.placeholder = mode === 'letter' ? 'А' : 'Введите слово';
    this.element('label').textContent = mode === 'letter' ? 'Ваша буква' : 'Слово целиком';
    this.say(mode === 'letter' ? 'letter_prompt' : 'word_prompt');
    this.input.focus({ preventScroll: true });
  }

  private submit(): void {
    if (!this.ready || this.round.solved) return;
    const result: GuessResult = this.round.guess(this.input.value, this.mode);
    this.input.value = '';
    this.say(result === 'invalid' && this.mode === 'word' ? 'invalid_word' : result);
    this.renderBoard();
    const positive = result === 'letter_correct' || result === 'word_correct';
    this.element('.status').textContent = result === 'word_correct' ? 'Слово угадано' : result === 'letter_correct' ? 'Буква открыта' : result === 'letter_wrong' ? 'Такой буквы нет' : result === 'word_wrong' ? 'Слово не совпало' : '';
    if (positive) this.playSound(result === 'word_correct' ? winUrl : correctUrl);
    else if (result === 'word_wrong' || result === 'letter_wrong') this.playSound(wrongUrl);
    if (this.round.solved) {
      this.element('.scene').classList.add('solved');
      this.element('.controls').hidden = true;
      this.element('.success').hidden = false;
      this.element<HTMLButtonElement>('.continue').focus({ preventScroll: true });
    } else this.input.focus({ preventScroll: true });
  }

  private renderBoard(): void {
    const board = this.element('.board');
    board.replaceChildren();
    this.round.cells.forEach(char => {
      const tile = document.createElement('span');
      tile.className = 'tile' + (char ? ' revealed' : '');
      tile.textContent = char;
      tile.setAttribute('aria-label', char || 'Скрытая буква');
      board.append(tile);
    });
    const letters = this.element('.letters');
    letters.replaceChildren();
    this.round.tried.forEach(char => {
      const chip = document.createElement('span');
      chip.textContent = char;
      chip.className = this.round.answer.includes(char) ? 'hit' : 'miss';
      letters.append(chip);
    });
  }

  private playSound(url: string, stopAfterSeconds = 0): void {
    clearTimeout(this.soundTimer);
    this.sound.pause();
    this.sound.src = url;
    this.sound.muted = this.muted;
    this.sound.volume = Math.min(1, Math.max(0, this.options.volume?.() ?? 0.35));
    this.sound.play().catch(() => { /* Keyboard input stays available if autoplay is blocked. */ });
    if (stopAfterSeconds) this.soundTimer = setTimeout(() => this.sound.pause(), stopAfterSeconds * 1000);
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(this.shadow.querySelectorAll<HTMLElement>('button, input')).filter(element => !element.closest('[hidden]') && !(element as HTMLButtonElement).disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.shadow.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && this.shadow.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.entranceTimer);
    clearTimeout(this.soundTimer);
    this.sound.pause();
    this.sound.removeAttribute('src');
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.host.remove();
    this.previousFocus?.focus({ preventScroll: true });
  }
}
