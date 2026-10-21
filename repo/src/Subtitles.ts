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

function matchWord(text: string, word: string): boolean {
  const re = new RegExp('(^|[^а-яёa-z0-9])' + word + '([^а-яёa-z0-9]|$)', 'i');
  return re.test(text);
}

export class Subtitles extends Container {
  // Dialogue Box HUD
  private _background: Graphics;
  private _frameGraphics: Graphics;
  private _badgeText: Text;
  private _counterText: Text;

  // Old-school RPG Avatar & Speaker Info (Left Side)
  private _avatarContainer: Container;
  private _avatarBoxBg: Graphics;
  private _avatarSprite: Sprite;
  private _avatarMask: Graphics;
  private _avatarBorder: Graphics;
  private _avatarPlaceholder: Container;
  private _speakerDeptText: Text;
  private _speakerNameText: Text;
  private _speakerRoleText: Text;

  // Speaker State & Persistence
  private _activeSpeakerProfile: SpeakerProfile | null = null;
  private _speakerCuesRemaining = 0;

  // Typewriter standard mode (Center Dialog Text)
  private _typewriterContainer: Container;
  private _mainText: Text;
  private _cursorText: Text;

  // Karaoke singing mode
  private _karaokeContainer: Container;
  private _karaokeBgText: Text;
  private _karaokeActiveContainer: Container;
  private _karaokeActiveText: Text;
  private _karaokeMask: Graphics;
  private _karaokeOrb: Graphics;
  private _karaokeNextText: Text;
  private _equalizerGraphics: Graphics;

  // Floating Slack Screenshot Modal (Upper-Middle Screen)
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

  // Controls & State
  private _prevPhraseBtn: Container;
  private _nextPhraseBtn: Container;

  private _cues: SubtitleCue[] = [];
  private _currentCueIndex = -1;
  private _hasFrame = false;
  private _isKaraoke = false;
  private _frameTitle = '';
  private _actId = '';
  private _cursorTimer = 0;
  private _forceRevealed = false;
  private _eqTimer = 0;

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

    // 1. FLOATING SLACK SCREENSHOT POPUP (placed in Subtitles so it floats above background)
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
      fontFamily: ['Orbitron', 'Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 2,
    });
    this._slackPopupTitleText = new Text({ text: '💬 СЛЕК-ДЕПЕША ЦИТАДЕЛИ: #VIZOR_PRODUCTION', style: slackTitleStyle });
    this._slackPopupTitleText.anchor.set(0, 0.5);
    this._slackPopupContainer.addChild(this._slackPopupTitleText);

    this._slackPopupSprite = new Sprite();
    this._slackPopupSprite.eventMode = 'static';
    this._slackPopupSprite.cursor = 'zoom-in';
    this._slackPopupSprite.on('pointerdown', (e) => {
      e.stopPropagation();
      ClickTracker.exclude();
      SFX.playClick();
      this.toggleSlackZoom();
    });
    this._slackPopupContainer.addChild(this._slackPopupSprite);

    // Zoom button [ 🔍 ZOOM / 100% ]
    this._slackZoomBtn = new Container();
    this._slackZoomBtn.eventMode = 'static';
    this._slackZoomBtn.cursor = 'pointer';
    const zoomBtnBg = new Graphics();
    this._slackZoomBtn.addChild(zoomBtnBg);
    this._slackZoomTxt = new Text({
      text: '🔍 ZOOM',
      style: new TextStyle({
        fontFamily: ['Orbitron', 'Share Tech Mono', 'sans-serif'],
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

    // Close button [ ✕ ЗАКРЫТЬ ]
    this._slackCloseBtn = new Container();
    this._slackCloseBtn.eventMode = 'static';
    this._slackCloseBtn.cursor = 'pointer';
    const closeBtnBg = new Graphics();
    this._slackCloseBtn.addChild(closeBtnBg);
    const closeBtnTxt = new Text({
      text: '✕ ЗАКРЫТЬ',
      style: new TextStyle({
        fontFamily: ['Orbitron', 'Share Tech Mono', 'sans-serif'],
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

    // Reading countdown progress bar
    this._slackProgressBar = new Graphics();
    this._slackPopupContainer.addChild(this._slackProgressBar);

    // 2. DIALOGUE BOX BACKDROP & FRAME
    this._background = new Graphics();
    this._frameGraphics = new Graphics();
    this.addChild(this._background);
    this.addChild(this._frameGraphics);

    const badgeStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 11,
      fontWeight: 'bold',
      fill: '#ffa800',
      letterSpacing: 2,
    });
    this._badgeText = new Text({ text: '', style: badgeStyle });
    this.addChild(this._badgeText);

    const counterStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 11,
      fill: '#717694',
    });
    this._counterText = new Text({ text: '', style: counterStyle });
    this.addChild(this._counterText);

    // 3. AVATAR & SPEAKER INFO (OLD-SCHOOL RPG HUD)
    this._avatarContainer = new Container();
    this.addChild(this._avatarContainer);

    this._avatarBoxBg = new Graphics();
    this._avatarContainer.addChild(this._avatarBoxBg);

    this._avatarSprite = new Sprite();
    this._avatarMask = new Graphics();
    this._avatarSprite.mask = this._avatarMask;
    this._avatarContainer.addChild(this._avatarSprite);
    this._avatarContainer.addChild(this._avatarMask);

    this._avatarPlaceholder = new Container();
    this._avatarContainer.addChild(this._avatarPlaceholder);

    const phGfx = new Graphics();
    phGfx.circle(48, 40, 24);
    phGfx.fill({ color: 0x141a2e, alpha: 0.9 });
    phGfx.circle(48, 40, 24);
    phGfx.stroke({ color: 0x00f5d4, width: 1.5, alpha: 0.7 });
    phGfx.roundRect(24, 70, 48, 22, 6);
    phGfx.fill({ color: 0x141a2e, alpha: 0.9 });
    phGfx.roundRect(24, 70, 48, 22, 6);
    phGfx.stroke({ color: 0x00f5d4, width: 1.5, alpha: 0.7 });
    this._avatarPlaceholder.addChild(phGfx);

    const phText = new Text({
      text: '🤖 VOX',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fill: '#00f5d4',
      }),
    });
    phText.anchor.set(0.5);
    phText.position.set(48, 40);
    this._avatarPlaceholder.addChild(phText);

    this._avatarBorder = new Graphics();
    this._avatarContainer.addChild(this._avatarBorder);

    // Department Badge Text
    const speakerDeptStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 1.5,
    });
    this._speakerDeptText = new Text({ text: '', style: speakerDeptStyle });
    this._speakerDeptText.visible = false;
    this.addChild(this._speakerDeptText);

    // Speaker Name Text
    const speakerNameStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 1.5,
      dropShadow: { alpha: 0.85, blur: 6, color: '#00f5d4', distance: 0 },
    });
    this._speakerNameText = new Text({ text: 'ИИ-ЛОРД', style: speakerNameStyle });
    this.addChild(this._speakerNameText);

    // Speaker Role Text
    const speakerRoleStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 11,
      fill: '#8c9eb8',
      letterSpacing: 0.5,
    });
    this._speakerRoleText = new Text({ text: '// ВЕРХОВНЫЙ ХРОНОМЕТРИСТ ЦИТАДЕЛИ', style: speakerRoleStyle });
    this.addChild(this._speakerRoleText);

    // 4. TYPEWRITER SPOKEN TEXT CONTAINER (CENTER ALIGNED)
    this._typewriterContainer = new Container();
    this.addChild(this._typewriterContainer);

    const textStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'Courier New', 'monospace', 'sans-serif'],
      fontSize: 16,
      fill: '#f0f4f8',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 700,
      lineHeight: 25,
      letterSpacing: 0.4,
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 2,
        blur: 4,
        color: '#000000',
        distance: 2,
      },
    });
    this._mainText = new Text({ text: '', style: textStyle });
    this._mainText.anchor.set(0.5, 0.5);
    this._typewriterContainer.addChild(this._mainText);

    const cursorStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 18,
      fill: '#ff5e1a',
      fontWeight: 'bold',
    });
    this._cursorText = new Text({ text: '▌', style: cursorStyle });
    this._cursorText.anchor.set(0, 0.5);
    this._typewriterContainer.addChild(this._cursorText);

    // 5. KARAOKE CONTAINER
    this._karaokeContainer = new Container();
    this.addChild(this._karaokeContainer);

    const karaokeBgStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'Share Tech Mono', 'sans-serif'],
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#3a506b',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 720,
      lineHeight: 25,
      letterSpacing: 1,
    });
    this._karaokeBgText = new Text({ text: '', style: karaokeBgStyle });
    this._karaokeBgText.anchor.set(0.5, 0.5);
    this._karaokeContainer.addChild(this._karaokeBgText);

    this._karaokeActiveContainer = new Container();
    this._karaokeContainer.addChild(this._karaokeActiveContainer);

    const karaokeActiveStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'Share Tech Mono', 'sans-serif'],
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffaa00',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 720,
      lineHeight: 25,
      letterSpacing: 1,
      stroke: { color: '#ff5e1a', width: 1.5 },
      dropShadow: {
        alpha: 1,
        blur: 10,
        color: '#ff5e1a',
        distance: 0,
      },
    });
    this._karaokeActiveText = new Text({ text: '', style: karaokeActiveStyle });
    this._karaokeActiveText.anchor.set(0.5, 0.5);
    this._karaokeActiveContainer.addChild(this._karaokeActiveText);

    this._karaokeMask = new Graphics();
    this._karaokeActiveContainer.mask = this._karaokeMask;
    this._karaokeContainer.addChild(this._karaokeMask);

    this._karaokeOrb = new Graphics();
    this._karaokeContainer.addChild(this._karaokeOrb);

    const nextStyle = new TextStyle({
      fontFamily: ['Inter', 'Share Tech Mono', 'sans-serif'],
      fontSize: 12,
      fontStyle: 'italic',
      fill: '#556580',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 720,
    });
    this._karaokeNextText = new Text({ text: '', style: nextStyle });
    this._karaokeNextText.anchor.set(0.5, 0.5);
    this._karaokeContainer.addChild(this._karaokeNextText);

    this._equalizerGraphics = new Graphics();
    this.addChild(this._equalizerGraphics);

    // 6. PHRASE NAVIGATOR BUTTONS
    this._prevPhraseBtn = this._createMiniBtn('⏮', () => this.previousPhrase());
    this._nextPhraseBtn = this._createMiniBtn('⏭', () => this.nextPhrase());
    this.addChild(this._prevPhraseBtn);
    this.addChild(this._nextPhraseBtn);

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
        fontFamily: ['Inter', 'sans-serif'],
        fontSize: 13,
        fill: '#ffffff',
      }),
    });
    txt.anchor.set(0.5);
    c.addChild(txt);

    const draw = (hover = false) => {
      bg.clear();
      bg.circle(0, 0, 14);
      bg.fill({ color: hover ? 0xff5e1a : 0x141826, alpha: 0.9 });
      bg.stroke({ color: hover ? 0xffa800 : 0x363e56, width: 1.2 });
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

  public setCues(cues: SubtitleCue[], hasDedicatedFrame: boolean, isKaraoke = false, frameTitle = '', actId = ''): void {
    this._cues = cues;
    this._currentCueIndex = -1;
    this._hasFrame = hasDedicatedFrame;
    this._isKaraoke = isKaraoke;
    this._frameTitle = frameTitle;
    this._actId = actId;
    this._forceRevealed = false;

    // Reset speaker state & slack modal
    this._activeSpeakerProfile = null;
    this._speakerCuesRemaining = 0;
    this._currentSlackKey = null;
    this._slackHoldTimer = 0;
    this._isSlackHovered = false;
    this._isSlackDismissed = false;
    this._isSlackZoomed = false;
    this._slackDimOverlay.visible = false;
    this._slackPopupTargetAlpha = 0;
    this._slackPopupCurrentAlpha = 0;
    this._slackPopupContainer.visible = false;

    this._typewriterContainer.visible = !isKaraoke;
    this._karaokeContainer.visible = isKaraoke;
    this._equalizerGraphics.visible = isKaraoke;

    this._mainText.text = '';
    this._karaokeBgText.text = '';
    this._karaokeActiveText.text = '';
    this._karaokeNextText.text = '';
    this._counterText.text = cues.length > 0 ? `1 / ${cues.length}` : '';

    this._redrawFrame();
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

    // Direct match with lead-in window
    for (let i = 0; i < this._cues.length; i++) {
      const c = this._cues[i];
      if (currentTime >= c.start - LEAD_IN && currentTime < c.end) {
        cueIndex = i;
        break;
      }
    }

    // Continuous bridge between cues
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

    // Fallback boundary
    if (cueIndex === -1) {
      if (currentTime >= this._cues[this._cues.length - 1].end) {
        cueIndex = this._cues.length - 1;
      } else if (currentTime < this._cues[0].start - LEAD_IN) {
        cueIndex = 0;
      }
    }

    if (cueIndex !== this._currentCueIndex) {
      this._currentCueIndex = cueIndex;
      this._forceRevealed = false;
      this._counterText.text = `${cueIndex + 1} / ${this._cues.length}`;

      const cue = this._cues[cueIndex];
      if (cue) {
        this._updateSpeakerAndAvatar(cue);
        this._updateSlackPopup(cue);

        if (this._isKaraoke) {
          this._karaokeBgText.text = cue.text;
          this._karaokeActiveText.text = cue.text;
          if (cueIndex + 1 < this._cues.length) {
            this._karaokeNextText.text = `Далее: "${this._cues[cueIndex + 1].text}"`;
          } else {
            this._karaokeNextText.text = '';
          }
        } else {
          // Standard movie subtitle style: FULL PHRASE CENTERED
          this._mainText.text = cue.text;
        }
      }
    }

    const currentCue = this._cues[this._currentCueIndex];
    if (!currentCue) return;

    const duration = Math.max(0.4, currentCue.end - currentCue.start);
    const elapsed = Math.max(0, currentTime - currentCue.start);
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    if (this._isKaraoke) {
      // KARAOKE FILLING LOGIC
      const textBounds = this._karaokeBgText.bounds;
      const maskW = this._forceRevealed ? textBounds.width : textBounds.width * progress;

      this._karaokeMask.clear();
      this._karaokeMask.rect(textBounds.x - 4, textBounds.y - 8, maskW + 4, textBounds.height + 16);
      this._karaokeMask.fill({ color: 0xffffff });

      const orbX = textBounds.x + maskW;
      const wordBounce = Math.abs(Math.sin(progress * 12 * Math.PI)) * 8;
      const orbY = textBounds.y - 10 - wordBounce;

      this._karaokeOrb.clear();
      this._karaokeOrb.circle(orbX, orbY, 6);
      this._karaokeOrb.fill({ color: 0x00f5d4 });
      this._karaokeOrb.circle(orbX, orbY, 9);
      this._karaokeOrb.stroke({ color: 0xffaa00, width: 1.5, alpha: 0.8 });
    } else {
      this._mainText.text = currentCue.text;
      const textBounds = this._mainText.bounds;
      this._cursorText.position.set(
        this._mainText.x + textBounds.width / 2 + 4,
        this._mainText.y
      );
    }
  }

  private _getDefaultSpeaker(cue?: SubtitleCue): SpeakerProfile {
    if (this._isKaraoke) {
      const isPeak = cue && cue.start >= 165.9;
      return {
        name: isPeak ? 'ИИ-ЛОРД [ ЯРОСТНЫЙ ПИК ]' : 'ИИ-ЛОРД НА БИТЕ',
        role: isPeak ? 'ДИКИЙ СОЛЯК // ПАРАД ФАКАПОВ' : 'СУПЕР-ТРЕК // ГИМН КОВЧЕГА',
        dept: '[ 🎵 ВОКАЛЬНЫЙ ТАКТИТРОН ]',
        themeColor: isPeak ? 0xff3b30 : 0x00f5d4,
        avatarKey: isPeak ? 'ai_lord_drive_default' : 'ai_lord_calm_singing',
        slackKey: null,
      };
    }
    return {
      name: 'ИИ-ЛОРД',
      role: 'ВЕРХОВНЫЙ ХРОНОМЕТРИСТ ЦИТАДЕЛИ',
      dept: '[ 🤖 СИСТЕМНЫЙ ВОКС-ТЕРМИНАЛ ]',
      themeColor: 0x36C5F0,
      avatarKey: 'ai_lord',
      slackKey: null,
    };
  }

  private _matchCharacterProfile(cue: SubtitleCue): SpeakerProfile | null {
    // Pure narration acts are 100% AI Lord, no rogue character popups or slack screenshots
    const pureNarratorActs = [
      'intro_playbox',
      'prologue_space',
      'act_1_convent',
      'act_6_punishment',
      'act_8_outro',
    ];
    if (pureNarratorActs.includes(this._actId)) {
      return null;
    }

    const t = cue.text.toLowerCase();

    // Explicit Slack quote triggers: ONLY trigger modal when actual Slack text/phrase is cited
    let sKey: string | null = cue.slackScreenshotKey || null;
    if (!sKey) {
      if (t.includes('jnghfdbk') || t.includes('джеков дбк')) sKey = '01_jnghfdbk';
      else if (t.includes('демоблил')) sKey = '02_demoblil';
      else if (t.includes('130 секунд') || t.includes('сто тридцать ночей') || (t.includes('томится') && t.includes('дисней'))) sKey = '03_disney_long_box';
      else if (t.includes('забанили клод') || t.includes('забанили claude')) sKey = '04_claude_banned';
      else if (t.includes('одиннадцать правок') || t.includes('11 правок')) sKey = '05_edik_11_points';
      else if (t.includes('палатк')) sKey = '06_tent_brother';
      else if (t.includes('лазер') && (t.includes('коров') || t.includes('вымен') || t.includes('вымя'))) sKey = '07_cow_laser';
      else if (t.includes('mavis') && t.includes('leg')) sKey = '08_mavis_legs';
      else if (t.includes('трипл') || t.includes('3а') || t.includes('3a')) sKey = '09_danial_3a_project';
      else if (t.includes('пирамид') && (t.includes('артём') || t.includes('артем') || t.includes('костей'))) sKey = '10_pyramids_museum';
      else if (t.includes('машин') && t.includes('времен')) sKey = '12_nick_time_machine';
      else if (t.includes('сундук') && (t.includes('яйца') || t.includes('яиц'))) sKey = '13_chest_egg_sound';
      else if (t.includes('филинга ноль') || t.includes('ноль филинга') || t.includes('филинг, механику')) sKey = '14_feeling_zero';
    }

    // 1. Explicit metadata in cue
    if (cue.speaker) {
      const s = cue.speaker.toLowerCase();
      if (s.includes('горин') || s.includes('алексей')) {
        return {
          name: 'АЛЕКСЕЙ ГОРИН',
          role: cue.speakerRole || 'Head of Production • Верховный Надзиратель',
          dept: '[ 👑 РУКОВОДСТВО ПРОДАКШЕНА ]',
          themeColor: 0xffaa00,
          avatarKey: cue.avatarKey || 'avatar_gorin',
          slackKey: sKey,
        };
      }
      if (s.includes('эдик') || s.includes('левин') || s.includes('эдуард')) {
        return {
          name: 'ЭДУАРД ЛЕВИН',
          role: cue.speakerRole || 'Creative Lead • Зодчий Игрового Замысла',
          dept: '[ 🎨 КРЕАТИВ & РЕЖИССУРА ]',
          themeColor: 0xff3366,
          avatarKey: cue.avatarKey || 'avatar_eduard',
          slackKey: sKey,
        };
      }
      if (s.includes('самойленко') || s.includes('павел') || s.includes('паша')) {
        return {
          name: 'ПАВЕЛ САМОЙЛЕНКО',
          role: cue.speakerRole || 'CTO • Архи-Цензор Синтаксической Ереси',
          dept: '[ ⚙️ ТЕХНИЧЕСКИЙ ДИРЕКТОРАТ ]',
          themeColor: 0x00f5d4,
          avatarKey: cue.avatarKey || 'avatar_pavel',
          slackKey: sKey,
        };
      }
      if (s.includes('хухро') || s.includes('артём') || s.includes('артем')) {
        return {
          name: 'АРТЁМ ХУХРО',
          role: cue.speakerRole || 'Lead 3D • Техноэкзорцист Графической Скверны',
          dept: '[ 👁️ 3D & CGI ДЕПАРТАМЕНТ ]',
          themeColor: 0x9d4edd,
          avatarKey: cue.avatarKey || 'avatar_huhro',
          slackKey: sKey,
        };
      }
      if (s.includes('ева') || s.includes('аксёнова') || s.includes('аксенова')) {
        return {
          name: 'ЕВА АКСЁНОВА',
          role: cue.speakerRole || 'Project Lead • Хранительница Скрижалей',
          dept: '[ 📋 ПРОДЖЕКТ МЕНЕДЖМЕНТ ]',
          themeColor: 0xff70a6,
          avatarKey: cue.avatarKey || 'avatar_eva',
          slackKey: sKey,
        };
      }
      if (s.includes('толя') || s.includes('щербаков')) {
        return {
          name: 'ТОЛЯ ЩЕРБАКОВ',
          role: cue.speakerRole || 'CEO / Founder • Лорд-Командор Цитадели',
          dept: '[ ⚡ ВЫСШИЙ СОВЕТ ЦИТАДЕЛИ ]',
          themeColor: 0xffd166,
          avatarKey: cue.avatarKey || 'avatar_toly',
          slackKey: sKey,
        };
      }
      if (s.includes('мамусин') || s.includes('максим')) {
        return {
          name: 'МАКСИМ МАМУСИН',
          role: cue.speakerRole || 'Tech Lead • Архи-Техномагистр Канона',
          dept: '[ ⚙️ ТЕХНИЧЕСКИЙ ДЕПАРТАМЕНТ ]',
          themeColor: 0x48cae4,
          avatarKey: cue.avatarKey || 'avatar_mamusin',
          slackKey: sKey,
        };
      }
      if (s.includes('вика') || s.includes('фесенко')) {
        return {
          name: 'ВИКТОРИЯ ФЕСЕНКО',
          role: cue.speakerRole || 'Art Director • Верховная Настоятельница',
          dept: '[ 🖌️ АРТ ДИРЕКЦИЯ ]',
          themeColor: 0xf72585,
          avatarKey: cue.avatarKey || 'avatar_vika',
          slackKey: sKey,
        };
      }
      if (s.includes('женя') || s.includes('руб')) {
        return {
          name: 'ЖЕНЯ РУБ',
          role: cue.speakerRole || '2D Artist • Мастер Вечного Рендера',
          dept: '[ 🖼️ 2D КОНЦЕПТ-АРТ ]',
          themeColor: 0x7209b7,
          avatarKey: cue.avatarKey || 'avatar_zhenya',
          slackKey: sKey,
        };
      }
      if (s.includes('давит') || s.includes('газарян')) {
        return {
          name: 'ДАВИТ ГАЗАРЯН',
          role: cue.speakerRole || 'Playable Developer • Архи-Механик Рантайма',
          dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
          themeColor: 0x06d6a0,
          avatarKey: cue.avatarKey || 'avatar_davit',
          slackKey: sKey,
        };
      }
      if (s.includes('панков')) {
        return {
          name: 'АЛЕКСАНДР ПАНКОВ',
          role: cue.speakerRole || 'Playable Developer • Квантовый Клик',
          dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
          themeColor: 0x118ab2,
          avatarKey: cue.avatarKey || 'avatar_pankov',
          slackKey: sKey,
        };
      }
      if (s.includes('ник') || s.includes('егоров')) {
        return {
          name: 'НИК ЕГОРОВ',
          role: cue.speakerRole || 'Playable Developer • Властелин Таймлайна',
          dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
          themeColor: 0x00b4d8,
          avatarKey: cue.avatarKey || 'avatar_egor',
          slackKey: sKey,
        };
      }
      if (s.includes('даниал') || s.includes('искаков')) {
        return {
          name: 'ДАНИАЛ ИСКАКОВ',
          role: cue.speakerRole || 'Playable Developer • Кузнец Троичного Кода',
          dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
          themeColor: 0x00f5d4,
          avatarKey: cue.avatarKey || 'avatar_hoodie',
          slackKey: sKey,
        };
      }
      if (s.includes('клиент') || s.includes('royal')) {
        return {
          name: cue.speaker.toUpperCase(),
          role: cue.speakerRole || 'Владыка Правок и 50-и Итераций',
          dept: '[ ⚠️ ВНЕХНИЙ ЗАКАЗЧИК ]',
          themeColor: 0xef233c,
          avatarKey: cue.avatarKey || 'robot_king',
          slackKey: sKey,
        };
      }
      return {
        name: cue.speaker.toUpperCase(),
        role: cue.speakerRole || '',
        dept: '[ 👥 КОМАНДА ЦИТАДЕЛИ ]',
        themeColor: 0x00f5d4,
        avatarKey: cue.avatarKey || 'avatar_gorin',
        slackKey: sKey,
      };
    }

    // 2. Strict whole-word matching in dialog / lyrics
    if (matchWord(t, 'горин') || matchWord(t, 'горину') || matchWord(t, 'горина') || matchWord(t, 'гарин') || sKey === '01_jnghfdbk' || sKey === '02_demoblil') {
      return {
        name: 'АЛЕКСЕЙ ГОРИН',
        role: 'Head of Production • Верховный Надзиратель',
        dept: '[ 👑 РУКОВОДСТВО ПРОДАКШЕНА ]',
        themeColor: 0xffaa00,
        avatarKey: 'avatar_gorin',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'эдик') || matchWord(t, 'эдика') || matchWord(t, 'эдику') || matchWord(t, 'левин') || sKey === '05_edik_11_points' || sKey === '13_chest_egg_sound') {
      return {
        name: 'ЭДУАРД ЛЕВИН',
        role: 'Creative Lead • Зодчий Игрового Замысла',
        dept: '[ 🎨 КРЕАТИВ & РЕЖИССУРА ]',
        themeColor: 0xff3366,
        avatarKey: 'avatar_eduard',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'самойленко') || matchWord(t, 'павел') || matchWord(t, 'паша') || matchWord(t, 'техлид') || sKey === '04_claude_banned') {
      return {
        name: 'ПАВЕЛ САМОЙЛЕНКО',
        role: 'CTO • Архи-Цензор Синтаксической Ереси',
        dept: '[ ⚙️ ТЕХНИЧЕСКИЙ ДИРЕКТОРАТ ]',
        themeColor: 0x00f5d4,
        avatarKey: 'avatar_pavel',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'хухро') || matchWord(t, 'хухра') || matchWord(t, 'артём') || matchWord(t, 'артем') || sKey === '10_pyramids_museum') {
      return {
        name: 'АРТЁМ ХУХРО',
        role: 'Lead 3D • Техноэкзорцист Графической Скверны',
        dept: '[ 👁️ 3D & CGI ДЕПАРТАМЕНТ ]',
        themeColor: 0x9d4edd,
        avatarKey: 'avatar_huhro',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'ева') || matchWord(t, 'евы') || matchWord(t, 'еве') || matchWord(t, 'еву') || matchWord(t, 'аксёнова') || matchWord(t, 'аксенова') || sKey === '11_eva_kickoff') {
      return {
        name: 'ЕВА АКСЁНОВА',
        role: 'Project Lead • Хранительница Скрижалей',
        dept: '[ 📋 ПРОДЖЕКТ МЕНЕДЖМЕНТ ]',
        themeColor: 0xff70a6,
        avatarKey: 'avatar_eva',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'толя') || matchWord(t, 'толи') || matchWord(t, 'толю') || matchWord(t, 'щербаков') || t.includes('сотку')) {
      return {
        name: 'ТОЛЯ ЩЕРБАКОВ',
        role: 'CEO / Founder • Лорд-Командор Цитадели',
        dept: '[ ⚡ ВЫСШИЙ СОВЕТ ЦИТАДЕЛИ ]',
        themeColor: 0xffd166,
        avatarKey: 'avatar_toly',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'мамусин') || matchWord(t, 'мамусина') || matchWord(t, 'мамусину')) {
      return {
        name: 'МАКСИМ МАМУСИН',
        role: 'Tech Lead • Архи-Техномагистр Канона',
        dept: '[ ⚙️ ТЕХНИЧЕСКИЙ ДЕПАРТАМЕНТ ]',
        themeColor: 0x48cae4,
        avatarKey: 'avatar_mamusin',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'вика') || matchWord(t, 'вики') || matchWord(t, 'вике') || matchWord(t, 'фесенко')) {
      return {
        name: 'ВИКТОРИЯ ФЕСЕНКО',
        role: 'Art Director • Верховная Настоятельница',
        dept: '[ 🖌️ АРТ ДИРЕКЦИЯ ]',
        themeColor: 0xf72585,
        avatarKey: 'avatar_vika',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'женя') || matchWord(t, 'жени') || matchWord(t, 'жене') || matchWord(t, 'руб')) {
      return {
        name: 'ЖЕНЯ РУБ',
        role: '2D Artist • Мастер Вечного Рендера',
        dept: '[ 🖼️ 2D КОНЦЕПТ-АРТ ]',
        themeColor: 0x7209b7,
        avatarKey: 'avatar_zhenya',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'давит') || matchWord(t, 'давита') || matchWord(t, 'газарян')) {
      return {
        name: 'ДАВИТ ГАЗАРЯН',
        role: 'Playable Developer • Архи-Механик Рантайма',
        dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
        themeColor: 0x06d6a0,
        avatarKey: 'avatar_davit',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'панков') || matchWord(t, 'панкова')) {
      return {
        name: 'АЛЕКСАНДР ПАНКОВ',
        role: 'Playable Developer • Квантовый Клик',
        dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
        themeColor: 0x118ab2,
        avatarKey: 'avatar_pankov',
        slackKey: sKey,
      };
    }

    if (t.includes('нику егорову') || t.includes('ник егоров') || matchWord(t, 'егор') || sKey === '12_nick_time_machine') {
      return {
        name: 'НИК ЕГОРОВ',
        role: 'Playable Developer • Властелин Таймлайна',
        dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
        themeColor: 0x00b4d8,
        avatarKey: 'avatar_egor',
        slackKey: sKey,
      };
    }

    if (matchWord(t, 'даниал') || sKey === '09_danial_3a_project') {
      return {
        name: 'ДАНИАЛ ИСКАКОВ',
        role: 'Playable Developer • Кузнец Троичного Кода',
        dept: '[ 💻 РАЗРАБОТКА ИНТЕРАКТИВОВ ]',
        themeColor: 0x00f5d4,
        avatarKey: 'avatar_hoodie',
        slackKey: sKey,
      };
    }

    if (sKey === '08_mavis_legs' || sKey === '14_feeling_zero' || sKey === '07_cow_laser' || sKey === '03_disney_long_box') {
      return {
        name: 'КЛИЕНТАРХ ЦИТАДЕЛИ',
        role: 'Владыка 50-и Итераций и Ночных Правок',
        dept: '[ ⚠️ ВНЕШНИЙ ЗАКАЗЧИК ]',
        themeColor: 0xef233c,
        avatarKey: 'robot_king',
        slackKey: sKey,
      };
    }

    return null;
  }

  private _updateSpeakerAndAvatar(cue: SubtitleCue): void {
    const matched = this._matchCharacterProfile(cue);
    if (matched) {
      this._activeSpeakerProfile = matched;
      this._speakerCuesRemaining = 2; // Persist for 2 consecutive dialog phrases
    } else if (this._speakerCuesRemaining > 0 && this._activeSpeakerProfile) {
      this._speakerCuesRemaining--;
      // Keep avatar and name, but decouple slackKey so Slack screenshot modal doesn't bleed into next cues!
      this._activeSpeakerProfile = {
        ...this._activeSpeakerProfile,
        slackKey: null,
      };
    } else {
      this._activeSpeakerProfile = this._getDefaultSpeaker(cue);
    }

    const speaker = this._activeSpeakerProfile;
    this._speakerDeptText.text = '';
    this._speakerDeptText.visible = false;

    this._speakerNameText.text = speaker.name;
    this._speakerNameText.style.fill = '#' + speaker.themeColor.toString(16).padStart(6, '0');
    (this._speakerNameText.style as any).dropShadow = {
      alpha: 0.85,
      blur: 8,
      color: '#' + speaker.themeColor.toString(16).padStart(6, '0'),
      distance: 0,
    };

    this._speakerRoleText.text = speaker.role ? `// ${speaker.role}` : '';

    const avatarTex = getTexture(speaker.avatarKey);
    const hasRealTex = avatarTex && avatarTex !== Texture.WHITE && avatarTex.width > 1;

    const isPortrait = this._screenHeight > this._screenWidth;
    const avatarSize = isPortrait ? 76 : 96;

    if (hasRealTex) {
      this._avatarSprite.texture = avatarTex;
      this._avatarSprite.visible = true;
      this._avatarPlaceholder.visible = false;
      this._avatarSprite.width = avatarSize;
      this._avatarSprite.height = avatarSize;
    } else {
      this._avatarSprite.visible = false;
      this._avatarPlaceholder.visible = true;
    }

    this._redrawAvatarBorder(speaker.themeColor);
  }

  private _redrawAvatarBorder(color: number): void {
    const isPortrait = this._screenHeight > this._screenWidth;
    const avatarSize = isPortrait ? 76 : 96;

    this._avatarBorder.clear();
    this._avatarBorder.roundRect(0, 0, avatarSize, avatarSize, 8);
    this._avatarBorder.stroke({ color: color, width: 2.0, alpha: 0.9 });

    // Avatar corner ticks
    const aTick = 12;
    this._avatarBorder.moveTo(0, aTick);
    this._avatarBorder.lineTo(0, 0);
    this._avatarBorder.lineTo(aTick, 0);
    this._avatarBorder.stroke({ color: 0xffffff, width: 2.5 });

    this._avatarBorder.moveTo(avatarSize - aTick, avatarSize);
    this._avatarBorder.lineTo(avatarSize, avatarSize);
    this._avatarBorder.lineTo(avatarSize, avatarSize - aTick);
    this._avatarBorder.stroke({ color: 0xffffff, width: 2.5 });
  }

  public toggleSlackZoom(): void {
    this._isSlackZoomed = !this._isSlackZoomed;
    this._slackPopupSprite.cursor = this._isSlackZoomed ? 'zoom-out' : 'zoom-in';
    this._slackZoomTxt.text = this._isSlackZoomed ? '✕ МЕНЬШЕ' : '🔍 ZOOM';
    if (this._slackPopupSprite.texture && this._slackPopupSprite.texture !== Texture.WHITE) {
      this._positionSlackPopup(this._slackPopupSprite.texture);
    }
  }

  private _positionSlackPopup(tex: Texture): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    // Available space above subtitles
    const boxH = this._hasFrame ? (isPortrait ? 180 : 155) : (isPortrait ? 150 : 135);
    const boxY = h - boxH - (isPortrait ? 85 : 55);
    const topBarY = 46;
    const availH = Math.max(340, boxY - topBarY - 20);

    let maxW: number;
    let maxH: number;

    if (this._isSlackZoomed) {
      maxW = Math.min(w * 0.96, 1400);
      maxH = Math.min(h * 0.92, 980);
      this._slackDimOverlay.clear();
      this._slackDimOverlay.rect(0, 0, w, h);
      this._slackDimOverlay.fill({ color: 0x03050c, alpha: 0.85 });
      this._slackDimOverlay.visible = true;
    } else {
      maxW = isPortrait ? Math.min(w * 0.94, 680) : Math.min(w * 0.90, 1150);
      maxH = isPortrait ? Math.min(availH, h * 0.65) : Math.min(availH, 720);
      this._slackDimOverlay.visible = false;
    }

    const natW = tex.width || 800;
    const natH = tex.height || 600;
    const scale = Math.min(maxW / natW, maxH / natH);
    const spW = Math.round(natW * scale);
    const spH = Math.round(natH * scale);

    this._slackPopupSprite.width = spW;
    this._slackPopupSprite.height = spH;
    this._slackPopupSprite.position.set(-spW / 2, -spH / 2 + 16);

    const pad = 12;
    const cardW = spW + pad * 2;
    const cardH = spH + pad * 2 + 34;

    this._slackPopupBg.clear();
    this._slackPopupBg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    this._slackPopupBg.fill({ color: 0x070b16, alpha: 0.97 });
    this._slackPopupBg.stroke({ color: this._isSlackZoomed ? 0x00f5d4 : 0x36C5F0, width: 2.2, alpha: 0.95 });

    // Corner tech brackets
    const bLen = 18;
    const bracketColor = this._isSlackZoomed ? 0xffaa00 : 0x00f5d4;

    this._slackPopupBg.moveTo(-cardW / 2 + bLen, -cardH / 2);
    this._slackPopupBg.lineTo(-cardW / 2, -cardH / 2);
    this._slackPopupBg.lineTo(-cardW / 2, -cardH / 2 + bLen);
    this._slackPopupBg.stroke({ color: bracketColor, width: 3.5 });

    this._slackPopupBg.moveTo(cardW / 2 - bLen, -cardH / 2);
    this._slackPopupBg.lineTo(cardW / 2, -cardH / 2);
    this._slackPopupBg.lineTo(cardW / 2, -cardH / 2 + bLen);
    this._slackPopupBg.stroke({ color: bracketColor, width: 3.5 });

    this._slackPopupBg.moveTo(-cardW / 2 + bLen, cardH / 2);
    this._slackPopupBg.lineTo(-cardW / 2, cardH / 2);
    this._slackPopupBg.lineTo(-cardW / 2, cardH / 2 - bLen);
    this._slackPopupBg.stroke({ color: bracketColor, width: 3.5 });

    this._slackPopupBg.moveTo(cardW / 2 - bLen, cardH / 2);
    this._slackPopupBg.lineTo(cardW / 2, cardH / 2);
    this._slackPopupBg.lineTo(cardW / 2, cardH / 2 - bLen);
    this._slackPopupBg.stroke({ color: bracketColor, width: 3.5 });

    this._slackPopupTitleText.position.set(-cardW / 2 + 20, -cardH / 2 + 17);
    this._slackCloseBtn.position.set(cardW / 2 - 48, -cardH / 2 + 17);
    this._slackZoomBtn.position.set(cardW / 2 - 138, -cardH / 2 + 17);

    if (this._isSlackZoomed) {
      this._slackPopupContainer.position.set(w / 2, h / 2);
    } else {
      const centerY = topBarY + (availH / 2);
      this._slackPopupContainer.position.set(w / 2, centerY);
    }

    this._updateSlackProgressBar();
  }

  private _updateSlackProgressBar(): void {
    if (!this._slackPopupSprite.texture) return;
    const cardW = this._slackPopupSprite.width + 24;
    const cardH = this._slackPopupSprite.height + 24 + 34;
    const progress = Math.max(0, Math.min(1, this._slackHoldTimer / 12.0));

    this._slackProgressBar.clear();
    // Background slot
    this._slackProgressBar.roundRect(-cardW / 2 + 12, cardH / 2 - 8, cardW - 24, 3, 1.5);
    this._slackProgressBar.fill({ color: 0x1f2336, alpha: 0.8 });

    // Active fill
    const fillW = (cardW - 24) * progress;
    if (fillW > 0) {
      this._slackProgressBar.roundRect(-cardW / 2 + 12, cardH / 2 - 8, fillW, 3, 1.5);
      this._slackProgressBar.fill({ color: this._isSlackHovered ? 0xffaa00 : 0x00f5d4, alpha: 0.9 });
    }
  }

  private _updateSlackPopup(cue: SubtitleCue): void {
    const pureNarratorActs = [
      'intro_playbox',
      'prologue_space',
      'act_1_convent',
      'act_6_punishment',
      'act_8_outro',
    ];
    if (pureNarratorActs.includes(this._actId)) {
      this._slackPopupTargetAlpha = 0;
      this._slackHoldTimer = 0;
      return;
    }

    const slackKey = cue.slackScreenshotKey || (this._activeSpeakerProfile ? this._activeSpeakerProfile.slackKey : null);

    if (slackKey && hasTexture(slackKey)) {
      if (this._currentSlackKey !== slackKey || this._slackHoldTimer <= 0) {
        this._currentSlackKey = slackKey;
        this._slackHoldTimer = 12.0; // Stay visible for at least 12 seconds so viewer can read the chat!
        this._isSlackDismissed = false;

        const tex = getTexture(slackKey);
        this._slackPopupSprite.texture = tex;
        this._positionSlackPopup(tex);
      }
      this._slackPopupTargetAlpha = 1.0;
    } else {
      if (this._slackHoldTimer <= 0 || this._isSlackDismissed) {
        this._slackPopupTargetAlpha = 0;
      }
    }
  }

  public update(dt: number): void {
    this._cursorTimer += dt;
    this._cursorText.visible = Math.floor(this._cursorTimer * 3.5) % 2 === 0;

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
      this._updateSlackProgressBar();
    }

    // Smooth Slack Popup transition
    const lerpSpeed = dt * 10;
    this._slackPopupCurrentAlpha += (this._slackPopupTargetAlpha - this._slackPopupCurrentAlpha) * Math.min(1, lerpSpeed);
    this._slackPopupContainer.alpha = this._slackPopupCurrentAlpha;
    this._slackPopupContainer.visible = this._slackPopupCurrentAlpha > 0.02;
    const popScale = 0.95 + 0.05 * this._slackPopupCurrentAlpha;
    this._slackPopupContainer.scale.set(popScale);

    // Animated Karaoke Equalizer
    if (this._isKaraoke && this._equalizerGraphics.visible) {
      this._eqTimer += dt * 8;
      this._equalizerGraphics.clear();
      const numBars = 8;
      const barW = 3.5;
      const spacing = 3;
      const startX = this._badgeText.x + this._badgeText.bounds.width + 20;
      const baseEndY = this._badgeText.y + 12;

      for (let i = 0; i < numBars; i++) {
        const barH = 4 + Math.abs(Math.sin(this._eqTimer + i * 1.3)) * 14;
        this._equalizerGraphics.rect(startX + i * (barW + spacing), baseEndY - barH, barW, barH);
        this._equalizerGraphics.fill({ color: i % 2 === 0 ? 0x00f5d4 : 0xff5e1a });
      }
    }
  }

  public nextPhrase(): void {
    if (this._currentCueIndex + 1 < this._cues.length) {
      const nextCue = this._cues[this._currentCueIndex + 1];
      this._forceRevealed = false;
      this.onSeekRequested?.(nextCue.start);
    }
  }

  public previousPhrase(): void {
    if (this._currentCueIndex > 0) {
      const prevCue = this._cues[this._currentCueIndex - 1];
      this._forceRevealed = false;
      this.onSeekRequested?.(prevCue.start);
    } else if (this._cues.length > 0) {
      this.onSeekRequested?.(this._cues[0].start);
    }
  }

  public resize(w: number, h: number): void {
    this._screenWidth = w;
    this._screenHeight = h;
    this._redrawFrame();
    if (this._slackPopupSprite.texture && this._slackPopupSprite.texture !== Texture.WHITE && this._slackPopupCurrentAlpha > 0.02) {
      this._positionSlackPopup(this._slackPopupSprite.texture);
    }
  }

  private _redrawFrame(): void {
    this._background.clear();
    this._frameGraphics.clear();

    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    // Dialogue Box Bounds
    const boxW = Math.min(w * 0.94, isPortrait ? 540 : 1060);
    const boxH = this._hasFrame ? (isPortrait ? 180 : 155) : (isPortrait ? 150 : 135);
    const boxX = (w - boxW) / 2;
    const boxY = h - boxH - (isPortrait ? 85 : 55);

    // 1. Dialogue Box Background & Border
    this._background.roundRect(boxX, boxY, boxW, boxH, 12);
    this._background.fill({ color: 0x070912, alpha: 0.94 });

    this._frameGraphics.roundRect(boxX, boxY, boxW, boxH, 12);
    this._frameGraphics.stroke({ color: this._isKaraoke ? 0x00f5d4 : 0xff5e1a, width: 2.0, alpha: 0.85 });

    // Corner tech brackets
    const bLen = 20;
    const cornerColor = this._isKaraoke ? 0xffaa00 : 0x00f5d4;

    this._frameGraphics.moveTo(boxX + bLen, boxY);
    this._frameGraphics.lineTo(boxX, boxY);
    this._frameGraphics.lineTo(boxX, boxY + bLen);
    this._frameGraphics.stroke({ color: cornerColor, width: 3.5 });

    this._frameGraphics.moveTo(boxX + boxW - bLen, boxY);
    this._frameGraphics.lineTo(boxX + boxW, boxY);
    this._frameGraphics.lineTo(boxX + boxW, boxY + bLen);
    this._frameGraphics.stroke({ color: cornerColor, width: 3.5 });

    this._frameGraphics.moveTo(boxX, boxY + boxH - bLen);
    this._frameGraphics.lineTo(boxX, boxY + boxH);
    this._frameGraphics.lineTo(boxX + bLen, boxY + boxH);
    this._frameGraphics.stroke({ color: cornerColor, width: 3.5 });

    this._frameGraphics.moveTo(boxX + boxW - bLen, boxY + boxH);
    this._frameGraphics.lineTo(boxX + boxW, boxY + boxH);
    this._frameGraphics.lineTo(boxX + boxW, boxY + boxH - bLen);
    this._frameGraphics.stroke({ color: cornerColor, width: 3.5 });

    // Top status indicator & badge - hidden per user request (redundant labels)
    this._badgeText.visible = false;

    // Phrase Navigator Buttons
    this._prevPhraseBtn.position.set(boxX + boxW - 54, boxY + 18);
    this._nextPhraseBtn.position.set(boxX + boxW - 20, boxY + 18);
    this._counterText.position.set(boxX + boxW - 105, boxY + 11);

    // 2. Avatar Positioning (Old-School RPG Left Box)
    const avatarSize = isPortrait ? 76 : 96;
    const avatarX = boxX + 18;
    const avatarY = boxY + 34;

    this._avatarContainer.position.set(avatarX, avatarY);

    this._avatarBoxBg.clear();
    this._avatarBoxBg.roundRect(0, 0, avatarSize, avatarSize, 8);
    this._avatarBoxBg.fill({ color: 0x0c101d, alpha: 0.95 });

    this._avatarMask.clear();
    this._avatarMask.roundRect(0, 0, avatarSize, avatarSize, 8);
    this._avatarMask.fill({ color: 0xffffff });

    this._redrawAvatarBorder(this._activeSpeakerProfile ? this._activeSpeakerProfile.themeColor : 0x00f5d4);

    // 3. Speaker Name & Role Header Bar (department label hidden per user request)
    const textStartX = avatarX + avatarSize + 22;
    const textW = boxX + boxW - textStartX - 24;

    this._speakerDeptText.visible = false;
    if (isPortrait) {
      this._speakerNameText.position.set(textStartX, boxY + 18);
      this._speakerRoleText.position.set(textStartX, boxY + 36);
    } else {
      this._speakerNameText.position.set(textStartX, boxY + 20);
      this._speakerRoleText.position.set(textStartX + this._speakerNameText.bounds.width + 12, boxY + 22);
    }

    // 4. Centered Spoken Dialogue Text
    const textCenterX = textStartX + textW / 2;
    const textCenterY = boxY + (isPortrait ? 52 : 44) + (boxH - (isPortrait ? 52 : 44)) / 2;

    this._mainText.style.wordWrapWidth = textW - 20;
    this._mainText.style.fontSize = isPortrait ? 15 : 17;
    this._mainText.style.lineHeight = isPortrait ? 22 : 25;
    this._mainText.position.set(textCenterX, textCenterY);

    this._karaokeBgText.style.wordWrapWidth = textW - 20;
    this._karaokeBgText.style.fontSize = isPortrait ? 15 : 17;
    this._karaokeBgText.style.lineHeight = isPortrait ? 22 : 25;
    this._karaokeBgText.position.set(textCenterX, textCenterY);

    this._karaokeActiveText.style.wordWrapWidth = textW - 20;
    this._karaokeActiveText.style.fontSize = isPortrait ? 15 : 17;
    this._karaokeActiveText.style.lineHeight = isPortrait ? 22 : 25;
    this._karaokeActiveText.position.set(textCenterX, textCenterY);

    this._karaokeNextText.style.wordWrapWidth = textW - 20;
    this._karaokeNextText.position.set(textCenterX, boxY + boxH - 18);
  }

  public get currentCueIndex(): number {
    return this._currentCueIndex;
  }
}
