import { Application, Container, Graphics, Sprite, Text, TextStyle, CanvasTextMetrics, FederatedPointerEvent, Texture, NineSliceSprite, TilingSprite, Rectangle, BlurFilter } from 'pixi.js';

import { STORY_ACTS, ActData } from './storyData';

import { getTexture, hasTexture, getAudioUrl, getIntroVideoUrl } from './assetsManager';

import { getConcertCutAtTime, ConcertFrameCut } from './concertSequence';

import { getNarratorShotAtTime, getActiveCueAtTime, NarratorShotCut } from './narratorShotSequence';

import { CosmicScene } from './CosmicScene';

import { Subtitles } from './Subtitles';

import { AudioController } from './AudioController';

import { ClickTracker } from './ClickTracker';

import { tween, cancelTween, ease, after } from './tween';

import { SFX } from './SoundEffects';

import { AmbientManager } from './AmbientManager';

import { AudioTrackAnalyzer, IntroTimingProfile } from './AudioTrackAnalyzer';



export const INTRO_DISCLAIMER_TEXT =

  'Настоящий материал создан с применением генеративного ИИ и не отражает точку зрения компании либо её представителей. Содержание основано на анализе реальных рабочих данных.';



export const INTRO_DISCLAIMER_DURATION = 12.8;



interface WsTimelineActButton {

  container: Container;

  btnSprite: Sprite;

  shadowSprite: Sprite;

  holeSprite: Sprite;

  lampSprite: Sprite;

  setLatched: (latched: boolean) => void;

  isLatched: () => boolean;

  setLampActive: (active: boolean) => void;

}



interface WsTimelineSticker {

  actIndex: number;

  container: Container;

  sprite: Sprite;

}



export const CREW_ARK_ROLES: Record<string, string> = {

  'алексей горин': 'Верховный Надзиратель Конвейера',

  'горин': 'Верховный Надзиратель Конвейера',

  'эдуард левин': 'Зодчий Игрового Замысла',

  'эдик': 'Зодчий Игрового Замысла',

  'павел самойленко': 'Архи-Цензор Синтаксической Ереси',

  'павел': 'Архи-Цензор Синтаксической Ереси',

  'артём хухро': 'Техноэкзорцист Графической Скверны',

  'хухро': 'Техноэкзорцист Графической Скверны',

  'хухра': 'Техноэкзорцист Графической Скверны',

  'максим мамусин': 'Палач Старого Стека',

  'мамусин': 'Палач Старого Стека',

  'даниал искаков': 'Кузнец Троичного Кода',

  'даниал': 'Кузнец Троичного Кода',

  'архинастоятель ворон': 'Архи-Настоятель Цензората',

  'ворон': 'Архи-Настоятель Цензората',

  'алексей (новенький)': 'Новообращённый Послушник',

  'новенький': 'Новообращённый Послушник',

  'кирилл берёзкин': 'Магистр Циклической Несовместимости',

  'берёзкин': 'Магистр Циклической Несовместимости',

  'кристиан': 'Хранитель Чистой Ветки',

  'ева аксёнова': 'Главная Хранительница Скрижалей и Сроков',

  'ева': 'Главная Хранительница Скрижалей и Сроков',

  'толя щербаков': 'Лорд-Командор Цитадели',

  'толя': 'Лорд-Командор Цитадели',

  'егор ткачёв': 'Преподобный Толкователь Воли Клиентархов',

  'егор': 'Преподобный Толкователь Воли Клиентархов',

  'вика': 'Верховная Настоятельница Пиксельного Канона',

  'виктория фесенко': 'Верховная Настоятельница Пиксельного Канона',

  'женя': 'Мастер Вечного Рендера',

  'владимир хаецкий': 'Хранитель Лонгбокса Disney',

  'вова хаецкий': 'Хранитель Лонгбокса Disney',

  'вова': 'Хранитель Лонгбокса Disney',

  'хаецкий': 'Хранитель Лонгбокса Disney',

  'давит газарян': 'Рыцарь Старого Движка',

  'давит': 'Рыцарь Старого Движка',

  'александр панков': 'Архи-Инженер Квантового Клика',

  'панков': 'Архи-Инженер Квантового Клика',

  'ник егоров': 'Координатор Скоростной Статики',

  'миша': 'Алхимик Внутренней Кузницы',

  'леван': 'Префект Сверхсветового Рендера',

  'клиентарх royal ark': 'Владыка Правок',

  'клиентарх game gears': 'Владыка НЛО',

};



export function getCrewArkRole(characterName: string, defaultRole: string): string {

  const norm = characterName.toLowerCase();

  for (const [key, arkRole] of Object.entries(CREW_ARK_ROLES)) {

    if (norm.includes(key)) {

      return arkRole;

    }

  }

  if (defaultRole.includes('•')) {

    return defaultRole.split('•')[1].trim();

  }

  if (defaultRole.includes('//')) {

    return defaultRole.split('//')[1].trim();

  }

  return defaultRole;

}



export function getCrewAvatarTexture(name: string, fallbackTexKey?: string | null): Texture | null {

  const n = (name || '').toLowerCase();

  let key: string | null = null;

  if (n.includes('горин')) key = 'avatar_gorin';

  else if (n.includes('эдуард') || n.includes('эдик')) key = 'avatar_eduard';

  else if (n.includes('павел') || n.includes('самойленко')) key = 'avatar_pavel';

  else if (n.includes('хухр')) key = 'avatar_huhro';

  else if (n.includes('мамусин')) key = 'avatar_mamusin';

  else if (n.includes('ева')) key = 'avatar_eva';

  else if (n.includes('толя') || n.includes('щербаков')) key = 'avatar_toly';

  else if (n.includes('ник') || n.includes('егоров')) key = hasTexture('avatar_nick_egorov') ? 'avatar_nick_egorov' : (hasTexture('avatar_nick') ? 'avatar_nick' : 'retro_film_nick_egorov_speedrun_v2');

  else if (n.includes('егор') || n.includes('ткачев') || n.includes('ткачёв')) key = 'avatar_egor';

  else if (n.includes('даниал') || n.includes('искаков')) key = hasTexture('avatar_hoodie') ? 'avatar_hoodie' : 'retro_film_danial_iskakov_sapper_v1';

  else if (n.includes('ворон')) key = hasTexture('retro_film_voron_arch_abbot_v7') ? 'retro_film_voron_arch_abbot_v7' : 'avatar_pavel';

  else if (n.includes('берёзкин') || n.includes('кирилл')) key = 'avatar_kirill';

  else if (n.includes('кристиан')) key = 'avatar_christian';

  else if (n.includes('давит')) key = 'avatar_davit';

  else if (n.includes('панков')) key = 'avatar_pankov';

  else if (n.includes('хаецкий') || n.includes('вова')) key = 'avatar_khaetsky';

  else if (n.includes('вика') || n.includes('фесенко')) key = 'avatar_vika';

  else if (n.includes('женя')) key = 'avatar_zhenya';

  else if (n.includes('новенький')) key = hasTexture('retro_film_alexey_novice_v4') ? 'retro_film_alexey_novice_v4' : 'avatar_gorin';



  if (key && hasTexture(key)) {

    const t = getTexture(key);

    if (t && t !== Texture.WHITE && t.width > 1) return t;

  }

  if (fallbackTexKey && hasTexture(fallbackTexKey)) {

    const t = getTexture(fallbackTexKey);

    if (t && t !== Texture.WHITE && t.width > 1) return t;

  }

  return null;

}



export class MovieApp {

  private _app: Application;

  private _root: Container;



  // Scene layers

  private _bgContainer: Container;

  private _bgBackdropSprite!: Sprite;

  private _bgSprite: Sprite;

  private _prevBgSprite: Sprite;
  private _letterboxBars: Graphics;

  private _wipeMask: Graphics;

  private _wipeEdgeGraphics: Graphics;

  private _isWiping = false;

  private _wipeProgress = 0;

  private _wipeDuration = 2.2;

  private _wipeType: 'line_lr' | 'line_rl' | 'line_tb' | 'circle_iris' | 'circle_iris_corner' = 'line_lr';

  private _cosmicScene: CosmicScene;

  private _vignetteGraphics: Graphics;

  private _introContainer: Container;

  private _introDisclaimerContainer!: Container;

  private _introDisclaimerBg!: Graphics;

  private _introDisclaimerCorners!: Graphics;

  private _introDisclaimerBadge!: Text;

  private _introDisclaimerLinesContainer!: Container;

  private _disclaimerLineTexts: Text[] = [];

  private _disclaimerLines: { text: string; width: number }[] = [];

  private _lastDisclaimerCharCount = -1;

  private _lastSeriesSubCharCount = -1;

  private _introAmbientStarted = false;

  private _introLogoSprite: Sprite;

  private _introStudiosText: Text;

  private _introPresentsText: Text;

  private _introSeriesContainer: Container;

  private _introSeriesLogoSprite: Sprite;

  private _introSeriesSubtitle: Text;

  private _introCycleSubtitle: Text;

  private _introLogoBaseScale = 0.2;

  private _videoElement: HTMLVideoElement | null = null;

  private _subtitles: Subtitles;



  // UI layer

  private _uiContainer: Container;

  private _playerBarContainer!: Container;

  private _playerBarBg!: Graphics;

  private _controlsRow!: Container;

  private _volumeGroup!: Container;

  private _badgeText: Text;

  private _titleText: Text;

  private _subtitleText: Text;

  private _timeCodeText: Text;

  private _prevButton: Container;

  private _nextButton: Container;

  private _playPauseButton: Container;

  private _playPauseIcon: Text;

  private _muteButton: Container;

  private _muteIcon: Text;

  private _ccButton!: Container;

  private _ccButtonVisuals!: (active: boolean) => void;

  private _fullscreenButton!: Container;

  private _fullscreenButtonVisuals!: () => void;

  private _isSubtitlesVisible = true;



  // Scrubber & Timeline

  private _progressBarContainer: Container;

  private _progressBarBg: Graphics;

  private _progressBarFill: Graphics;

  private _scrubberThumb!: Graphics;

  private _timelineTooltip!: Container;

  private _timelineTooltipBg!: Graphics;

  private _timelineTooltipText!: Text;

  private _isTimelineHovered = false;

  private _isTimelineDragging = false;

  private _wasPlayingBeforeDrag = false;

  private _dotsContainer: Container;

  private _totalMovieDuration = 953;

  private _actStartTimes: number[] = [];



  // WS-96 Retro Hardware Console

  private _wsConsoleContainer!: Container;

  private _wsLeftWing!: Container;

  private _wsChassisLeft!: Sprite;

  private _wsMidWing!: Container;

  private _wsChassisMid!: Sprite;

  private _wsRightWing!: Container;

  private _wsChassisRight!: Sprite;

  private _wsPlayPauseSprite!: Sprite;

  private _wsPrevSprite!: Sprite;

  private _wsNextSprite!: Sprite;

  private _wsVolSprite!: Sprite;

  private _wsCcSprite!: Sprite;

  private _wsModeSprite!: Sprite;

  private _wsSetPlayPauseLatched!: (latched: boolean) => void;

  private _wsPlayPausePressAndRelease!: () => void;

  private _wsPrevPressAndRelease!: () => void;

  private _wsNextPressAndRelease!: () => void;

  private _wsSetVolLatched!: (latched: boolean) => void;

  private _wsSetCcLatched!: (latched: boolean) => void;

  private _wsSetModeLatched!: (latched: boolean) => void;

  private _wsVoiceKnob!: Sprite;

  private _wsMusicKnob!: Sprite;

  private _wsSfxKnob!: Sprite;

  private _wsLcdText!: Text;

  private _wsTimelineContainer!: Container;

  private _wsTrackCapLeft!: Sprite;

  private _wsTrackMid!: Sprite;

  private _wsTrackCapRight!: Sprite;

  private _wsTimelineFill!: Graphics;

  private _wsTimelineKnob!: Sprite;

  private _wsLeds: Sprite[] = [];

  private _wsActButtons: WsTimelineActButton[] = [];

  private _wsStickers: WsTimelineSticker[] = [];

  private _wsGuiScale = 1.0;



  // Canvas click gestures & Ripple

  private _canvasHitArea!: Graphics;

  private _rippleContainer!: Container;

  private _centerRipple!: Container;

  private _centerRippleBg!: Graphics;

  private _centerRippleIcon!: Text;

  private _sideRipple!: Container;

  private _sideRippleBg!: Graphics;

  private _sideRippleText!: Text;

  private _clickTimer: any = null;

  private _lastClickTime = 0;

  private _lastClickPos = { x: 0, y: 0 };



  // Autohide & HUD Sliding

  private _autohideTimer = 2.5;

  private _isUiHovered = false;

  private _hudAnimState = { p: 1.0 };

  private _hudIsVisible = true;



  // State & Audio

  private _currentActIndex = 0;

  private _voiceAudio: HTMLAudioElement | null = null;

  private _isPlaying = true;

  private _actTime = 0;

  private _actDuration = 44;

  private _screenWidth = 1280;

  private _screenHeight = 720;

  private _prologueCurrentTexKey = 'ship_cistam';

  private _concertCurrentTexKey = '';

  private _narratorCurrentTexKey = '';

  private _concertPunchScale = 1.0;
  private _shotElapsed = 0;
  private _shotDriftSeed = 0;

  private _bgBaseScale = 1.0;

  private _isTransitioningAct = false;



  // Volume channels

  private _voiceVolume = 1.0;

  private _musicVolume = 0.85;

  private _sfxVolume = 0.8;

  private _voiceVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };

  private _musicVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };

  private _sfxVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };



  // Team Quote Corner Badge (Square Avatar + 2 Lines: Name & Ark Role)

  private _cornerQuoteBadge!: Container;

  private _cornerQuoteBg!: Graphics;

  private _cornerQuoteAvatarContainer!: Container;

  private _cornerQuoteAvatarSprite!: Sprite;

  private _cornerQuoteAvatarMask!: Graphics;

  private _cornerQuoteAvatarBorder!: Graphics;

  private _cornerQuoteName!: Text;

  private _cornerQuoteRole!: Text;

  private _currentQuoteColor = 0x00f5d4;

  private _currentQuoteAvatarTex: Texture | null = null;

  private _seenCharacterQuotes: Set<string> = new Set();

  private _quoteBadgeTyping = {

    active: false,

    elapsed: 0,

    fullName: '',

    fullRole: '',

    lastCharCount: -1,

  };



  private _missingImageOverlay!: Container;

  private _missingImageBg!: Graphics;

  private _missingImageTitle!: Text;

  private _missingImageSubtitle!: Text;

  private _missingImageCharText!: Text;



  // Debug mode & Audio analysis

  private _debugContainer!: Container;

  private _debugPillBg!: Graphics;

  private _debugTrackText!: Text;

  private _debugDropInfoText!: Text;

  private _debugExpandedPanel!: Container;

  private _debugExpanded = false;

  private _introProfile!: IntroTimingProfile;



  constructor(app: Application) {

    this._app = app;

    this._root = new Container();

    this._app.stage.addChild(this._root);



    this._bgContainer = new Container();

    this._bgBackdropSprite = new Sprite();

    this._bgBackdropSprite.anchor.set(0.5);

    this._bgBackdropSprite.alpha = 0.45;

    this._bgBackdropSprite.visible = false;

    this._bgBackdropSprite.filters = [new BlurFilter({ strength: 24, quality: 3 })];

    this._bgContainer.addChild(this._bgBackdropSprite);



    this._prevBgSprite = new Sprite();

    this._prevBgSprite.anchor.set(0.5);

    this._prevBgSprite.visible = false;

    this._bgContainer.addChild(this._prevBgSprite);



    this._bgSprite = new Sprite();

    this._bgSprite.anchor.set(0.5);

    this._bgContainer.addChild(this._bgSprite);

    this._letterboxBars = new Graphics();
    this._bgContainer.addChild(this._letterboxBars);



    this._wipeMask = new Graphics();

    this._bgContainer.addChild(this._wipeMask);



    this._wipeEdgeGraphics = new Graphics();

    this._bgContainer.addChild(this._wipeEdgeGraphics);



    this._cosmicScene = new CosmicScene();

    this._vignetteGraphics = new Graphics();

    this._introContainer = new Container();

    this._subtitles = new Subtitles();

    this._rippleContainer = new Container();

    this._uiContainer = new Container();



    this._canvasHitArea = new Graphics();

    this._canvasHitArea.eventMode = 'static';

    this._canvasHitArea.cursor = 'pointer';



    this._initQuoteAndMissingImageHUD();



    this._root.addChild(this._bgContainer);

    this._root.addChild(this._cosmicScene);

    this._root.addChild(this._canvasHitArea);

    this._root.addChild(this._vignetteGraphics);

    this._root.addChild(this._introContainer);

    this._root.addChild(this._cornerQuoteBadge);

    this._root.addChild(this._subtitles);

    this._root.addChild(this._rippleContainer);

    this._root.addChild(this._uiContainer);



    // Video element setup (loops gemini_generated_video_42e28e3d; backups: gemini_generated_video_aaf115f1, gemini_generated_video_50f3f52f)

    this._videoElement = document.getElementById('intro-video') as HTMLVideoElement | null;

    if (this._videoElement) {

      this._videoElement.src = getIntroVideoUrl();

      this._videoElement.loop = true;

      this._videoElement.muted = true;

      this._videoElement.setAttribute('playsinline', '');

      this._videoElement.load();

    }



    // 0. Disclaimer HUD Card (Cyberpunk Corporate Warning)

    this._introDisclaimerContainer = new Container();

    this._introDisclaimerContainer.alpha = 0;

    this._introContainer.addChild(this._introDisclaimerContainer);



    this._introDisclaimerBg = new Graphics();

    this._introDisclaimerContainer.addChild(this._introDisclaimerBg);



    this._introDisclaimerCorners = new Graphics();

    this._introDisclaimerContainer.addChild(this._introDisclaimerCorners);



    const discBadgeStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 16,

      fontWeight: 'bold',

      fill: '#00f5d4',

      align: 'center',

      letterSpacing: 3,

      dropShadow: { alpha: 0.85, blur: 10, color: '#00f5d4', distance: 0 },

    });

    this._introDisclaimerBadge = new Text({ text: '[ ДИСКЛЕЙМЕР ]', style: discBadgeStyle });

    this._introDisclaimerBadge.anchor.set(0.5, 0);

    this._introDisclaimerContainer.addChild(this._introDisclaimerBadge);



    this._introDisclaimerLinesContainer = new Container();

    this._introDisclaimerContainer.addChild(this._introDisclaimerLinesContainer);



    // 1. Skull Logo sprite

    this._introLogoSprite = new Sprite(getTexture('playbox_skull_logo'));

    this._introLogoSprite.anchor.set(0.5);

    this._introLogoSprite.alpha = 0;

    this._introContainer.addChild(this._introLogoSprite);



    // 2. STUDIOS text (no square brackets, tighter letter spacing)

    const studiosStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 34,

      fontWeight: 'bold',

      fill: '#ffffff',

      letterSpacing: 4,

      dropShadow: { alpha: 0.95, blur: 18, color: '#ff5e1a', distance: 0 },

    });

    this._introStudiosText = new Text({ text: 'STUDIOS', style: studiosStyle });

    this._introStudiosText.anchor.set(0.5);

    this._introStudiosText.alpha = 0;

    this._introContainer.addChild(this._introStudiosText);



    // 3. PRESENTS text (no square brackets, tighter letter spacing)

    const presentsStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 22,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 4,

      dropShadow: { alpha: 0.95, blur: 16, color: '#00f5d4', distance: 0 },

    });

    this._introPresentsText = new Text({ text: '', style: presentsStyle });

    this._introPresentsText.anchor.set(0.5);

    this._introPresentsText.alpha = 0;

    this._introContainer.addChild(this._introPresentsText);



    // 4. Series Title & Subtitle container (massive movie title card with custom logo!)

    this._introSeriesContainer = new Container();

    this._introSeriesContainer.alpha = 0;

    this._introContainer.addChild(this._introSeriesContainer);



    this._introSeriesLogoSprite = new Sprite(getTexture('series_title_logo'));

    this._introSeriesLogoSprite.anchor.set(0.5);

    this._introSeriesContainer.addChild(this._introSeriesLogoSprite);



    const seriesSubStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 18,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 4,

      dropShadow: { alpha: 0.9, blur: 10, color: '#00f5d4', distance: 0 },

    });

    this._introSeriesSubtitle = new Text({ text: '[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]', style: seriesSubStyle });

    this._introSeriesSubtitle.anchor.set(0.5);

    this._introSeriesContainer.addChild(this._introSeriesSubtitle);



    const cycleSubStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 32,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 8,

      dropShadow: { alpha: 0.95, blur: 16, color: '#00f5d4', distance: 0 },

    });

    this._introCycleSubtitle = new Text({ text: '[ ЧЕТЫРНАДЦАТЫЙ ЦИКЛ ]', style: cycleSubStyle });

    this._introCycleSubtitle.anchor.set(0.5);

    this._introCycleSubtitle.alpha = 0;

    this._introContainer.addChild(this._introCycleSubtitle);



    // Setup HUD & UI (hidden for clean cinema look per user request)

    const badgeStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 12,

      fontWeight: 'bold',

      fill: '#ff5e1a',

      letterSpacing: 2,

    });

    this._badgeText = new Text({ text: '', style: badgeStyle });

    this._badgeText.visible = false;



    const titleStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 19,

      fontWeight: 'bold',

      fill: '#ffffff',

      letterSpacing: 1,

      dropShadow: { alpha: 0.7, blur: 6, color: '#000000', distance: 2 },

    });

    this._titleText = new Text({ text: '', style: titleStyle });

    this._titleText.visible = false;



    const subStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 13,

      fill: '#a0a3b8',

    });

    this._subtitleText = new Text({ text: '', style: subStyle });

    this._subtitleText.visible = false;



    const timeStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 12,

      fill: '#ffa800',

    });

    this._timeCodeText = new Text({ text: '00:00 / 00:00', style: timeStyle });

    this._timeCodeText.anchor.set(0, 0.5);



    // Timeline calculation

    this._totalMovieDuration = STORY_ACTS.reduce((sum, act) => sum + act.duration, 0);

    this._actStartTimes = [];

    let cumulative = 0;

    for (const act of STORY_ACTS) {

      this._actStartTimes.push(cumulative);

      cumulative += act.duration;

    }



    // 1. Center & Side Ripples

    this._centerRipple = new Container();

    this._centerRipple.visible = false;

    this._centerRippleBg = new Graphics();

    this._centerRippleBg.circle(0, 0, 38);

    this._centerRippleBg.fill({ color: 0x000000, alpha: 0.65 });

    this._centerRippleBg.stroke({ color: 0xffffff, width: 2, alpha: 0.9 });

    const centerStyle = new TextStyle({

      fontFamily: ['Segoe UI Emoji', 'Inter', 'sans-serif'],

      fontSize: 26,

      fill: '#ffffff',

    });

    this._centerRippleIcon = new Text({ text: '▶', style: centerStyle });

    this._centerRippleIcon.anchor.set(0.5);

    this._centerRipple.addChild(this._centerRippleBg);

    this._centerRipple.addChild(this._centerRippleIcon);

    this._rippleContainer.addChild(this._centerRipple);



    this._sideRipple = new Container();

    this._sideRipple.visible = false;

    this._sideRippleBg = new Graphics();

    this._sideRippleBg.roundRect(-46, -20, 92, 40, 20);

    this._sideRippleBg.fill({ color: 0x000000, alpha: 0.72 });

    this._sideRippleBg.stroke({ color: 0xff3b30, width: 1.5 });

    const sideStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 14,

      fontWeight: 'bold',

      fill: '#ffffff',

    });

    this._sideRippleText = new Text({ text: '⏩ +5с', style: sideStyle });

    this._sideRippleText.anchor.set(0.5);

    this._sideRipple.addChild(this._sideRippleBg);

    this._sideRipple.addChild(this._sideRippleText);

    this._rippleContainer.addChild(this._sideRipple);



    // 2. Canvas Click & Double Click Gestures (Instant YouTube click-to-pause!)

    this._canvasHitArea.on('pointerdown', (e: FederatedPointerEvent) => {

      this._resetAutohide();

      ClickTracker.exclude();



      const now = performance.now();

      const pos = { x: e.global.x, y: e.global.y };

      const dist = Math.hypot(pos.x - this._lastClickPos.x, pos.y - this._lastClickPos.y);



      if (now - this._lastClickTime < 300 && dist < 50) {

        // Double-click: toggle fullscreen (YouTube desktop standard)

        this._lastClickTime = 0;

        this.toggleFullscreen();

      } else {

        // Single click: INSTANT STOP / PLAY (Zero latency, exactly like YouTube!)

        this._lastClickTime = now;

        this._lastClickPos = pos;

        this.togglePlayPause();

        this._showCenterRipple(this._isPlaying ? 'play' : 'pause');

      }

    });



    // 3. Bottom Player Controls

    this._prevButton = this._createIconButton('⏮', () => this.previousPhrase());

    this._nextButton = this._createIconButton('⏭', () => this.nextPhrase());

    this._playPauseButton = this._createIconButton('⏸', () => {

      this.togglePlayPause();

      this._showCenterRipple(this._isPlaying ? 'play' : 'pause');

    });

    this._playPauseIcon = this._playPauseButton.children[1] as Text;

    this._muteButton = this._createIconButton('🔊', () => this.toggleMute());

    this._muteIcon = this._muteButton.children[1] as Text;



    const ccRes = this._createCCButton();

    this._ccButton = ccRes.container;

    this._ccButtonVisuals = ccRes.updateVisuals;



    const fsRes = this._createFullscreenButton();

    this._fullscreenButton = fsRes.container;

    this._fullscreenButtonVisuals = fsRes.updateVisuals;

    document.addEventListener('fullscreenchange', () => {

      if (this._fullscreenButtonVisuals) this._fullscreenButtonVisuals();

      if (this._wsSetModeLatched) this._wsSetModeLatched(Boolean(document.fullscreenElement));

    });



    // Segmented YouTube Scrubber Timeline

    this._progressBarContainer = new Container();

    this._progressBarContainer.eventMode = 'static';

    this._progressBarContainer.cursor = 'pointer';

    this._progressBarBg = new Graphics();

    this._progressBarFill = new Graphics();

    this._scrubberThumb = new Graphics();



    this._timelineTooltip = new Container();

    this._timelineTooltip.visible = false;

    this._timelineTooltipBg = new Graphics();

    const tipStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 11,

      fill: '#ffffff',

    });

    this._timelineTooltipText = new Text({ text: '', style: tipStyle });

    this._timelineTooltipText.anchor.set(0.5);

    this._timelineTooltip.addChild(this._timelineTooltipBg);

    this._timelineTooltip.addChild(this._timelineTooltipText);



    this._progressBarContainer.addChild(this._progressBarBg);

    this._progressBarContainer.addChild(this._progressBarFill);

    this._progressBarContainer.addChild(this._scrubberThumb);

    this._progressBarContainer.addChild(this._timelineTooltip);



    const handleTimelinePointer = (e: FederatedPointerEvent, isClick = false) => {

      const local = this._progressBarContainer.toLocal(e.global);

      const barW = Math.max(300, this._screenWidth - 48);

      const ratio = Math.max(0, Math.min(1, local.x / barW));

      const targetOverallTime = ratio * this._totalMovieDuration;



      let targetActIndex = 0;

      for (let i = STORY_ACTS.length - 1; i >= 0; i--) {

        if (targetOverallTime >= this._actStartTimes[i]) {

          targetActIndex = i;

          break;

        }

      }



      const targetActTime = targetOverallTime - this._actStartTimes[targetActIndex];



      if (isClick || this._isTimelineDragging) {

        if (targetActIndex !== this._currentActIndex) {

          this.goToAct(targetActIndex);

        }

        this.seekAudio(targetActTime);

      }



      const act = STORY_ACTS[targetActIndex];

      const formatTime = (s: number) => {

        const m = Math.floor(s / 60);

        const rem = Math.floor(s % 60);

        return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;

      };

      this._timelineTooltipText.text = `${formatTime(targetActTime)} • ${act.title}`;

      this._timelineTooltipBg.clear();

      this._timelineTooltipBg.roundRect(-this._timelineTooltipText.width / 2 - 8, -13, this._timelineTooltipText.width + 16, 26, 6);

      this._timelineTooltipBg.fill({ color: 0x0a0c14, alpha: 0.95 });

      this._timelineTooltipBg.stroke({ color: 0xff0033, width: 1.5 });

      this._timelineTooltip.position.set(Math.max(70, Math.min(barW - 70, local.x)), -24);

      this._timelineTooltip.visible = true;

    };



    this._progressBarContainer.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this._wasPlayingBeforeDrag = this._isPlaying;

      this._isTimelineDragging = true;

      if (this._isPlaying) {

        this.pause();

      }

      handleTimelinePointer(e, true);

    });



    this._progressBarContainer.on('pointerenter', () => {

      this._isTimelineHovered = true;

      this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

    });



    this._progressBarContainer.on('pointerleave', () => {

      this._isTimelineHovered = false;

      this._timelineTooltip.visible = false;

      this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

    });



    this._progressBarContainer.on('globalpointermove', (e: FederatedPointerEvent) => {

      if (this._isTimelineHovered || this._isTimelineDragging) {

        handleTimelinePointer(e, false);

      }

    });



    window.addEventListener('pointerup', () => {

      if (this._isTimelineDragging) {

        this._isTimelineDragging = false;

        if (this._wasPlayingBeforeDrag) {

          this.play();

        } else {

          this.pause();

        }

        this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

      }

    });



    this._dotsContainer = new Container();



    // Volume controls: Voice (🎙️), Music (🎵), Sound Effects (⚡)

    this._voiceVolControl = this._createVolumeControl('🎙️', this._voiceVolume, 0x00f5d4, (v) => {

      this._voiceVolume = v;

      const act = STORY_ACTS[this._currentActIndex];

      const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

      if (!isSong && this._voiceAudio) {

        this._voiceAudio.volume = AudioController.isMuted() ? 0 : v;

      }

    });



    AmbientManager.setMusicVolume(this._musicVolume);



    this._musicVolControl = this._createVolumeControl('🎵', this._musicVolume, 0xff5e1a, (v) => {

      this._musicVolume = v;

      AmbientManager.setMusicVolume(v);

      const act = STORY_ACTS[this._currentActIndex];

      const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

      if (isSong && this._voiceAudio) {

        this._voiceAudio.volume = AudioController.isMuted() ? 0 : v;

      }

    });



    this._sfxVolControl = this._createVolumeControl('⚡', this._sfxVolume, 0xffcc00, (v) => {

      this._sfxVolume = v;

      SFX.setVolume(v);

      SFX.playPreview();

    });



    this._volumeGroup = new Container();

    this._voiceVolControl.container.position.set(0, 0);

    this._musicVolControl.container.position.set(92, 0);

    this._sfxVolControl.container.position.set(184, 0);

    this._volumeGroup.addChild(this._voiceVolControl.container);

    this._volumeGroup.addChild(this._musicVolControl.container);

    this._volumeGroup.addChild(this._sfxVolControl.container);



    // Audio Analysis & Timing Profile for Intro

    this._introProfile = AudioTrackAnalyzer.getProfile(AmbientManager.getIntroTrack());

    const desolateUrl = getAudioUrl('desolate_cry');

    if (desolateUrl) {

      AudioTrackAnalyzer.analyzeTrack('desolate_cry', desolateUrl).then((p) => {

        if (AmbientManager.getIntroTrack() === 'desolate_cry') {

          this._introProfile = p;

          if (this._currentActIndex === 0) this._actDuration = INTRO_DISCLAIMER_DURATION + p.introEndTime;

          this._updateDebugDisplay();

        }

      });

    }

    const titanUrl = getAudioUrl('titan_forge');

    if (titanUrl) {

      AudioTrackAnalyzer.analyzeTrack('titan_forge', titanUrl).then((p) => {

        if (AmbientManager.getIntroTrack() === 'titan_forge') {

          this._introProfile = p;

          if (this._currentActIndex === 0) this._actDuration = INTRO_DISCLAIMER_DURATION + p.introEndTime;

          this._updateDebugDisplay();

        }

      });

    }



    // Setup interactive Debug UI

    this._setupDebugUI();



    // Assemble Unified Bottom Player Bar

    this._controlsRow = new Container();

    this._controlsRow.addChild(this._playPauseButton);

    this._controlsRow.addChild(this._prevButton);

    this._controlsRow.addChild(this._nextButton);

    this._controlsRow.addChild(this._muteButton);

    this._controlsRow.addChild(this._volumeGroup);

    this._controlsRow.addChild(this._timeCodeText);

    this._controlsRow.addChild(this._dotsContainer);

    this._controlsRow.addChild(this._ccButton);

    this._controlsRow.addChild(this._fullscreenButton);



    this._playerBarBg = new Graphics();

    this._playerBarBg.visible = false;

    this._playerBarContainer = new Container();

    this._playerBarContainer.eventMode = 'static';

    this._playerBarContainer.addChild(this._playerBarBg);



    // Setup WS-96 Retro Hardware Console

    this._setupWsConsole();



    this._controlsRow.visible = false;

    this._progressBarContainer.visible = false;

    this._playerBarContainer.addChild(this._progressBarContainer);

    this._playerBarContainer.addChild(this._controlsRow);



    this._playerBarContainer.on('pointerenter', () => { this._isUiHovered = true; });

    this._playerBarContainer.on('pointerleave', () => { this._isUiHovered = false; });



    // Header on top

    this._uiContainer.addChild(this._badgeText);

    this._uiContainer.addChild(this._titleText);

    this._uiContainer.addChild(this._subtitleText);

    this._uiContainer.addChild(this._debugContainer);

    this._uiContainer.addChild(this._playerBarContainer);



    // Connect AudioController

    AudioController.init({

      onChange: (muted) => {

        SFX.setMuted(muted);

        AmbientManager.setMuted(muted);

        const act = STORY_ACTS[this._currentActIndex];

        const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

        if (this._voiceAudio) {

          this._voiceAudio.muted = muted;

          this._voiceAudio.volume = muted ? 0 : (isSong ? this._musicVolume : this._voiceVolume);

        }

        this._muteIcon.text = muted ? '🔇' : '🔊';

      },

    });



    // Subtitle phrase seeking hook

    this._subtitles.onSeekRequested = (targetTime: number) => {

      this.seekAudio(targetTime);

    };



    // YouTube Hotkeys & Keyboard Navigation

    window.addEventListener('keydown', (e) => {

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();

      if (tag === 'input' || tag === 'textarea') return;



      this._resetAutohide();



      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {

        e.preventDefault();

        this.togglePlayPause();

        this._showCenterRipple(this._isPlaying ? 'play' : 'pause');

      } else if (e.key === 'j' || e.key === 'J') {

        e.preventDefault();

        this.seekAudio(this._actTime - 10);

        this._showSeekRipple(-10);

      } else if (e.key === 'l' || e.key === 'L') {

        e.preventDefault();

        this.seekAudio(this._actTime + 10);

        this._showSeekRipple(10);

      } else if (e.key === 'ArrowLeft') {

        e.preventDefault();

        this.seekAudio(this._actTime - 5);

        this._showSeekRipple(-5);

      } else if (e.key === 'ArrowRight') {

        e.preventDefault();

        this.seekAudio(this._actTime + 5);

        this._showSeekRipple(5);

      } else if ((e.shiftKey && e.key === 'ArrowLeft') || e.key === 'PageUp') {

        e.preventDefault();

        if (this._wsPrevPressAndRelease) this._wsPrevPressAndRelease();

        this.previousAct();

      } else if ((e.shiftKey && e.key === 'ArrowRight') || e.key === 'PageDown') {

        e.preventDefault();

        if (this._wsNextPressAndRelease) this._wsNextPressAndRelease();

        this.nextAct();

      } else if (e.key === 'm' || e.key === 'M') {

        e.preventDefault();

        this.toggleMute();

      } else if (e.key === 'f' || e.key === 'F') {

        e.preventDefault();

        this.toggleFullscreen();

      } else if (e.key === 'c' || e.key === 'C') {

        e.preventDefault();

        this.toggleSubtitles();

      } else if (e.key >= '0' && e.key <= '9') {

        e.preventDefault();

        const ratio = Number(e.key) * 0.1;

        this.seekAudio(ratio * this._actDuration);

      } else if (e.key === 'd' || e.key === 'D') {

        SFX.playClick();

        this._debugExpanded = !this._debugExpanded;

        this._debugExpandedPanel.visible = this._debugExpanded;

        this.resize(this._screenWidth, this._screenHeight);

      } else if (e.key === 't' || e.key === 'T') {

        SFX.playClick();

        this.toggleIntroTrack();

      } else if (e.key === 'p' || e.key === 'P') {

        if (this._currentActIndex === 0) {

          this.seekAudio(24.0);

        }

      }

    });



    window.addEventListener('pointermove', () => {

      this._resetAutohide();

    });



    if (typeof document !== 'undefined' && (document as any).fonts) {

      (document as any).fonts.ready.then(() => {

        const curW = this._screenWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);

        const curH = this._screenHeight || (typeof window !== 'undefined' ? window.innerHeight : 720);

        this._layoutIntroDisclaimer(curW, curH, curH > curW);

      }).catch(() => {});

    }



    this.goToAct(0);

  }



  private _resetAutohide(): void {

    this._autohideTimer = 2.5;

    if (!this._hudIsVisible) {

      this._hudIsVisible = true;

      cancelTween(this._hudAnimState);

      tween(this._hudAnimState, { p: 1.0 }, 0.45, ease.outBack);

    }

    if (this._app.canvas) {

      this._app.canvas.style.cursor = 'default';

    }

  }



  public toggleSubtitles(): void {

    SFX.playClick();

    this._isSubtitlesVisible = !this._isSubtitlesVisible;

    this._subtitles.visible = this._isSubtitlesVisible;

    if (this._ccButtonVisuals) {

      this._ccButtonVisuals(this._isSubtitlesVisible);

    }

    if (this._wsSetCcLatched) {

      this._wsSetCcLatched(this._isSubtitlesVisible);

    }

    this._showSeekRipple(this._isSubtitlesVisible ? 1 : 0);

    this._sideRippleText.text = this._isSubtitlesVisible ? 'CC: ВКЛ' : 'CC: ВЫКЛ';

  }



  public toggleFullscreen(): void {

    SFX.playClick();

    if (!document.fullscreenElement) {

      document.documentElement.requestFullscreen().catch(() => {});

    } else {

      document.exitFullscreen().catch(() => {});

    }

    if (this._fullscreenButtonVisuals) {

      this._fullscreenButtonVisuals();

    }

    if (this._wsSetModeLatched) {

      this._wsSetModeLatched(Boolean(document.fullscreenElement));

    }

  }



  private _showCenterRipple(type: 'play' | 'pause'): void {

    this._centerRippleIcon.text = type === 'play' ? '▶' : '⏸';

    this._centerRipple.position.set(this._screenWidth / 2, this._screenHeight / 2);

    this._centerRipple.scale.set(0.7);

    this._centerRipple.alpha = 0.95;

    this._centerRipple.visible = true;



    cancelTween(this._centerRipple);

    tween(this._centerRipple, { alpha: 0 }, 0.4, ease.outQuad);

    tween(this._centerRipple.scale, { x: 1.35, y: 1.35 }, 0.4, ease.outBack);

  }



  private _showSeekRipple(delta: number, posX?: number, posY?: number): void {

    const isForward = delta > 0;

    this._sideRippleText.text = `${isForward ? '⏩ +' : '⏪ '}${Math.abs(delta)}с`;

    const targetX = posX !== undefined ? posX : (isForward ? this._screenWidth * 0.78 : this._screenWidth * 0.22);

    const targetY = posY !== undefined ? posY : this._screenHeight / 2;

    this._sideRipple.position.set(targetX, targetY);

    this._sideRipple.scale.set(0.8);

    this._sideRipple.alpha = 0.95;

    this._sideRipple.visible = true;



    cancelTween(this._sideRipple);

    tween(this._sideRipple, { alpha: 0 }, 0.45, ease.outQuad);

    tween(this._sideRipple.scale, { x: 1.25, y: 1.25 }, 0.45, ease.outBack);

  }



  private _createCCButton(): { container: Container; updateVisuals: (active: boolean) => void } {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    c.addChild(bg);



    const txtStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 11,

      fontWeight: 'bold',

      fill: '#ffffff',

      letterSpacing: 1,

    });

    const txt = new Text({ text: 'CC', style: txtStyle });

    txt.anchor.set(0.5);

    c.addChild(txt);



    const updateVisuals = (active: boolean, hover = false) => {

      bg.clear();

      bg.roundRect(-16, -12, 32, 24, 4);

      if (active) {

        bg.fill({ color: hover ? 0xff3b30 : 0xcc2222, alpha: 0.95 });

        bg.stroke({ color: 0xffffff, width: 1.5 });

        txt.style.fill = '#ffffff';

      } else {

        bg.fill({ color: hover ? 0x2a3148 : 0x141624, alpha: 0.65 });

        bg.stroke({ color: hover ? 0x5a6578 : 0x2a3148, width: 1 });

        txt.style.fill = '#7a8599';

      }

    };



    updateVisuals(this._isSubtitlesVisible, false);

    c.on('pointerover', () => updateVisuals(this._isSubtitlesVisible, true));

    c.on('pointerout', () => updateVisuals(this._isSubtitlesVisible, false));

    c.on('pointerdown', (e) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this.toggleSubtitles();

    });



    return { container: c, updateVisuals: (a) => updateVisuals(a, false) };

  }



  private _createFullscreenButton(): { container: Container; updateVisuals: () => void } {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    c.addChild(bg);



    const txtStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 16,

      fill: '#ffffff',

    });

    const txt = new Text({ text: '⛶', style: txtStyle });

    txt.anchor.set(0.5);

    c.addChild(txt);



    const draw = (hover = false) => {

      const isFs = Boolean(document.fullscreenElement);

      bg.clear();

      bg.circle(0, 0, 16);

      bg.fill({ color: hover ? 0x2d3248 : 0x141624, alpha: hover ? 0.95 : 0.65 });

      bg.stroke({ color: hover ? 0xff5e1a : 0x2a3148, width: 1.2 });

      txt.text = isFs ? '✕' : '⛶';

    };



    draw(false);

    c.on('pointerover', () => draw(true));

    c.on('pointerout', () => draw(false));

    c.on('pointerdown', (e) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this.toggleFullscreen();

    });



    return { container: c, updateVisuals: () => draw(false) };

  }



  private _createButton(label: string, onClick: () => void, isPrimary = false): Container {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    c.addChild(bg);



    const txtStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 12,

      fontWeight: 'bold',

      fill: isPrimary ? '#050508' : '#ffffff',

      letterSpacing: 1,

    });

    const txt = new Text({ text: label, style: txtStyle });

    txt.anchor.set(0.5);

    c.addChild(txt);



    const draw = (hover = false) => {

      bg.clear();

      const fillCol = isPrimary ? (hover ? 0xff7b3a : 0xff5e1a) : (hover ? 0x242838 : 0x141622);

      const strokeCol = isPrimary ? 0xffa800 : (hover ? 0x00d2ff : 0x3a3f5a);

      bg.roundRect(-68, -18, 136, 36, 8);

      bg.fill({ color: fillCol, alpha: 0.95 });

      bg.stroke({ color: strokeCol, width: 1.5 });

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



  private _createIconButton(icon: string, onClick: () => void): Container {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    c.addChild(bg);



    const txtStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 16,

      fill: '#ffffff',

    });

    const txt = new Text({ text: icon, style: txtStyle });

    txt.anchor.set(0.5);

    c.addChild(txt);



    const draw = (hover = false) => {

      bg.clear();

      bg.circle(0, 0, 20);

      bg.fill({ color: hover ? 0x2d3248 : 0x181a28, alpha: 0.9 });

      bg.stroke({ color: hover ? 0x00d2ff : 0x3a4060, width: 1.5 });

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



  private _createVolumeControl(

    icon: string,

    initialVol: number,

    tintColor: number,

    onChange: (vol: number) => void

  ): { container: Container; setVolumeDisplay: (v: number) => void } {

    const c = new Container();

    c.eventMode = 'static';



    let currentVol = initialVol;

    let savedVol = initialVol > 0 ? initialVol : 0.8;

    let isDragging = false;



    // Capsule background

    const bgCapsule = new Graphics();

    c.addChild(bgCapsule);



    // Icon button (left)

    const iconBtn = new Container();

    iconBtn.eventMode = 'static';

    iconBtn.cursor = 'pointer';



    const iconBg = new Graphics();

    iconBg.circle(-26, 0, 13);

    iconBg.fill({ color: 0x000000, alpha: 0.001 });

    iconBtn.addChild(iconBg);



    const iconStyle = new TextStyle({

      fontFamily: ['Segoe UI Emoji', 'Inter', 'sans-serif'],

      fontSize: 13,

      fill: '#ffffff',

    });

    const iconText = new Text({ text: icon, style: iconStyle });

    iconText.anchor.set(0.5);

    iconText.position.set(-26, 0);

    iconBtn.addChild(iconText);

    c.addChild(iconBtn);



    // Slider track (right)

    const trackStartX = -10;

    const trackW = 44;

    const trackH = 5;



    const trackContainer = new Container();

    trackContainer.eventMode = 'static';

    trackContainer.cursor = 'pointer';

    c.addChild(trackContainer);



    const trackHit = new Graphics();

    trackHit.rect(trackStartX - 4, -13, trackW + 8, 26);

    trackHit.fill({ color: 0x000000, alpha: 0.001 });

    trackContainer.addChild(trackHit);



    const trackBg = new Graphics();

    const trackFill = new Graphics();

    const thumb = new Graphics();



    trackContainer.addChild(trackBg);

    trackContainer.addChild(trackFill);

    trackContainer.addChild(thumb);



    const updateVisuals = (vol: number) => {

      currentVol = Math.max(0, Math.min(1, vol));



      bgCapsule.clear();

      bgCapsule.roundRect(-43, -13, 86, 26, 13);

      bgCapsule.fill({ color: 0x0f111a, alpha: 0.88 });

      bgCapsule.stroke({ color: currentVol > 0 ? 0x2a3148 : 0x1c1f2b, width: 1 });



      iconText.alpha = currentVol > 0 ? 1.0 : 0.35;



      trackBg.clear();

      trackBg.roundRect(trackStartX, -trackH / 2, trackW, trackH, trackH / 2);

      trackBg.fill({ color: 0x1e2335, alpha: 0.95 });



      trackFill.clear();

      if (currentVol > 0) {

        trackFill.roundRect(trackStartX, -trackH / 2, trackW * currentVol, trackH, trackH / 2);

        trackFill.fill({ color: tintColor });

      }



      thumb.clear();

      const thumbX = trackStartX + trackW * currentVol;

      thumb.circle(thumbX, 0, 4.5);

      thumb.fill({ color: currentVol > 0 ? 0xffffff : 0x5a6578 });

      thumb.stroke({ color: currentVol > 0 ? tintColor : 0x3a4055, width: 1.5 });

    };



    updateVisuals(initialVol);



    const setVol = (v: number, triggerCallback = true) => {

      const clamped = Math.max(0, Math.min(1, v));

      updateVisuals(clamped);

      if (triggerCallback) onChange(clamped);

    };



    iconBtn.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      if (currentVol > 0.01) {

        savedVol = currentVol;

        setVol(0);

      } else {

        setVol(savedVol > 0.05 ? savedVol : 0.8);

      }

    });



    const handlePointerPos = (e: FederatedPointerEvent) => {

      const local = trackContainer.toLocal(e.global);

      const ratio = Math.max(0, Math.min(1, (local.x - trackStartX) / trackW));

      setVol(ratio);

    };



    trackContainer.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      isDragging = true;

      handlePointerPos(e);

    });



    trackContainer.on('globalpointermove', (e: FederatedPointerEvent) => {

      if (isDragging) {

        handlePointerPos(e);

      }

    });



    const stopDrag = () => {

      if (isDragging) {

        isDragging = false;

      }

    };



    trackContainer.on('pointerup', stopDrag);

    trackContainer.on('pointerupoutside', stopDrag);



    return {

      container: c,

      setVolumeDisplay: (v: number) => updateVisuals(v),

    };

  }



  private _createWsKeycap(

    normalTexKey: string,

    onClick: () => void,

    options?: {

      isLatching?: boolean;

      initialLatched?: boolean;

      onHover?: () => void;

      onOut?: () => void;

    }

  ): {

    container: Container;

    sprite: Sprite;

    setLatched: (latched: boolean) => void;

    isLatched: () => boolean;

    pressAndRelease: () => void;

  } {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const sprite = new Sprite(getTexture(normalTexKey));

    sprite.anchor.set(0.5, 0.5);

    sprite.alpha = 1.0;

    c.addChild(sprite);



    // Physical keycap press scales & shadow tints

    const PRESSED_SCALE = 0.72; // Deep overtravel into socket ("нажатие с избытком")

    const PRESSED_TINT = 0x8a8a8a; // Heavy shadow darkening when pressed deeply into socket

    const LATCHED_SCALE = 0.86; // Depressed resting state when toggled ON ("не до конца назад увеличиваются")

    const LATCHED_TINT = 0xc4c4c4; // Subtle resting shadow when latched in

    const NORMAL_SCALE = 1.0; // Fully unlatched / momentary resting state

    const NORMAL_TINT = 0xffffff;



    let latched = Boolean(options?.initialLatched);

    let isPressedDown = false;

    let isHandlingPointerRelease = false;



    const applyState = (pressed: boolean, animate = false) => {

      cancelTween(sprite.scale);

      sprite.y = 0; // Strictly centered, no vertical displacement



      let targetScale = NORMAL_SCALE;

      let targetTint = NORMAL_TINT;



      if (pressed) {

        // Active mouse press: plunges deep into socket with excess travel and heavy shadow

        targetScale = PRESSED_SCALE;

        targetTint = PRESSED_TINT;

      } else if (options?.isLatching && latched) {

        // Latched resting state: stays partially sunken at intermediate scale with subtle shadow

        targetScale = LATCHED_SCALE;

        targetTint = LATCHED_TINT;

      }



      if (animate) {

        sprite.tint = targetTint;

        tween(sprite.scale, { x: targetScale, y: targetScale }, 0.15, ease.outBack);

      } else {

        sprite.scale.set(targetScale);

        sprite.tint = targetTint;

      }

    };



    applyState(false, false);



    c.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      isPressedDown = true;

      applyState(true, false);

    });



    c.on('pointerup', (e: FederatedPointerEvent) => {

      if (!isPressedDown) return;

      isPressedDown = false;

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      isHandlingPointerRelease = true;

      try {

        onClick();

      } finally {

        isHandlingPointerRelease = false;

      }

      applyState(false, true);

    });



    const cancelPress = () => {

      if (!isPressedDown) return;

      isPressedDown = false;

      applyState(false, true);

    };



    c.on('pointerupoutside', cancelPress);

    c.on('pointerout', () => {

      cancelPress();

      options?.onOut?.();

    });

    c.on('pointerover', () => {

      options?.onHover?.();

    });



    const pressAndRelease = () => {

      if (isPressedDown || isHandlingPointerRelease) return;

      cancelTween(sprite.scale);

      sprite.y = 0;

      sprite.scale.set(PRESSED_SCALE);

      sprite.tint = PRESSED_TINT;

      after(0.09, () => {

        applyState(false, true);

      });

    };



    return {

      container: c,

      sprite,

      setLatched: (isLatched: boolean) => {

        latched = isLatched;

        if (!isPressedDown && !isHandlingPointerRelease) {

          applyState(false, true);

        }

      },

      isLatched: () => latched,

      pressAndRelease,

    };

  }



  private _createWsActButton(

    actIdx: number,

    onClick: () => void

  ): WsTimelineActButton {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    // Transparent generous hit area (24x48) covering button (y=0) and indicator lamp (y=-20.5)

    const hitArea = new Graphics();

    hitArea.rect(-12, -30, 24, 48);

    hitArea.fill({ color: 0x000000, alpha: 0.0001 });

    c.addChild(hitArea);



    // 1. Static chassis socket well / hole

    const holeSprite = new Sprite(getTexture('gui_act_btn_hole'));

    holeSprite.anchor.set(0.5, 0.5);

    holeSprite.position.set(0, 0);

    c.addChild(holeSprite);



    // 2. Button drop shadow: shrinks when button is pressed ("КОгда кнопка нажата ее тень тоже уменьшается")

    const shadowSprite = new Sprite(getTexture('gui_act_btn_shadow'));

    shadowSprite.anchor.set(0.5, 0.5);

    shadowSprite.position.set(-3.5, 4.5);

    shadowSprite.alpha = 0.65;

    c.addChild(shadowSprite);



    // 3. Button keycap

    const btnSprite = new Sprite(getTexture('gui_act_btn'));

    btnSprite.anchor.set(0.5, 0.5);

    btnSprite.position.set(0, 0);

    c.addChild(btnSprite);



    // 4. Indicator Lamp (above button at y = -20.5)

    const lampSprite = new Sprite(getTexture('gui_act_lamp_off'));

    lampSprite.anchor.set(0.5, 0.5);

    lampSprite.position.set(0, -20.5);

    c.addChild(lampSprite);



    const PRESSED_SCALE = 0.72; // Deep overtravel into socket ("нажатие с избытком")

    const PRESSED_TINT = 0x8a8a8a; // Heavy shadow darkening

    const LATCHED_SCALE = 0.86; // Depressed resting state when active ("не до конца назад увеличиваются")

    const LATCHED_TINT = 0xc4c4c4; // Resting shadow

    const NORMAL_SCALE = 1.0;

    const NORMAL_TINT = 0xffffff;



    let latched = false;

    let isPressedDown = false;

    let isHandlingPointerRelease = false;



    const applyState = (pressed: boolean, animate = false) => {

      cancelTween(btnSprite.scale);

      cancelTween(shadowSprite.scale);

      cancelTween(shadowSprite.position);



      let targetScale = NORMAL_SCALE;

      let targetTint = NORMAL_TINT;



      if (pressed) {

        targetScale = PRESSED_SCALE;

        targetTint = PRESSED_TINT;

      } else if (latched) {

        targetScale = LATCHED_SCALE;

        targetTint = LATCHED_TINT;

      }



      const targetShadowX = -3.5 * targetScale;

      const targetShadowY = 4.5 * targetScale;



      if (animate) {

        btnSprite.tint = targetTint;

        tween(btnSprite.scale, { x: targetScale, y: targetScale }, 0.15, ease.outBack);

        tween(shadowSprite.scale, { x: targetScale, y: targetScale }, 0.15, ease.outBack);

        tween(shadowSprite.position, { x: targetShadowX, y: targetShadowY }, 0.15, ease.outBack);

      } else {

        btnSprite.scale.set(targetScale);

        btnSprite.tint = targetTint;

        shadowSprite.scale.set(targetScale);

        shadowSprite.position.set(targetShadowX, targetShadowY);

      }

    };



    applyState(false, false);



    c.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      isPressedDown = true;

      applyState(true, false);

    });



    c.on('pointerup', (e: FederatedPointerEvent) => {

      if (!isPressedDown) return;

      isPressedDown = false;

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      isHandlingPointerRelease = true;

      try {

        onClick();

      } finally {

        isHandlingPointerRelease = false;

      }

      applyState(false, true);

    });



    const cancelPress = () => {

      if (!isPressedDown) return;

      isPressedDown = false;

      applyState(false, true);

    };



    c.on('pointerupoutside', cancelPress);

    c.on('pointerout', () => {

      cancelPress();

      this._timelineTooltip.visible = false;

    });



    c.on('pointerover', (e: FederatedPointerEvent) => {

      const act = STORY_ACTS[actIdx];

      if (act) {

        const m = Math.floor(act.duration / 60);

        const rem = Math.floor(act.duration % 60);

        const timeStr = `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;

        this._timelineTooltipText.text = `Акт ${actIdx}: ${act.title} (${timeStr})`;

        this._timelineTooltipBg.clear();

        this._timelineTooltipBg.roundRect(

          -this._timelineTooltipText.width / 2 - 8,

          -13,

          this._timelineTooltipText.width + 16,

          26,

          6

        );

        this._timelineTooltipBg.fill({ color: 0x0a0c14, alpha: 0.95 });

        this._timelineTooltipBg.stroke({ color: 0x00d2ff, width: 1.5 });

        const local = this._wsConsoleContainer.toLocal(e.global);

        this._timelineTooltip.position.set(local.x, local.y - 20);

        this._timelineTooltip.visible = true;

      }

    });



    return {

      container: c,

      btnSprite,

      shadowSprite,

      holeSprite,

      lampSprite,

      setLatched: (isLatched: boolean) => {

        if (latched === isLatched) return;

        latched = isLatched;

        if (!isPressedDown && !isHandlingPointerRelease) {

          applyState(false, true);

        }

      },

      isLatched: () => latched,

      setLampActive: (active: boolean) => {

        if (active) {

          lampSprite.texture = getTexture('gui_act_lamp_on');

          lampSprite.alpha = 0.9 + Math.sin(Date.now() * 0.006) * 0.1;

        } else {

          lampSprite.texture = getTexture('gui_act_lamp_off');

          lampSprite.alpha = 0.75;

        }

      },

    };

  }



  private _createWsKnobSlider(

    knobTexKey: string,

    startX: number,

    endX: number,

    slotY: number,

    initialVol: number,

    onChange: (vol: number) => void

  ): { container: Container; knob: Sprite; setVol: (v: number) => void } {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const hit = new Graphics();

    hit.rect(startX - 12, slotY - 16, (endX - startX) + 24, 32);

    hit.fill({ color: 0x000000, alpha: 0.001 });

    c.addChild(hit);



    const knob = new Sprite(getTexture(knobTexKey));

    knob.anchor.set(0.5, 0.5);

    knob.position.set(startX + initialVol * (endX - startX), slotY);

    c.addChild(knob);



    let isDragging = false;

    const updateFromPos = (globalPos: { x: number; y: number }) => {

      const local = c.toLocal(globalPos);

      const ratio = Math.max(0, Math.min(1, (local.x - startX) / (endX - startX)));

      knob.x = startX + ratio * (endX - startX);

      onChange(ratio);

    };



    c.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      isDragging = true;

      updateFromPos(e.global);

    });



    c.on('globalpointermove', (e: FederatedPointerEvent) => {

      if (isDragging) {

        updateFromPos(e.global);

      }

    });



    window.addEventListener('pointerup', () => {

      isDragging = false;

    });



    return {

      container: c,

      knob,

      setVol: (v: number) => {

        const clamped = Math.max(0, Math.min(1, v));

        knob.x = startX + clamped * (endX - startX);

      }

    };

  }



  private _setupWsConsole(): void {

    this._wsConsoleContainer = new Container();

    this._wsConsoleContainer.eventMode = 'static';



    // Left Wing (Pause, Prev, Next, Vol, 3 Sliders, LCD)

    this._wsLeftWing = new Container();

    this._wsChassisLeft = new Sprite(getTexture('gui_chassis_left'));

    this._wsLeftWing.addChild(this._wsChassisLeft);



    // Play/Pause keycap button at (90, 83) from mockup3

    // Does NOT latch in scale because its icon toggles between play and pause

    const ppKey = this._createWsKeycap(

      this._isPlaying ? 'gui_btn_pause' : 'gui_btn_play',

      () => {

        this.togglePlayPause();

        this._showCenterRipple(this._isPlaying ? 'play' : 'pause');

      },

      {

        isLatching: false,

      }

    );

    ppKey.container.position.set(90.0, 83.0);

    this._wsPlayPauseSprite = ppKey.sprite;

    this._wsSetPlayPauseLatched = ppKey.setLatched;

    this._wsPlayPausePressAndRelease = ppKey.pressAndRelease;

    this._wsLeftWing.addChild(ppKey.container);



    // Prev keycap button at (152, 83) -> jumps to previous phrase / subtitle cue

    const prevKey = this._createWsKeycap(

      'gui_btn_prev',

      () => this.previousPhrase(),

      { isLatching: false }

    );

    prevKey.container.position.set(152.0, 83.0);

    this._wsPrevSprite = prevKey.sprite;

    this._wsPrevPressAndRelease = prevKey.pressAndRelease;

    this._wsLeftWing.addChild(prevKey.container);



    // Next keycap button at (213.5, 83) -> jumps to next phrase / subtitle cue

    const nextKey = this._createWsKeycap(

      'gui_btn_next',

      () => this.nextPhrase(),

      { isLatching: false }

    );

    nextKey.container.position.set(213.5, 83.0);

    this._wsNextSprite = nextKey.sprite;

    this._wsNextPressAndRelease = nextKey.pressAndRelease;

    this._wsLeftWing.addChild(nextKey.container);



    // Vol keycap button at (275, 83)

    const volKey = this._createWsKeycap(

      'gui_btn_vol',

      () => this.toggleMute(),

      {

        isLatching: true,

        initialLatched: AudioController.isMuted(),

      }

    );

    volKey.container.position.set(275.0, 83.0);

    this._wsVolSprite = volKey.sprite;

    this._wsSetVolLatched = volKey.setLatched;

    this._wsLeftWing.addChild(volKey.container);



    // 3 Volume Sliders (narrowed travel boundaries so knobs stay strictly within the sculpted wells)

    const voiceSlider = this._createWsKnobSlider(

      'gui_knob_voice',

      342,

      390,

      83,

      this._voiceVolume,

      (v) => {

        this._voiceVolume = v;

        const act = STORY_ACTS[this._currentActIndex];

        const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

        if (!isSong && this._voiceAudio) {

          this._voiceAudio.volume = AudioController.isMuted() ? 0 : v;

        }

      }

    );

    this._wsLeftWing.addChild(voiceSlider.container);

    this._wsVoiceKnob = voiceSlider.knob;



    const musicSlider = this._createWsKnobSlider(

      'gui_knob_music',

      428,

      480,

      83,

      this._musicVolume,

      (v) => {

        this._musicVolume = v;

        AmbientManager.setMusicVolume(v);

        const act = STORY_ACTS[this._currentActIndex];

        const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

        if (isSong && this._voiceAudio) {

          this._voiceAudio.volume = AudioController.isMuted() ? 0 : v;

        }

      }

    );

    this._wsLeftWing.addChild(musicSlider.container);

    this._wsMusicKnob = musicSlider.knob;



    const sfxSlider = this._createWsKnobSlider(

      'gui_knob_sfx',

      522,

      569,

      83,

      this._sfxVolume,

      (v) => {

        this._sfxVolume = v;

        SFX.setVolume(v);

        SFX.playPreview();

      }

    );

    this._wsLeftWing.addChild(sfxSlider.container);

    this._wsSfxKnob = sfxSlider.knob;



    // Digital LCD Screen

    const lcdStyle = new TextStyle({

      fontFamily: ['DSEG7 Classic', 'Share Tech Mono', 'monospace'],

      fontSize: 14,

      fontWeight: 'bold',

      fill: '#8be194',

      letterSpacing: 2,

      dropShadow: {

        alpha: 0.55,

        blur: 3,

        color: '#33ff77',

        distance: 0,

      },

    });

    this._wsLcdText = new Text({ text: '00:00 / 00:00', style: lcdStyle });

    this._wsLcdText.anchor.set(0.5, 0.5);

    this._wsLcdText.position.set(694.5, 82.5);

    this._wsLeftWing.addChild(this._wsLcdText);



    // Middle Wing (Plastic Chassis + 3-piece Track + 9 LEDs)

    this._wsMidWing = new Container();

    this._wsMidWing.eventMode = 'static';

    this._wsChassisMid = new Sprite(getTexture('gui_chassis_mid'));

    this._wsMidWing.addChild(this._wsChassisMid);



    this._wsTimelineContainer = new Container();

    this._wsTimelineContainer.eventMode = 'static';

    this._wsTimelineContainer.cursor = 'pointer';



    this._wsTrackCapLeft = new Sprite(getTexture('gui_track_cap_left'));

    this._wsTrackMid = new Sprite(getTexture('gui_track_mid'));

    this._wsTrackCapRight = new Sprite(getTexture('gui_track_cap_right'));



    this._wsTimelineContainer.addChild(this._wsTrackCapLeft);

    this._wsTimelineContainer.addChild(this._wsTrackMid);

    this._wsTimelineContainer.addChild(this._wsTrackCapRight);



    this._wsTimelineFill = new Graphics();

    this._wsTimelineContainer.addChild(this._wsTimelineFill);



    this._wsTimelineKnob = new Sprite(getTexture('gui_knob_timeline'));

    this._wsTimelineKnob.anchor.set(0.5, 0.5);

    this._wsTimelineContainer.addChild(this._wsTimelineKnob);



    // Timeline Act Buttons with Indicator Lamps above timeline track (one per act)

    this._wsActButtons = [];

    const actCount = STORY_ACTS.length;

    for (let i = 0; i < actCount; i++) {

      const actIdx = i;

      const actBtn = this._createWsActButton(actIdx, () => {

        this.goToAct(actIdx);

      });

      this._wsActButtons.push(actBtn);

      this._wsMidWing.addChild(actBtn.container);

    }



    // Timeline Chapter Stickers placed on chassis under timeline track and buttons

    const getActIndex = (id: string, fallback: number) => {

      const idx = STORY_ACTS.findIndex((a) => a.id === id);

      return idx !== -1 ? idx : fallback;

    };



    const stickerDefs: { actIndex: number; texKey: string }[] = [

      { actIndex: getActIndex('intro_playbox', 0), texKey: 'gui_sticker_logo' },

      { actIndex: getActIndex('prologue_space', 1), texKey: 'gui_sticker_speech' },

      { actIndex: getActIndex('act_6_punishment', 4), texKey: 'gui_sticker_punishment' },

      { actIndex: getActIndex('act_6_reward', 5), texKey: 'gui_sticker_reward' },

      { actIndex: getActIndex('act_7_song', 7), texKey: 'gui_sticker_song' },

    ];



    this._wsStickers = [];

    for (const def of stickerDefs) {

      const c = new Container();

      c.eventMode = 'static';

      c.cursor = 'pointer';



      const spr = new Sprite(getTexture(def.texKey));

      spr.anchor.set(0.5, 0.5);

      spr.alpha = 0.9;

      c.addChild(spr);



      c.on('pointerdown', (e: FederatedPointerEvent) => {

        e.stopPropagation();

        ClickTracker.exclude();

        SFX.playClick();

        this.goToAct(def.actIndex);

      });



      c.on('pointerover', (e: FederatedPointerEvent) => {

        spr.alpha = 1.0;

        const act = STORY_ACTS[def.actIndex];

        if (act) {

          const m = Math.floor(act.duration / 60);

          const rem = Math.floor(act.duration % 60);

          const timeStr = `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;

          this._timelineTooltipText.text = `Акт ${def.actIndex}: ${act.title} (${timeStr})`;

          this._timelineTooltipBg.clear();

          this._timelineTooltipBg.roundRect(

            -this._timelineTooltipText.width / 2 - 8,

            -13,

            this._timelineTooltipText.width + 16,

            26,

            6

          );

          this._timelineTooltipBg.fill({ color: 0x0a0c14, alpha: 0.95 });

          this._timelineTooltipBg.stroke({ color: 0x00d2ff, width: 1.5 });

          const local = this._wsConsoleContainer.toLocal(e.global);

          this._timelineTooltip.position.set(local.x, local.y - 20);

          this._timelineTooltip.visible = true;

        }

      });



      c.on('pointerout', () => {

        spr.alpha = (def.actIndex === this._currentActIndex) ? 1.0 : 0.9;

        this._timelineTooltip.visible = false;

      });



      this._wsStickers.push({

        actIndex: def.actIndex,

        container: c,

        sprite: spr,

      });

      this._wsMidWing.addChild(c);

    }



    // Timeline Scrubbing Logic

    const handleTimelinePointer = (e: FederatedPointerEvent, isClick = false) => {

      const local = this._wsTimelineContainer.toLocal(e.global);

      const trackW = this._wsTrackCapLeft.width + this._wsTrackMid.width + this._wsTrackCapRight.width;

      const knobMinX = 28;

      const knobMaxX = trackW - 28;

      const knobRange = Math.max(10, knobMaxX - knobMinX);

      const ratio = Math.max(0, Math.min(1, (local.x - knobMinX) / knobRange));

      const targetOverallTime = ratio * this._totalMovieDuration;



      let targetActIndex = 0;

      for (let i = STORY_ACTS.length - 1; i >= 0; i--) {

        if (targetOverallTime >= this._actStartTimes[i]) {

          targetActIndex = i;

          break;

        }

      }



      const targetActTime = targetOverallTime - this._actStartTimes[targetActIndex];



      if (isClick || this._isTimelineDragging) {

        if (targetActIndex !== this._currentActIndex) {

          this.goToAct(targetActIndex);

        }

        this.seekAudio(targetActTime);

      }



      const act = STORY_ACTS[targetActIndex];

      const formatTime = (s: number) => {

        const m = Math.floor(s / 60);

        const rem = Math.floor(s % 60);

        return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;

      };

      this._timelineTooltipText.text = `${formatTime(targetActTime)} • ${act.title}`;

      this._timelineTooltipBg.clear();

      this._timelineTooltipBg.roundRect(-this._timelineTooltipText.width / 2 - 8, -13, this._timelineTooltipText.width + 16, 26, 6);

      this._timelineTooltipBg.fill({ color: 0x0a0c14, alpha: 0.95 });

      this._timelineTooltipBg.stroke({ color: 0xff0033, width: 1.5 });

      const localTooltip = this._wsConsoleContainer.toLocal(e.global);

      this._timelineTooltip.position.set(localTooltip.x, localTooltip.y - 24);

      this._timelineTooltip.visible = true;

    };



    this._wsTimelineContainer.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this._wasPlayingBeforeDrag = this._isPlaying;

      this._isTimelineDragging = true;

      if (this._isPlaying) {

        this.pause();

      }

      handleTimelinePointer(e, true);

    });



    this._wsTimelineContainer.on('pointerenter', () => {

      this._isTimelineHovered = true;

      this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

    });



    this._wsTimelineContainer.on('pointerleave', () => {

      this._isTimelineHovered = false;

      this._timelineTooltip.visible = false;

      this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

    });



    this._wsTimelineContainer.on('globalpointermove', (e: FederatedPointerEvent) => {

      if (this._isTimelineHovered || this._isTimelineDragging) {

        handleTimelinePointer(e, false);

      }

    });



    window.addEventListener('pointerup', () => {

      if (this._isTimelineDragging) {

        this._isTimelineDragging = false;

        if (this._wasPlayingBeforeDrag) {

          this.play();

        } else {

          this.pause();

        }

        this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));

      }

    });



    this._wsMidWing.addChild(this._wsTimelineContainer);



    // Right Wing

    this._wsRightWing = new Container();

    this._wsChassisRight = new Sprite(getTexture('gui_chassis_right'));

    this._wsRightWing.addChild(this._wsChassisRight);



    // Deep black backing well behind CC and Mode buttons to ensure 100% pitch-black well

    const socketBg = new Graphics();

    socketBg.roundRect(156, 48, 126, 64, 5);

    socketBg.fill({ color: 0x080a0c });

    this._wsRightWing.addChild(socketBg);



    // CC button at (189.5, 79.5)

    const ccKey = this._createWsKeycap(

      'gui_btn_cc',

      () => this.toggleSubtitles(),

      {

        isLatching: true,

        initialLatched: this._isSubtitlesVisible,

      }

    );

    ccKey.container.position.set(189.5, 79.5);

    this._wsCcSprite = ccKey.sprite;

    this._wsSetCcLatched = ccKey.setLatched;

    this._wsRightWing.addChild(ccKey.container);



    // Mode / Fullscreen button at (249.0, 79.5)

    const modeKey = this._createWsKeycap(

      'gui_btn_mode',

      () => this.toggleFullscreen(),

      {

        isLatching: true,

        initialLatched: Boolean(document.fullscreenElement),

      }

    );

    modeKey.container.position.set(249.0, 79.5);

    this._wsModeSprite = modeKey.sprite;

    this._wsSetModeLatched = modeKey.setLatched;

    this._wsRightWing.addChild(modeKey.container);



    // Assemble Console

    this._wsConsoleContainer.addChild(this._wsLeftWing);

    this._wsConsoleContainer.addChild(this._wsMidWing);

    this._wsConsoleContainer.addChild(this._wsRightWing);

    this._wsConsoleContainer.addChild(this._timelineTooltip);



    this._playerBarContainer.addChild(this._wsConsoleContainer);

  }



  private _setupDebugUI(): void {

    this._debugContainer = new Container();
    this._debugContainer.visible = false;

    this._debugContainer.eventMode = 'static';



    // 1. Compact Toggle Pill (always accessible)

    const pill = new Container();

    pill.eventMode = 'static';

    pill.cursor = 'pointer';



    this._debugPillBg = new Graphics();

    pill.addChild(this._debugPillBg);



    const txtStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 10,

      fontWeight: 'bold',

      fill: '#ffffff',

      letterSpacing: 1,

    });

    this._debugTrackText = new Text({ text: '', style: txtStyle });

    this._debugTrackText.anchor.set(0.5);

    pill.addChild(this._debugTrackText);



    pill.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this.toggleIntroTrack();

    });



    this._debugContainer.addChild(pill);



    // 2. Expanded Options Panel

    this._debugExpandedPanel = new Container();

    this._debugExpandedPanel.position.set(0, 22);

    this._debugExpandedPanel.visible = false;

    this._debugContainer.addChild(this._debugExpandedPanel);



    const panelBg = new Graphics();

    panelBg.roundRect(-215, 0, 430, 74, 10);

    panelBg.fill({ color: 0x080a14, alpha: 0.96 });

    panelBg.stroke({ color: 0x00f5d4, width: 1.2 });

    this._debugExpandedPanel.addChild(panelBg);



    // Info text: drop time & audio analysis

    const infoStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 11,

      fill: '#00f5d4',

    });

    this._debugDropInfoText = new Text({ text: '', style: infoStyle });

    this._debugDropInfoText.anchor.set(0.5, 0);

    this._debugDropInfoText.position.set(0, 9);

    this._debugExpandedPanel.addChild(this._debugDropInfoText);



    // Quick action mini buttons

    const btnRestart = this._createDebugMiniBtn('↺ С начала (0s)', () => {

      AmbientManager.restartIntro();

      this.seekAudio(0);

    });

    btnRestart.position.set(-135, 46);

    this._debugExpandedPanel.addChild(btnRestart);



    const btnPause = this._createDebugMiniBtn('⏸ К паузе (24s)', () => {

      this.seekAudio(24.0);

    });

    btnPause.position.set(-10, 46);

    this._debugExpandedPanel.addChild(btnPause);



    const btnDrop = this._createDebugMiniBtn('🎬 К дропу', () => {

      this.seekAudio(this._introProfile.titleDropTime);

    });

    btnDrop.position.set(120, 46);

    this._debugExpandedPanel.addChild(btnDrop);



    // Toggle dropdown arrow button

    const arrowBtn = new Container();

    arrowBtn.eventMode = 'static';

    arrowBtn.cursor = 'pointer';

    const arrowBg = new Graphics();

    arrowBg.circle(135, 0, 11);

    arrowBg.fill({ color: 0x181c2c, alpha: 0.85 });

    arrowBg.stroke({ color: 0x2e3852, width: 1 });

    arrowBtn.addChild(arrowBg);



    const arrowTxt = new Text({

      text: '⚙️',

      style: new TextStyle({ fontSize: 10, fill: '#ffffff' }),

    });

    arrowTxt.anchor.set(0.5);

    arrowTxt.position.set(135, 0);

    arrowBtn.addChild(arrowTxt);



    arrowBtn.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      this._debugExpanded = !this._debugExpanded;

      this._debugExpandedPanel.visible = this._debugExpanded;

      this._updateDebugDisplay();

      this.resize(this._screenWidth, this._screenHeight);

    });

    this._debugContainer.addChild(arrowBtn);



    this._updateDebugDisplay();

  }



  private _createDebugMiniBtn(label: string, onClick: () => void): Container {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    c.addChild(bg);



    const txt = new Text({

      text: label,

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 10,

        fontWeight: 'bold',

        fill: '#ffffff',

      }),

    });

    txt.anchor.set(0.5);

    c.addChild(txt);



    const draw = (hover = false) => {

      bg.clear();

      bg.roundRect(-54, -12, 108, 24, 6);

      bg.fill({ color: hover ? 0x222a40 : 0x141824, alpha: 0.95 });

      bg.stroke({ color: hover ? 0x00f5d4 : 0x364060, width: 1 });

    };



    draw(false);

    c.on('pointerover', () => draw(true));

    c.on('pointerout', () => draw(false));

    c.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      SFX.playClick();

      onClick();

    });



    return c;

  }



  public toggleIntroTrack(): void {

    const cur = AmbientManager.getIntroTrack();

    const next: 'desolate_cry' | 'titan_forge' = cur === 'desolate_cry' ? 'titan_forge' : 'desolate_cry';

    const isPlayingIntroMusic = this._currentActIndex === 0 && this._actTime >= INTRO_DISCLAIMER_DURATION && this._isPlaying;

    AmbientManager.setIntroTrack(next, isPlayingIntroMusic);

    this._introProfile = AudioTrackAnalyzer.getProfile(next);

    if (this._currentActIndex === 0) {

      this._actDuration = INTRO_DISCLAIMER_DURATION + this._introProfile.introEndTime;

    }

    this._updateDebugDisplay();

  }



  private _updateDebugDisplay(): void {

    if (!this._debugContainer) return;

    const cur = AmbientManager.getIntroTrack();

    const isDesolate = cur === 'desolate_cry';

    const trackName = isDesolate ? 'Desolate Cry' : 'Titan Forge';

    const altName = isDesolate ? 'Titan Forge' : 'Desolate Cry';



    this._debugTrackText.text = `🛠️ ИНТРО: [${trackName}] ⇄ ${altName}`;

    this._debugTrackText.style.fill = isDesolate ? '#00f5d4' : '#ffaa00';



    this._debugPillBg.clear();

    this._debugPillBg.roundRect(-150, -13, 270, 26, 13);

    this._debugPillBg.fill({ color: 0x090b14, alpha: 0.9 });

    this._debugPillBg.stroke({ color: isDesolate ? 0x00f5d4 : 0xffaa00, width: 1.2 });



    const dropT = this._introProfile.titleDropTime.toFixed(1);

    const valleyT = this._introProfile.valleyTime.toFixed(1);

    const durT = this._introProfile.introEndTime.toFixed(1);

    this._debugDropInfoText.text = `🎬 Анализ: Дроп названия на ${dropT}s • Долина тишины: ${valleyT}s • Итог: ${durT}s`;

  }



  public goToAct(index: number, autoPlay?: boolean, crossfadeSec: number = 0): void {

    if (index < 0 || index >= STORY_ACTS.length) return;

    const shouldPlay = autoPlay !== undefined ? autoPlay : this._isPlaying;

    this._isPlaying = shouldPlay;

    if (shouldPlay) {

      this._playPauseIcon.text = '⏸';

      if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_pause');

      if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(true);

    } else {

      this._playPauseIcon.text = '▶';

      if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_play');

      if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(false);

    }



    if (index === 0) {

      this._seenCharacterQuotes.clear();

      this._quoteBadgeTyping.active = false;

    }

    const prevActIndex = this._currentActIndex;
    const prevAct = prevActIndex >= 0 ? STORY_ACTS[prevActIndex] : null;
    const act = STORY_ACTS[index];

    // Seamless continuous voice handover detection (punishment -> reward):
    const isContinuousVoice = Boolean(
      prevAct && act &&
      prevAct.audioKey && act.audioKey &&
      prevAct.audioKey === act.audioKey &&
      act.audioOffset !== undefined && act.audioOffset > 0 &&
      this._voiceAudio && !this._voiceAudio.paused &&
      Math.abs(this._voiceAudio.currentTime - act.audioOffset) < 1.5
    );

    if (index !== 0 && !isContinuousVoice) {

      SFX.playWhoosh();

    }

    const oldSceneTex = (this._bgSprite && this._bgSprite.texture && this._bgSprite.texture !== Texture.WHITE && this._bgSprite.texture.width > 1)
      ? this._bgSprite.texture
      : null;

    this._isTransitioningAct = false;

    AmbientManager.cancelWait();

    AmbientManager.stopCinematicCue(0.2);

    this._currentActIndex = index;

    this._actTime = 0;

    this._actDuration = act.duration || 30;



    // Stop previous voice track if running with a smooth micro-fadeout (80ms) to eliminate audio clicks/pops

    if (!isContinuousVoice && this._voiceAudio) {

      const oldAudio = this._voiceAudio;

      this._voiceAudio = null;

      try {

        const curVol = oldAudio.volume;

        let step = 0;

        const totalSteps = 4;

        const fadeTimer = setInterval(() => {

          step++;

          if (step >= totalSteps) {

            clearInterval(fadeTimer);

            oldAudio.pause();

            oldAudio.currentTime = 0;

          } else {

            oldAudio.volume = Math.max(0, curVol * (1 - step / totalSteps));

          }

        }, 20);

      } catch {

        oldAudio.pause();

      }

    }



    // Header info

    this._badgeText.text = `[ ${act.badge} • ${act.actNumber}/${act.totalActs} ]`;

    this._titleText.text = act.title;

    this._subtitleText.text = act.subtitle;



    // Setup visual

    if (act.id === 'intro_playbox') {

      this._cosmicScene.visible = false;

      this._bgContainer.visible = false;

      this._introContainer.visible = true;

      this._subtitles.visible = false;

      this._timeCodeText.visible = true;

      this._introProfile = AudioTrackAnalyzer.getProfile(AmbientManager.getIntroTrack());

      this._actDuration = INTRO_DISCLAIMER_DURATION + this._introProfile.introEndTime;

      this._playIntroAnimation();

    } else if (act.category === 'prologue') {

      // In Prologue (Act 1): Keep cosmic video playing during the opening void expose until the ship appears!

      if (this._videoElement) {

        this._videoElement.style.opacity = '1';

        if (shouldPlay) {

          this._videoElement.play().catch(() => {});

        } else {

          this._videoElement.pause();

        }

      }

      this._introContainer.visible = false;

      this._cosmicScene.visible = false;

      this._bgContainer.visible = true;

      this._prologueCurrentTexKey = 'ship_cistam';

      this._bgSprite.texture = getTexture('ship_cistam');

      this._resizeBgSprite();

      this._bgSprite.alpha = 0; // Starts invisible; update() fades it in when told about at ~18.5s!



      this._subtitles.visible = true;

      this._timeCodeText.visible = true;

      this._subtitles.setCues(act.cues, act.hasDedicatedFrame, Boolean(act.isKaraoke), act.frameTitle, act.id);



      // Start Prologue voiceover

      
      // Audio Transition: Switch to Prologue ambient track
      if (!shouldPlay) {
        AmbientManager.setPaused(true);
      } else {
        AmbientManager.setPaused(false);
      }
      AmbientManager.transitionToAct(index, crossfadeSec, act.id);

      this._playVoiceAct(act, index, shouldPlay);

    } else {

      if (this._videoElement) {

        this._videoElement.style.opacity = '0';

        setTimeout(() => {

          if (this._currentActIndex !== 0 && this._videoElement) {

            this._videoElement.pause();

          }

        }, 1500);

      }

      this._introContainer.visible = false;

      this._cosmicScene.visible = false;

      this._bgContainer.visible = true;

      this._subtitles.visible = true;

      this._timeCodeText.visible = true;



      if (act.id === 'act_2_sarcophagus') {

        if (this._videoElement) {

          this._videoElement.style.opacity = '1';

          if (shouldPlay) {

            this._videoElement.play().catch(() => {});

          }

        }

      }



      const isSong = act.category === 'song' || act.id === 'act_7_song';

      // Audio Transition: Switch ambient track BEFORE applying shot cuts and cues
      if (index === 0) {
        this._introAmbientStarted = false;
        if (!shouldPlay) {
          AmbientManager.setPaused(true);
        } else {
          AmbientManager.setPaused(false);
        }
        AmbientManager.playTrack(null, 0.0, crossfadeSec);
      } else {
        if (!shouldPlay) {
          AmbientManager.setPaused(true);
        } else {
          AmbientManager.setPaused(false);
        }
        AmbientManager.transitionToAct(index, crossfadeSec, act.id);
      }

      if (isSong) {

        const initialCut = getConcertCutAtTime(0);

        this._concertCurrentTexKey = initialCut.texKey;

        this._concertPunchScale = 1.0;

        this._applyConcertCut(initialCut, false);

      } else {

        this._concertCurrentTexKey = '';

      }



      // Determine initial narrator cut (or act image / default narrator reading book)

      const initialNarratorCut = (!isSong && act.id !== 'intro_playbox')

        ? getNarratorShotAtTime(act.id, 0)

        : null;



      const resolvedImageKey = initialNarratorCut
        ? (initialNarratorCut.texKey || '')
        : ((!act.hasDedicatedFrame && act.id !== 'intro_playbox' && act.id !== 'prologue_space')
            ? 'ai_lord_throne_book_reading_narrator'
            : act.imageKey);

      // Star Wars Optical Wipe: ONLY between scenes with a pause (Act transitions)
      const isSceneTransition = (prevActIndex !== -1 && prevActIndex !== index && index !== 0 && prevActIndex !== 0);
      const newSceneTex = resolvedImageKey ? getTexture(resolvedImageKey) : null;
      if (isSceneTransition && oldSceneTex && newSceneTex && oldSceneTex !== newSceneTex && oldSceneTex !== Texture.WHITE) {
        this._startStarWarsWipe(oldSceneTex, newSceneTex);
      }

      if (initialNarratorCut) {

        this._narratorCurrentTexKey = initialNarratorCut.texKey || '';

        this._applyCinematicCut(initialNarratorCut, false);

      } else if (!isSong) {

        this._hideCornerQuoteBadge();

        this._missingImageOverlay.visible = false;

        this._bgSprite.visible = true;

        this._narratorCurrentTexKey = resolvedImageKey;

        const tex = getTexture(resolvedImageKey);

        if (!this._isWiping) {

          this._bgSprite.texture = tex;

          this._resizeBgSprite();

        }

        cancelTween(this._bgSprite);

        this._bgSprite.alpha = 1.0;

      }



      this._subtitles.setCues(act.cues, act.hasDedicatedFrame, Boolean(act.isKaraoke), act.frameTitle, act.id);



      // Start act voiceover / song (Act 0 has no voiceover; its audio is 100% managed by AmbientManager)

      if (index !== 0) {

        this._playVoiceAct(act, index, shouldPlay, isContinuousVoice);

      } else {

        if (!shouldPlay) {

          this.pause();

        }

      }

    }







    this._updateDots();

    if (this._debugContainer) {
      this._debugContainer.visible = false;
    }

    this._updateDebugDisplay();

    this.resize(this._screenWidth, this._screenHeight);

  }



  private _playVoiceAct(act: (typeof STORY_ACTS)[0], index: number, autoPlay = true, isContinuousVoice = false): void {

    if (!act.audioKey) return;

    const audioUrl = getAudioUrl(act.audioKey);

    if (!audioUrl) return;

    // If continuous audio is already playing seamlessly from the previous act, keep playing uninterrupted!
    if (isContinuousVoice && this._voiceAudio && !this._voiceAudio.paused) {
      this._voiceAudio.onended = () => {
        this._onActContentFinished(index);
      };
      return;
    }



    this._voiceAudio = new Audio(audioUrl);

    this._voiceAudio.muted = AudioController.isMuted();

    const isSong = act.category === 'song' || act.id === 'act_7_song';

    if (isSong) {

      AmbientManager.playTrack(null, 0.0, 0.2);

    }

    this._voiceAudio.volume = AudioController.isMuted() ? 0 : (isSong ? this._musicVolume : this._voiceVolume);

    const startOffset = act.audioOffset || 0;

    if (startOffset > 0) {

      this._voiceAudio.currentTime = startOffset;

    }



    this._voiceAudio.onended = () => {

      this._onActContentFinished(index);

    };



    this._voiceAudio.onloadedmetadata = () => {

      if (!act.duration && this._voiceAudio && Number.isFinite(this._voiceAudio.duration)) {

        this._actDuration = this._voiceAudio.duration;

        act.duration = this._voiceAudio.duration;

      }

    };



    const voiceDelay = act.voiceDelay || (index === 1 ? 3.5 : 0);

    if (voiceDelay > 0) {

      // Voice pause: let ambient establish mood and scene emerge

      // Voice playback will be triggered in update() once _actTime >= voiceDelay!

      this._voiceAudio.pause();

      if (!autoPlay) {

        this._isPlaying = false;

        this._playPauseIcon.text = '▶';

        if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_play');

        if (this._wsPlayPausePressAndRelease) this._wsPlayPausePressAndRelease();

        if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(false);

      } else {

        this._isPlaying = true;

        this._playPauseIcon.text = '⏸';

        if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_pause');

        if (this._wsPlayPausePressAndRelease) this._wsPlayPausePressAndRelease();

        if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(true);

      }

      return;

    }



    if (autoPlay) {

      this._voiceAudio.play().then(() => {

        this._isPlaying = true;

        this._playPauseIcon.text = '⏸';

        if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_pause');

        if (this._wsPlayPausePressAndRelease) this._wsPlayPausePressAndRelease();

        if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(true);

      }).catch((err: unknown) => {

        console.warn('[VoiceAudio] Autoplay blocked, click play to start:', err);

      });

    } else {

      this._voiceAudio.pause();

      this._isPlaying = false;

      this._playPauseIcon.text = '▶';

      if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_play');

      if (this._wsPlayPausePressAndRelease) this._wsPlayPausePressAndRelease();

      if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(false);

    }

  }



  private _onActContentFinished(index: number): void {

    if (this._isTransitioningAct || this._currentActIndex !== index) return;

    this._isTransitioningAct = true;
    AmbientManager.stopCinematicCue(0.3);



    const nextIndex = index + 1;

    if (nextIndex >= STORY_ACTS.length) {

      this._isTransitioningAct = false;

      this._isPlaying = false;

      this._playPauseIcon.text = '▶';

      if (this._wsPlayPauseSprite) this._wsPlayPauseSprite.texture = getTexture('gui_btn_play');

      if (this._wsPlayPausePressAndRelease) this._wsPlayPausePressAndRelease();

      if (this._wsSetPlayPauseLatched) this._wsSetPlayPauseLatched(false);

      return;

    }



    const currentAct = STORY_ACTS[index];
    const nextAct = STORY_ACTS[nextIndex];

    const isNextSong = nextAct && (nextAct.category === 'song' || nextAct.id === 'act_7_song');

    // Continuous voice acts (e.g. act_6_punishment -> act_6_reward from single continuous recording):
    // Zero-wait handover so speech flows continuously without stuttering or restart!
    const isContinuousVoiceTransition = Boolean(
      currentAct && nextAct &&
      currentAct.audioKey && nextAct.audioKey &&
      currentAct.audioKey === nextAct.audioKey &&
      nextAct.audioOffset !== undefined &&
      nextAct.audioOffset > 0
    );

    if (isContinuousVoiceTransition) {
      this.nextAct(2.0);
      return;
    }

    // Universal Musical Intensity Director:

    // Holds the handover until ambient intensity falls/decays into a valley,

    // ensuring transitions never cut off during an emotional swell or musical rise.

    AmbientManager.waitForIntensityDrop({

      minWaitSec: isNextSong ? 2.4 : 1.8,

      maxWaitSec: isNextSong ? 5.5 : 4.8,

      onReady: () => {

        if (this._currentActIndex === index && this._currentActIndex + 1 < STORY_ACTS.length) {

          this.nextAct(2.5);

        }

      },

    });

  }



  public seekAudio(targetSeconds: number): void {

    const clamped = Math.max(0, Math.min(this._actDuration, targetSeconds));

    this._actTime = clamped;

    this._narratorCurrentTexKey = '';

    this._isTransitioningAct = false;

    AmbientManager.cancelWait();

    cancelTween(this._bgSprite);



    if (this._currentActIndex === 0) {

      if (clamped < INTRO_DISCLAIMER_DURATION) {

        this._introAmbientStarted = false;

        // Во время дисклеймера музыки быть не должно

        AmbientManager.playTrack(null, 0.0, 0.0);

        if (this._videoElement) {

          this._videoElement.pause();

          this._videoElement.style.opacity = '0';

        }

      } else {

        const mt = clamped - INTRO_DISCLAIMER_DURATION;

        if (!this._introAmbientStarted) {

          this._introAmbientStarted = true;

          if (!this._isPlaying) {

            AmbientManager.setPaused(true);

          }

          AmbientManager.playTrack(this._introProfile.trackKey, 1.0, 0.0);

        }

        AmbientManager.seekCurrent(mt);

        if (this._isPlaying) {

          AmbientManager.resumeCurrent();

          if (this._videoElement) {

            this._videoElement.style.opacity = '1';

            this._videoElement.play().catch(() => {});

          }

        } else {

          AmbientManager.pauseAll();

          if (this._videoElement) {

            this._videoElement.style.opacity = '1';

            this._videoElement.pause();

          }

        }

      }

      this._updateIntroTimeline(clamped);

    } else {

      const act = STORY_ACTS[this._currentActIndex];

      const offset = act.audioOffset || 0;

      const isPrologue = this._currentActIndex === 1;

      const voiceDelay = act.voiceDelay || (isPrologue ? 3.5 : 0);



      if (this._voiceAudio) {

        if (voiceDelay > 0 && clamped < voiceDelay) {

          this._voiceAudio.pause();

          this._voiceAudio.currentTime = offset;

        } else {

          this._voiceAudio.currentTime = offset + (clamped - voiceDelay);

          if (this._isPlaying) {

            this._voiceAudio.play().catch(() => {});

          } else {

            this._voiceAudio.pause();

          }

        }

      }



      const isSongAct = act.category === 'song' || act.id === 'act_7_song';

      // Ensure the correct ambient background track for this act is active
      const { key: expectedAmbientKey, duckFactor: expectedDuck } = AmbientManager.getTrackForAct(this._currentActIndex, act.id);
      if (expectedAmbientKey) {
        const curKey = AmbientManager.getCurrentTrackKey();
        const curAudio = AmbientManager.getCurrentAudio();
        if (curKey !== expectedAmbientKey || !curAudio) {
          AmbientManager.playTrack(expectedAmbientKey, expectedDuck, 0.0);
        }
      } else if (isSongAct) {
        if (AmbientManager.getCurrentTrackKey() !== null) {
          AmbientManager.playTrack(null, 0.0, 0.0);
        }
      }

      // Sync or stop cinematic cue (нагнетание / dread / peace) at the seek position
      if (!isSongAct) {
        const activeCue = getActiveCueAtTime(act.id, clamped);
        if (activeCue) {
          AmbientManager.syncCinematicCue(activeCue.cueKey, activeCue.offset, this._isPlaying);
        } else {
          AmbientManager.stopCinematicCue(0.2);
        }
      } else {
        AmbientManager.stopCinematicCue(0.0);
      }

      if (this._isPlaying) {

        AmbientManager.resumeCurrent();

      } else {

        AmbientManager.pauseAll();

      }



      this._subtitles.syncToTime(clamped, this._isPlaying);



      // Immediately sync cinematic cut and visual alpha on seek


      if (!isSongAct) {

        const narratorCut = getNarratorShotAtTime(act.id, clamped);

        if (narratorCut) {

          const cutKey = (narratorCut.type === 'character_quote' && !narratorCut.texKey)

            ? `missing_${narratorCut.characterName}_${narratorCut.time}`

            : `${narratorCut.texKey || 'empty'}_${narratorCut.slackKey || ''}_${narratorCut.time}`;

          this._narratorCurrentTexKey = cutKey;

          this._applyCinematicCut(narratorCut, false);

        }

      } else {

        const concertCut = getConcertCutAtTime(clamped);

        if (concertCut) {

          this._concertCurrentTexKey = `${concertCut.texKey}_${concertCut.time}`;

          this._applyConcertCut(concertCut, false);

        }

      }

      if (isPrologue) {

        if (clamped < 18.5) {

          this._bgSprite.alpha = 0;

          if (this._videoElement) {

            this._videoElement.style.opacity = '1';

            if (this._isPlaying) {

              this._videoElement.play().catch(() => {});

            } else {

              this._videoElement.pause();

            }

          }

        } else if (clamped < 21.0) {

          this._bgSprite.alpha = (clamped - 18.5) / 2.5;

          this._syncBgBackdrop();

          if (this._videoElement) {

            if (this._isPlaying) {

              this._videoElement.play().catch(() => {});

            } else {

              this._videoElement.pause();

            }

          }

        } else {

          this._bgSprite.alpha = 1.0;

          if (this._videoElement) this._videoElement.style.opacity = '0';

        }

      }

    }

  }



  private _playIntroAnimation(): void {

    this._introAmbientStarted = false;

    this._introDisclaimerContainer.alpha = 0;

    this._clearDisclaimerLines();

    this._lastDisclaimerCharCount = -1;

    this._lastSeriesSubCharCount = -1;

    this._introLogoSprite.alpha = 0;

    this._introStudiosText.alpha = 0;

    this._introPresentsText.alpha = 0;

    this._introPresentsText.text = '';

    this._introSeriesContainer.alpha = 0;

    this._introSeriesSubtitle.text = '';

    this._introCycleSubtitle.alpha = 0;

    this._introCycleSubtitle.scale.set(1);

    this._cosmicScene.visible = false;



    // During disclaimer: absolute black screen, no stars, total silence

    if (this._videoElement) {

      this._videoElement.pause();

      this._videoElement.currentTime = 0;

      this._videoElement.style.opacity = '0';

    }

  }



  private _clearDisclaimerLines(): void {

    for (const lineText of this._disclaimerLineTexts) {

      lineText.text = '';

    }

  }



  private _showFullDisclaimerWithCursor(cursor: string): void {

    const totalLines = this._disclaimerLines.length;

    for (let i = 0; i < totalLines; i++) {

      const lineText = this._disclaimerLineTexts[i];

      if (!lineText) continue;

      if (i === totalLines - 1) {

        lineText.text = this._disclaimerLines[i].text + cursor;

      } else {

        lineText.text = this._disclaimerLines[i].text;

      }

    }

  }



  private _showFullDisclaimerWithoutCursor(): void {

    for (let i = 0; i < this._disclaimerLines.length; i++) {

      const lineText = this._disclaimerLineTexts[i];

      if (!lineText) continue;

      lineText.text = this._disclaimerLines[i].text;

    }

  }



  private _getDisclaimerCharAt(charIndex: number): string {

    let count = 0;

    for (const l of this._disclaimerLines) {

      if (charIndex <= count + l.text.length) {

        const offset = charIndex - count - 1;

        return l.text[Math.max(0, offset)] || '';

      }

      count += l.text.length;

    }

    return '';

  }



  private _updateDisclaimerTyping(p: number, cursor: string): void {

    const totalChars = this._disclaimerLines.reduce((sum, l) => sum + l.text.length, 0);

    if (totalChars <= 0) return;

    const chars = Math.max(1, Math.min(totalChars, Math.floor(p * totalChars)));



    if (chars !== this._lastDisclaimerCharCount) {

      const activeLineChar = this._getDisclaimerCharAt(chars);

      if (chars % 2 === 0 || activeLineChar === ' ' || activeLineChar === '.' || activeLineChar === ',' || activeLineChar === ':') {

        SFX.playTypewriterTick();

      }

      this._lastDisclaimerCharCount = chars;

    }



    let remaining = chars;

    const totalLines = this._disclaimerLines.length;

    for (let i = 0; i < totalLines; i++) {

      const lineText = this._disclaimerLineTexts[i];

      if (!lineText) continue;

      const lineStr = this._disclaimerLines[i].text;

      const lineLen = lineStr.length;



      if (remaining <= 0) {

        lineText.text = '';

      } else if (remaining < lineLen) {

        lineText.text = lineStr.substring(0, remaining) + cursor;

        remaining = 0;

      } else {

        remaining -= lineLen;

        if (remaining === 0) {

          lineText.text = lineStr + cursor;

        } else {

          lineText.text = lineStr;

        }

      }

    }

  }



  private _updateIntroTimeline(currentTime: number): void {

    const t = currentTime;

    const profile = this._introProfile;



    const discStart = 0.6;

    const discTypeEnd = 8.8;

    const discHoldEnd = 11.6;

    const discFadeEnd = INTRO_DISCLAIMER_DURATION; // 12.8s



    // During disclaimer (0.0s - 12.8s): strictly NO music!

    if (t < discFadeEnd) {

      if (this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== null) {

        this._introAmbientStarted = false;

        AmbientManager.playTrack(null, 0.0, 0.2);

      }

    }



    // Phase A: 0.0s - 0.6s: Pure black screen, disclaimer ambient drone hums

    if (t < discStart) {

      if (this._videoElement) {

        this._videoElement.style.opacity = '0';

        this._videoElement.pause();

      }

      this._introDisclaimerContainer.alpha = 0;

      this._clearDisclaimerLines();

      this._introLogoSprite.alpha = 0;

      this._introStudiosText.alpha = 0;

      this._introPresentsText.alpha = 0;

      this._introSeriesContainer.alpha = 0;

      this._introCycleSubtitle.alpha = 0;

    }

    // Phase B: 0.6s - 8.8s: Pure black screen, disclaimer typing out with real keyboard sounds

    else if (t >= discStart && t < discTypeEnd) {

      if (this._videoElement) {

        this._videoElement.style.opacity = '0';

        this._videoElement.pause();

      }

      const p = (t - discStart) / (discTypeEnd - discStart);

      const cursor = Math.floor(t * 5) % 2 === 0 ? ' ▌' : '  ';

      this._introDisclaimerContainer.alpha = Math.min(1, (t - discStart) / 0.4);

      this._updateDisclaimerTyping(p, cursor);



      this._introLogoSprite.alpha = 0;

      this._introStudiosText.alpha = 0;

      this._introPresentsText.alpha = 0;

      this._introSeriesContainer.alpha = 0;

      this._introCycleSubtitle.alpha = 0;

    }

    // Phase C: 8.8s - 11.6s: Pure black screen, disclaimer holds with blinking cursor

    else if (t >= discTypeEnd && t < discHoldEnd) {

      if (this._videoElement) {

        this._videoElement.style.opacity = '0';

        this._videoElement.pause();

      }

      const cursor = Math.floor(t * 3.5) % 2 === 0 ? ' ▌' : '  ';

      this._introDisclaimerContainer.alpha = 1;

      this._showFullDisclaimerWithCursor(cursor);



      this._introLogoSprite.alpha = 0;

      this._introStudiosText.alpha = 0;

      this._introPresentsText.alpha = 0;

      this._introSeriesContainer.alpha = 0;

      this._introCycleSubtitle.alpha = 0;

    }

    // Phase D: 11.6s - 12.8s: Pure black screen, disclaimer dissolves into void

    else if (t >= discHoldEnd && t < discFadeEnd) {

      if (this._videoElement) {

        this._videoElement.style.opacity = '0';

        this._videoElement.pause();

      }

      const fade = Math.max(0, 1 - (t - discHoldEnd) / (discFadeEnd - discHoldEnd));

      this._introDisclaimerContainer.alpha = fade;

      this._showFullDisclaimerWithoutCursor();



      this._introLogoSprite.alpha = 0;

      this._introStudiosText.alpha = 0;

      this._introPresentsText.alpha = 0;

      this._introSeriesContainer.alpha = 0;

      this._introCycleSubtitle.alpha = 0;

    }

    // =========================================================================

    // AFTER DISCLAIMER: MUSIC BEGINS AND STARS APPEAR! (t >= discFadeEnd)

    // All intro music cues and animations are based on mt = (t - discFadeEnd)

    // =========================================================================

    else {

      this._introDisclaimerContainer.alpha = 0;

      this._clearDisclaimerLines();



      const mt = t - discFadeEnd; // Music time from 0.0s!



      // Stars & Cosmic video ignite!

      if (this._videoElement) {

        const vidFadeIn = Math.min(1, mt / 1.5);

        this._videoElement.style.opacity = String(vidFadeIn);

        if (this._isPlaying && this._videoElement.paused) {

          this._videoElement.play().catch(() => {});

        } else if (!this._isPlaying && !this._videoElement.paused) {

          this._videoElement.pause();

        }

      }



      // Music begins from 0.0s (ignited once smoothly, not every frame!)

      if (this._isPlaying && !this._introAmbientStarted) {

        this._introAmbientStarted = true;

        AmbientManager.playTrack(profile.trackKey, 1.0, 1.5);

        AmbientManager.seekCurrent(mt);

      }



      // Phase 1 (in music): 0.0s - 3.0s: Space video background drift, ambient begins

      if (mt < 3.0) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 2: 3.0s - 9.0s: Skull logo slowly appears over space video

      else if (mt >= 3.0 && mt < 9.0) {

        const p = (mt - 3.0) / 6.0;

        this._introLogoSprite.alpha = Math.min(1, p);

        this._introLogoSprite.scale.set(this._introLogoBaseScale * (0.94 + p * 0.06));

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 3: 9.0s - 14.0s: "STUDIOS" glows into visibility below the skull

      else if (mt >= 9.0 && mt < 14.0) {

        this._introLogoSprite.alpha = 1;

        const p = (mt - 9.0) / 3.5;

        this._introStudiosText.alpha = Math.min(1, p);

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 4: 11.5s - logoDisperseTime: Letters "PRESENTS" type out on screen

      else if (mt >= 11.5 && mt < profile.logoDisperseTime) {

        this._introLogoSprite.alpha = 1;

        this._introStudiosText.alpha = 1;

        const full = 'PRESENTS';

        const typingSpan = Math.max(1.0, profile.logoDisperseTime - 11.5);

        const p = Math.min(1, (mt - 11.5) / typingSpan);

        const chars = Math.floor(p * full.length);

        this._introPresentsText.text = full.substring(0, chars);

        this._introPresentsText.alpha = 1;

        this._introPresentsText.style.letterSpacing = 4;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 5: logoDisperseTime - logoFadeOutTime: Alien-style dispersion and slow fade out into the void

      else if (mt >= profile.logoDisperseTime && mt < profile.logoFadeOutTime) {

        const fadeDur = profile.logoFadeOutTime - profile.logoDisperseTime;

        const fade = Math.max(0, 1 - (mt - profile.logoDisperseTime) / fadeDur);

        this._introLogoSprite.alpha = fade;

        this._introStudiosText.alpha = fade;

        this._introPresentsText.alpha = fade;

        this._introPresentsText.text = 'PRESENTS';

        this._introPresentsText.style.letterSpacing = 4 + (mt - profile.logoDisperseTime) * 1.5;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 6: logoFadeOutTime - titleDropTime: THEATRICAL PAUSE IN THE VOID

      // Tension valley in audio, cosmic video drifts silently, audience holds breath

      else if (mt >= profile.logoFadeOutTime && mt < profile.titleDropTime) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introSeriesSubtitle.text = '';

        this._lastSeriesSubCharCount = -1;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 7: titleDropTime - titleFadeOutTime: MAIN TITLE STRIKE ON MUSICAL DROP!

      // Shows series title and animated typewriter subtitle

      else if (mt >= profile.titleDropTime && mt < profile.titleFadeOutTime) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        const isDesolate = profile.trackKey === 'desolate_cry';

        const fadeSpeed = isDesolate ? 2.5 : 0.7;

        const p = Math.min(1, (mt - profile.titleDropTime) / fadeSpeed);

        this._introSeriesContainer.alpha = p;

        this._introSeriesContainer.scale.set(0.95 + p * 0.05);

        this._introCycleSubtitle.alpha = 0;



        // Subtitle typing letter-by-letter with typewriter tick sound, exactly like disclaimer

        const fullSubText = '[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]';

        const typeStart = profile.titleDropTime + (isDesolate ? 0.6 : 0.3);

        const typeDuration = 1.8;

        if (mt < typeStart) {

          this._introSeriesSubtitle.text = '';

          this._lastSeriesSubCharCount = -1;

        } else if (mt < typeStart + typeDuration) {

          const typeProg = (mt - typeStart) / typeDuration;

          const chars = Math.max(1, Math.min(fullSubText.length, Math.floor(typeProg * fullSubText.length)));

          const cursor = Math.floor(mt * 5) % 2 === 0 ? ' ▌' : '  ';

          this._introSeriesSubtitle.text = fullSubText.substring(0, chars) + cursor;

          if (chars !== this._lastSeriesSubCharCount) {

            SFX.playTypewriterTick();

            this._lastSeriesSubCharCount = chars;

          }

        } else {

          this._introSeriesSubtitle.text = fullSubText;

        }

      }

      // Phase 8: titleFadeOutTime - (titleFadeOutTime + 1.5): Main series logo dissolves completely into void

      else if (mt >= profile.titleFadeOutTime && mt < profile.titleFadeOutTime + 1.5) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesSubtitle.text = '[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]';

        const dissolveDur = 1.5;

        const endFade = Math.max(0, 1 - (mt - profile.titleFadeOutTime) / dissolveDur);

        this._introSeriesContainer.alpha = endFade;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 9: Pause in void after main logo is completely gone

      else if (mt >= profile.titleFadeOutTime + 1.5 && mt < profile.cycleStartTime) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 10: cycleStartTime - cycleFadeOutTime: "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" APPEARS IN CENTER OF SCREEN!

      else if (mt >= profile.cycleStartTime && mt < profile.cycleFadeOutTime) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        const cycleFadeSpeed = 1.0;

        const cp = Math.min(1, (mt - profile.cycleStartTime) / cycleFadeSpeed);

        this._introCycleSubtitle.alpha = cp;

        // Gentle cinematic push forward (0.97 -> 1.03)

        const scaleP = 0.97 + Math.min(0.06, (mt - profile.cycleStartTime) * 0.012);

        this._introCycleSubtitle.scale.set(scaleP);

      }

      // Phase 11: cycleFadeOutTime - (cycleFadeOutTime + 1.5): "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void

      else if (mt >= profile.cycleFadeOutTime && mt < profile.cycleFadeOutTime + 1.5) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        const dissolveDur = 1.5;

        const cycleFade = Math.max(0, 1 - (mt - profile.cycleFadeOutTime) / dissolveDur);

        this._introCycleSubtitle.alpha = cycleFade;

      }

      // Phase 12: Both dissolved; intro ambient resolves naturally in calm valley until introEndTime

      else if (mt >= profile.cycleFadeOutTime + 1.5 && mt < profile.introEndTime) {

        this._introLogoSprite.alpha = 0;

        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;

      }

      // Phase 13: introEndTime+: Seamless handover to Prologue (ambient plays down to quiet valley, then hands over)

      else if (mt >= profile.introEndTime) {

        this.nextAct(2.5);

      }

    }

  }



  public nextPhrase(): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (act && act.cues && act.cues.length > 0) {

      // Find the next subtitle cue ahead of current playback position (+0.3s tolerance)

      const nextCue = act.cues.find((c) => c.start > this._actTime + 0.3);

      if (nextCue) {

        this.seekAudio(nextCue.start);

        return;

      }

    }

    // If no more phrases in this act, advance to the next act

    this.nextAct();

  }



  public previousPhrase(): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (act && act.cues && act.cues.length > 0) {

      // Find the subtitle cue prior to current position (-0.5s tolerance)

      const prevCues = act.cues.filter((c) => c.start < this._actTime - 0.5);

      if (prevCues.length > 0) {

        this.seekAudio(prevCues[prevCues.length - 1].start);

        return;

      } else if (this._actTime > 1.5) {

        // Rewind to beginning of current act

        this.seekAudio(0);

        return;

      }

    }

    this.previousAct();

  }



  public nextAct(crossfadeSec: number = 0): void {

    if (this._currentActIndex + 1 < STORY_ACTS.length) {

      this.goToAct(this._currentActIndex + 1, undefined, crossfadeSec);

    }

  }



  public previousAct(): void {

    if (this._currentActIndex > 0) {

      this.goToAct(this._currentActIndex - 1);

    }

  }



  public get isPlaying(): boolean {

    return this._isPlaying;

  }



  public get currentActIndex(): number {

    return this._currentActIndex;

  }



  public get actTime(): number {

    return this._actTime;

  }



  public play(): void {

    if (this._isPlaying) return;

    this._isPlaying = true;

    this._playPauseIcon.text = '⏸';

    if (this._wsPlayPauseSprite) {

      this._wsPlayPauseSprite.texture = getTexture('gui_btn_pause');

    }

    if (this._wsSetPlayPauseLatched) {

      this._wsSetPlayPauseLatched(true);

    }



    if (this._currentActIndex === 0) {

      if (this._actTime < INTRO_DISCLAIMER_DURATION) {

        this._introAmbientStarted = false;

        // Во время дисклеймера музыки быть не должно

        AmbientManager.playTrack(null, 0.0, 0.2);

      } else {

        if (!this._introAmbientStarted) {

          this._introAmbientStarted = true;

          AmbientManager.playTrack(this._introProfile.trackKey, 1.0, 1.5);

          const mt = Math.max(0, this._actTime - INTRO_DISCLAIMER_DURATION);

          AmbientManager.seekCurrent(mt);

        } else {

          AmbientManager.resumeCurrent();

        }

        if (this._videoElement) this._videoElement.play().catch(() => {});

      }

    } else {

      const act = STORY_ACTS[this._currentActIndex];

      const isPrologue = this._currentActIndex === 1;

      const voiceDelay = act.voiceDelay || (isPrologue ? 3.5 : 0);

      if (this._voiceAudio && this._actTime >= voiceDelay) {

        this._voiceAudio.play().catch(() => {});

      }

      if (isPrologue && this._actTime < 21.0 && this._videoElement) {

        this._videoElement.play().catch(() => {});

      }

      AmbientManager.setPaused(false);
      AmbientManager.resumeCurrent();

    }

  }



  public pause(): void {

    if (!this._isPlaying) return;

    this._isPlaying = false;

    this._playPauseIcon.text = '▶';

    if (this._wsPlayPauseSprite) {

      this._wsPlayPauseSprite.texture = getTexture('gui_btn_play');

    }

    if (this._wsSetPlayPauseLatched) {

      this._wsSetPlayPauseLatched(false);

    }



    if (this._voiceAudio) this._voiceAudio.pause();

    AmbientManager.pauseAll();

    if (this._videoElement) this._videoElement.pause();

  }



  public togglePlayPause(): void {

    if (this._wsPlayPausePressAndRelease) {

      this._wsPlayPausePressAndRelease();

    }

    if (this._isPlaying) {

      this.pause();

    } else {

      this.play();

    }

  }



  public toggleMute(): void {

    SFX.playClick();

    const isMuted = AudioController.toggle();

    this._muteIcon.text = isMuted ? '🔇' : '🔊';

    if (this._wsSetVolLatched) {

      this._wsSetVolLatched(isMuted);

    }

    SFX.setMuted(isMuted);

    AmbientManager.setMuted(isMuted);

    const act = STORY_ACTS[this._currentActIndex];

    const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

    if (this._voiceAudio) {

      this._voiceAudio.muted = isMuted;

      this._voiceAudio.volume = isMuted ? 0 : (isSong ? this._musicVolume : this._voiceVolume);

    }

  }



  public update(dt: number): void {

    AmbientManager.update(dt);



    let currentTime = this._actTime;

    if (this._currentActIndex === 0) {

      if (this._actTime < INTRO_DISCLAIMER_DURATION) {

        if (this._isPlaying) {

          this._actTime += dt;

        } else {

          AmbientManager.pauseAll();

          if (this._videoElement && !this._videoElement.paused) {

            this._videoElement.pause();

          }

        }

        currentTime = this._actTime;

      } else {

        const curAudio = AmbientManager.getCurrentAudio();

        if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {

          currentTime = INTRO_DISCLAIMER_DURATION + curAudio.currentTime;

          this._actTime = currentTime;

        } else if (this._isPlaying) {

          this._actTime += dt;

          currentTime = this._actTime;

        } else {

          currentTime = this._actTime;

          AmbientManager.pauseAll();

          if (curAudio && !curAudio.paused) {

            curAudio.pause();

          }

          if (this._videoElement && !this._videoElement.paused) {

            this._videoElement.pause();

          }

        }

      }

      this._updateIntroTimeline(currentTime);

    } else {

      const act = STORY_ACTS[this._currentActIndex];

      const offset = act.audioOffset || 0;

      const isPrologue = this._currentActIndex === 1;

      const voiceDelay = act.voiceDelay || (isPrologue ? 3.5 : 0);



      if (voiceDelay > 0 && this._actTime < voiceDelay) {

        if (this._isPlaying) {

          this._actTime += dt;

          if (this._actTime >= voiceDelay && this._voiceAudio) {

            this._voiceAudio.currentTime = offset;

            if (!this._voiceAudio.muted) {

              this._voiceAudio.volume = this._voiceVolume;

            }

            this._voiceAudio.play().catch(() => {});

          }

        }

        currentTime = this._actTime;

      } else if (this._voiceAudio && Number.isFinite(this._voiceAudio.currentTime)) {

        if (this._isPlaying) {

          if (this._voiceAudio.paused && !this._voiceAudio.ended) {

            this._voiceAudio.play().catch(() => {});

          }

          currentTime = voiceDelay + Math.max(0, this._voiceAudio.currentTime - offset);

          this._actTime = currentTime;

        } else {

          if (!this._voiceAudio.paused) {

            this._voiceAudio.pause();

          }

          AmbientManager.pauseAll();

          currentTime = this._actTime;

        }



        // Check for split-file audio track boundary (e.g. Act 6 punishment ends at 63.46s, but file continues to 159.19s)

        const isSplitAct = offset === 0 && Number.isFinite(this._voiceAudio.duration) && this._voiceAudio.duration > (this._actDuration + 2.0);

        if (isSplitAct && this._actDuration > 0 && currentTime >= this._actDuration) {

          this._onActContentFinished(this._currentActIndex);

        } else if (this._actDuration > 0 && currentTime >= this._actDuration + 1.5) {

          // Generous fallback only if onended never triggered after a 1.5s buffer

          this._onActContentFinished(this._currentActIndex);

        }

      } else if (this._isPlaying) {

        this._actTime += dt;

        currentTime = this._actTime;

        if (!this._voiceAudio && this._actDuration > 0 && currentTime >= this._actDuration) {

          this._onActContentFinished(this._currentActIndex);

        }

      } else {

        AmbientManager.pauseAll();

        currentTime = this._actTime;

      }



      // In Prologue (Act 1): cosmic space video plays until 18.5s, then crossfades into the background scene

      if (this._currentActIndex === 1) {

        if (currentTime < 18.5) {

          this._bgSprite.alpha = 0;

          if (this._videoElement) {

            if (this._videoElement.style.opacity !== '1') this._videoElement.style.opacity = '1';

            if (this._isPlaying && this._videoElement.paused) this._videoElement.play().catch(() => {});

          }

        } else if (currentTime < 21.0) {

          this._bgSprite.alpha = (currentTime - 18.5) / 2.5;

          this._syncBgBackdrop();

          if (this._videoElement && this._isPlaying && this._videoElement.paused) {

            this._videoElement.play().catch(() => {});

          }

        } else {

          this._bgSprite.alpha = 1.0;

          if (this._videoElement && this._videoElement.style.opacity !== '0') {

            this._videoElement.style.opacity = '0';

            setTimeout(() => {

              if (this._currentActIndex === 1 && this._actTime >= 21.0 && this._videoElement) {

                this._videoElement.pause();

              }

            }, 1200);

          }

        }

      }



      // In AI-Lord Concert Sequence (act_7_song): Dynamic Montage cut system synced to drums/beats!

      const isSongAct = act && (act.id === 'act_7_song' || act.category === 'song');

      if (isSongAct) {

        const activeCut = getConcertCutAtTime(currentTime);

        const concertCutKey = `${activeCut.texKey}_${activeCut.time}`;

        if (this._concertCurrentTexKey !== concertCutKey) {

          const isInitial = !this._concertCurrentTexKey;

          this._concertCurrentTexKey = concertCutKey;

          this._applyConcertCut(activeCut, !isInitial);

        }

      }



      // In AI-Lord Narration Acts: Dynamic cinematic shot switching (Team Quotes, Events, AI-Lord shots)

      if (!isSongAct && act) {

        const narratorCut = getNarratorShotAtTime(act.id, currentTime);

        if (narratorCut) {

          const cutKey = (narratorCut.type === 'character_quote' && !narratorCut.texKey)

            ? `missing_${narratorCut.characterName}_${narratorCut.time}`

            : `${narratorCut.texKey || 'empty'}_${narratorCut.slackKey || ''}_${narratorCut.time}`;



          if (this._narratorCurrentTexKey !== cutKey) {

            const isInitial = !this._narratorCurrentTexKey;

            this._narratorCurrentTexKey = cutKey;

            this._applyCinematicCut(narratorCut, !isInitial);

          }

        }

      }



      this._subtitles.update(dt);

      this._subtitles.syncToTime(currentTime, this._isPlaying);



      // Real-time Voice Presence Sidechain: Ducks ambient and sound cues when someone speaks or sings

      const isVoiceSpeaking = this._isPlaying && this._subtitles.isVoiceActive(currentTime);

      AmbientManager.setVoiceActive(isVoiceSpeaking);



      if (this._isPlaying) {

        this._updateQuoteBadgeTyping(dt);

      }

    }



    // Update progress bar & timecode

    const curSec = Math.floor(currentTime);

    const totSec = Math.floor(this._actDuration);

    const formatTime = (s: number) => {

      const m = Math.floor(s / 60);

      const rem = s % 60;

      return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;

    };

    const overallCurSec = Math.floor((this._actStartTimes[this._currentActIndex] || 0) + currentTime);

    const overallTotSec = Math.floor(this._totalMovieDuration);

    this._timeCodeText.text = `${formatTime(curSec)} / ${formatTime(totSec)}  •  ${formatTime(overallCurSec)} / ${formatTime(overallTotSec)}`;

    if (this._wsLcdText) {

      this._wsLcdText.text = `${formatTime(overallCurSec)} / ${formatTime(overallTotSec)}`;

    }



    const progress = Math.min(1, currentTime / Math.max(1, this._actDuration));

    this._renderProgressBar(progress);



    // Autohide HUD sliding logic (crawling away with easing & overmove)

    if (this._isPlaying && !this._isUiHovered && !this._isTimelineDragging) {

      this._autohideTimer = Math.max(0, this._autohideTimer - dt);

      if (this._autohideTimer <= 0 && this._hudIsVisible) {

        this._hudIsVisible = false;

        cancelTween(this._hudAnimState);

        tween(this._hudAnimState, { p: 0.0 }, 0.55, ease.inBack);

      }

    } else {

      if (!this._hudIsVisible) {

        this._hudIsVisible = true;

        cancelTween(this._hudAnimState);

        tween(this._hudAnimState, { p: 1.0 }, 0.45, ease.outBack);

      }

      this._autohideTimer = 2.5;

    }



    const p = this._hudAnimState.p;

    const barH = 161 * this._wsGuiScale;

    const baseY = this._screenHeight - barH;

    const hiddenY = this._screenHeight + 24;

    const currentBarY = hiddenY + (baseY - hiddenY) * p;

    this._playerBarContainer.position.set(0, currentBarY);



    // Notify Subtitles of visible bottom HUD height to lift text dynamically

    const visibleBarHeight = Math.max(0, this._screenHeight - currentBarY);

    this._subtitles.setBottomOffset(visibleBarHeight);



    // Subtle fade of bottom vignette backdrop in sync with HUD

    this._vignetteGraphics.alpha = Math.max(0, Math.min(0.9, p * 0.9));



    // Top headers slide slightly upwards with matching curve

    const headerP = Math.max(0, Math.min(1, p));

    const headerOffset = (1 - headerP) * -80;

    const isPortrait = this._screenHeight > this._screenWidth;

    this._badgeText.position.set(24, 14 + headerOffset);

    this._titleText.position.set(24, 32 + headerOffset);

    this._subtitleText.position.set(24, (isPortrait ? 54 : 58) + headerOffset);



    if (this._app.canvas) {

      if (!this._hudIsVisible && p <= 0.05 && this._isPlaying) {

        this._app.canvas.style.cursor = 'none';

      } else {

        this._app.canvas.style.cursor = 'default';

      }

    }



    // Star Wars Optical Wipe Transition

    if (this._isWiping) {

      this._wipeProgress += dt / this._wipeDuration;

      if (this._wipeProgress >= 1.0) {

        this._cancelWipe();

      } else {

        this._updateWipeGraphics();

      }

    }



    if (this._prevBgSprite && this._prevBgSprite.visible) {

      this._prevBgSprite.position.set(this._screenWidth / 2, this._screenHeight / 2);

    }



    // Subtle background drift & concert camera impulse

    if (this._concertPunchScale > 1.001) {

      this._concertPunchScale += (1.0 - this._concertPunchScale) * Math.min(1, dt * 10);

    } else {

      this._concertPunchScale = 1.0;

    }



    if (this._bgContainer.visible && this._bgSprite.texture && this._bgSprite.texture.width > 0) {

      const isShipFlyby = this._currentActIndex === 1 && this._prologueCurrentTexKey === 'ship_cistam' && currentTime < 68.54;

      if (isShipFlyby) {

        const isPortrait = this._screenHeight > this._screenWidth;

        // Anchor centered on ship's center of mass (1024x576 texture coordinates)

        this._bgSprite.anchor.set(0.5684, 0.5243);



        // Timeline progression of ship flyby:

        // Starts appearing at ~18.5s, explicitly told about from 19.5s ("вечно несется исполинский ковчег «Цитадель»").

        // Finishes when it arrives at the center of the screen at ~68.0s ("Пыльные тонированные окна нависают над зияющей бездной").

        const tStart = 19.5;

        const tEnd = 68.0;

        const rawP = Math.min(1.0, Math.max(0.0, (currentTime - tStart) / (tEnd - tStart)));

        // Smooth cinematic ease (smoothstep)

        const p = rawP * rawP * (3.0 - 2.0 * rawP);



        // Scale: Moderate increase (~14% zoom in landscape, not too aggressive)

        const scaleStart = this._bgBaseScale * (isPortrait ? 1.05 : 1.12);

        const scaleEnd = this._bgBaseScale * (isPortrait ? 1.18 : 1.28);

        const curScale = scaleStart + (scaleEnd - scaleStart) * p;



        // Position: Starts shifted to the right as far as the background allows (left edge at 0),

        // and ends when the ship is positioned precisely in the center of the screen!

        const texWScr = this._bgSprite.texture.width * curScale;

        const maxShiftX = 0.5684 * texWScr;

        const startX = isPortrait ? Math.min(maxShiftX, this._screenWidth * 0.70) : maxShiftX;

        const endX = this._screenWidth / 2;

        const curX = startX + (endX - startX) * p;



        // Vertical positioning: Keep ship centered vertically with slight cosmetic breathing

        const curY = this._screenHeight / 2;



        // Gentle cosmic ambient breathing/hover

        const floatY = Math.sin(currentTime * 0.5) * 4;

        const floatX = Math.cos(currentTime * 0.4) * 2;



        this._bgSprite.scale.set(curScale);

        this._bgSprite.position.set(curX + floatX, curY + floatY);

      } else {

        this._bgSprite.anchor.set(0.5, 0.5);
        this._shotElapsed += dt;

        // Vizavi Motion: Subtle organic camera push-in (max 2.8%) + slow ambient breathing
        const driftT = Math.min(8.0, this._shotElapsed);
        const kenBurnsScale = 1.0 + 0.028 * (driftT / 8.0);
        const breathX = Math.sin(currentTime * 0.35 + this._shotDriftSeed) * 3.5;
        const breathY = Math.cos(currentTime * 0.28 + this._shotDriftSeed) * 2.5;

        const effectiveScale = this._bgBaseScale * kenBurnsScale * this._concertPunchScale;
        this._bgSprite.scale.set(effectiveScale);
        this._bgSprite.position.set(this._screenWidth / 2 + breathX, this._screenHeight / 2 + breathY);

      }

    }

  }



  private _applyConcertCut(cut: ConcertFrameCut, punch: boolean = true): void {
    try {
      if (cut.ambientCueKey) {
        AmbientManager.playCinematicCue(cut.ambientCueKey);
      }

      const tex = getTexture(cut.texKey);

      if (tex && tex !== Texture.WHITE && tex.width > 1) {

        this._bgSprite.texture = tex;

      }

      this._resizeBgSprite();

      this._bgSprite.alpha = 1.0; // Hard cut on the beat! No slow fade!

      this._concertPunchScale = 1.0;

      // Always hide Slack screenshot popups during song act per user rule: "Но без скриншотов из слек"
      this._subtitles.hideSlackPopup(true);

      // Show real character portrait & avatar badge with name and rank
      if (cut.characterName) {
        const color = cut.characterThemeColor || 0x00f5d4;
        const role = cut.characterRole || '';
        this._showCornerQuoteBadge(cut.characterName, role, color, cut.texKey);
      } else {
        this._hideCornerQuoteBadge();
      }

    } catch (err) {

      console.warn('[MovieApp] Concert cut error:', err);

    }

  }



  private _resizePrevBgSprite(): void {

    if (this._prevBgSprite && this._prevBgSprite.texture && this._prevBgSprite.texture.width > 0) {

      const texW = this._prevBgSprite.texture.width;

      const texH = this._prevBgSprite.texture.height;

      const scaleW = this._screenWidth / texW;

      const scaleH = this._screenHeight / texH;

      const coverScale = Math.max(scaleW, scaleH);

      const containScale = Math.min(scaleW, scaleH);

      const maxAllowedZoom = containScale * 1.15;

      const effectiveScale = Math.min(coverScale, Math.max(containScale, maxAllowedZoom));

      this._prevBgSprite.scale.set(effectiveScale);

      this._prevBgSprite.position.set(this._screenWidth / 2, this._screenHeight / 2);

    }

  }



  private _cancelWipe(): void {

    this._isWiping = false;

    this._bgSprite.mask = null;

    this._prevBgSprite.visible = false;

    this._wipeMask.clear();

    this._wipeEdgeGraphics.clear();

  }



  private _startStarWarsWipe(prevTex: Texture, newTex: Texture): void {

    if (!prevTex || prevTex === Texture.WHITE || prevTex === newTex) return;



    if (this._isWiping) {

      this._cancelWipe();

    }



    this._prevBgSprite.texture = prevTex;

    this._prevBgSprite.visible = true;

    this._resizePrevBgSprite();



    this._bgSprite.texture = newTex;

    this._resizeBgSprite();

    this._bgSprite.mask = this._wipeMask;



    const wipeTypes: ('line_lr' | 'line_rl' | 'line_tb' | 'circle_iris' | 'circle_iris_corner')[] = [

      'line_lr',

      'line_rl',

      'line_tb',

      'circle_iris',

      'circle_iris_corner',

    ];

    this._wipeType = wipeTypes[Math.floor(Math.random() * wipeTypes.length)];

    this._wipeProgress = 0.0;

    this._wipeDuration = 2.2; // Genuine George Lucas Star Wars ~1250ms unhurried optical print wipe

    this._isWiping = true;



    this._updateWipeGraphics();

  }



  private _updateWipeGraphics(): void {

    const w = this._screenWidth;

    const h = this._screenHeight;

    const p = Math.min(1.0, Math.max(0.0, this._wipeProgress));



    this._wipeMask.clear();

    this._wipeEdgeGraphics.clear();



    if (p <= 0.0) return;



    if (this._wipeType === 'line_lr') {

      const curX = w * p;

      this._wipeMask.rect(0, 0, curX, h);

      this._wipeMask.fill({ color: 0xffffff });

    } else if (this._wipeType === 'line_rl') {

      const curX = w * (1.0 - p);

      this._wipeMask.rect(curX, 0, w - curX, h);

      this._wipeMask.fill({ color: 0xffffff });

    } else if (this._wipeType === 'line_tb') {

      const curY = h * p;

      this._wipeMask.rect(0, 0, w, curY);

      this._wipeMask.fill({ color: 0xffffff });

    } else if (this._wipeType === 'circle_iris') {

      const cx = w / 2;

      const cy = h / 2;

      const maxRadius = Math.hypot(cx, cy);

      const r = maxRadius * p;

      this._wipeMask.circle(cx, cy, r);

      this._wipeMask.fill({ color: 0xffffff });

    } else if (this._wipeType === 'circle_iris_corner') {

      const cx = w * 0.85;

      const cy = h * 0.2;

      const maxRadius = Math.hypot(cx, h - cy) * 1.15;

      const r = maxRadius * p;

      this._wipeMask.circle(cx, cy, r);

      this._wipeMask.fill({ color: 0xffffff });

    }

  }



  private _setBgTextureWithWipe(newTex: Texture, allowWipe: boolean): void {

    if (!newTex || newTex === Texture.WHITE || newTex.width <= 1) return;

    if (this._isWiping && this._bgSprite.texture === newTex) {
      return;
    }

    const oldTex = this._bgSprite.texture;

    const canWipe = (

      allowWipe &&

      oldTex &&

      oldTex !== Texture.WHITE &&

      oldTex.width > 1 &&

      oldTex !== newTex &&

      this._bgSprite.visible &&

      this._bgSprite.alpha > 0.8 &&

      STORY_ACTS[this._currentActIndex]?.id !== 'act_7_song' &&

      STORY_ACTS[this._currentActIndex]?.category !== 'song' &&

      this._currentActIndex !== 0 &&  // Intro

      this._currentActIndex !== 1     // Prologue space flyby

    );



    if (canWipe) {

      this._startStarWarsWipe(oldTex, newTex);

    } else {

      if (this._isWiping) {

        this._cancelWipe();

      }

      this._bgSprite.texture = newTex;

      this._resizeBgSprite();

    }

  }



  private _initQuoteAndMissingImageHUD(): void {

    // 1. Missing Image Overlay (Solid black screen with "ТРЕБУЕТСЯ ИЗОБРАЖЕНИЕ")

    this._missingImageOverlay = new Container();

    this._missingImageOverlay.visible = false;

    this._bgContainer.addChild(this._missingImageOverlay);



    this._missingImageBg = new Graphics();

    this._missingImageOverlay.addChild(this._missingImageBg);



    const warnTitleStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 26,

      fontWeight: 'bold',

      fill: '#ff3344',

      letterSpacing: 3,

      dropShadow: { alpha: 0.8, blur: 10, color: '#ff0033', distance: 0 },

    });

    this._missingImageTitle = new Text({ text: '[ ⚠️ ТРЕБУЕТСЯ ИЗОБРАЖЕНИЕ ]', style: warnTitleStyle });

    this._missingImageTitle.anchor.set(0.5);

    this._missingImageOverlay.addChild(this._missingImageTitle);



    const warnSubStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 13,

      fill: '#64748b',

      letterSpacing: 1.5,

    });

    this._missingImageSubtitle = new Text({ text: '[ КАДР ОТСУТСТВУЕТ В ПАПКЕ FIN ]', style: warnSubStyle });

    this._missingImageSubtitle.anchor.set(0.5);

    this._missingImageOverlay.addChild(this._missingImageSubtitle);



    const charStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 15,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 2,

    });

    this._missingImageCharText = new Text({ text: '', style: charStyle });

    this._missingImageCharText.anchor.set(0.5);

    this._missingImageOverlay.addChild(this._missingImageCharText);



    // 2. Corner Quote Nameplate Badge (Top-left: Square Avatar + 2 Lines: Name & Ark Role)

    this._cornerQuoteBadge = new Container();

    this._cornerQuoteBadge.visible = false;



    this._cornerQuoteBg = new Graphics();

    this._cornerQuoteBadge.addChild(this._cornerQuoteBg);



    // Square avatar container with mask and border

    this._cornerQuoteAvatarContainer = new Container();

    this._cornerQuoteBadge.addChild(this._cornerQuoteAvatarContainer);



    this._cornerQuoteAvatarSprite = new Sprite();

    this._cornerQuoteAvatarContainer.addChild(this._cornerQuoteAvatarSprite);



    this._cornerQuoteAvatarMask = new Graphics();

    this._cornerQuoteAvatarSprite.mask = this._cornerQuoteAvatarMask;

    this._cornerQuoteAvatarContainer.addChild(this._cornerQuoteAvatarMask);



    this._cornerQuoteAvatarBorder = new Graphics();

    this._cornerQuoteAvatarContainer.addChild(this._cornerQuoteAvatarBorder);



    // Line 1: Name

    this._cornerQuoteName = new Text({

      text: '',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 28,

        fontWeight: 'bold',

        fill: '#ffffff',

        letterSpacing: 1.2,

        dropShadow: { alpha: 0.8, blur: 6, color: '#000000', distance: 1 },

      }),

    });

    this._cornerQuoteBadge.addChild(this._cornerQuoteName);



    // Line 2: Role on "Сыгравший в ящик"

    this._cornerQuoteRole = new Text({

      text: '',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 22,

        fontWeight: '500',

        fill: '#00f5d4',

        letterSpacing: 0.5,

        dropShadow: { alpha: 0.7, blur: 4, color: '#000000', distance: 1 },

      }),

    });

    this._cornerQuoteBadge.addChild(this._cornerQuoteRole);

  }



  private _applyCinematicCut(cut: NarratorShotCut, punch: boolean = true): void {

    try {

      if (this._currentActIndex === 1) {

        this._prologueCurrentTexKey = cut.texKey || '';

      }



      if (!cut.texKey) {

        // Space establishing shot: Hide sprite, show cosmic void video

        this._hideCornerQuoteBadge();

        this._missingImageOverlay.visible = false;

        this._bgSprite.alpha = 0;

        if (this._videoElement) {

          this._videoElement.style.opacity = '1';

          if (this._isPlaying) {

            this._videoElement.play().catch(() => {});

          }

        }

        return;

      } else {

        if (this._videoElement && this._currentActIndex !== 1) {

          this._videoElement.style.opacity = '0';

        }

      }



      const isQuote = cut.type === 'character_quote';

      const hasImage = Boolean(cut.texKey && hasTexture(cut.texKey));



      const isSlackTex = Boolean(cut.texKey && (

        /^\d{2}_/.test(cut.texKey) ||

        cut.texKey.startsWith('01c_') ||

        cut.texKey.startsWith('01d_')

      ));



      // Show floating Slack screenshot overlay without stretching across the screen

      if (cut.ambientCueKey) {
        AmbientManager.playCinematicCue(cut.ambientCueKey);
      }

      if (cut.slackKey) {
        this._subtitles.showSlackPopup(cut.slackKey);

      } else if (isSlackTex && cut.texKey) {

        this._subtitles.showSlackPopup(cut.texKey);

      } else {
        // Do not kill active Slack popup on cuts - let 10s hold timer finish naturally
      }



      if (isQuote) {

        this._showCornerQuoteBadge(

          cut.characterName || 'ПЕРСОНАЖ КОВЧЕГА',

          cut.characterRole || '',

          cut.characterThemeColor || 0x00f5d4,

          cut.texKey

        );



        if (hasImage && cut.texKey && !isSlackTex) {

          this._missingImageOverlay.visible = false;

          this._bgSprite.visible = true;

          const tex = getTexture(cut.texKey);

          this._setBgTextureWithWipe(tex, false);

          this._bgSprite.alpha = 1.0;

        } else if (!hasImage && !isSlackTex) {

          // РЕЖИССУРА: Если кадра персонажа нет в Fin, показываем Рассказчика ИИ Лорда + плашку цитаты персонажа!

          this._missingImageOverlay.visible = false;

          this._bgSprite.visible = true;

          const fallbackTex = getTexture('ai_lord_throne_book_reading_narrator');

          this._setBgTextureWithWipe(fallbackTex, false);

          this._bgSprite.alpha = 1.0;

        }

      } else {

        this._hideCornerQuoteBadge();

        this._missingImageOverlay.visible = false;

        this._bgSprite.visible = true;



        const effectiveTexKey = (hasImage && cut.texKey && !isSlackTex)

          ? cut.texKey

          : 'ai_lord_throne_book_reading_narrator';



        const tex = getTexture(effectiveTexKey);

        this._setBgTextureWithWipe(tex, false);

        // In Prologue (Act 1), the ship emerges smoothly between 18.5s - 21.0s; never flash at 1.0 before 18.5s

        if (this._currentActIndex === 1 && this._actTime < 18.5) {

          this._bgSprite.alpha = 0;

        } else if (this._currentActIndex === 1 && this._actTime < 21.0) {

          this._bgSprite.alpha = (this._actTime - 18.5) / 2.5;

          this._syncBgBackdrop();

        } else {

          this._bgSprite.alpha = 1.0;

        }

      }



      this._concertPunchScale = 1.0;

    } catch (err) {

      console.warn('[MovieApp] Cinematic cut error:', err);

    }

  }



  private _showMissingImage(characterName: string): void {

    this._missingImageOverlay.visible = true;

    this._missingImageCharText.text = `ПЕРСОНАЖ: ${characterName.toUpperCase()}`;

    this._resizeMissingImageOverlay();

  }



  private _resizeMissingImageOverlay(): void {

    const w = this._screenWidth;

    const h = this._screenHeight;

    this._missingImageBg.clear();

    this._missingImageBg.rect(0, 0, w, h);

    this._missingImageBg.fill({ color: 0x000000, alpha: 1.0 });



    this._missingImageTitle.position.set(w / 2, h / 2 - 30);

    this._missingImageSubtitle.position.set(w / 2, h / 2 + 10);

    this._missingImageCharText.position.set(w / 2, h / 2 + 38);

  }



  private _showCornerQuoteBadge(name: string, role: string, color: number, texKey?: string | null): void {

    this._currentQuoteColor = color;

    const fullName = `[ ${name.toUpperCase().trim()} ]`;

    const arkRole = `[ ${getCrewArkRole(name, role).toUpperCase().trim()} ]`;

    const roleColor = '#00f5d4';



    // Square avatar texture

    const avatarTex = getCrewAvatarTexture(name, texKey);

    this._currentQuoteAvatarTex = avatarTex;



    // Check if this character's badge is being shown for the first time

    const isSong = STORY_ACTS[this._currentActIndex]?.id === 'act_7_song' || STORY_ACTS[this._currentActIndex]?.category === 'song';
    const isFirstTime = !this._seenCharacterQuotes.has(fullName);

    this._seenCharacterQuotes.add(fullName);



    if (isFirstTime && !isSong) {

      // First time: layout badge based on full dimensions, but start typing text letter-by-letter with keyboard sound

      this._cornerQuoteName.text = fullName;

      this._cornerQuoteRole.text = arkRole;

      this._cornerQuoteName.style.fill = '#ffffff';

      (this._cornerQuoteName.style as any).dropShadow = { alpha: 0.85, blur: 8, color: '#ff5e1a', distance: 0 };

      this._cornerQuoteRole.style.fill = roleColor;

      (this._cornerQuoteRole.style as any).dropShadow = { alpha: 0.85, blur: 8, color: '#00f5d4', distance: 0 };

      this._positionCornerQuoteBadge(color, avatarTex);



      this._quoteBadgeTyping = {

        active: true,

        elapsed: 0,

        fullName: fullName,

        fullRole: arkRole,

        lastCharCount: -1,

      };

      this._cornerQuoteName.text = '▌';

      this._cornerQuoteRole.text = '';

      this._cornerQuoteBadge.visible = true;

    } else {

      // Not first time: appears abruptly! Full text immediately, zero delay, no typing sound

      this._quoteBadgeTyping.active = false;

      this._cornerQuoteName.text = fullName;

      this._cornerQuoteRole.text = arkRole;

      this._cornerQuoteName.style.fill = '#ffffff';

      (this._cornerQuoteName.style as any).dropShadow = { alpha: 0.85, blur: 8, color: '#ff5e1a', distance: 0 };

      this._cornerQuoteRole.style.fill = roleColor;

      (this._cornerQuoteRole.style as any).dropShadow = { alpha: 0.85, blur: 8, color: '#00f5d4', distance: 0 };

      this._cornerQuoteBadge.visible = true;

      this._positionCornerQuoteBadge(color, avatarTex);

    }

  }



  private _hideCornerQuoteBadge(): void {

    this._cornerQuoteBadge.visible = false;

    this._quoteBadgeTyping.active = false;

  }



  private _updateQuoteBadgeTyping(dt: number): void {

    if (!this._quoteBadgeTyping.active || !this._cornerQuoteBadge.visible) return;



    this._quoteBadgeTyping.elapsed += dt;

    const { fullName, fullRole, elapsed } = this._quoteBadgeTyping;

    const totalChars = fullName.length + fullRole.length;

    if (totalChars <= 0) {

      this._quoteBadgeTyping.active = false;

      return;

    }



    // Teletype typing speed: 32 characters per second

    const charsPerSec = 32;

    const typed = Math.min(totalChars, Math.floor(elapsed * charsPerSec));



    if (typed !== this._quoteBadgeTyping.lastCharCount) {

      this._quoteBadgeTyping.lastCharCount = typed;

      // Real recorded keyboard keystroke sound

      SFX.playTypewriterTick();

    }



    const cursor = '▌';



    if (typed < fullName.length) {

      // Typing line 1 (Name)

      this._cornerQuoteName.text = fullName.substring(0, typed) + cursor;

      this._cornerQuoteRole.text = '';

    } else if (typed < totalChars) {

      // Line 1 is done, typing line 2 (Ark role)

      this._cornerQuoteName.text = fullName;

      const roleTyped = typed - fullName.length;

      this._cornerQuoteRole.text = fullRole.substring(0, roleTyped) + cursor;

    } else {

      // Complete! Remove cursor

      this._cornerQuoteName.text = fullName;

      this._cornerQuoteRole.text = fullRole;

      this._quoteBadgeTyping.active = false;

    }

  }



  private _positionCornerQuoteBadge(
    color: number = this._currentQuoteColor,
    tex: Texture | null = this._currentQuoteAvatarTex
  ): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    const isPortrait = h > w;

    // Doubled avatar size (~2x) for prominent cinematic presence
    const avatarSize = isPortrait ? 92 : 108;
    const pad = isPortrait ? 12 : 16;

    this._cornerQuoteAvatarContainer.position.set(pad, pad);

    const hasAvatar = Boolean(tex && tex !== Texture.WHITE && tex.width > 0);
    if (hasAvatar && tex) {
      this._cornerQuoteAvatarSprite.visible = true;
      this._cornerQuoteAvatarSprite.texture = tex;

      const scale = Math.max(avatarSize / tex.width, avatarSize / tex.height);
      this._cornerQuoteAvatarSprite.width = tex.width * scale;
      this._cornerQuoteAvatarSprite.height = tex.height * scale;
      this._cornerQuoteAvatarSprite.position.set(
        - (this._cornerQuoteAvatarSprite.width - avatarSize) / 2,
        - (this._cornerQuoteAvatarSprite.height - avatarSize) / 2
      );

      this._cornerQuoteAvatarMask.clear();
      this._cornerQuoteAvatarMask.roundRect(0, 0, avatarSize, avatarSize, 10);
      this._cornerQuoteAvatarMask.fill({ color: 0xffffff });

      this._cornerQuoteAvatarBorder.clear();
      this._cornerQuoteAvatarBorder.roundRect(0, 0, avatarSize, avatarSize, 10);
      this._cornerQuoteAvatarBorder.stroke({ color: 0x333333, width: 2, alpha: 0.5 });
    } else {
      this._cornerQuoteAvatarSprite.visible = false;
      this._cornerQuoteAvatarMask.clear();
      this._cornerQuoteAvatarBorder.clear();
    }

    const textX = hasAvatar ? pad + avatarSize + (isPortrait ? 16 : 22) : pad + 12;
    // Doubled font size (~2x)
    this._cornerQuoteName.style.fontSize = isPortrait ? 24 : 28;
    this._cornerQuoteRole.style.fontSize = isPortrait ? 18 : 22;

    this._cornerQuoteName.position.set(textX, pad + (isPortrait ? 8 : 12));
    this._cornerQuoteRole.position.set(textX, pad + (isPortrait ? 48 : 58));

    // When typing, measure full text bounds so badge box doesn't jitter during typing
    let textW: number;
    if (this._quoteBadgeTyping.active && this._quoteBadgeTyping.fullName) {
      const origName = this._cornerQuoteName.text;
      const origRole = this._cornerQuoteRole.text;
      this._cornerQuoteName.text = this._quoteBadgeTyping.fullName;
      this._cornerQuoteRole.text = this._quoteBadgeTyping.fullRole;
      textW = Math.max(this._cornerQuoteName.bounds.width, this._cornerQuoteRole.bounds.width);
      this._cornerQuoteName.text = origName;
      this._cornerQuoteRole.text = origRole;
    } else {
      textW = Math.max(this._cornerQuoteName.bounds.width, this._cornerQuoteRole.bounds.width);
    }
    const badgeW = Math.max(isPortrait ? 380 : 480, textX + textW + pad + 24);
    const badgeH = avatarSize + pad * 2;

    this._cornerQuoteBg.clear();
    this._cornerQuoteBg.roundRect(0, 0, badgeW, badgeH, 10);
    this._cornerQuoteBg.fill({ color: 0x000000, alpha: 0.94 });

    const badgeX = isPortrait ? 16 : 28;
    const badgeY = isPortrait ? 24 : 28;
    this._cornerQuoteBadge.position.set(badgeX, badgeY);
  }

  private _applyNarratorCut(texKey: string, punch: boolean = true): void {

    try {

      const tex = getTexture(texKey);

      if (tex && tex !== Texture.WHITE && tex.width > 1) {

        this._bgSprite.texture = tex;

      }

      this._resizeBgSprite();

      this._bgSprite.alpha = 1.0; // Clean cinematic hard cut

      this._concertPunchScale = 1.0;

    } catch (err) {

      console.warn('[MovieApp] Narrator cut error:', err);

    }

  }



  private _syncBgBackdrop(): void {

    if (!this._bgBackdropSprite || !this._bgSprite || !this._bgSprite.texture) return;

    this._bgBackdropSprite.texture = this._bgSprite.texture;

    this._bgBackdropSprite.alpha = this._bgSprite.alpha * 0.45;

    this._bgBackdropSprite.visible = false;

  }



  private _resizeBgSprite(): void {

    if (this._bgSprite.texture && this._bgSprite.texture.width > 0) {

      const texW = this._bgSprite.texture.width;

      const texH = this._bgSprite.texture.height;



      const scaleW = this._screenWidth / texW;

      const scaleH = this._screenHeight / texH;

      const coverScale = Math.max(scaleW, scaleH);

      const containScale = Math.min(scaleW, scaleH);



      // Intelligent Anti-Crop System:

      // Prevents aggressive over-zooming on widescreen/ultrawide/portrait (caps at contain * 1.15)

      const maxAllowedZoom = containScale * 1.15;

      const effectiveScale = Math.min(coverScale, Math.max(containScale, maxAllowedZoom));

      this._bgBaseScale = effectiveScale;



      const finalScale = this._bgBaseScale;

      this._bgSprite.scale.set(finalScale);



      const renderedW = texW * finalScale;

      const renderedH = texH * finalScale;



      // YouTube Shorts Style Background Extension:

      // If the sharp foreground image doesn't fill the entire screen (bars on sides or top/bottom),

      // duplicate it behind with a zoomed blur to fill the black gaps seamlessly!

      if (this._bgBackdropSprite) {

        if (renderedW < this._screenWidth - 1 || renderedH < this._screenHeight - 1) {

          this._bgBackdropSprite.texture = this._bgSprite.texture;

          const bgCoverScale = Math.max(this._screenWidth / texW, this._screenHeight / texH) * 1.12;

          this._bgBackdropSprite.scale.set(bgCoverScale);

          this._bgBackdropSprite.position.set(this._screenWidth / 2, this._screenHeight / 2);

          this._bgBackdropSprite.alpha = this._bgSprite.alpha * 0.45;

          this._bgBackdropSprite.visible = false;

        } else {

          this._bgBackdropSprite.visible = false;

        }

      }



      const isShipFlyby = this._currentActIndex === 1 && this._prologueCurrentTexKey === 'ship_cistam' && this._actTime < 68.54;

      if (!isShipFlyby) {

        this._bgSprite.anchor.set(0.5, 0.5);

        this._bgSprite.position.set(this._screenWidth / 2, this._screenHeight / 2);

      }

    }

  }



  private _renderProgressBar(progress: number): void {

    const barW = Math.max(300, this._screenWidth - 48);

    const barH = this._isTimelineHovered || this._isTimelineDragging ? 8 : 4;

    const gap = 2.5;



    this._progressBarBg.clear();

    this._progressBarFill.clear();

    this._scrubberThumb.clear();



    const count = STORY_ACTS.length;

    for (let i = 0; i < count; i++) {

      const act = STORY_ACTS[i];

      const startX = (this._actStartTimes[i] / this._totalMovieDuration) * barW;

      const endX = ((this._actStartTimes[i] + act.duration) / this._totalMovieDuration) * barW;

      const segW = Math.max(2, (endX - startX) - gap);



      // Background segment

      this._progressBarBg.roundRect(startX, -barH / 2, segW, barH, 2);

      this._progressBarBg.fill({ color: 0x2e3448, alpha: 0.85 });



      // Fill segment

      if (i < this._currentActIndex) {

        this._progressBarFill.roundRect(startX, -barH / 2, segW, barH, 2);

        this._progressBarFill.fill({ color: 0xff0033 });

      } else if (i === this._currentActIndex) {

        const fillW = Math.max(0, Math.min(segW, progress * segW));

        if (fillW > 0) {

          this._progressBarFill.roundRect(startX, -barH / 2, fillW, barH, 2);

          this._progressBarFill.fill({ color: 0xff0033 });

        }

      }

    }



    // Scrubber thumb at current overall position

    const currentOverallTime = (this._actStartTimes[this._currentActIndex] || 0) + this._actTime;

    const thumbX = Math.max(0, Math.min(barW, (currentOverallTime / this._totalMovieDuration) * barW));



    const thumbRadius = this._isTimelineHovered || this._isTimelineDragging ? 7.5 : 4.5;

    this._scrubberThumb.circle(thumbX, 0, thumbRadius);

    this._scrubberThumb.fill({ color: 0xff0033 });

    this._scrubberThumb.stroke({ color: 0xffffff, width: 2 });



    // WS-96 Hardware Console Scrubber & LEDs

    if (this._wsTrackMid && this._wsTimelineKnob && this._wsMidWing) {

      const trackW = this._wsTrackCapLeft.width + this._wsTrackMid.width + this._wsTrackCapRight.width;

      const knobMinX = 28;

      const knobMaxX = trackW - 28;

      const knobRange = Math.max(10, knobMaxX - knobMinX);

      const slitStartX = 14;

      const slitY = 18.0; // Perfectly centered inside the dark slit groove (rows 15-21, center = 18.0)



      const overallRatio = Math.max(0, Math.min(1, currentOverallTime / Math.max(1, this._totalMovieDuration)));

      const knobX = knobMinX + overallRatio * knobRange;

      this._wsTimelineKnob.position.set(knobX, slitY);



      this._wsTimelineFill.clear();

      if (overallRatio > 0.001) {

        const fillW = Math.max(0, knobX - slitStartX);

        const fillH = 3.0;

        this._wsTimelineFill.roundRect(slitStartX, slitY - fillH / 2, fillW, fillH, 1.5);

        this._wsTimelineFill.fill({ color: 0xff0033, alpha: 0.95 });

      }



      // YouTube-style chapter divider notches ("засечки")

      // Drawn on top of both the red line and the dark slit

      const tickH = 7.0;

      const tickTop = slitY - tickH / 2;

      const count = STORY_ACTS.length;

      for (let i = 1; i < count; i++) {

        const actStartTime = this._actStartTimes[i];

        if (actStartTime === undefined) continue;

        const ratio = actStartTime / Math.max(1, this._totalMovieDuration);

        const tickX = knobMinX + ratio * knobRange;



        // Dark gap cut for crisp separation over the red fill line

        this._wsTimelineFill.rect(tickX - 1.25, tickTop, 2.5, tickH);

        this._wsTimelineFill.fill({ color: 0x07080b, alpha: 0.8 });



        // Crisp bright tick mark (visible over both red fill and black slit)

        this._wsTimelineFill.rect(tickX - 0.75, tickTop, 1.5, tickH);

        this._wsTimelineFill.fill({ color: 0xf0e9db, alpha: 0.95 });

      }



      // Update Timeline Act Buttons with Indicator Lamps for all acts

      const actCount = STORY_ACTS.length;

      for (let i = 0; i < actCount; i++) {

        const actBtn = this._wsActButtons[i];

        if (!actBtn) continue;

        const isActive = (i === this._currentActIndex);

        actBtn.setLatched(isActive);

        actBtn.setLampActive(isActive);

      }



      // Update stickers active opacity

      for (const item of this._wsStickers) {

        const isActive = (item.actIndex === this._currentActIndex);

        item.sprite.alpha = isActive ? 1.0 : 0.88;

      }

    }

  }



  private _updateDots(): void {

    this._dotsContainer.removeChildren();

    const count = STORY_ACTS.length;

    const isPortrait = this._screenHeight > this._screenWidth;

    const dotSpacing = isPortrait ? 24 : 28;

    const totalW = (count - 1) * dotSpacing;



    for (let i = 0; i < count; i++) {

      const act = STORY_ACTS[i];

      const isActive = i === this._currentActIndex;

      const c = new Container();

      c.position.set(i * dotSpacing - totalW / 2, 0);

      c.eventMode = 'static';

      c.cursor = 'pointer';



      // 0. Dedicated distinct marker for Intro (🎬)

      if (act.id === 'intro_playbox' || act.category === 'intro') {

        const introStyle = new TextStyle({

          fontFamily: ['Segoe UI Emoji', 'Inter', 'sans-serif'],

          fontSize: isActive ? 18 : 13,

          fill: isActive ? '#ffaa00' : '#8899aa',

          dropShadow: isActive ? { alpha: 1, blur: 10, color: '#ff5e1a', distance: 0 } : undefined,

        });

        const introTxt = new Text({ text: '🎬', style: introStyle });

        introTxt.anchor.set(0.5);

        c.addChild(introTxt);



        if (isActive) {

          const aura = new Graphics();

          aura.circle(0, 0, 14);

          aura.stroke({ color: 0xffaa00, width: 1.5, alpha: 0.85 });

          c.addChildAt(aura, 0);

        }

      }

      // 1. Music note for song act

      else if (act.category === 'song' || act.id === 'act_7_song') {

        const noteStyle = new TextStyle({

          fontFamily: ['Segoe UI Emoji', 'Inter', 'sans-serif'],

          fontSize: isActive ? 18 : 13,

          fill: isActive ? '#00f5d4' : '#64748b',

          dropShadow: isActive ? { alpha: 0.9, blur: 8, color: '#00f5d4', distance: 0 } : undefined,

        });

        const noteTxt = new Text({ text: '🎵', style: noteStyle });

        noteTxt.anchor.set(0.5);

        c.addChild(noteTxt);

      }

      // 2. Red baton indicator for punishment act

      else if (act.id === 'act_6_punishment') {

        const g = new Graphics();

        g.circle(0, 0, isActive ? 6.5 : 4.5);

        g.fill({ color: isActive ? 0xff2a55 : 0xaa2244 });

        g.stroke({ color: 0xff0033, width: isActive ? 2 : 1 });

        c.addChild(g);

      }

      // 3. Golden cookie indicator for reward act

      else if (act.id === 'act_6_reward') {

        const g = new Graphics();

        g.circle(0, 0, isActive ? 6.5 : 4.5);

        g.fill({ color: isActive ? 0xffb703 : 0x996611 });

        g.stroke({ color: 0xffcc00, width: isActive ? 2 : 1 });

        c.addChild(g);

      }

      // 4. Standard act dot

      else {

        const g = new Graphics();

        g.circle(0, 0, isActive ? 5.5 : 3.5);

        g.fill({ color: isActive ? 0xff5e1a : 0x555870 });

        c.addChild(g);

      }



      c.on('pointerdown', (e) => {

        e.stopPropagation();

        ClickTracker.exclude();

        SFX.playClick();

        this.goToAct(i);

      });

      this._dotsContainer.addChild(c);

    }

  }



  private _layoutIntroDisclaimer(w: number, h: number, isPortrait: boolean): void {

    if (!this._introDisclaimerContainer) return;



    const contentW = Math.min(w * 0.86, isPortrait ? 520 : 880);

    const contentY = isPortrait ? -h * 0.16 : -h * 0.12;

    this._introDisclaimerContainer.position.set(0, contentY);



    // Completely clear borders, corners and backgrounds

    this._introDisclaimerBg.clear();

    this._introDisclaimerCorners.clear();



    const badgeFontSize = isPortrait ? 13 : 16;

    this._introDisclaimerBadge.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introDisclaimerBadge.style.fontSize = badgeFontSize;

    this._introDisclaimerBadge.style.fill = '#00f5d4';

    this._introDisclaimerBadge.style.align = 'center';

    this._introDisclaimerBadge.anchor.set(0.5, 0);

    this._introDisclaimerBadge.position.set(0, 0);



    const textFontSize = isPortrait ? 16 : 22;

    const textLineHeight = isPortrait ? 27 : 38;

    const startY = isPortrait ? 28 : 38;



    const measureStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: textFontSize,

      fontWeight: 'bold',

      letterSpacing: 0.6,

      wordWrap: true,

      wordWrapWidth: contentW,

    });



    const metrics = CanvasTextMetrics.measureText(INTRO_DISCLAIMER_TEXT, measureStyle);

    const rawLines = metrics.lines;

    const rawWidths = metrics.lineWidths;



    // Destroy existing line sprites

    for (const t of this._disclaimerLineTexts) {

      t.destroy();

    }

    this._disclaimerLineTexts = [];

    this._disclaimerLines = [];



    const lineStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: textFontSize,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 0.6,

      align: 'left',

      dropShadow: { alpha: 0.85, blur: 8, color: '#00f5d4', distance: 0 },

    });



    for (let i = 0; i < rawLines.length; i++) {

      const lineStr = rawLines[i];

      // Create line text initially with full text to obtain exact Pixi bounds

      const lineText = new Text({ text: lineStr, style: lineStyle });

      const measuredW = lineText.width || rawWidths[i] || 0;

      lineText.anchor.set(0, 0);

      lineText.position.set(-measuredW / 2, startY + i * textLineHeight);

      lineText.text = ''; // Clear for typing playback



      this._introDisclaimerLinesContainer.addChild(lineText);

      this._disclaimerLineTexts.push(lineText);

      this._disclaimerLines.push({ text: lineStr, width: measuredW });

    }



    // If currently during disclaimer, re-render for current time

    if (this._currentActIndex === 0 && this._actTime < INTRO_DISCLAIMER_DURATION) {

      this._updateIntroTimeline(this._actTime);

    }

  }



  public resize(w: number, h: number): void {

    this._screenWidth = w;

    this._screenHeight = h;

    const isPortrait = h > w;



    // Fullscreen canvas hit area for single-click play/pause and double-click fullscreen

    this._canvasHitArea.clear();

    this._canvasHitArea.rect(0, 0, w, h);

    this._canvasHitArea.fill({ color: 0x000000, alpha: 0.0001 });

    this._canvasHitArea.hitArea = new Rectangle(0, 0, w, h);



    this._cosmicScene.resize(w, h);

    this._subtitles.resize(w, h);

    this._resizeBgSprite();

    this._resizePrevBgSprite();

    if (this._isWiping) {

      this._updateWipeGraphics();

    }

    this._resizeMissingImageOverlay();

    if (this._cornerQuoteBadge && this._cornerQuoteBadge.visible) {

      this._positionCornerQuoteBadge();

    }



    this._introContainer.position.set(w / 2, h / 2);



    // 0. Disclaimer Layout (NO FRAME / BORDER, pure green terminal text, stationary pre-centered lines!)

    this._layoutIntroDisclaimer(w, h, isPortrait);



    const logoMaxH = isPortrait ? h * 0.46 : Math.min(480, h * 0.58);

    this._introLogoBaseScale = logoMaxH / 1536;

    this._introLogoSprite.scale.set(this._introLogoBaseScale);

    this._introLogoSprite.position.set(0, isPortrait ? -logoMaxH * 0.28 : -logoMaxH * 0.24);



    this._introStudiosText.position.set(0, isPortrait ? logoMaxH * 0.35 : logoMaxH * 0.33);

    this._introStudiosText.style.fontSize = isPortrait ? 24 : 34;



    this._introPresentsText.position.set(0, isPortrait ? logoMaxH * 0.48 : logoMaxH * 0.45);

    this._introPresentsText.style.fontSize = isPortrait ? 16 : 22;



    // Series Title Graphic Logo & Subtitle (Cinematic Scale)

    this._introSeriesContainer.position.set(0, isPortrait ? -30 : -15);

    const titleMaxW = isPortrait ? w * 0.92 : Math.min(w * 0.85, 960);

    const titleMaxH = isPortrait ? h * 0.35 : Math.min(h * 0.50, 440);

    const logoTex = this._introSeriesLogoSprite.texture;

    const texW = logoTex && logoTex.width > 0 ? logoTex.width : 913;

    const texH = logoTex && logoTex.height > 0 ? logoTex.height : 374;

    const titleScale = Math.min(titleMaxW / texW, titleMaxH / texH);

    this._introSeriesLogoSprite.scale.set(titleScale);

    this._introSeriesLogoSprite.position.set(0, 0);



    const logoRenderedH = texH * titleScale;

    this._introSeriesSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introSeriesSubtitle.style.fill = '#00f5d4';

    this._introSeriesSubtitle.style.fontSize = isPortrait ? 13 : 18;

    this._introSeriesSubtitle.position.set(0, logoRenderedH / 2 + (isPortrait ? 24 : 30));



    this._introCycleSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introCycleSubtitle.style.fill = '#00f5d4';

    this._introCycleSubtitle.style.fontSize = isPortrait ? 22 : 32;

    this._introCycleSubtitle.style.letterSpacing = isPortrait ? 6 : 10;

    this._introCycleSubtitle.position.set(0, 0); // Center of screen after main logo disappears



    // Header layout (Top Left)

    this._badgeText.position.set(24, 14);

    this._titleText.position.set(24, 32);

    this._titleText.style.fontSize = isPortrait ? 15 : 18;

    this._subtitleText.position.set(24, isPortrait ? 54 : 58);



    // WS-96 Hardware Console Layout

    // Left wing: 841px, right wing: 346px.

    // Panel vertical height reduced by 30% (baseScale * 0.70)

    const baseScale = Math.min(1.0, Math.max(0.48, (w - 30) / 1535));

    const guiScale = baseScale * 0.70;

    this._wsGuiScale = guiScale;



    const leftW = 841 * guiScale;

    const rightW = 346 * guiScale;

    const trackPad = 10 * guiScale;

    const minMidW = 200 * guiScale;

    const midW = Math.max(minMidW, w - (leftW + rightW));

    const barH = 161 * guiScale;



    // Vignette bottom (backdrop for WS-96 retro console)

    this._vignetteGraphics.clear();

    this._vignetteGraphics.rect(0, h - barH - 24, w, barH + 24);

    this._vignetteGraphics.fill({ color: 0x050508, alpha: 0.9 });

    this._vignetteGraphics.alpha = Math.max(0, Math.min(0.9, this._hudAnimState.p * 0.9));



    const baseY = h - barH;

    const hiddenY = h + 24;

    const currentBarY = hiddenY + (baseY - hiddenY) * this._hudAnimState.p;

    this._playerBarContainer.position.set(0, currentBarY);

    this._subtitles.setBottomOffset(Math.max(0, h - currentBarY));



    if (this._wsConsoleContainer) {

      // Left Wing (Fixed proportions, scaled)

      this._wsLeftWing.position.set(0, 0);

      this._wsLeftWing.scale.set(guiScale);



      // Middle Stretchable Wing (Chassis Mid + Progress Slider + 9 LEDs)

      this._wsMidWing.position.set(leftW, 0);

      this._wsChassisMid.width = midW;

      this._wsChassisMid.height = 161 * guiScale;



      const trackW = Math.max(120, (midW - trackPad * 2) / guiScale);



      // Timeline slider raised higher in the center (62 * guiScale)

      this._wsTimelineContainer.position.set(trackPad, 62 * guiScale);

      this._wsTimelineContainer.scale.set(guiScale);



      // 3-slice track positioning (in container local coords)

      this._wsTrackCapLeft.position.set(0, 0);

      this._wsTrackMid.position.set(25, 0);

      this._wsTrackMid.width = Math.max(10, trackW - 50);

      this._wsTrackCapRight.position.set(trackW - 25, 0);



      // Timeline Act Buttons & Lamps positioned at the bottom under timeline track

      const btnY = 136 * guiScale;

      const trackStartInMid = trackPad + 28 * guiScale;

      const trackEndInMid = trackPad + (trackW - 28) * guiScale;

      const trackInnerW = Math.max(10, trackEndInMid - trackStartInMid);

      const actCount = STORY_ACTS.length;

      for (let i = 0; i < actCount; i++) {

        const actBtn = this._wsActButtons[i];

        if (actBtn) {

          const actStart = this._actStartTimes[i] ?? 0;

          const actDur = STORY_ACTS[i]?.duration ?? 0;

          const midTime = actStart + actDur / 2;

          const midRatio = midTime / Math.max(1, this._totalMovieDuration);

          const btnX = trackStartInMid + midRatio * trackInnerW;

          actBtn.container.position.set(btnX, btnY);

          actBtn.container.scale.set(guiScale);

        }

      }



      // Timeline Chapter Stickers positioned at the top above timeline track

      const stickerY = 33 * guiScale;

      for (const item of this._wsStickers) {

        const i = item.actIndex;

        const actStart = this._actStartTimes[i] ?? 0;

        const actDur = STORY_ACTS[i]?.duration ?? 0;

        const midTime = actStart + actDur / 2;

        const midRatio = midTime / Math.max(1, this._totalMovieDuration);

        const stickerX = trackStartInMid + midRatio * trackInnerW;

        item.container.position.set(stickerX, stickerY);

        item.container.scale.set(guiScale);

      }



      this._wsTimelineKnob.scale.set(1.0);



      // Right Wing (Fixed proportions, scaled)

      this._wsRightWing.position.set(w - rightW, 0);

      this._wsRightWing.scale.set(guiScale);

    }



    this._renderProgressBar(Math.min(1, this._actTime / Math.max(1, this._actDuration)));



    // Debug Mode UI (Top Center - completely out of the way of the player bar!)

    if (this._debugContainer) {

      this._debugContainer.position.set(w / 2, isPortrait ? 114 : 32);

      this._debugContainer.scale.set(w < 950 ? 0.85 : 1.0);

    }

  }

}

