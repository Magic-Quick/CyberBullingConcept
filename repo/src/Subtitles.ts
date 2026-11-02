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
    height: number;
  }[] = [];
  private _karaokeCurrentScrollY = 0;
  private _karaokeTargetScrollY = 0;
  private _karaokeContainerTargetAlpha = 1;
  private _karaokeContainerCurrentAlpha = 1;

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
  private _slackSpriteMask: Graphics;
  private _slackHoldTimer = 0;
  private _slackMotionTimer = 0;
  private _slackBaseX = 0;
  private _slackBaseY = 0;
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
    this._slackPopupSprite.eventMode = 'static';
    this._slackPopupSprite.cursor = 'pointer';
    this._slackPopupSprite.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      SFX.playClick();
      this.toggleSlackZoom();
    });
    this._slackPopupContainer.addChild(this._slackPopupSprite);

    this._slackSpriteMask = new Graphics();
    this._slackPopupContainer.addChild(this._slackSpriteMask);
    this._slackPopupSprite.mask = this._slackSpriteMask;

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
    this._currentSlackKey = null;
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
    this._slackMotionTimer = 0;
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

  /**
   * Real-time Voice Detection:
   * Returns true if any phrase is actively being spoken or sung at currentTime.
   */
  public isVoiceActive(currentTime: number): boolean {
    if (!this._cues || this._cues.length === 0) return false;
    for (let i = 0; i < this._cues.length; i++) {
      const c = this._cues[i];
      if (currentTime >= c.start && currentTime <= c.end) {
        return true;
      }
    }
    return false;
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
    this._karaokeContainerTargetAlpha = isKaraoke ? 1 : 0;
    this._karaokeContainerCurrentAlpha = isKaraoke ? 1 : 0;
    this._karaokeScreenContainer.alpha = this._karaokeContainerCurrentAlpha;
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
    const baseFontSize = isPortrait ? 18 : 20;
    const baseLineHeight = isPortrait ? 25 : 28;
    const panelW = isPortrait ? Math.min(this._screenWidth * 0.92, 420) : Math.min(460, Math.max(340, Math.round(this._screenWidth * 0.36)));
    const wrapWidth = panelW - 70 - 20;
    let curY = 16;

    cues.forEach((cue, index) => {
      const lineC = new Container();

      // Line number badge in retro terminal brackets style: [ 01 ]
      const numTxt = new Text({
        text: `[ ${(index + 1).toString().padStart(2, '0')} ]`,
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: 11,
          letterSpacing: 0.8,
          fill: '#007a6c',
        }),
      });
      numTxt.position.set(10, 10);
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
      noteIcon.position.set(54, 10);
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
      lyricTxt.position.set(70, 8);
      lineC.addChild(lyricTxt);

      // Dynamically calculate height based on verse lines to guarantee ZERO overlap
      const lineCount = cleanText.split('\n').length;
      const estimatedHeight = lineCount * baseLineHeight;
      const measuredHeight = (lyricTxt.height > 10) ? lyricTxt.height : estimatedHeight;
      const itemHeight = Math.ceil(measuredHeight) + 16;

      lineC.position.set(0, curY);
      this._karaokeListContainer.addChild(lineC);

      this._karaokeLines.push({
        container: lineC,
        text: lyricTxt,
        indexText: numTxt,
        noteIcon: noteIcon,
        cue: cue,
        baseY: curY,
        height: itemHeight,
      });

      curY += itemHeight + 12;
    });
  }

  private _relayoutKaraokeLines(panelW: number): void {
    if (this._karaokeLines.length === 0) return;
    const isPortrait = this._screenHeight > this._screenWidth;
    const baseFontSize = isPortrait ? 18 : 20;
    const baseLineHeight = isPortrait ? 25 : 28;
    const wrapWidth = panelW - 70 - 20;

    let curY = 16;
    for (const item of this._karaokeLines) {
      item.text.style.wordWrapWidth = wrapWidth;
      item.text.style.fontSize = baseFontSize;
      item.text.style.lineHeight = baseLineHeight;

      const cleanText = item.cue.text.replace(/^[♪\s]+/, '');
      const lineCount = cleanText.split('\n').length;
      const estimatedHeight = lineCount * baseLineHeight;
      const measuredHeight = (item.text.height > 10) ? item.text.height : estimatedHeight;
      const itemH = Math.ceil(measuredHeight) + 16;

      item.container.position.set(0, curY);
      item.baseY = curY;
      item.height = itemH;
      curY += itemH + 12;
    }
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
        } else {
          // Efficient, lag-free styling: Only updated on cue transitions!
          for (let i = 0; i < this._karaokeLines.length; i++) {
            const item = this._karaokeLines[i];
            if (i === this._currentCueIndex) {
              item.text.style.fill = '#00f5d4';
              item.text.alpha = 1.0;
              item.noteIcon.visible = true;
              item.indexText.style.fill = '#00f5d4';
              item.indexText.alpha = 1.0;
            } else if (i < this._currentCueIndex) {
              item.text.style.fill = '#005f54';
              item.text.alpha = 0.35;
              item.noteIcon.visible = false;
              item.indexText.style.fill = '#005f54';
              item.indexText.alpha = 0.35;
            } else {
              item.text.style.fill = '#007a6c';
              item.text.alpha = 0.55;
              item.noteIcon.visible = false;
              item.indexText.style.fill = '#007a6c';
              item.indexText.alpha = 0.55;
            }
          }
          this._karaokeActiveHighlight.clear();
        }
      }
    }

    if (this._isKaraoke && this._cues.length > 0) {
      const lastCue = this._cues[this._cues.length - 1];
      if (currentTime >= lastCue.end) {
        // Karaoke lyrics finished! Smoothly hide karaoke panel
        this._karaokeContainerTargetAlpha = 0;
      } else {
        this._karaokeContainerTargetAlpha = 1;
      }
    }

    const currentCue = this._cues[this._currentCueIndex];
    if (!currentCue) return;

    if (this._isKaraoke) {
      if (this._currentCueIndex < 0 || this._currentCueIndex >= this._karaokeLines.length) {
        this._karaokeActiveHighlight.clear();
        return;
      }

      const isPortrait = this._screenHeight > this._screenWidth;
      const panelY = isPortrait ? Math.max(20, Math.round(this._screenHeight * 0.32)) : 24;
      const panelH = this._screenHeight - panelY;
      const panelW = isPortrait ? Math.min(this._screenWidth * 0.92, 420) : Math.min(460, Math.max(340, Math.round(this._screenWidth * 0.36)));
      const targetFocusY = Math.round(panelH * 0.28);

      const activeItem = this._karaokeLines[this._currentCueIndex];
      let smoothLineY = activeItem ? activeItem.baseY : 0;

      if (activeItem) {
        const currentCue = this._cues[this._currentCueIndex];
        const nextItem = this._karaokeLines[this._currentCueIndex + 1];
        const nextCue = this._cues[this._currentCueIndex + 1];

        if (nextItem && currentCue) {
          const cueSpan = Math.max(0.4, (nextCue ? nextCue.start : currentCue.end) - currentCue.start);
          const progress = Math.max(0, Math.min(1, (currentTime - currentCue.start) / cueSpan));
          // Butter-smooth continuous crawl across line duration
          smoothLineY = activeItem.baseY + (nextItem.baseY - activeItem.baseY) * progress;
        } else if (currentCue && !nextItem) {
          // Final stanza and 16-second guitar outro: text slowly, continuously crawls upward like movie credits
          const extraTime = Math.max(0, currentTime - currentCue.start);
          smoothLineY = activeItem.baseY + extraTime * 28.0;
        }
      }

      this._karaokeTargetScrollY = targetFocusY - smoothLineY;

      // On large seek / scrub, snap immediately; on normal playback, glide smoothly
      if (Math.abs(this._karaokeTargetScrollY - this._karaokeCurrentScrollY) > 300) {
        this._karaokeCurrentScrollY = this._karaokeTargetScrollY;
      }

      
    } else {
      this._mainText.text = currentCue.text;
    }
  }

  public update(dt: number): void {
    this._cursorTimer += dt;

    // Smooth continuous crawling scroll of karaoke text list upward & alpha fade
    if (this._isKaraoke) {
      const lerpSpeed = Math.min(1, dt * 5.0);
      this._karaokeCurrentScrollY += (this._karaokeTargetScrollY - this._karaokeCurrentScrollY) * lerpSpeed;
      this._karaokeListContainer.y = this._karaokeCurrentScrollY;

      if (this._karaokeContainerCurrentAlpha !== this._karaokeContainerTargetAlpha) {
        const dAlpha = this._karaokeContainerTargetAlpha - this._karaokeContainerCurrentAlpha;
        const step = Math.sign(dAlpha) * Math.min(Math.abs(dAlpha), dt * 3.5);
        this._karaokeContainerCurrentAlpha += step;
        this._karaokeScreenContainer.alpha = this._karaokeContainerCurrentAlpha;
        this._karaokeScreenContainer.visible = this._karaokeContainerCurrentAlpha > 0.01;
      }
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

    // Smooth alpha fade & Ken Burns motion graphics for Slack screenshot popup
    if (this._slackPopupCurrentAlpha !== this._slackPopupTargetAlpha) {
      const dAlpha = this._slackPopupTargetAlpha - this._slackPopupCurrentAlpha;
      const step = Math.sign(dAlpha) * Math.min(Math.abs(dAlpha), dt * 4.5);
      this._slackPopupCurrentAlpha += step;
      this._slackPopupContainer.alpha = this._slackPopupCurrentAlpha;
      this._slackPopupContainer.visible = this._slackPopupCurrentAlpha > 0.01;
    }

    if (this._slackPopupContainer.visible) {
      if (!this._isSlackZoomed) {
        this._slackMotionTimer += dt;
        // Motion graphics: continuous subtle slow zoom from 1.00 to 1.045 over 8s
        const motionProgress = Math.min(1.0, this._slackMotionTimer / 8.0);
        const kenBurnsScale = 1.0 + 0.045 * (1 - Math.pow(1 - motionProgress, 1.5));

        // Smooth subtle drift: gentle rise + micro horizontal breathing
        const driftY = -Math.min(18, this._slackMotionTimer * 1.8);
        const driftX = Math.sin(this._slackMotionTimer * 0.35) * 4.0;

        const popScale = (0.97 + 0.03 * this._slackPopupCurrentAlpha) * kenBurnsScale;
        this._slackPopupContainer.scale.set(popScale);
        this._slackPopupContainer.position.set(this._slackBaseX + driftX, this._slackBaseY + driftY);
        this._slackPopupContainer.rotation = 0;
      } else {
        this._slackPopupContainer.scale.set(1.0);
        this._slackPopupContainer.position.set(this._slackBaseX, this._slackBaseY);
        this._slackPopupContainer.rotation = 0;
      }
    } else {
      this._slackMotionTimer = 0;
      this._slackPopupContainer.scale.set(0.97);
    }

    this._updateSlackProgressBar();
  }

  private _updateSlackPopup(cue: SubtitleCue): void {
    if (this._isKaraoke) {
      this.hideSlackPopup(true);
      return;
    }
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
      else if (t.includes('попровил') || t.includes('поправил')) sKey = '12_nick_time_machine';
      else if (t.includes('сундук') && (t.includes('яйцо') || t.includes('звук'))) sKey = '13_chest_egg_sound';
      else if (t.includes('чуяния ноль') || t.includes('было чуяния') || t.includes('павел, простите')) sKey = '14_feeling_zero';
    }

    if (sKey && hasTexture(sKey)) {
      if (this._currentSlackKey !== sKey) {
        this._currentSlackKey = sKey;
        this._slackHoldTimer = 7.0;
        this._slackMotionTimer = 0;
        this._isSlackDismissed = false;
        const tex = getTexture(sKey);
        this._slackPopupSprite.texture = tex;
        this._positionSlackPopup(tex);
        this._slackPopupTargetAlpha = 1.0;
      }
    } else {
      // Clean Picture Reveal: Immediately dismiss previous Slack popup when moving to next cue
      this._slackPopupTargetAlpha = 0;
      this._slackHoldTimer = 0;
      this._currentSlackKey = null;
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
      const maxH = h * 0.86;
      const scale = Math.min(maxW / tex.width, maxH / tex.height, 2.0);
      const imgW = Math.round(tex.width * scale);
      const imgH = Math.round(tex.height * scale);

      const modalX = Math.round(w / 2);
      const modalY = Math.round(h / 2);
      this._slackBaseX = modalX;
      this._slackBaseY = modalY;
      this._slackPopupContainer.position.set(modalX, modalY);

      const r = 10;
      this._slackSpriteMask.clear();
      this._slackSpriteMask.roundRect(-imgW / 2, -imgH / 2, imgW, imgH, r);
      this._slackSpriteMask.fill({ color: 0xffffff });
      this._slackPopupSprite.mask = this._slackSpriteMask;

      this._slackPopupSprite.width = imgW;
      this._slackPopupSprite.height = imgH;
      this._slackPopupSprite.position.set(-imgW / 2, -imgH / 2);

      this._slackPopupBg.clear();
      this._slackPopupBg.roundRect(-imgW / 2 - 8, -imgH / 2 - 8, imgW + 16, imgH + 16, r + 4);
      this._slackPopupBg.fill({ color: 0x000000, alpha: 0.60 });

      this._slackPopupTitleText.visible = false;
      this._slackZoomBtn.visible = false;
      this._slackCloseBtn.visible = false;
      this._slackProgressBar.visible = false;
    } else {
      // Minimalist larger display with subtle cinematic drop shadow and zero UI clutter
      const karaokeW = this._isKaraoke ? 460 : 0;
      const maxW = isPortrait
        ? Math.min(w * 0.94, 620)
        : (this._isKaraoke ? Math.min(w - karaokeW - 48, 760) : Math.min(w * 0.78, 920));
      const maxH = isPortrait ? Math.min(h * 0.46, 380) : Math.min(h * 0.58, 430);

      const scale = Math.min(maxW / tex.width, maxH / tex.height, 1.35);
      const imgW = Math.round(tex.width * scale);
      const imgH = Math.round(tex.height * scale);

      const modalX = (this._isKaraoke && !isPortrait)
        ? Math.round((w - karaokeW - 24) / 2)
        : Math.round(w / 2);
      const modalY = Math.round(h * 0.40);

      this._slackBaseX = modalX;
      this._slackBaseY = modalY;
      this._slackPopupContainer.position.set(modalX, modalY);

      const r = 8;
      this._slackSpriteMask.clear();
      this._slackSpriteMask.roundRect(-imgW / 2, -imgH / 2, imgW, imgH, r);
      this._slackSpriteMask.fill({ color: 0xffffff });
      this._slackPopupSprite.mask = this._slackSpriteMask;

      this._slackPopupSprite.width = imgW;
      this._slackPopupSprite.height = imgH;
      this._slackPopupSprite.position.set(-imgW / 2, -imgH / 2);

      // Clean diffused drop shadow beneath screenshot (NO frames, NO borders)
      this._slackPopupBg.clear();
      this._slackPopupBg.roundRect(-imgW / 2, -imgH / 2 + 4, imgW, imgH, r);
      this._slackPopupBg.fill({ color: 0x000000, alpha: 0.45 });

      this._slackPopupBg.roundRect(-imgW / 2 - 4, -imgH / 2 + 8, imgW + 8, imgH + 4, r + 2);
      this._slackPopupBg.fill({ color: 0x000000, alpha: 0.25 });

      this._slackPopupBg.roundRect(-imgW / 2 - 10, -imgH / 2 + 16, imgW + 20, imgH + 8, r + 4);
      this._slackPopupBg.fill({ color: 0x000000, alpha: 0.12 });

      // Clean minimalist: hide header, zoom, close, and progress bar
      this._slackPopupTitleText.visible = false;
      this._slackZoomBtn.visible = false;
      this._slackCloseBtn.visible = false;
      this._slackProgressBar.visible = false;
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
    const panelX = isPortrait ? (w - panelW) / 2 : w - panelW - 24;
    const panelY = isPortrait ? Math.max(20, Math.round(h * 0.32)) : 24;
    const panelH = h - panelY; // Clean rectangle extending all the way down to the bottom

    this._karaokeScreenContainer.position.set(panelX, panelY);

    // Clean black rectangle backdrop extending to bottom without strokes or rounded corners
    this._karaokePanelBg.clear();
    this._karaokePanelBg.rect(0, 0, panelW, panelH);
    this._karaokePanelBg.fill({ color: 0x000000, alpha: 0.88 });

    // Header is hidden for clean minimalist look per user request
    this._karaokeHeader.visible = false;

    // Mask for scrolling lines with bottom clearance above player bar
    const bottomClearance = Math.max(16, this._bottomOffset + 12);
    this._karaokeListMask.clear();
    this._karaokeListMask.rect(0, 16, panelW, Math.max(60, panelH - 16 - bottomClearance));
    this._karaokeListMask.fill({ color: 0xffffff });

    this._relayoutKaraokeLines(panelW);
  }

  public get currentCueIndex(): number {
    return this._currentCueIndex;
  }
}
