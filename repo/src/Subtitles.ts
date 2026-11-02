import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { SubtitleCue } from './storyData';
import { ClickTracker } from './ClickTracker';
import { SFX } from './SoundEffects';
import { getTexture, hasTexture } from './assetsManager';

export interface SpeakerProfile {
  name: string;
  role: string;
  dept: string;
  themeColor: number;
  avatarKey: string;
  slackKey: string | null;
}

export class Subtitles extends Container {
  // 1. Regular cinematic subtitles (Black rectangle at bottom center, NO NAME / AVATAR)
  private _dialogueContainer: Container;
  private _background: Graphics;
  private _mainText: Text;
  private _cursorText: Text;
  private _counterText: Text;
  private _prevPhraseBtn: Container;
  private _nextPhraseBtn: Container;

  // 2. Vertical Karaoke Screen (Right side of screen, text crawls top to bottom)
  private _karaokeScreenContainer: Container;
  private _karaokePanelBg: Graphics;
  private _karaokeHeader: Container;
  private _karaokeTitleText: Text;
  private _karaokeSubText: Text;
  private _karaokeListMask: Graphics;
  private _karaokeListContainer: Container;
  private _karaokeActiveHighlight: Graphics;
  private _karaokeLines: {
    container: Container;
    text: Text;
    indexText: Text;
    noteIcon: Text;
    cue: SubtitleCue;
    baseY: number;
  }[] = [];
  private _karaokeCurrentScrollY = 0;
  private _karaokeTargetScrollY = 0;

  // 3. Floating Slack Screenshot Modal
  private _slackDimOverlay: Graphics;
  private _slackPopupContainer: Container;
  private _slackPopupBg: Graphics;
  private _slackPopupTitleText: Text;
  private _slackPopupSprite: Sprite;
  private _slackCloseBtn: Container;
  private _slackZoomBtn: Container;
  private _slackZoomTxt: Text;
  private _slackProgressBar: Graphics;
  private _slackHoldTimer = 0;
  private _isSlackHovered = false;
  private _isSlackDismissed = false;
  private _isSlackZoomed = false;
  private _slackPopupTargetAlpha = 0;
  private _slackPopupCurrentAlpha = 0;
  private _currentSlackKey: string | null = null;

  // Positioning & Metrics
  private _cues: SubtitleCue[] = [];
  private _currentCueIndex = -1;
  private _isKaraoke = false;
  private _actId = '';
  private _cursorTimer = 0;
  private _bottomOffset = 0;

  private _screenWidth = 1280;
  private _screenHeight = 720;

  public onSeekRequested?: (targetTime: number) => void;

  constructor() {
    super();

    // 0. Fullscreen dark dim overlay for Slack Zoom mode
    this._slackDimOverlay = new Graphics();
    this._slackDimOverlay.eventMode = 'static';
    this._slackDimOverlay.cursor = 'pointer';
    this._slackDimOverlay.visible = false;
    this._slackDimOverlay.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      if (this._isSlackZoomed) {
        this.toggleSlackZoom();
      }
    });
    this.addChild(this._slackDimOverlay);

    // 1. FLOATING SLACK SCREENSHOT POPUP
    this._slackPopupContainer = new Container();
    this._slackPopupContainer.alpha = 0;
    this._slackPopupContainer.visible = false;
    this._slackPopupContainer.eventMode = 'static';
    this.addChild(this._slackPopupContainer);

    this._slackPopupContainer.on('pointerover', () => {
      this._isSlackHovered = true;
    });
    this._slackPopupContainer.on('pointerout', () => {
      this._isSlackHovered = false;
    });

    this._slackPopupBg = new Graphics();
    this._slackPopupContainer.addChild(this._slackPopupBg);

    const slackTitleStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 2,
    });
    this._slackPopupTitleText = new Text({ text: 'СЛЕК-ДЕПЕША ЦИТАДЕЛИ: #VIZOR_PRODUCTION', style: slackTitleStyle });
    this._slackPopupTitleText.position.set(16, 12);
    this._slackPopupContainer.addChild(this._slackPopupTitleText);

    this._slackPopupSprite = new Sprite();
    this._slackPopupContainer.addChild(this._slackPopupSprite);

    // Zoom button
    this._slackZoomBtn = new Container();
    this._slackZoomBtn.eventMode = 'static';
    this._slackZoomBtn.cursor = 'pointer';
    const zoomBtnBg = new Graphics();
    this._slackZoomBtn.addChild(zoomBtnBg);
    this._slackZoomTxt = new Text({
      text: '🔍 ZOOM',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace', 'sans-serif'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#00f5d4',
        letterSpacing: 1,
      }),
    });
    this._slackZoomTxt.anchor.set(0.5);
    this._slackZoomBtn.addChild(this._slackZoomTxt);

    const drawZoomBtn = (hover = false) => {
      zoomBtnBg.clear();
      zoomBtnBg.roundRect(-36, -11, 72, 22, 6);
      zoomBtnBg.fill({ color: hover ? 0x00f5d4 : 0x141826, alpha: 0.95 });
      zoomBtnBg.stroke({ color: hover ? 0xffaa00 : 0x00f5d4, width: 1.2 });
      this._slackZoomTxt.style.fill = hover ? '#050711' : '#00f5d4';
    };
    drawZoomBtn(false);
    this._slackZoomBtn.on('pointerover', () => drawZoomBtn(true));
    this._slackZoomBtn.on('pointerout', () => drawZoomBtn(false));
    this._slackZoomBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      SFX.playClick();
      this.toggleSlackZoom();
    });
    this._slackPopupContainer.addChild(this._slackZoomBtn);

    // Close button
    this._slackCloseBtn = new Container();
    this._slackCloseBtn.eventMode = 'static';
    this._slackCloseBtn.cursor = 'pointer';
    const closeBtnBg = new Graphics();
    this._slackCloseBtn.addChild(closeBtnBg);
    const closeBtnTxt = new Text({
      text: '✕ ЗАКРЫТЬ',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace', 'sans-serif'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#ff5e1a',
        letterSpacing: 1,
      }),
    });
    closeBtnTxt.anchor.set(0.5);
    this._slackCloseBtn.addChild(closeBtnTxt);

    const drawCloseBtn = (hover = false) => {
      closeBtnBg.clear();
      closeBtnBg.roundRect(-42, -11, 84, 22, 6);
      closeBtnBg.fill({ color: hover ? 0xff5e1a : 0x141826, alpha: 0.95 });
      closeBtnBg.stroke({ color: hover ? 0xffaa00 : 0x552233, width: 1.2 });
      closeBtnTxt.style.fill = hover ? '#ffffff' : '#ff5e1a';
    };
    drawCloseBtn(false);
    this._slackCloseBtn.on('pointerover', () => drawCloseBtn(true));
    this._slackCloseBtn.on('pointerout', () => drawCloseBtn(false));
    this._slackCloseBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      SFX.playClick();
      this._isSlackDismissed = true;
      this._slackPopupTargetAlpha = 0;
      if (this._isSlackZoomed) {
        this.toggleSlackZoom();
      }
    });
    this._slackPopupContainer.addChild(this._slackCloseBtn);

    this._slackProgressBar = new Graphics();
    this._slackPopupContainer.addChild(this._slackProgressBar);

    // 2. DIALOGUE CONTAINER (Clean Cinematic Subtitles on Black Rectangle, NO NAME / AVATAR)
    this._dialogueContainer = new Container();
    this.addChild(this._dialogueContainer);

    this._background = new Graphics();
    this._dialogueContainer.addChild(this._background);

    const textStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 20,
      fontWeight: 'normal',
      fill: '#00f5d4',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 840,
      lineHeight: 30,
      letterSpacing: 0.5,
    });
    this._mainText = new Text({ text: '', style: textStyle });
    this._mainText.anchor.set(0.5, 0.5);
    this._dialogueContainer.addChild(this._mainText);

    const cursorStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 18,
      fill: '#00f5d4',
      fontWeight: 'bold',
    });
    this._cursorText = new Text({ text: '▌', style: cursorStyle });
    this._cursorText.anchor.set(0, 0.5);
    this._cursorText.visible = false;
    this._dialogueContainer.addChild(this._cursorText);

    const counterStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 10,
      fill: '#64748b',
    });
    this._counterText = new Text({ text: '', style: counterStyle });
    this._counterText.anchor.set(1, 0.5);
    this._counterText.visible = false;
    this._dialogueContainer.addChild(this._counterText);

    this._prevPhraseBtn = this._createMiniBtn('◀', () => this.previousPhrase());
    this._nextPhraseBtn = this._createMiniBtn('▶', () => this.nextPhrase());
    this._prevPhraseBtn.visible = false;
    this._nextPhraseBtn.visible = false;
    this._dialogueContainer.addChild(this._prevPhraseBtn);
    this._dialogueContainer.addChild(this._nextPhraseBtn);

    // 3. VERTICAL KARAOKE SCREEN (Right Side of Screen, Text Crawls Top to Bottom)
    this._karaokeScreenContainer = new Container();
    this._karaokeScreenContainer.visible = false;
    this.addChild(this._karaokeScreenContainer);

    this._karaokePanelBg = new Graphics();
    this._karaokeScreenContainer.addChild(this._karaokePanelBg);

    this._karaokeHeader = new Container();
    this._karaokeHeader.visible = false;
    this._karaokeScreenContainer.addChild(this._karaokeHeader);

    this._karaokeTitleText = new Text({
      text: 'ХРОНИКИ ВЕЛИКОГО СЕРВОТОРИАТОРА',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 13,
        fontWeight: 'bold',
        fill: '#00f5d4',
        letterSpacing: 2,
      }),
    });
    this._karaokeHeader.addChild(this._karaokeTitleText);

    this._karaokeSubText = new Text({
      text: 'КАРАОКЕ // ФИНАЛЬНЫЙ ТРЕК',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fill: '#007a6c',
        letterSpacing: 1.5,
      }),
    });
    this._karaokeSubText.position.set(0, 20);
    this._karaokeHeader.addChild(this._karaokeSubText);

    this._karaokeListContainer = new Container();
    this._karaokeListMask = new Graphics();
    this._karaokeListContainer.mask = this._karaokeListMask;
    this._karaokeScreenContainer.addChild(this._karaokeListContainer);
    this._karaokeScreenContainer.addChild(this._karaokeListMask);

    this._karaokeActiveHighlight = new Graphics();
    this._karaokeListContainer.addChild(this._karaokeActiveHighlight);

    this.eventMode = 'passive';
  }

  private _createMiniBtn(icon: string, onClick: () => void): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const bg = new Graphics();
    c.addChild(bg);

    const txt = new Text({
      text: icon,
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fill: '#00f5d4',
      }),
    });
    txt.anchor.set(0.5);
    c.addChild(txt);

    const draw = (hover = false) => {
      bg.clear();
      bg.circle(0, 0, 11);
      bg.fill({ color: hover ? 0x00f5d4 : 0x000000, alpha: hover ? 0.9 : 0.6 });
      bg.stroke({ color: hover ? 0xffaa00 : 0x007a6c, width: 1.0 });
      txt.style.fill = hover ? '#050711' : '#00f5d4';
    };

    draw(false);
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      SFX.playClick();
      onClick();
    });

    return c;
  }

  public setBottomOffset(offset: number): void {
    if (this._bottomOffset !== offset) {
      this._bottomOffset = offset;
      this._redrawLayout();
    }
  }

  public showSlackPopup(slackKey: string): void {
    if (!slackKey || !hasTexture(slackKey)) return;
    this._currentSlackKey = slackKey;
    this._slackHoldTimer = 8.0;
    this._isSlackDismissed = false;
    const tex = getTexture(slackKey);
    this._slackPopupSprite.texture = tex;
    this._positionSlackPopup(tex);
    this._slackPopupTargetAlpha = 1.0;
  }

  public hideSlackPopup(immediate: boolean = false): void {
    this._slackPopupTargetAlpha = 0;
    this._slackHoldTimer = 0;
    this._isSlackDismissed = true;
    if (immediate) {
      this._slackPopupCurrentAlpha = 0;
      this._slackPopupContainer.alpha = 0;
      this._slackPopupContainer.visible = false;
    }
  }

  public setCues(cues: SubtitleCue[], hasDedicatedFrame: boolean, isKaraoke = false, frameTitle = '', actId = ''): void {
    this._cues = cues;
    this._currentCueIndex = -1;
    this._isKaraoke = isKaraoke;
    this._actId = actId;

    // Reset Slack popup modal
    this._currentSlackKey = null;
    this._slackHoldTimer = 0;
    this._isSlackHovered = false;
    this._isSlackDismissed = false;
    this._isSlackZoomed = false;
    this._slackDimOverlay.visible = false;
    this._slackPopupTargetAlpha = 0;
    this._slackPopupCurrentAlpha = 0;
    this._slackPopupContainer.visible = false;

    // Toggle Modes: Dialogue vs Right-Side Karaoke Screen
    this._dialogueContainer.visible = !isKaraoke;
    this._karaokeScreenContainer.visible = isKaraoke;

    this._mainText.text = '';
    this._counterText.text = cues.length > 0 ? ('1 / ' + cues.length) : '';

    if (isKaraoke) {
      this._buildKaraokeLines(cues);
    } else {
      this._clearKaraokeLines();
    }

    this._redrawLayout();
  }

  private _buildKaraokeLines(cues: SubtitleCue[]): void {
    this._clearKaraokeLines();

    const isPortrait = this._screenHeight > this._screenWidth;
    const baseFontSize = isPortrait ? 20 : 23;
    const baseLineHeight = isPortrait ? 28 : 32;
    const lineHeight = isPortrait ? 52 : 56;
    const wrapWidth = isPortrait ? 340 : 380;
    let curY = 0;

    cues.forEach((cue, index) => {
      const lineC = new Container();
      lineC.position.set(0, curY);

      // Line number badge
      const numTxt = new Text({
        text: (index + 1).toString().padStart(2, '0'),
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: 10,
          fill: '#005f54',
        }),
      });
      numTxt.position.set(12, 12);
      lineC.addChild(numTxt);

      // Note icon indicator for active line
      const noteIcon = new Text({
        text: '♪',
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: 12,
          fill: '#00f5d4',
        }),
      });
      noteIcon.position.set(34, 10);
      noteIcon.visible = false;
      lineC.addChild(noteIcon);

      // Clean lyric text
      const cleanText = cue.text.replace(/^[♪\s]+/, '');
      const lyricTxt = new Text({
        text: cleanText,
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: baseFontSize,
          fontWeight: 'normal',
          fill: '#007a6c',
          wordWrap: true,
          wordWrapWidth: wrapWidth,
          lineHeight: baseLineHeight,
          letterSpacing: 0.6,
        }),
      });
      lyricTxt.position.set(54, 6);
      lineC.addChild(lyricTxt);

      this._karaokeListContainer.addChild(lineC);

      this._karaokeLines.push({
        container: lineC,
        text: lyricTxt,
        indexText: numTxt,
        noteIcon: noteIcon,
        cue: cue,
        baseY: curY,
      });

      curY += lineHeight;
    });
  }

  private _clearKaraokeLines(): void {
    for (const item of this._karaokeLines) {
      this._karaokeListContainer.removeChild(item.container);
      item.container.destroy({ children: true });
    }
    this._karaokeLines = [];
  }

  public syncToTime(currentTime: number, isPlaying: boolean): void {
    if (this._cues.length === 0) {
      this._mainText.text = '';
      this._counterText.text = '';
      this._slackPopupTargetAlpha = 0;
      return;
    }

    const LEAD_IN = 0.16;
    let cueIndex = -1;

    for (let i = 0; i < this._cues.length; i++) {
      const c = this._cues[i];
      if (currentTime >= c.start - LEAD_IN && currentTime < c.end) {
        cueIndex = i;
        break;
      }
    }

    if (cueIndex === -1) {
      for (let i = 0; i < this._cues.length; i++) {
        const c = this._cues[i];
        const nextStart = i + 1 < this._cues.length ? this._cues[i + 1].start - LEAD_IN : Infinity;
        if (currentTime >= c.start - LEAD_IN && currentTime < nextStart) {
          cueIndex = i;
          break;
        }
      }
    }

    if (cueIndex === -1) {
      if (currentTime >= this._cues[this._cues.length - 1].end) {
        cueIndex = this._cues.length - 1;
      } else if (currentTime < this._cues[0].start - LEAD_IN) {
        cueIndex = 0;
      }
    }

    if (cueIndex !== this._currentCueIndex) {
      this._currentCueIndex = cueIndex;
      this._counterText.text = (cueIndex + 1) + ' / ' + this._cues.length;

      const cue = this._cues[cueIndex];
      if (cue) {
        this._updateSlackPopup(cue);

        if (!this._isKaraoke) {
          // Standard movie subtitle style: Clean, centered, NO NAME / AVATAR
          this._mainText.text = cue.text;
          this._redrawDialogueBox();
        }
      }
    }

    const currentCue = this._cues[this._currentCueIndex];
    if (!currentCue) return;

    if (this._isKaraoke) {
      // KARAOKE SCREEN: Text crawls top to bottom smoothly
      const isPortrait = this._screenHeight > this._screenWidth;
      const lineHeight = isPortrait ? 52 : 56;
      const targetFocusY = isPortrait ? 120 : 160;

      const duration = Math.max(0.3, currentCue.end - currentCue.start);
      const elapsed = Math.max(0, currentTime - currentCue.start);
      const lineProgress = Math.min(1, Math.max(0, elapsed / duration));

      const lineY = this._currentCueIndex * lineHeight;
      this._karaokeTargetScrollY = targetFocusY - lineY + (lineProgress * 6);

      // Constant uniform text size across all lines: size NEVER jumps, only highlight changes
      const baseFontSize = isPortrait ? 20 : 23;
      const baseLineHeight = isPortrait ? 28 : 32;

      for (let i = 0; i < this._karaokeLines.length; i++) {
        const item = this._karaokeLines[i];
        item.text.style.fontFamily = ['Share Tech Mono', 'monospace'];
        (item.text.style as any).dropShadow = null;
        item.text.style.fontSize = baseFontSize;
        item.text.style.lineHeight = baseLineHeight;
        item.text.style.fontWeight = 'normal';
        item.text.style.letterSpacing = 0.6;

        if (i === this._currentCueIndex) {
          // Active singing line: illuminated bright cyan
          item.text.style.fill = '#00f5d4';
          item.text.alpha = 1.0;
          item.noteIcon.visible = true;
          item.indexText.style.fill = '#00f5d4';

          // Active background highlight bar
          const panelW = isPortrait ? Math.min(this._screenWidth * 0.92, 420) : Math.min(460, Math.max(340, Math.round(this._screenWidth * 0.36)));
          this._karaokeActiveHighlight.clear();
          this._karaokeActiveHighlight.roundRect(8, item.baseY + 2, panelW - 32, lineHeight - 4, 6);
          this._karaokeActiveHighlight.fill({ color: 0x00f5d4, alpha: 0.12 });
          this._karaokeActiveHighlight.stroke({ color: 0x00f5d4, width: 1.0, alpha: 0.35 });
        } else if (i < this._currentCueIndex) {
          // Past lines: dimmed dark teal
          item.text.style.fill = '#005f54';
          item.text.alpha = 0.35;
          item.noteIcon.visible = false;
          item.indexText.style.fill = '#003831';
        } else {
          // Upcoming lines: muted cyan
          item.text.style.fill = '#007a6c';
          item.text.alpha = 0.55;
          item.noteIcon.visible = false;
          item.indexText.style.fill = '#003831';
        }
      }
    } else {
      this._mainText.text = currentCue.text;
    }
  }

  public update(dt: number): void {
    this._cursorTimer += dt;

    // Smooth crawling scroll of karaoke text list (top to bottom)
    if (this._isKaraoke) {
      const lerpSpeed = Math.min(1, dt * 8);
      this._karaokeCurrentScrollY += (this._karaokeTargetScrollY - this._karaokeCurrentScrollY) * lerpSpeed;
      this._karaokeListContainer.y = this._karaokeCurrentScrollY;
    }

    // Slack screenshot countdown timer
    if (this._slackHoldTimer > 0) {
      if (!this._isSlackHovered && !this._isSlackZoomed) {
        this._slackHoldTimer = Math.max(0, this._slackHoldTimer - dt);
      }
      if (this._slackHoldTimer <= 0 || this._isSlackDismissed) {
        this._slackPopupTargetAlpha = 0;
        if (this._isSlackZoomed) {
          this.toggleSlackZoom();
        }
      }
    }

    // Smooth alpha fade for Slack screenshot popup
    if (this._slackPopupCurrentAlpha !== this._slackPopupTargetAlpha) {
      const dAlpha = this._slackPopupTargetAlpha - this._slackPopupCurrentAlpha;
      const step = Math.sign(dAlpha) * Math.min(Math.abs(dAlpha), dt * 4.5);
      this._slackPopupCurrentAlpha += step;
      this._slackPopupContainer.alpha = this._slackPopupCurrentAlpha;
      this._slackPopupContainer.visible = this._slackPopupCurrentAlpha > 0.01;
    }

    this._updateSlackProgressBar();
  }

  private _updateSlackPopup(cue: SubtitleCue): void {
    let sKey: string | null = cue.slackScreenshotKey || null;

    if (!sKey) {
      const t = cue.text.toLowerCase();
      if (t.includes('jnghfdbk') || t.includes('демоблил')) sKey = '01_jnghfdbk';
      else if (t.includes('130 страниц') || t.includes('под стеклом лежат') || (t.includes('диснея') && t.includes('гроб'))) sKey = '03_disney_long_box';
      else if (t.includes('забанили клод') || t.includes('забанили claude')) sKey = '04_claude_banned';
      else if (t.includes('одиннадцать баллов') || t.includes('11 баллов')) sKey = '05_edik_11_points';
      else if (t.includes('палатку')) sKey = '06_tent_brother';
      else if (t.includes('корова') && (t.includes('лазер') || t.includes('лупит') || t.includes('коров'))) sKey = '07_cow_laser';
      else if (t.includes('mavis') && t.includes('ноги')) sKey = '08_mavis_legs';
      else if (t.includes('даниал') || t.includes('3а') || t.includes('3a')) sKey = '09_danial_3a_project';
      else if (t.includes('музеях') && (t.includes('котов') || t.includes('мумий') || t.includes('фараон'))) sKey = '10_pyramids_museum';
      else if (t.includes('нотион') && t.includes('даты')) sKey = '12_nick_time_machine';
      else if (t.includes('сундук') && (t.includes('яйцо') || t.includes('звук'))) sKey = '13_chest_egg_sound';
      else if (t.includes('чуяния ноль') || t.includes('было чуяния') || t.includes('павел, простите')) sKey = '14_feeling_zero';
    }

    if (sKey && hasTexture(sKey)) {
      if (this._currentSlackKey !== sKey) {
        this._currentSlackKey = sKey;
        this._slackHoldTimer = 8.0;
        this._isSlackDismissed = false;
        const tex = getTexture(sKey);
        this._slackPopupSprite.texture = tex;
        this._positionSlackPopup(tex);
        this._slackPopupTargetAlpha = 1.0;
      }
    } else {
      if (this._currentSlackKey && this._slackHoldTimer <= 0) {
        this._slackPopupTargetAlpha = 0;
        this._currentSlackKey = null;
      }
    }
  }

  public toggleSlackZoom(): void {
    this._isSlackZoomed = !this._isSlackZoomed;
    this._slackDimOverlay.visible = this._isSlackZoomed;

    if (this._slackPopupSprite.texture && this._slackPopupSprite.texture !== Texture.WHITE) {
      this._positionSlackPopup(this._slackPopupSprite.texture);
    }
    this._slackZoomTxt.text = this._isSlackZoomed ? '✕ МЕНЬШЕ' : '🔍 ZOOM';
  }

  private _positionSlackPopup(tex: Texture): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    if (this._isSlackZoomed) {
      this._slackDimOverlay.clear();
      this._slackDimOverlay.rect(0, 0, w, h);
      this._slackDimOverlay.fill({ color: 0x030408, alpha: 0.88 });

      const maxW = w * 0.94;
      const maxH = h * 0.84;
      const scale = Math.min(maxW / tex.width, maxH / tex.height, 2.0);
      const imgW = Math.round(tex.width * scale);
      const imgH = Math.round(tex.height * scale);

      const padX = 14;
      const topH = 34;
      const botH = 10;
      const modalW = imgW + padX * 2;
      const modalH = imgH + topH + botH;

      const posX = (w - modalW) / 2;
      const posY = (h - modalH) / 2;
      this._slackPopupContainer.position.set(posX, posY);

      this._slackPopupBg.clear();
      this._slackPopupBg.roundRect(0, 0, modalW, modalH, 10);
      this._slackPopupBg.fill({ color: 0x0a0e18, alpha: 0.98 });
      this._slackPopupBg.stroke({ color: 0x00f5d4, width: 2.0, alpha: 0.95 });

      this._slackPopupTitleText.text = 'СЛЕК-ДЕПЕША ЦИТАДЕЛИ: #VIZOR_PRODUCTION [УВЕЛИЧЕНО]';
      this._slackPopupTitleText.position.set(16, 10);

      this._slackZoomBtn.position.set(modalW - 130, 18);
      this._slackCloseBtn.position.set(modalW - 50, 18);

      this._slackPopupSprite.width = imgW;
      this._slackPopupSprite.height = imgH;
      this._slackPopupSprite.position.set(padX, topH);

      this._slackProgressBar.visible = false;
    } else {
      const maxW = isPortrait ? w * 0.92 : Math.min(w * 0.58, 680);
      const maxH = isPortrait ? h * 0.38 : Math.min(h * 0.38, 250);
      const scale = Math.min(maxW / tex.width, maxH / tex.height, 1.0);
      const imgW = Math.round(tex.width * scale);
      const imgH = Math.round(tex.height * scale);

      const padX = 12;
      const topH = 32;
      const botH = 8;
      const modalW = imgW + padX * 2;
      const modalH = imgH + topH + botH;

      const posX = (w - modalW) / 2;
      const posY = isPortrait ? 60 : 34;
      this._slackPopupContainer.position.set(posX, posY);

      this._slackPopupBg.clear();
      this._slackPopupBg.roundRect(0, 0, modalW, modalH, 8);
      this._slackPopupBg.fill({ color: 0x070b14, alpha: 0.95 });
      this._slackPopupBg.stroke({ color: 0x00f5d4, width: 1.5, alpha: 0.85 });

      this._slackPopupTitleText.text = 'СЛЕК-ДЕПЕША ЦИТАДЕЛИ: #VIZOR_PRODUCTION';
      this._slackPopupTitleText.position.set(14, 9);

      this._slackZoomBtn.position.set(modalW - 124, 16);
      this._slackCloseBtn.position.set(modalW - 46, 16);

      this._slackPopupSprite.width = imgW;
      this._slackPopupSprite.height = imgH;
      this._slackPopupSprite.position.set(padX, topH);

      this._slackProgressBar.visible = true;
    }
  }

  private _updateSlackProgressBar(): void {
    if (!this._slackProgressBar.visible || this._isSlackZoomed || this._slackHoldTimer <= 0) {
      this._slackProgressBar.clear();
      return;
    }
    const ratio = Math.max(0, Math.min(1, this._slackHoldTimer / 8.0));
    const padX = 12;
    const w = this._slackPopupSprite.width;
    const y = this._slackPopupSprite.y + this._slackPopupSprite.height + 2;

    this._slackProgressBar.clear();
    this._slackProgressBar.roundRect(padX, y, w, 3, 1.5);
    this._slackProgressBar.fill({ color: 0x141a2e, alpha: 0.6 });

    this._slackProgressBar.roundRect(padX, y, w * ratio, 3, 1.5);
    this._slackProgressBar.fill({ color: 0x00f5d4, alpha: 0.95 });
  }

  public nextPhrase(): void {
    if (this._currentCueIndex + 1 < this._cues.length) {
      const nextCue = this._cues[this._currentCueIndex + 1];
      this.onSeekRequested?.(nextCue.start);
    }
  }

  public previousPhrase(): void {
    if (this._currentCueIndex > 0) {
      const prevCue = this._cues[this._currentCueIndex - 1];
      this.onSeekRequested?.(prevCue.start);
    } else if (this._cues.length > 0) {
      this.onSeekRequested?.(this._cues[0].start);
    }
  }

  public resize(w: number, h: number): void {
    this._screenWidth = w;
    this._screenHeight = h;
    this._redrawLayout();
    if (this._slackPopupSprite.texture && this._slackPopupSprite.texture !== Texture.WHITE && this._slackPopupCurrentAlpha > 0.02) {
      this._positionSlackPopup(this._slackPopupSprite.texture);
    }
  }

  private _redrawLayout(): void {
    if (this._isKaraoke) {
      this._redrawKaraokeScreen();
    } else {
      this._redrawDialogueBox();
    }
  }

  /**
   * 1. REGULAR SUBTITLES: Clean black rectangle at bottom center, NO NAME / AVATAR / BORDER
   */
  private _redrawDialogueBox(): void {
    this._background.clear();

    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    // Subtitle text width & height
    const maxTextW = Math.min(w * 0.88, isPortrait ? 520 : 920);
    this._mainText.style.fontFamily = ['Share Tech Mono', 'monospace'];
    this._mainText.style.wordWrapWidth = maxTextW;
    this._mainText.style.fontSize = isPortrait ? 18 : 22;
    this._mainText.style.lineHeight = isPortrait ? 26 : 32;
    this._mainText.style.fill = '#00f5d4';
    this._mainText.style.letterSpacing = 0.5;
    (this._mainText.style as any).dropShadow = null;

    const bounds = this._mainText.bounds;
    const padX = isPortrait ? 24 : 32;
    const padY = isPortrait ? 14 : 18;
    const boxW = Math.max(260, Math.min(w * 0.94, bounds.width + padX * 2));
    const boxH = Math.max(48, bounds.height + padY * 2);

    const boxX = (w - boxW) / 2;
    // Dynamic bottom clearance: lifts subtitles when HUD bar slides up
    const bottomClearance = Math.max(isPortrait ? 36 : 24, this._bottomOffset + 18);
    const boxY = h - boxH - bottomClearance;

    // Clean black rectangle backdrop without borders or corner ticks
    this._background.roundRect(boxX, boxY, boxW, boxH, 8);
    this._background.fill({ color: 0x000000, alpha: 0.88 });

    // Text centered inside black box
    const textCenterX = boxX + boxW / 2;
    const textCenterY = boxY + boxH / 2;
    this._mainText.position.set(textCenterX, textCenterY);

    // Hide clutter buttons and counter inside dialogue box
    this._prevPhraseBtn.visible = false;
    this._nextPhraseBtn.visible = false;
    this._counterText.visible = false;
    this._cursorText.visible = false;
  }

  /**
   * 2. KARAOKE SCREEN: Screen on the right side of the screen, text crawls top to bottom
   */
  private _redrawKaraokeScreen(): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    const panelW = isPortrait ? Math.min(w * 0.92, 420) : Math.min(460, Math.max(340, Math.round(w * 0.36)));
    const panelH = isPortrait ? Math.min(h * 0.62, 540) : Math.min(h - 100, 680);
    const panelX = isPortrait ? (w - panelW) / 2 : w - panelW - 24;
    const panelY = isPortrait ? h - panelH - (this._bottomOffset + 24) : 44;

    this._karaokeScreenContainer.position.set(panelX, panelY);

    // Clean black rectangle backdrop without strokes or borders
    this._karaokePanelBg.clear();
    this._karaokePanelBg.roundRect(0, 0, panelW, panelH, 10);
    this._karaokePanelBg.fill({ color: 0x000000, alpha: 0.88 });

    // Header is hidden for clean minimalist look per user request
    this._karaokeHeader.visible = false;

    // Mask for the scrolling lines
    this._karaokeListMask.clear();
    this._karaokeListMask.rect(0, 16, panelW, panelH - 32);
    this._karaokeListMask.fill({ color: 0xffffff });
  }

  public get currentCueIndex(): number {
    return this._currentCueIndex;
  }
}
