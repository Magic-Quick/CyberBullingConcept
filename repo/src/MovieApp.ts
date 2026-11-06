import { PremiereAudioDirector, isDevMode } from './PremiereAudioDirector';

import { Application, Container, Graphics, Sprite, Text, TextStyle, CanvasTextMetrics, FederatedPointerEvent, Texture, NineSliceSprite, TilingSprite, Rectangle, BlurFilter } from 'pixi.js';



import { STORY_ACTS, ActData } from './storyData';



import { getTexture, hasTexture, getAudioUrl, getIntroVideoUrl } from './assetsManager';



import { getConcertCutAtTime, ConcertFrameCut } from './concertSequence';



import { getNarratorShotAtTime, NarratorShotCut } from './narratorShotSequence';



import { CosmicScene } from './CosmicScene';



import { Subtitles } from './Subtitles';



import { AudioController } from './AudioController';



import { ClickTracker } from './ClickTracker';



import { tween, cancelTween, ease, after } from './tween';



import { SFX } from './SoundEffects';



import { AmbientManager, CUE_NORMALIZATION_MAP } from './AmbientManager';



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



  'ева аксёнова': 'Сестра Клиентского Фронта',



  'ева': 'Сестра Клиентского Фронта',



  'толя щербаков': 'Лорд-Командор Цитадели',



  'толя': 'Лорд-Командор Цитадели',



  'егор ткачёв': 'Преподобный Толкователь Воли Клиентархов',



  'егор': 'Преподобный Толкователь Воли Клиентархов',



  'вика': 'Верховная Настоятельница Пиксельного Канона',



  'виктория фесенко': 'Верховная Настоятельница Пиксельного Канона',



  'женя': 'Мастер Вечного Рендера',



  'владимир хаецкий': 'Страж Невидимого Слоя',



  'вова хаецкий': 'Страж Невидимого Слоя',



  'вова': 'Страж Невидимого Слоя',



  'хаецкий': 'Страж Невидимого Слоя',



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



  private _introRealLogoSprite: Sprite;



  private _introStudiosText: Text;



  private _introPresentsText: Text;



  private _introSeriesContainer: Container;



  private _introSeriesLogoSprite: Sprite;



  private _introSeriesSubtitle: Text;



  private _introCycleSubtitle: Text;



  private _introLogoBaseScale = 0.2;

  private _introLogoBaseY = 0;

  private _introFontScale = 1.0;

  private _introGlitchSoundPlayed1 = false;

  private _introGlitchSoundPlayed2 = false;



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

  private _wsVoiceSlider?: { container: Container; knob: Sprite; setVol: (v: number) => void };



  private _wsMusicKnob!: Sprite;

  private _wsMusicSlider?: { container: Container; knob: Sprite; setVol: (v: number) => void };



  private _wsSfxKnob!: Sprite;

  private _wsSfxSlider?: { container: Container; knob: Sprite; setVol: (v: number) => void };



  private _wsLcdText!: Text;

  private _wsLcdOverrideTimer = 0.0;



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

  private _isSeeking = false;

  private _devGearBtn!: Container;



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



  // Location Corner Badge (Top-left: Authentic Sector Radar HUD + 2 Lines: [ СЕКТОР КОВЧЕГА ] & [ НАЗВАНИЕ ЛОКАЦИИ ])

  private _cornerLocationBadge!: Container;

  private _cornerLocationBg!: Graphics;

  private _cornerLocationRadarContainer!: Container;

  private _cornerLocationRadarGfx!: Graphics;

  private _cornerLocationCategory!: Text;

  private _cornerLocationTitle!: Text;

  private _radarAngle = 0;

  private _locationBadgeTyping = {

    active: false,

    elapsed: 0,

    fullCategory: '',

    fullTitle: '',

    lastCharCount: -1,

    displayDuration: 5.5,

    fadeElapsed: 0,

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



    // Audio Director Suite State & Cues

  private _selectedDreadIndex = 0;

  private _selectedPeaceIndex = 0;

  private _directorActiveTab: 'cues' | 'ambient' = 'cues';

  private _directorMusicCues: Map<string, { id: string; actId: string; time: number; key: string; name: string; category: 'dread' | 'peace' | 'stop' }[]> = new Map();

  private _lastFiredMusicCueId: string | null = null;

  private _lastFiredPremiereCueId: string | null = null;
  private _lastFiredScreamerCueId: string | null = null;

  private _directorTabBtnCues!: Container;

  private _directorTabBtnAmb!: Container;

  private _directorCuesPanel!: Container;

  private _directorAmbientPanel!: Container;

  private _directorActTimeText!: Text;

  private _directorDreadText!: Text;

  private _directorPeaceText!: Text;

  private _directorCuesListContainer!: Container;

  private _directorNoticeText!: Text;

  private _debugExpanded = false;



  // DAW Multi-Track Timeline & Act 0 Intro Variants

  private _dawTimelineContainer!: Container;

  private _dawTimelineBg!: Graphics;

  private _dawRulerGraphics!: Graphics;

  private _dawRulerLabelsContainer!: Container;

  private _dawLanesBg!: Graphics;

  private _dawLaneLabelsContainer!: Container;

  private _dawDreadBlocksContainer!: Container;

  private _dawPeaceBlocksContainer!: Container;

  private _dawAmbientLaneContainer!: Container;

  private _dawPlayhead!: Container;

  private _directorNowPlayingText!: Text;

  private _dawIntroVariantsContainer!: Container;

  private _btnIntroVar1!: Container;

  private _btnIntroVar2!: Container;

  private _dawIsDraggingTimeline: boolean = false;



  private _introProfile!: IntroTimingProfile;

  private _debugTransLabel!: Text;

  private _debugAmbientLabel!: Text;

  private _debugAudioStatusText!: Text;

  private _selectedTransSoundIndex = 0;

  private _selectedAmbientIndex = 0;

  private _transitionAudio: HTMLAudioElement | null = null;



  public static readonly FIN_TRANSITION_KEYS = [

    'trailer_tension_riser_to_brutal_cut',

    'trailer_braam_sub_drop',

    'melodic_tension_mournful_vocal_drone',

  ];



  public static readonly TRANSITION_SOUNDS_METADATA = [

    { key: 'random', name: '🎲 Случайный выбор (Рандом Fin)', gain: 0.70 },

    { key: 'trailer_tension_riser_to_brutal_cut', name: '★ Резкий Райзер (Fin)', gain: 0.70 },

    { key: 'trailer_braam_sub_drop', name: '★ Саб-Дроп Брам (Fin)', gain: 0.70 },

    { key: 'melodic_tension_mournful_vocal_drone', name: '★ Траурный Вокал (Fin)', gain: 0.72 },

    { key: 'braam_titan_warhorn_doom', name: 'Титанический Вархорн', gain: 0.60 },

    { key: 'melodic_tension_french_horn_minor_swell', name: 'Валторна (French Horn)', gain: 0.75 },

    { key: 'braam_analog_synth_pitch_drop', name: 'Аналоговый Синт', gain: 0.65 },

    { key: 'trailer_reese_bass_distortion_hit', name: 'Риз-Бас Хит', gain: 0.70 },

    { key: 'trailer_industrial_anvil_slam', name: 'Индустриальная Наковальня', gain: 0.70 },

    { key: 'trailer_dissonant_warp_stinger', name: 'Варп-Стингер', gain: 0.68 },

    { key: 'trailer_pneumatic_gate_crush', name: 'Пневмошлюз (Краш)', gain: 0.70 },

    { key: 'braam_reactor_turbine_overdrive', name: 'Турбина Реактора (Взвыв)', gain: 0.65 },

    { key: 'braam_seismic_tectonic_rumble', name: 'Сейсмический Гул', gain: 0.65 },

    { key: 'braam_triple_pulse_staccato', name: 'Тройной Пульс Стаккато', gain: 0.65 },

    { key: 'melodic_tension_blade_runner_synth_drop', name: 'Неоновый Синт Blade Runner', gain: 0.70 },

    { key: 'melodic_tension_dark_cello_bend_braam', name: 'Темный Бенд Виолончели', gain: 0.70 },

  ];



  public static readonly DEFAULT_TRANSITIONS_BY_ACT: Record<string, string> = {

    prologue_space: 'random',

    act_1_convent: 'trailer_tension_riser_to_brutal_cut',

    act_2_sarcophagus: 'trailer_braam_sub_drop',

    act_3_timemachine: 'melodic_tension_mournful_vocal_drone',

    act_4_engine: 'trailer_braam_sub_drop',

    act_5_clientarchs: 'trailer_tension_riser_to_brutal_cut',

    act_6_punishment: 'trailer_braam_sub_drop',

    act_6_reward: 'melodic_tension_mournful_vocal_drone',

    act_8_outro: 'trailer_braam_sub_drop',

  };



  public static readonly AMBIENT_OPTIONS: { key: import('./AmbientManager').AmbientTrackKey; name: string }[] = [

    { key: 'rust_and_bone', name: 'Rust and Bone (Гримдарк)' },

    { key: 'titan_forge', name: 'Titan Forge (Горн)' },

    { key: 'desolate_cry', name: 'Desolate Cry (Одинокий вой)' },

    { key: 'absolute_blackout', name: 'Absolute Blackout (Блэкаут)' },

    { key: 'chronicles_ambient', name: 'Chronicles (Соборный хор)' },

  ];



  public static readonly DREAD_OPTIONS = [

    { key: 'braam_analog_synth_pitch_drop', name: 'Аналоговый Синт (Цифровой Наркотик)', dur: 10 },

    { key: 'trailer_tension_riser_to_brutal_cut', name: 'Резкий Райзер к обрыву', dur: 8 },

    { key: 'braam_titan_warhorn_doom', name: 'Титанический Вархорн', dur: 8 },

    { key: 'trailer_braam_sub_drop', name: 'Саб-Дроп Брам', dur: 8 },

    { key: 'trailer_reese_bass_distortion_hit', name: 'Перегруженный Рис-Бас Хит', dur: 6 },

    { key: 'braam_reactor_turbine_overdrive', name: 'Турбина Реактора (Взвыв)', dur: 8 },

    { key: 'trailer_industrial_anvil_slam', name: 'Индустриальная Наковальня', dur: 8 },

    { key: 'trailer_dissonant_warp_stinger', name: 'Диссонирующий Варп-Стингер', dur: 6 },

    { key: 'trailer_pneumatic_gate_crush', name: 'Пневмошлюз (Краш)', dur: 6 },

    { key: 'braam_seismic_tectonic_rumble', name: 'Сейсмический Грохот', dur: 12 },

    { key: 'braam_triple_pulse_staccato', name: 'Тройной Пульс Стаккато', dur: 8 },

    { key: 'melodic_tension_dark_cello_bend_braam', name: 'Темный Бенд Виолончели', dur: 8 },

    { key: 'dread_11_morlock_war_march_climax_50s', name: 'Марш Морлоков (50с • Климакс)', dur: 50 },

  ];



  public static readonly PEACE_OPTIONS = [

    { key: 'peace_08_pin_drop_silence_reward_grace_60s', name: 'Печенька Благодати (60с • Свет)', dur: 60 },

    { key: 'peace_01_pin_drop_silence_pure_calm_25s', name: 'Чистый покой (25с • Pin Drop)', dur: 25 },

    { key: 'peace_02_pin_drop_silence_warm_melody_30s', name: 'Тёплая мелодия (30с • Пады)', dur: 30 },

    { key: 'peace_03_pin_drop_silence_gentle_resolution_25s', name: 'Мягкое разрешение (25с)', dur: 25 },

    { key: 'peace_04_chronicles_playbox_heavenly_vocalise_30s', name: 'Небесный вокализ (30с)', dur: 30 },

    { key: 'peace_05_chronicles_playbox_uplifting_pads_30s', name: 'Возвышенные пэды (30с)', dur: 30 },

    { key: 'peace_06_chronicles_playbox_warm_culmination_25s', name: 'Тёплая кульминация (25с)', dur: 25 },

  ];



  public getRandomFinTransitionSound(): string {

    const keys = MovieApp.FIN_TRANSITION_KEYS;

    const idx = Math.floor(Math.random() * keys.length);

    return keys[idx] || 'trailer_tension_riser_to_brutal_cut';

  }



  public getLockedTransitionSound(actId?: string): string {

    try {

      if (typeof window !== 'undefined' && window.localStorage) {

        if (actId) {

          const perAct = window.localStorage.getItem(`cyberbulling_transition_sound_${actId}`);

          if (perAct) {

            if (perAct === 'random') return this.getRandomFinTransitionSound();

            if (MovieApp.TRANSITION_SOUNDS_METADATA.some(s => s.key === perAct)) return perAct;

          }

        }

        const saved = window.localStorage.getItem('cyberbulling_transition_sound');

        if (saved) {

          if (saved === 'random') return this.getRandomFinTransitionSound();

          if (MovieApp.TRANSITION_SOUNDS_METADATA.some(s => s.key === saved)) return saved;

        }

      }

    } catch {}

    if (actId && MovieApp.DEFAULT_TRANSITIONS_BY_ACT[actId]) {

      const def = MovieApp.DEFAULT_TRANSITIONS_BY_ACT[actId];

      if (def === 'random') return this.getRandomFinTransitionSound();

      return def;

    }

    return this.getRandomFinTransitionSound();

  }



  public setLockedTransitionSound(key: string, actId?: string): void {

    try {

      if (typeof window !== 'undefined' && window.localStorage) {

        if (actId) {

          window.localStorage.setItem(`cyberbulling_transition_sound_${actId}`, key);

        } else {

          window.localStorage.setItem('cyberbulling_transition_sound', key);

        }

      }

    } catch {}

  }



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

    this._root.addChild(this._cornerLocationBadge);



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



    this._introRealLogoSprite = new Sprite(getTexture('playbox_real_logo'));



    this._introRealLogoSprite.anchor.set(0.5);



    this._introRealLogoSprite.alpha = 0;



    this._introContainer.addChild(this._introRealLogoSprite);



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



          if (this._currentActIndex === 0) this._actDuration = p.introEndTime;



          this._updateDebugDisplay();



        }



      });



    }



    const titanUrl = getAudioUrl('titan_forge');



    if (titanUrl) {



      AudioTrackAnalyzer.analyzeTrack('titan_forge', titanUrl).then((p) => {



        if (AmbientManager.getIntroTrack() === 'titan_forge') {



          this._introProfile = p;



          if (this._currentActIndex === 0) this._actDuration = p.introEndTime;



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



      } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        e.preventDefault();
        this.toggleDevAudioDirector();



      } else if (this._debugExpanded && (e.code === 'KeyT' || e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е')) {

        e.preventDefault();

        this.addDirectorMusicCue('dread');

      } else if (this._debugExpanded && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {

        e.preventDefault();

        this.addDirectorMusicCue('peace');

      } else if (this._debugExpanded && (e.code === 'KeyX' || e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч')) {

        e.preventDefault();

        this.addDirectorMusicCue('stop');

      } else if (this._debugExpanded && (e.code === 'BracketLeft' || e.key === '[' || e.key === 'х')) {

        e.preventDefault();

        const act = STORY_ACTS[this._currentActIndex];

        const cues = this._directorMusicCues.get(act.id) || [];

        if (cues.length) this.nudgeDirectorMusicCue(cues[cues.length - 1].id, -1.0);

      } else if (this._debugExpanded && (e.code === 'BracketRight' || e.key === ']' || e.key === 'ъ')) {

        e.preventDefault();

        const act = STORY_ACTS[this._currentActIndex];

        const cues = this._directorMusicCues.get(act.id) || [];

        if (cues.length) this.nudgeDirectorMusicCue(cues[cues.length - 1].id, +1.0);

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



    const premiereDirector = PremiereAudioDirector.getInstance();

    premiereDirector.onSeekRequested = (targetSeconds: number) => {

      this.seekAudio(targetSeconds);

    };

    premiereDirector.onActChangeRequested = (actIndex: number) => {

      this.goToAct(actIndex, this._isPlaying);

    };

    (window as any).__premiereAudioDirector = premiereDirector;

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

    onChange: (vol: number) => void,

    label: string = ''

  ): { container: Container; knob: Sprite; setVol: (v: number) => void } {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'ew-resize';



    // Generous hitArea so mouse and touch never miss the knob

    const hitW = (endX - startX) + 40;

    const hitH = 64;

    c.hitArea = new Rectangle(startX - 20, slotY - 32, hitW, hitH);



    const hit = new Graphics();

    hit.rect(startX - 20, slotY - 32, hitW, hitH);

    hit.fill({ color: 0x000000, alpha: 0.001 });

    hit.eventMode = 'static';

    hit.cursor = 'ew-resize';

    c.addChild(hit);



    const knob = new Sprite(getTexture(knobTexKey));

    knob.anchor.set(0.5, 0.5);

    knob.eventMode = 'static';

    knob.cursor = 'ew-resize';

    knob.position.set(startX + initialVol * (endX - startX), slotY);

    c.addChild(knob);



    let isDragging = false;



    const updateFromPos = (globalPos: { x: number; y: number }) => {

      const local = c.toLocal(globalPos);

      const ratio = Math.max(0, Math.min(1, (local.x - startX) / (endX - startX)));

      knob.x = startX + ratio * (endX - startX);

      onChange(ratio);



      const pct = Math.round(ratio * 100);



      // 1. Live console LCD feedback

      if (this._wsLcdText && label) {

        this._wsLcdText.text = `${label} ${pct}%`;

        this._wsLcdOverrideTimer = 1.6;

      }



      // 2. Live tooltip feedback

      if (this._timelineTooltip && this._timelineTooltipText && label) {

        this._timelineTooltipText.text = `${label}: ${pct}%`;

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

        const localTooltip = this._wsConsoleContainer.toLocal(globalPos);

        this._timelineTooltip.position.set(localTooltip.x, localTooltip.y - 24);

        this._timelineTooltip.visible = true;

      }

    };



    const onWindowMove = (e: PointerEvent) => {

      if (!isDragging) return;

      const canvas = this._app.canvas as HTMLCanvasElement;

      const rect = canvas.getBoundingClientRect();

      const screenX = (e.clientX - rect.left) * (this._app.screen.width / (rect.width || 1));

      const screenY = (e.clientY - rect.top) * (this._app.screen.height / (rect.height || 1));

      updateFromPos({ x: screenX, y: screenY });

    };



    const onWindowUp = () => {

      if (isDragging) {

        isDragging = false;

        if (this._timelineTooltip) {

          this._timelineTooltip.visible = false;

        }

      }

      window.removeEventListener('pointermove', onWindowMove);

      window.removeEventListener('pointerup', onWindowUp);

    };



    const startDrag = (e: FederatedPointerEvent) => {

      e?.stopPropagation?.();

      ClickTracker.exclude();

      isDragging = true;

      if (e?.global) {

        updateFromPos(e.global);

      }

      window.addEventListener('pointermove', onWindowMove);

      window.addEventListener('pointerup', onWindowUp);

    };



    c.on('pointerdown', startDrag);

    knob.on('pointerdown', startDrag);



    c.on('pointerover', (e: FederatedPointerEvent) => {

      if (label && this._timelineTooltip && this._timelineTooltipText && !isDragging) {

        const ratio = (knob.x - startX) / (endX - startX);

        const pct = Math.round(ratio * 100);

        this._timelineTooltipText.text = `${label}: ${pct}%`;

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

        const localTooltip = this._wsConsoleContainer.toLocal(e.global);

        this._timelineTooltip.position.set(localTooltip.x, localTooltip.y - 24);

        this._timelineTooltip.visible = true;

      }

    });



    c.on('pointerout', () => {

      if (!isDragging && this._timelineTooltip) {

        this._timelineTooltip.visible = false;

      }

    });



    return {

      container: c,

      knob,

      setVol: (v: number) => {

        const clamped = Math.max(0, Math.min(1, v));

        knob.x = startX + clamped * (endX - startX);

        onChange(clamped);

      },

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

      },

      'VOICE'

    );

    this._wsLeftWing.addChild(voiceSlider.container);

    this._wsVoiceKnob = voiceSlider.knob;

    this._wsVoiceSlider = voiceSlider;



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

      },

      'MUSIC'

    );

    this._wsLeftWing.addChild(musicSlider.container);

    this._wsMusicKnob = musicSlider.knob;

    this._wsMusicSlider = musicSlider;



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

      },

      'SFX'

    );



    this._wsLeftWing.addChild(sfxSlider.container);



    this._wsSfxKnob = sfxSlider.knob;

    this._wsSfxSlider = sfxSlider;



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



    socketBg.rect(156, 48, 126, 64);



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



  public toggleDevAudioDirector(): void {
    SFX.playClick();
    PremiereAudioDirector.getInstance().toggle();
  }



  private _initDirectorMusicCues(): void {

    const defaults: Record<string, { time: number; key: string; category: 'dread' | 'peace' | 'stop' }[]> = {

      intro_playbox: [

        { time: 0.0, key: AmbientManager.getIntroTrack(), category: 'peace' },

      ],

      prologue_space: [

        { time: 60.0, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },

      ],

      act_1_convent: [

        { time: 17.14, key: 'dread_12_predator_digital_drug_28s', category: 'dread' },

      ],

      act_2_sarcophagus: [

        { time: 45.58, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },

      ],

      act_3_timemachine: [

        { time: 108.62, key: 'peace_03_pin_drop_silence_gentle_resolution_25s', category: 'peace' },

      ],

      act_4_engine: [

        { time: 4.5, key: 'dread_10_predator_nightmare_drop_52s', category: 'dread' },

        { time: 103.6, key: 'peace_01_pin_drop_silence_pure_calm_25s', category: 'peace' },

      ],

      act_5_clientarchs: [

        { time: 0.00, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },

        { time: 97.96, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },

        { time: 140.72, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },

        { time: 208.70, key: 'dread_10_predator_nightmare_drop_52s', category: 'dread' },

      ],

      act_6_punishment: [

        { time: 25.44, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },

        { time: 53.40, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },

      ],

      act_6_reward: [

        { time: 0.00, key: 'peace_08_pin_drop_silence_reward_grace_60s', category: 'peace' },

        { time: 60.18, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },

      ],

      act_8_outro: [

        { time: 48.9, key: 'trailer_braam_sub_drop', category: 'dread' },

      ],

      act_7_song: [

        { time: 0.0, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },

      ],

    };



    let overrides: Record<string, { id: string; actId: string; time: number; key: string; name: string; category: 'dread' | 'peace' | 'stop' }[]> = {};

    try {

      if (typeof window !== 'undefined' && window.localStorage) {

        const raw = window.localStorage.getItem('cyberbulling_music_cues');

        if (raw) overrides = JSON.parse(raw);

      }

    } catch {}



    for (const act of STORY_ACTS) {

      const savedList = overrides[act.id];

      if (savedList && savedList.length > 0) {

        this._directorMusicCues.set(act.id, savedList);

      } else if (defaults[act.id]) {

        const cues = defaults[act.id].map((d, i) => {

          let name = d.key;

          if (d.category === 'dread') {

            const opt = MovieApp.DREAD_OPTIONS.find((o) => o.key === d.key);

            if (opt) name = opt.name;

          } else if (d.category === 'peace') {

            const opt = MovieApp.PEACE_OPTIONS.find((o) => o.key === d.key);

            if (opt) name = opt.name;

          } else {

            name = '⏹ Стоп музыки';

          }

          if (act.id === 'intro_playbox') {

            if (d.time === 0.0) {

              name = (AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Вступление)' : 'Titan Forge (Вступление)');

            } else if (d.time === 24.0) {

              name = '🎬 ДРОП ЛОГОТИПА / КУЛЬМИНАЦИЯ';

            }

          }

          return {

            id: `${act.id}_${i}_${d.time}`,

            actId: act.id,

            time: d.time,

            key: d.key,

            name: name,

            category: d.category,

          };

        });

        this._directorMusicCues.set(act.id, cues);

      } else {

        this._directorMusicCues.set(act.id, []);

      }

    }

  }



  public setIntroTrackVariant(variant: 'desolate_cry' | 'titan_forge'): void {

    AmbientManager.setIntroTrack(variant, this._currentActIndex === 0);

    this._introProfile = AudioTrackAnalyzer.getProfile(variant);

    if (this._currentActIndex === 0) {

      this._actDuration = this._introProfile.introEndTime;

    }

    const cues = this._directorMusicCues.get('intro_playbox');

    if (cues && cues.length > 0) {

      cues[0].key = variant;

      cues[0].name = variant === 'desolate_cry' ? 'Desolate Cry (Вступление)' : 'Titan Forge (Вступление)';

    }

    this._saveDirectorMusicCues();

    this._setDirectorNotice(`★ Выбран вариант интро: ${variant === 'desolate_cry' ? 'Desolate Cry' : 'Titan Forge'}`);

    this._updateDebugDisplay();

  }



  private _saveDirectorMusicCues(): void {

    try {

      if (typeof window !== 'undefined' && window.localStorage) {

        const obj: Record<string, any> = {};

        for (const [k, v] of this._directorMusicCues.entries()) {

          obj[k] = v;

        }

        window.localStorage.setItem('cyberbulling_music_cues', JSON.stringify(obj));

      }

    } catch {}

  }



  public addDirectorMusicCue(category: 'dread' | 'peace' | 'stop'): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (!act) return;

    const actId = act.id;

    const curTime = Math.round(Math.max(0, this._actTime) * 10) / 10;



    let key = 'stop';

    let name = '⏹ Стоп / Fade Out';



    if (category === 'dread') {

      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex] || MovieApp.DREAD_OPTIONS[0];

      key = opt.key;

      name = `💀 ${opt.name}`;

      AmbientManager.playCinematicCue(key);

    } else if (category === 'peace') {

      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];

      key = opt.key;

      name = `🕊️ ${opt.name}`;

      AmbientManager.playCinematicCue(key);

    } else {

      AmbientManager.stopCinematicCue(2.5);

    }



    const cues = this._directorMusicCues.get(actId) || [];

    // If a cue already exists within 0.4s, replace it

    const existingIdx = cues.findIndex((c) => Math.abs(c.time - curTime) < 0.4);

    const newCue = {

      id: `${actId}_${Date.now()}`,

      actId,

      time: curTime,

      key,

      name,

      category,

    };



    if (existingIdx !== -1) {

      cues[existingIdx] = newCue;

    } else {

      cues.push(newCue);

    }

    cues.sort((a, b) => a.time - b.time);

    this._directorMusicCues.set(actId, cues);

    this._saveDirectorMusicCues();

    this._setDirectorNotice(`✓ Зафиксировано на ${curTime.toFixed(1)}s: ${name}`);

    this._updateDebugDisplay();

  }



  public deleteDirectorMusicCue(id: string): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (!act) return;

    const cues = (this._directorMusicCues.get(act.id) || []).filter((c) => c.id !== id);

    this._directorMusicCues.set(act.id, cues);

    this._saveDirectorMusicCues();

    this._setDirectorNotice(`✕ Отрезок удалён`);

    this._updateDebugDisplay();

  }



  public nudgeDirectorMusicCue(id: string, deltaSec: number): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (!act) return;

    const cues = this._directorMusicCues.get(act.id) || [];

    const cue = cues.find((c) => c.id === id);

    if (!cue) return;

    cue.time = Math.round(Math.max(0, Math.min(this._actDuration, cue.time + deltaSec)) * 10) / 10;

    cues.sort((a, b) => a.time - b.time);

    this._saveDirectorMusicCues();

    this._setDirectorNotice(`↔ Сдвиг на ${cue.time.toFixed(1)}s: ${cue.name}`);

    this._updateDebugDisplay();

  }



  public exportDirectorCuesJson(): void {

    const obj: Record<string, any> = {};

    for (const [k, v] of this._directorMusicCues.entries()) {

      if (v.length > 0) obj[k] = v;

    }

    const json = JSON.stringify(obj, null, 2);

    try {

      if (typeof navigator !== 'undefined' && navigator.clipboard) {

        navigator.clipboard.writeText(json);

      }

    } catch {}

    console.log('[AUDIO DIRECTOR] Music Cues JSON:\n', json);

    this._setDirectorNotice(`📋 JSON скопирован в буфер обмена!`);

  }



  public resetDirectorCuesToDefaults(): void {

    try {

      if (typeof window !== 'undefined' && window.localStorage) {

        window.localStorage.removeItem('cyberbulling_music_cues');

      }

    } catch {}

    this._initDirectorMusicCues();

    this._setDirectorNotice(`↺ Сброшено к исходному канону`);

    this._updateDebugDisplay();

  }



  private _setDirectorNotice(msg: string): void {

    if (this._directorNoticeText) {

      this._directorNoticeText.text = msg;

      this._directorNoticeText.style.fill = '#00f5d4';

    }

  }



  private _checkDirectorMusicCues(currentTime: number): void {

    const act = STORY_ACTS[this._currentActIndex];

    if (!act) return;

    const cues = this._directorMusicCues.get(act.id);

    if (!cues || cues.length === 0) return;



    // Find the latest cue that should be active up to currentTime

    let activeCue: typeof cues[0] | null = null;

    for (const c of cues) {

      if (currentTime >= c.time) {

        activeCue = c;

      } else {

        break;

      }

    }



    if (activeCue && this._lastFiredMusicCueId !== activeCue.id) {

      this._lastFiredMusicCueId = activeCue.id;

      if (activeCue.category === 'stop') {

        AmbientManager.stopCinematicCue(2.5);

      } else {

        AmbientManager.playCinematicCue(activeCue.key);

      }

    }

  }



  private _checkPremiereTimelineCues(actIndex: number, currentTime: number): void {

    const act = STORY_ACTS[actIndex];

    if (!act || act.category === 'song' || act.id === 'act_7_song') {

      if (this._lastFiredPremiereCueId !== null) {

        this._lastFiredPremiereCueId = null;

        AmbientManager.stopCinematicCue(0.2);

      }

      return;

    }



    const dir = PremiereAudioDirector.getInstance();

    // 1. Cinematic Music Layer (dread / peace) - controls ambient ducking
    const activeCinematic = dir.getActiveCueAtTime(act.id, currentTime, 'cinematic');
    if (activeCinematic) {
      const cue = activeCinematic.cue;
      const isMuted = AmbientManager.isCategoryMuted(cue.type);
      if (isMuted) {
        if (this._lastFiredPremiereCueId === cue.id) {
          this._lastFiredPremiereCueId = null;
          AmbientManager.stopCinematicCue(0.2);
        }
      } else {
        if (this._lastFiredPremiereCueId !== cue.id) {
          this._lastFiredPremiereCueId = cue.id;
          AmbientManager.syncCinematicCue(cue.cueKey, activeCinematic.offset, this._isPlaying, cue.customGain ?? 1.0);
        }
      }
    } else {
      if (this._lastFiredPremiereCueId !== null) {
        this._lastFiredPremiereCueId = null;
        AmbientManager.stopCinematicCue(0.35);
      }
    }

    // 2. Screamer Layer (screamer) - plays in PARALLEL over music and ambient with ZERO ducking!
    const activeScreamer = dir.getActiveCueAtTime(act.id, currentTime, 'screamer');
    if (activeScreamer) {
      const cue = activeScreamer.cue;
      const isMuted = AmbientManager.isCategoryMuted('screamer');
      if (isMuted) {
        if (this._lastFiredScreamerCueId === cue.id) {
          this._lastFiredScreamerCueId = null;
          AmbientManager.stopScreamerCue(0.2);
        }
      } else {
        if (this._lastFiredScreamerCueId !== cue.id) {
          this._lastFiredScreamerCueId = cue.id;
          AmbientManager.syncScreamerCue(cue.cueKey, activeScreamer.offset, this._isPlaying, cue.customGain ?? 1.35);
        }
      }
    } else {
      if (this._lastFiredScreamerCueId !== null) {
        this._lastFiredScreamerCueId = null;
        AmbientManager.stopScreamerCue(0.2);
      }
    }
  }

  private _renderDawTimeline(): void {

    if (!this._dawTimelineContainer) return;



    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];

    const actDuration = Math.max(1, this._actDuration || act.duration || 60);

    const cues = this._directorMusicCues.get(act.id) || [];



    // Clear dynamic layers

    this._dawRulerGraphics.clear();

    this._dawRulerLabelsContainer.removeChildren();

    this._dawLanesBg.clear();

    this._dawLaneLabelsContainer.removeChildren();

    this._dawAmbientLaneContainer.removeChildren();

    this._dawPeaceBlocksContainer.removeChildren();

    this._dawDreadBlocksContainer.removeChildren();



    const DAW_X = -280;

    const DAW_W = 560;

    const TRACK_X = -255;

    const TRACK_W = 530;



    // 1. Ruler

    this._dawRulerGraphics.rect(DAW_X, 0, DAW_W, 18);

    this._dawRulerGraphics.fill({ color: 0x0f172a, alpha: 0.9 });

    this._dawRulerGraphics.stroke({ color: 0x334155, width: 0.8 });



    const stepSec = actDuration <= 50 ? 5 : (actDuration <= 130 ? 10 : (actDuration <= 250 ? 20 : 30));

    const labelStep = stepSec * 2;



    for (let t = 0; t <= actDuration + 0.1; t += stepSec) {

      const rx = TRACK_X + (t / actDuration) * TRACK_W;

      const isMajor = Math.round(t) % labelStep === 0 || t === 0;



      this._dawRulerGraphics.moveTo(rx, isMajor ? 5 : 10);

      this._dawRulerGraphics.lineTo(rx, 17);

      this._dawRulerGraphics.stroke({ color: isMajor ? 0x94a3b8 : 0x475569, width: isMajor ? 1.0 : 0.6 });



      if (isMajor && rx < DAW_X + DAW_W - 25) {

        const mins = Math.floor(t / 60);

        const secs = Math.floor(t % 60);

        const timeLabel = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        const lbl = new Text({

          text: timeLabel,

          style: new TextStyle({ fontFamily: ['Share Tech Mono', 'monospace'], fontSize: 8, fill: '#94a3b8' }),

        });

        lbl.anchor.set(0.5, 0);

        lbl.position.set(rx, 1);

        this._dawRulerLabelsContainer.addChild(lbl);

      }

    }



    // 2. Lanes Background

    // Lane 1: Dread

    this._dawLanesBg.rect(DAW_X, 20, DAW_W, 22);

    this._dawLanesBg.fill({ color: 0x190b14, alpha: 0.95 });

    this._dawLanesBg.stroke({ color: 0x3d1222, width: 0.6 });



    // Lane 2: Peace

    this._dawLanesBg.rect(DAW_X, 44, DAW_W, 22);

    this._dawLanesBg.fill({ color: 0x091a14, alpha: 0.95 });

    this._dawLanesBg.stroke({ color: 0x133827, width: 0.6 });



    // Lane 3: Ambient

    this._dawLanesBg.rect(DAW_X, 68, DAW_W, 24);

    this._dawLanesBg.fill({ color: 0x0d1a29, alpha: 0.95 });

    this._dawLanesBg.stroke({ color: 0x1a334d, width: 0.6 });



    // Lane Badges

    const badgeDread = new Text({

      text: '💀',

      style: new TextStyle({ fontSize: 11 }),

    });

    badgeDread.anchor.set(0.5);

    badgeDread.position.set(DAW_X + 12, 31);

    this._dawLaneLabelsContainer.addChild(badgeDread);



    const badgePeace = new Text({

      text: '🕊️',

      style: new TextStyle({ fontSize: 11 }),

    });

    badgePeace.anchor.set(0.5);

    badgePeace.position.set(DAW_X + 12, 55);

    this._dawLaneLabelsContainer.addChild(badgePeace);



    const badgeAmb = new Text({

      text: '📻',

      style: new TextStyle({ fontSize: 11 }),

    });

    badgeAmb.anchor.set(0.5);

    badgeAmb.position.set(DAW_X + 12, 80);

    this._dawLaneLabelsContainer.addChild(badgeAmb);



    // 3. Ambient Lane Strip

    const ambStrip = new Graphics();

    ambStrip.rect(TRACK_X, 70, TRACK_W, 20);

    ambStrip.fill({ color: 0x11273f, alpha: 0.85 });

    ambStrip.stroke({ color: 0x00f5d4, width: 0.8 });

    this._dawAmbientLaneContainer.addChild(ambStrip);



    let ambTitle = 'Базовый эмбиент';

    if (this._currentActIndex === 0) {

      ambTitle = `ВСТУПЛЕНИЕ: ${AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Distortion)' : 'Titan Forge'}`;

    } else {

      const curAmbKey = AmbientManager.getLockedTrackForAct(act.id) || AmbientManager.getCurrentTrackKey() || act.audioKey;

      const opt = MovieApp.AMBIENT_OPTIONS.find((o) => o.key === curAmbKey);

      ambTitle = `ЭМБИЕНТ: ${opt ? opt.name : curAmbKey}`;

    }



    const ambTxt = new Text({

      text: ambTitle,

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 9,

        fontWeight: 'bold',

        fill: '#00f5d4',

      }),

    });

    ambTxt.anchor.set(0, 0.5);

    ambTxt.position.set(TRACK_X + 6, 80);

    this._dawAmbientLaneContainer.addChild(ambTxt);



    // 4. Dread Blocks

    const dreadCues = cues.filter((c) => c.category === 'dread');

    dreadCues.forEach((cue) => {

      const opt = MovieApp.DREAD_OPTIONS.find((o) => o.key === cue.key);

      const dur = opt ? opt.dur : 25;

      const startX = TRACK_X + (cue.time / actDuration) * TRACK_W;

      const blockW = Math.max(26, Math.min(TRACK_X + TRACK_W - startX, (dur / actDuration) * TRACK_W));



      const blk = new Graphics();

      blk.rect(startX, 21, blockW, 20);

      blk.fill({ color: 0x470c1b, alpha: 0.90 });

      blk.stroke({ color: 0xef476f, width: 1.2 });

      blk.eventMode = 'static';

      blk.cursor = 'pointer';

      blk.on('pointerdown', (e: FederatedPointerEvent) => {

        e.stopPropagation();

        this.seekAudio(cue.time);

      });

      this._dawDreadBlocksContainer.addChild(blk);



      const titleTxt = new Text({

        text: `[${cue.time.toFixed(1)}s] ${opt ? opt.name : cue.name}`,

        style: new TextStyle({

          fontFamily: ['Share Tech Mono', 'monospace'],

          fontSize: 8,

          fontWeight: 'bold',

          fill: '#ff94aa',

        }),

      });

      titleTxt.anchor.set(0, 0.5);

      titleTxt.position.set(startX + 4, 31);

      this._dawDreadBlocksContainer.addChild(titleTxt);

    });



    // 5. Peace Blocks

    const peaceCues = cues.filter((c) => c.category === 'peace');

    peaceCues.forEach((cue) => {

      const opt = MovieApp.PEACE_OPTIONS.find((o) => o.key === cue.key);

      const dur = opt ? opt.dur : 30;

      const startX = TRACK_X + (cue.time / actDuration) * TRACK_W;

      const blockW = Math.max(26, Math.min(TRACK_X + TRACK_W - startX, (dur / actDuration) * TRACK_W));



      const blk = new Graphics();

      blk.rect(startX, 45, blockW, 20);

      blk.fill({ color: 0x093325, alpha: 0.90 });

      blk.stroke({ color: 0x06d6a0, width: 1.2 });

      blk.eventMode = 'static';

      blk.cursor = 'pointer';

      blk.on('pointerdown', (e: FederatedPointerEvent) => {

        e.stopPropagation();

        this.seekAudio(cue.time);

      });

      this._dawPeaceBlocksContainer.addChild(blk);



      const titleTxt = new Text({

        text: `[${cue.time.toFixed(1)}s] ${opt ? opt.name : cue.name}`,

        style: new TextStyle({

          fontFamily: ['Share Tech Mono', 'monospace'],

          fontSize: 8,

          fontWeight: 'bold',

          fill: '#52ffce',

        }),

      });

      titleTxt.anchor.set(0, 0.5);

      titleTxt.position.set(startX + 4, 55);

      this._dawPeaceBlocksContainer.addChild(titleTxt);

    });

  }



  private _setupDebugUI(): void {

    this._initDirectorMusicCues();



    // 0. Dedicated always-visible Gear button at top-right

    this._devGearBtn = new Container();

    this._devGearBtn.eventMode = 'static';

    this._devGearBtn.cursor = 'pointer';



    const gearBg = new Graphics();

    gearBg.rect(-16, -16, 32, 32);

    gearBg.fill({ color: 0x090b14, alpha: 0.90 });

    gearBg.stroke({ color: 0x00f5d4, width: 1.2 });

    this._devGearBtn.addChild(gearBg);



    const gearTxt = new Text({

      text: '⚙️',

      style: new TextStyle({ fontSize: 16, fill: '#00f5d4' }),

    });

    gearTxt.anchor.set(0.5);

    this._devGearBtn.addChild(gearTxt);



    this._devGearBtn.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      this.toggleDevAudioDirector();

    });



    this._devGearBtn.visible = false;
    // this._uiContainer.addChild(this._devGearBtn); // Completely disabled so nothing blocks the screen



    // Main Debug Container

    this._debugContainer = new Container();

    this._debugContainer.visible = false;

    this._debugContainer.eventMode = 'static';



    const pill = new Container();

    pill.eventMode = 'static';

    pill.cursor = 'pointer';



    this._debugPillBg = new Graphics();

    this._debugPillBg.rect(-150, -13, 270, 26);

    this._debugPillBg.fill({ color: 0x090b14, alpha: 0.9 });

    this._debugPillBg.stroke({ color: 0x00f5d4, width: 1.2 });

    pill.addChild(this._debugPillBg);



    const pillStyle = new TextStyle({

      fontFamily: ['Share Tech Mono', 'monospace'],

      fontSize: 10,

      fontWeight: 'bold',

      fill: '#00f5d4',

      letterSpacing: 0.5,

    });



    this._debugTrackText = new Text({ text: '🛠️ ЗВУКОВОЙ РЕЖИССЁР', style: pillStyle });

    this._debugTrackText.anchor.set(0.5);

    pill.addChild(this._debugTrackText);



    pill.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      this.toggleDevAudioDirector();

    });



    this._debugContainer.addChild(pill);



    // Expanded Director Suite Panel (620x520 sharp rectangle, zero rounding, pro dark sci-fi HUD)

    this._debugExpandedPanel = new Container();

    this._debugExpandedPanel.position.set(0, 22);

    this._debugExpandedPanel.visible = false;

    this._debugContainer.addChild(this._debugExpandedPanel);



    const panelBg = new Graphics();

    panelBg.rect(-310, 0, 620, 520);

    panelBg.fill({ color: 0x080a14, alpha: 0.98 });

    panelBg.stroke({ color: 0x00f5d4, width: 1.5 });

    this._debugExpandedPanel.addChild(panelBg);



    // Header Title

    const headerTitle = new Text({

      text: '[ 🎧 РЕЖИССЁР ЗВУКА И МУЗЫКИ • ГОТОВЫЙ ИНСТРУМЕНТ ]',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 11,

        fontWeight: 'bold',

        fill: '#00f5d4',

        letterSpacing: 1,

      }),

    });

    headerTitle.anchor.set(0.5, 0);

    headerTitle.position.set(0, 8);

    this._debugExpandedPanel.addChild(headerTitle);



    // Tab 1 & Tab 2 Switcher Buttons

    this._directorTabBtnCues = this._createDebugMiniBtn('🎬 Таймлайны музыки', () => {

      this._directorActiveTab = 'cues';

      this._updateDebugDisplay();

    }, 160);

    this._directorTabBtnCues.position.set(-85, 32);

    this._debugExpandedPanel.addChild(this._directorTabBtnCues);



    this._directorTabBtnAmb = this._createDebugMiniBtn('🎚️ Переходы & Эмбиент', () => {

      this._directorActiveTab = 'ambient';

      this._updateDebugDisplay();

    }, 160);

    this._directorTabBtnAmb.position.set(85, 32);

    this._debugExpandedPanel.addChild(this._directorTabBtnAmb);



    // CONTAINER A: Cues Timeline Director (Tab 1)

    this._directorCuesPanel = new Container();

    this._directorCuesPanel.position.set(0, 56);

    this._debugExpandedPanel.addChild(this._directorCuesPanel);



    // 1. Act time HUD

    this._directorActTimeText = new Text({

      text: '',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 11,

        fontWeight: 'bold',

        fill: '#ffd166',

      }),

    });

    this._directorActTimeText.anchor.set(0.5, 0);

    this._directorActTimeText.position.set(0, 0);

    this._directorCuesPanel.addChild(this._directorActTimeText);



    // 2. Now Playing Live HUD

    this._directorNowPlayingText = new Text({

      text: 'СЕЙЧАС ЗВУЧИТ: [ 📻 Базовый эмбиент ]',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 10,

        fontWeight: 'bold',

        fill: '#00f5d4',

      }),

    });

    this._directorNowPlayingText.anchor.set(0.5, 0);

    this._directorNowPlayingText.position.set(0, 13);

    this._directorCuesPanel.addChild(this._directorNowPlayingText);



    // 3. Act 0 Dedicated Intro Variants Switcher Row

    this._dawIntroVariantsContainer = new Container();

    this._dawIntroVariantsContainer.position.set(0, 44);

    this._dawIntroVariantsContainer.visible = false;

    this._directorCuesPanel.addChild(this._dawIntroVariantsContainer);



    this._btnIntroVar1 = this._createDebugMiniBtn('★ 1: Desolate Cry', () => {

      this.setIntroTrackVariant('desolate_cry');

    }, 210);

    this._btnIntroVar1.position.set(-110, 0);

    this._dawIntroVariantsContainer.addChild(this._btnIntroVar1);



    this._btnIntroVar2 = this._createDebugMiniBtn('2: Titan Forge', () => {

      this.setIntroTrackVariant('titan_forge');

    }, 210);

    this._btnIntroVar2.position.set(110, 0);

    this._dawIntroVariantsContainer.addChild(this._btnIntroVar2);



    // 4. DAW Multi-Track Timeline Container

    this._dawTimelineContainer = new Container();

    this._dawTimelineContainer.position.set(0, 68);

    this._directorCuesPanel.addChild(this._dawTimelineContainer);



    // DAW background & click/scrub listener

    this._dawTimelineBg = new Graphics();

    this._dawTimelineBg.rect(-280, 0, 560, 96);

    this._dawTimelineBg.fill({ color: 0x090d16, alpha: 0.95 });

    this._dawTimelineBg.stroke({ color: 0x1e293b, width: 1.0 });

    this._dawTimelineBg.eventMode = 'static';

    this._dawTimelineBg.cursor = 'pointer';

    this._dawTimelineContainer.addChild(this._dawTimelineBg);



    const handleDawPointer = (e: FederatedPointerEvent) => {

      const local = e.getLocalPosition(this._dawTimelineContainer);

      const ratio = Math.max(0, Math.min(1.0, (local.x - (-255)) / 530));

      const targetTime = ratio * this._actDuration;

      this.seekAudio(targetTime);

    };



    this._dawTimelineBg.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      this._dawIsDraggingTimeline = true;

      handleDawPointer(e);

    });

    this._dawTimelineBg.on('globalpointermove', (e: FederatedPointerEvent) => {

      if (this._dawIsDraggingTimeline) handleDawPointer(e);

    });

    this._dawTimelineBg.on('pointerup', () => { this._dawIsDraggingTimeline = false; });

    this._dawTimelineBg.on('pointerupoutside', () => { this._dawIsDraggingTimeline = false; });



    this._dawRulerGraphics = new Graphics();

    this._dawTimelineContainer.addChild(this._dawRulerGraphics);



    this._dawRulerLabelsContainer = new Container();

    this._dawTimelineContainer.addChild(this._dawRulerLabelsContainer);



    this._dawLanesBg = new Graphics();

    this._dawTimelineContainer.addChild(this._dawLanesBg);



    this._dawAmbientLaneContainer = new Container();

    this._dawTimelineContainer.addChild(this._dawAmbientLaneContainer);



    this._dawPeaceBlocksContainer = new Container();

    this._dawTimelineContainer.addChild(this._dawPeaceBlocksContainer);



    this._dawDreadBlocksContainer = new Container();

    this._dawTimelineContainer.addChild(this._dawDreadBlocksContainer);



    this._dawLaneLabelsContainer = new Container();

    this._dawTimelineContainer.addChild(this._dawLaneLabelsContainer);



    this._dawPlayhead = new Container();

    this._dawPlayhead.position.set(-255, 0);



    const needleLine = new Graphics();

    needleLine.rect(0, 0, 2, 94);

    needleLine.fill({ color: 0x00f5d4, alpha: 0.9 });

    this._dawPlayhead.addChild(needleLine);



    const needleHead = new Graphics();

    needleHead.moveTo(-4, 0);

    needleHead.lineTo(4, 0);

    needleHead.lineTo(0, 7);

    needleHead.closePath();

    needleHead.fill({ color: 0xffd166, alpha: 1.0 });

    this._dawPlayhead.addChild(needleHead);



    this._dawTimelineContainer.addChild(this._dawPlayhead);



    // --- 5. DREAD / TENSION SECTION ---

    const dreadBox = new Graphics();

    dreadBox.rect(-275, 158, 550, 64);

    dreadBox.fill({ color: 0x140a12, alpha: 0.90 });

    dreadBox.stroke({ color: 0xef476f, width: 1.0 });

    this._directorCuesPanel.addChild(dreadBox);



    this._directorDreadText = new Text({

      text: '💀 НАГНЕТАЮЩАЯ МУЗЫКА:',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 10,

        fontWeight: 'bold',

        fill: '#ef476f',

      }),

    });

    this._directorDreadText.anchor.set(0, 0.5);

    this._directorDreadText.position.set(-265, 172);

    this._directorCuesPanel.addChild(this._directorDreadText);



    const btnDreadPrev = this._createDebugMiniBtn('◄', () => {

      this._selectedDreadIndex = (this._selectedDreadIndex - 1 + MovieApp.DREAD_OPTIONS.length) % MovieApp.DREAD_OPTIONS.length;

      this._updateDebugDisplay();

    }, 28);

    btnDreadPrev.position.set(70, 172);

    this._directorCuesPanel.addChild(btnDreadPrev);



    const btnDreadNext = this._createDebugMiniBtn('►', () => {

      this._selectedDreadIndex = (this._selectedDreadIndex + 1) % MovieApp.DREAD_OPTIONS.length;

      this._updateDebugDisplay();

    }, 28);

    btnDreadNext.position.set(104, 172);

    this._directorCuesPanel.addChild(btnDreadNext);



    const btnDreadTest = this._createDebugMiniBtn('▶ Тест', () => {

      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex];

      if (opt) AmbientManager.playCinematicCue(opt.key);

    }, 62);

    btnDreadTest.position.set(156, 172);

    this._directorCuesPanel.addChild(btnDreadTest);



    const btnDreadSetStart = this._createDebugMiniBtn('💀 НАЧАТЬ ЗДЕСЬ (T)', () => {

      this.addDirectorMusicCue('dread');

    }, 150);

    btnDreadSetStart.position.set(-185, 202);

    this._directorCuesPanel.addChild(btnDreadSetStart);



    const btnDreadSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {

      this.addDirectorMusicCue('stop');

    }, 150);

    btnDreadSetStop.position.set(-25, 202);

    this._directorCuesPanel.addChild(btnDreadSetStop);



    // --- 6. PEACE SECTION ---

    const peaceBox = new Graphics();

    peaceBox.rect(-275, 228, 550, 64);

    peaceBox.fill({ color: 0x0a141a, alpha: 0.90 });

    peaceBox.stroke({ color: 0x06d6a0, width: 1.0 });

    this._directorCuesPanel.addChild(peaceBox);



    this._directorPeaceText = new Text({

      text: '🕊️ ДОБРАЯ МУЗЫКА:',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 10,

        fontWeight: 'bold',

        fill: '#06d6a0',

      }),

    });

    this._directorPeaceText.anchor.set(0, 0.5);

    this._directorPeaceText.position.set(-265, 242);

    this._directorCuesPanel.addChild(this._directorPeaceText);



    const btnPeacePrev = this._createDebugMiniBtn('◄', () => {

      this._selectedPeaceIndex = (this._selectedPeaceIndex - 1 + MovieApp.PEACE_OPTIONS.length) % MovieApp.PEACE_OPTIONS.length;

      this._updateDebugDisplay();

    }, 28);

    btnPeacePrev.position.set(70, 242);

    this._directorCuesPanel.addChild(btnPeacePrev);



    const btnPeaceNext = this._createDebugMiniBtn('►', () => {

      this._selectedPeaceIndex = (this._selectedPeaceIndex + 1) % MovieApp.PEACE_OPTIONS.length;

      this._updateDebugDisplay();

    }, 28);

    btnPeaceNext.position.set(104, 242);

    this._directorCuesPanel.addChild(btnPeaceNext);



    const btnPeaceTest = this._createDebugMiniBtn('▶ Тест', () => {

      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex];

      if (opt) AmbientManager.playCinematicCue(opt.key);

    }, 62);

    btnPeaceTest.position.set(156, 242);

    this._directorCuesPanel.addChild(btnPeaceTest);



    const btnPeaceSetStart = this._createDebugMiniBtn('🕊️ НАЧАТЬ ЗДЕСЬ (P)', () => {

      this.addDirectorMusicCue('peace');

    }, 150);

    btnPeaceSetStart.position.set(-185, 272);

    this._directorCuesPanel.addChild(btnPeaceSetStart);



    const btnPeaceSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {

      this.addDirectorMusicCue('stop');

    }, 150);

    btnPeaceSetStop.position.set(-25, 272);

    this._directorCuesPanel.addChild(btnPeaceSetStop);



    // --- 7. ACTIVE CUES LIST OF THIS ACT ---

    const listHeader = new Text({

      text: 'АКТИВНЫЕ МУЗЫКАЛЬНЫЕ ОТРЕЗКИ ЭТОГО АКТА (СДВИГ [-1s] / [+1s]):',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 10,

        fontWeight: 'bold',

        fill: '#e2e8f0',

      }),

    });

    listHeader.anchor.set(0, 0);

    listHeader.position.set(-275, 298);

    this._directorCuesPanel.addChild(listHeader);



    this._directorCuesListContainer = new Container();

    this._directorCuesListContainer.position.set(-275, 314);

    this._directorCuesPanel.addChild(this._directorCuesListContainer);



    // --- 8. ACTION BAR: EXPORT JSON & RESET ---

    const btnExportJson = this._createDebugMiniBtn('📋 Скопировать JSON', () => {

      this.exportDirectorCuesJson();

    }, 150);

    btnExportJson.position.set(-185, 412);

    this._directorCuesPanel.addChild(btnExportJson);



    const btnResetCues = this._createDebugMiniBtn('↺ Сбросить к канону', () => {

      this.resetDirectorCuesToDefaults();

    }, 150);

    btnResetCues.position.set(-25, 412);

    this._directorCuesPanel.addChild(btnResetCues);



    // CONTAINER B: Ambient & Transitions (Tab 2)

    this._directorAmbientPanel = new Container();

    this._directorAmbientPanel.position.set(0, 60);

    this._directorAmbientPanel.visible = false;

    this._debugExpandedPanel.addChild(this._directorAmbientPanel);



    // Transition Sound Controls

    this._debugTransLabel = new Text({

      text: 'ПЕРЕХОД: [...]',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 11,

        fontWeight: 'bold',

        fill: '#e2e8f0',

      }),

    });

    this._debugTransLabel.anchor.set(0.5, 0);

    this._debugTransLabel.position.set(0, 20);

    this._directorAmbientPanel.addChild(this._debugTransLabel);



    const btnTransPrev = this._createDebugMiniBtn('◄ Пред', () => {

      this._selectedTransSoundIndex = (this._selectedTransSoundIndex - 1 + MovieApp.TRANSITION_SOUNDS_METADATA.length) % MovieApp.TRANSITION_SOUNDS_METADATA.length;

      this._updateDebugDisplay();

    }, 72);

    btnTransPrev.position.set(-155, 48);

    this._directorAmbientPanel.addChild(btnTransPrev);



    const btnTransNext = this._createDebugMiniBtn('След ►', () => {

      this._selectedTransSoundIndex = (this._selectedTransSoundIndex + 1) % MovieApp.TRANSITION_SOUNDS_METADATA.length;

      this._updateDebugDisplay();

    }, 72);

    btnTransNext.position.set(-72, 48);

    this._directorAmbientPanel.addChild(btnTransNext);



    const btnTransTest = this._createDebugMiniBtn('▶ Тест', () => {

      const cur = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex];

      const url = getAudioUrl(cur.key);

      if (url) {

        if (this._transitionAudio) this._transitionAudio.pause();

        const a = new Audio(url);

        a.volume = Math.max(0, Math.min(1.0, this._sfxVolume * cur.gain));

        a.play().catch(() => {});

        this._transitionAudio = a;

      }

    }, 72);

    btnTransTest.position.set(11, 48);

    this._directorAmbientPanel.addChild(btnTransTest);



    const btnTransLock = this._createDebugMiniBtn('★ Закрепить', () => {

      const cur = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex];

      this.setLockedTransitionSound(cur.key);

      this._setDirectorNotice(`★ Переход зафиксирован: ${cur.name}`);

      this._updateDebugDisplay();

    }, 98);

    btnTransLock.position.set(106, 48);

    this._directorAmbientPanel.addChild(btnTransLock);



    // Act Ambient Track Controls

    this._debugAmbientLabel = new Text({

      text: 'ЭМБИЕНТ: [...]',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 11,

        fontWeight: 'bold',

        fill: '#e2e8f0',

      }),

    });

    this._debugAmbientLabel.anchor.set(0.5, 0);

    this._debugAmbientLabel.position.set(0, 92);

    this._directorAmbientPanel.addChild(this._debugAmbientLabel);



    const btnAmbPrev = this._createDebugMiniBtn('◄ Пред', () => {

      this._selectedAmbientIndex = (this._selectedAmbientIndex - 1 + MovieApp.AMBIENT_OPTIONS.length) % MovieApp.AMBIENT_OPTIONS.length;

      this._updateDebugDisplay();

    }, 72);

    btnAmbPrev.position.set(-155, 120);

    this._directorAmbientPanel.addChild(btnAmbPrev);



    const btnAmbNext = this._createDebugMiniBtn('След ►', () => {

      this._selectedAmbientIndex = (this._selectedAmbientIndex + 1) % MovieApp.AMBIENT_OPTIONS.length;

      this._updateDebugDisplay();

    }, 72);

    btnAmbNext.position.set(-72, 120);

    this._directorAmbientPanel.addChild(btnAmbNext);



    const btnAmbPlay = this._createDebugMiniBtn('▶ Включить', () => {

      const cur = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex];

      AmbientManager.playTrack(cur.key as any, 0.28, 0.5);

    }, 84);

    btnAmbPlay.position.set(17, 120);

    this._directorAmbientPanel.addChild(btnAmbPlay);



    const btnAmbLock = this._createDebugMiniBtn('★ Закрепить', () => {

      const cur = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex];

      const act = STORY_ACTS[this._currentActIndex];

      const actKey = act ? act.id : `act_${this._currentActIndex}`;

      AmbientManager.setLockedTrackForAct(actKey, cur.key);

      AmbientManager.playTrack(cur.key as any, 0.28, 0.5);

      this._setDirectorNotice(`★ Эмбиент акта зафиксирован: ${cur.name}`);

      this._updateDebugDisplay();

    }, 98);

    btnAmbLock.position.set(119, 120);

    this._directorAmbientPanel.addChild(btnAmbLock);



    // Global Notice / Status Text

    this._directorNoticeText = new Text({

      text: 'Горячие клавиши режиссера: T = Начать страшную, P = Начать добрую, X = Стоп музыки, D = Скрыть панель',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 9,

        fill: '#94a3b8',

      }),

    });

    this._directorNoticeText.anchor.set(0.5, 0);

    this._directorNoticeText.position.set(0, 442);

    this._debugExpandedPanel.addChild(this._directorNoticeText);



    this._updateDebugDisplay();

  }



  private _createDebugMiniBtn(label: string, onClick: () => void, btnW = 108): Container {

    const c = new Container();

    c.eventMode = 'static';

    c.cursor = 'pointer';



    const bg = new Graphics();

    bg.rect(-btnW / 2, -11, btnW, 22);

    bg.fill({ color: 0x141824, alpha: 0.9 });

    bg.stroke({ color: 0x2e3852, width: 1 });

    c.addChild(bg);



    const txt = new Text({

      text: label,

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 9,

        fontWeight: 'bold',

        fill: '#e2e8f0',

      }),

    });

    txt.anchor.set(0.5);

    c.addChild(txt);



    c.on('pointerdown', (e: FederatedPointerEvent) => {

      e.stopPropagation();

      ClickTracker.exclude();

      onClick();

    });



    c.on('pointerenter', () => {

      bg.clear();

      bg.rect(-btnW / 2, -11, btnW, 22);

      bg.fill({ color: 0x242e44, alpha: 0.95 });

      bg.stroke({ color: 0x00f5d4, width: 1.2 });

      txt.style.fill = '#00f5d4';

    });



    c.on('pointerleave', () => {

      bg.clear();

      bg.rect(-btnW / 2, -11, btnW, 22);

      bg.fill({ color: 0x141824, alpha: 0.9 });

      bg.stroke({ color: 0x2e3852, width: 1 });

      txt.style.fill = '#e2e8f0';

    });



    return c;

  }



  public toggleIntroTrack(): void {

    const cur = AmbientManager.getIntroTrack();

    const next = cur === 'desolate_cry' ? 'titan_forge' : 'desolate_cry';

    AmbientManager.setIntroTrack(next, this._currentActIndex === 0);

    this._updateDebugDisplay();

  }



  private _updateDebugDisplay(): void {

    if (!this._debugContainer) return;



    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];

    const isCuesTab = this._directorActiveTab === 'cues';



    if (this._directorCuesPanel) this._directorCuesPanel.visible = isCuesTab;

    if (this._directorAmbientPanel) this._directorAmbientPanel.visible = !isCuesTab;



    // Update Act HUD

    if (this._directorActTimeText) {

      const curT = Math.max(0, this._actTime).toFixed(1);

      const totT = this._actDuration.toFixed(1);

      this._directorActTimeText.text = `АКТ ${this._currentActIndex}: ${act.title} • ТЕКУЩИЙ КАДР: ${curT}s / ${totT}s`;

    }



    // Update Dread track name

    if (this._directorDreadText) {

      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex] || MovieApp.DREAD_OPTIONS[0];

      this._directorDreadText.text = `💀 НАГНЕТАЮЩАЯ: [${opt.name}]`;

    }



    // Update Peace track name

    if (this._directorPeaceText) {

      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];

      this._directorPeaceText.text = `🕊️ ДОБРАЯ: [${opt.name}]`;

    }



    // Act 0 Intro Variants Button Highlights

    if (this._currentActIndex === 0) {

      if (this._dawIntroVariantsContainer) this._dawIntroVariantsContainer.visible = true;

      const curIntro = AmbientManager.getIntroTrack();

      if (this._btnIntroVar1) {

        const txt = this._btnIntroVar1.children.find((ch): ch is Text => ch instanceof Text);

        if (txt) txt.text = curIntro === 'desolate_cry' ? '★ 1: Desolate Cry (Активен)' : '1: Desolate Cry';

      }

      if (this._btnIntroVar2) {

        const txt = this._btnIntroVar2.children.find((ch): ch is Text => ch instanceof Text);

        if (txt) txt.text = curIntro === 'titan_forge' ? '★ 2: Titan Forge (Активен)' : '2: Titan Forge';

      }

    } else {

      if (this._dawIntroVariantsContainer) this._dawIntroVariantsContainer.visible = false;

    }



    // Redraw Multi-Track DAW Timeline

    this._renderDawTimeline();



    // Redraw Active Cues List

    if (this._directorCuesListContainer) {

      this._directorCuesListContainer.removeChildren();

      const cues = this._directorMusicCues.get(act.id) || [];



      if (cues.length === 0) {

        const emptyTxt = new Text({

          text: '(В этом акте пока нет музыкальных отрезков. Нажмите "Начать здесь" для фиксации)',

          style: new TextStyle({ fontFamily: ['Share Tech Mono', 'monospace'], fontSize: 9, fill: '#64748b' }),

        });

        emptyTxt.position.set(0, 4);

        this._directorCuesListContainer.addChild(emptyTxt);

      } else {

        cues.slice(0, 5).forEach((cue, idx) => {

          const row = new Container();

          row.position.set(0, idx * 24);



          const timeTxt = new Text({

            text: `[ ${cue.time.toFixed(1)}s ] ${cue.name}`,

            style: new TextStyle({

              fontFamily: ['Share Tech Mono', 'monospace'],

              fontSize: 9,

              fontWeight: 'bold',

              fill: cue.category === 'dread' ? '#ef476f' : (cue.category === 'peace' ? '#06d6a0' : '#ffd166'),

            }),

          });

          timeTxt.position.set(0, 3);

          row.addChild(timeTxt);



          const btnMinus = this._createDebugMiniBtn('-1s', () => {

            this.nudgeDirectorMusicCue(cue.id, -1.0);

          }, 32);

          btnMinus.position.set(385, 8);

          row.addChild(btnMinus);



          const btnPlus = this._createDebugMiniBtn('+1s', () => {

            this.nudgeDirectorMusicCue(cue.id, +1.0);

          }, 32);

          btnPlus.position.set(425, 8);

          row.addChild(btnPlus);



          const btnDel = this._createDebugMiniBtn('✕', () => {

            this.deleteDirectorMusicCue(cue.id);

          }, 24);

          btnDel.position.set(462, 8);

          row.addChild(btnDel);



          this._directorCuesListContainer.addChild(row);

        });

      }

    }



    // Update Ambient & Transition Labels

    if (this._debugTransLabel) {

      const lockedTrans = this.getLockedTransitionSound();

      const curTrans = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex] || MovieApp.TRANSITION_SOUNDS_METADATA[0];

      const isLocked = curTrans.key === lockedTrans;

      this._debugTransLabel.text = `ПЕРЕХОД: [${curTrans.name}] ${isLocked ? '★ ЗАКРЕПЛЁН' : ''}`;

      this._debugTransLabel.style.fill = isLocked ? '#00f5d4' : '#e2e8f0';

    }



    if (this._debugAmbientLabel) {

      const actKey = act ? act.id : `act_${this._currentActIndex}`;

      const lockedAmb = AmbientManager.getLockedTrackForAct(actKey);

      const curAmb = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex] || MovieApp.AMBIENT_OPTIONS[0];

      const isLocked = curAmb.key === lockedAmb;

      this._debugAmbientLabel.text = `ЭМБИЕНТ АКТА (${this._currentActIndex + 1}): [${curAmb.name}] ${isLocked ? '★ ЗАКРЕПЛЁН' : ''}`;

      this._debugAmbientLabel.style.fill = isLocked ? '#00f5d4' : '#e2e8f0';

    }

  }

public goToAct(index: number, autoPlay?: boolean, crossfadeSec: number = 0, isNaturalTransition: boolean = false): void {



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



    this._lastFiredPremiereCueId = null;



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



    this._subtitles.hideSlackPopup(true);



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



      this._actDuration = this._introProfile.introEndTime;



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

        const introTrack = AmbientManager.getIntroTrack();

        if (!shouldPlay) {

          AmbientManager.setPaused(true);

        } else {

          AmbientManager.setPaused(false);

        }

        this._introAmbientStarted = true;

        AmbientManager.playTrack(introTrack, 1.0, crossfadeSec > 0 ? crossfadeSec : 1.5);

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



      // Star Wars Optical Wipe: between distinct locations and acts

      const isSceneTransition = isNaturalTransition && (prevActIndex !== -1 && prevActIndex !== index && index !== 0) && !this._isSeeking && !this._isTimelineDragging;

      const newSceneTex = resolvedImageKey ? getTexture(resolvedImageKey) : null;

      if (isSceneTransition && oldSceneTex && newSceneTex && oldSceneTex !== newSceneTex && oldSceneTex !== Texture.WHITE) {

        this._startStarWarsWipe(oldSceneTex, newSceneTex);

      }



      // Location Establishing Badge: prints out top-left with teletype tick SFX and radar HUD

      if (act.id !== 'intro_playbox' && (act.frameTitle || act.title)) {

        const locTitle = act.frameTitle || act.title;

        this._showCornerLocationBadge('СЕКТОР КОВЧЕГА', locTitle, Math.max(5.5, (act.voiceDelay || 0) + 1.2));

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
      AmbientManager.stopAllAmbientImmediately();
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



          AmbientManager.stopCinematicCue(0.3);



          this.nextAct(2.5);



        }



      },



    });



  }



  public seekAudio(targetSeconds: number): void {

    this._isSeeking = true;

    this._lastFiredMusicCueId = null;

    if (this._isWiping) {

      this._cancelWipe();

    }

    if (this._transitionAudio) {

      this._transitionAudio.pause();

      this._transitionAudio = null;

    }



    const clamped = Math.max(0, Math.min(this._actDuration, targetSeconds));

    this._actTime = clamped;

    this._narratorCurrentTexKey = '';

    this._isTransitioningAct = false;

    AmbientManager.cancelWait();

    cancelTween(this._bgSprite);



    if (this._currentActIndex === 0) {

      const introTrack = AmbientManager.getIntroTrack();

      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack) {

        this._introAmbientStarted = true;

        AmbientManager.playTrack(introTrack, 1.0, 0.0);

      }

      AmbientManager.seekCurrent(clamped);

      if (this._isPlaying) {

        AmbientManager.resumeCurrent();

        if (this._videoElement && clamped >= 7.5) {

          this._videoElement.style.opacity = '1';

          this._videoElement.play().catch(() => {});

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

      const { key: expectedAmbientKey, duckFactor: expectedDuck } = AmbientManager.getTrackForAct(this._currentActIndex, act.id, clamped);

      const activeCinematic = !isSongAct ? PremiereAudioDirector.getInstance().getActiveCueAtTime(act.id, clamped, 'cinematic') : null;

      const isCinematicMuted = activeCinematic ? AmbientManager.isCategoryMuted(activeCinematic.cue.type) : false;

      // Only cinematic tracks (dread/peace) are allowed to duck background ambient!
      const effectiveDuck = (activeCinematic && !isCinematicMuted && activeCinematic.cue.duckAmbientTo !== undefined)
        ? activeCinematic.cue.duckAmbientTo
        : expectedDuck;

      if (expectedAmbientKey) {
        const curKey = AmbientManager.getCurrentTrackKey();
        const curAudio = AmbientManager.getCurrentAudio();
        if (curKey !== expectedAmbientKey || !curAudio) {
          AmbientManager.playTrack(expectedAmbientKey, effectiveDuck, 0.0);
        }

        let targetAmbientSeek = clamped;
        if (isPrologue) {
          if (clamped < 18.5) {
            targetAmbientSeek = 45.5 + clamped;
          } else {
            targetAmbientSeek = 15.0 + (clamped - 18.5);
          }
        }
        AmbientManager.seekCurrent(targetAmbientSeek);
      } else if (isSongAct) {
        AmbientManager.stopAllAmbientImmediately();
      }

      // 1. Sync or stop cinematic cue (dread / peace)
      if (!isSongAct && activeCinematic && !isCinematicMuted) {
        this._lastFiredPremiereCueId = activeCinematic.cue.id;
        AmbientManager.syncCinematicCue(activeCinematic.cue.cueKey, activeCinematic.offset, this._isPlaying, activeCinematic.cue.customGain ?? 1.0);
      } else {
        this._lastFiredPremiereCueId = null;
        AmbientManager.stopCinematicCue(0.2);
      }

      // 2. Sync or stop screamer cue (parallel stinger layer, zero ducking!)
      const activeScreamer = !isSongAct ? PremiereAudioDirector.getInstance().getActiveCueAtTime(act.id, clamped, 'screamer') : null;
      const isScreamerMuted = activeScreamer ? AmbientManager.isCategoryMuted('screamer') : false;
      if (!isSongAct && activeScreamer && !isScreamerMuted) {
        this._lastFiredScreamerCueId = activeScreamer.cue.id;
        AmbientManager.syncScreamerCue(activeScreamer.cue.cueKey, activeScreamer.offset, this._isPlaying, activeScreamer.cue.customGain ?? 1.35);
      } else {
        this._lastFiredScreamerCueId = null;
        AmbientManager.stopScreamerCue(0.2);
      }

      if (this._isPlaying) {
        if (!isSongAct) {
          AmbientManager.resumeCurrent();
        }
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

    this._isSeeking = false;

  }



  private _playIntroAnimation(): void {



    this._introAmbientStarted = false;



    this._introDisclaimerContainer.alpha = 0;



    this._clearDisclaimerLines();



    this._lastDisclaimerCharCount = -1;



    this._lastSeriesSubCharCount = -1;



    this._introLogoSprite.alpha = 0;

    this._introRealLogoSprite.alpha = 0;

    this._introGlitchSoundPlayed1 = false;

    this._introGlitchSoundPlayed2 = false;



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

    const currentTrackKey = AmbientManager.getIntroTrack();

    if (!this._introProfile || this._introProfile.trackKey !== currentTrackKey) {

      this._introProfile = AudioTrackAnalyzer.getProfile(currentTrackKey);

    }

    const profile = this._introProfile;

    const discStart = 0.4;

    const discTypeEnd = 5.4;

    const discHoldEnd = 6.8;

    const discFadeEnd = 7.8;



    // Ensure initial music is ignited once from second 0.0

    const introKey = profile.trackKey || AmbientManager.getIntroTrack();

    if (this._isPlaying && !this._introAmbientStarted) {

      this._introAmbientStarted = true;

      AmbientManager.playTrack(introKey, 1.0, 1.5);

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



      const mt = t; // Continuous music timeline from 0.0s!



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



      // Phase 1 (in music): 7.8s - 9.0s: Space video background drift, ambient begins ("не сразу" - космическая пауза)



      if (mt < 9.0) {



        this._introLogoSprite.alpha = 0;

        this._introRealLogoSprite.alpha = 0;

        this._introGlitchSoundPlayed1 = false;

        this._introGlitchSoundPlayed2 = false;



        this._introStudiosText.alpha = 0;



        this._introPresentsText.alpha = 0;



        this._introSeriesContainer.alpha = 0;



        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 2: 9.0s - 13.0s: Skull logo slowly and smoothly appears over space video ("плавно появлялось")

      else if (mt >= 9.0 && mt < 13.0) {



        const p = (mt - 9.0) / 4.0;

        const skullAlpha = Math.min(1, p);

        const scaleMul = 0.94 + p * 0.06;



        this._introLogoSprite.alpha = skullAlpha;

        this._introRealLogoSprite.alpha = 0;

        this._introLogoSprite.position.set(0, this._introLogoBaseY);

        this._introLogoSprite.scale.set(this._introLogoBaseScale * scaleMul);



        this._introStudiosText.alpha = 0;

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 3: 13.0s - 15.0s: "STUDIOS" glows into visibility

      else if (mt >= 13.0 && mt < 15.0) {



        this._introLogoSprite.alpha = 1;

        this._introRealLogoSprite.alpha = 0;

        this._introLogoSprite.position.set(0, this._introLogoBaseY);

        this._introLogoSprite.scale.set(this._introLogoBaseScale);



        const p = (mt - 13.0) / 2.0;

        this._introStudiosText.alpha = Math.min(1, p);

        this._introPresentsText.alpha = 0;

        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 4: 15.0s - logoDisperseTime: Letters "PRESENTS" type out on screen, followed by double electric glitch!

      else if (mt >= 15.0 && mt < profile.logoDisperseTime) {



        this._introStudiosText.alpha = 1;



        const full = 'PRESENTS';

        const typingSpan = 1.0;

        const p = Math.min(1, (mt - 15.0) / typingSpan);

        const chars = Math.floor(p * full.length);

        this._introPresentsText.text = full.substring(0, chars);

        this._introPresentsText.alpha = 1;

        this._introPresentsText.style.letterSpacing = Math.round(4 * this._introFontScale);



        // Double electric contact glitch AFTER "PRESENTS" is fully typed (mt >= 16.3s)

        // With calibrated delay between glitch 1 and glitch 2:

        // Glitch 1: 16.45s - 16.59s (140ms duration)

        // Delay between: 16.59s - 16.72s (130ms delay)

        // Glitch 2: 16.72s - 16.86s (140ms duration)

        const isGlitch1 = mt >= 16.45 && mt < 16.59;

        const isGlitch2 = mt >= 16.72 && mt < 16.86;



        if (isGlitch1) {

          if (!this._introGlitchSoundPlayed1) {

            this._introGlitchSoundPlayed1 = true;

            SFX.playElectricGlitch();

          }

          this._introLogoSprite.alpha = 0;

          this._introRealLogoSprite.alpha = 1;

          const jx = (Math.random() - 0.5) * 5;

          const jy = (Math.random() - 0.5) * 4;

          this._introRealLogoSprite.position.set(jx, this._introLogoBaseY + jy);

          this._introRealLogoSprite.scale.set(this._introLogoBaseScale);

        } else if (isGlitch2) {

          if (!this._introGlitchSoundPlayed2) {

            this._introGlitchSoundPlayed2 = true;

            SFX.playElectricGlitch();

          }

          this._introLogoSprite.alpha = 0;

          this._introRealLogoSprite.alpha = 1;

          const jx = (Math.random() - 0.5) * 5;

          const jy = (Math.random() - 0.5) * 4;

          this._introRealLogoSprite.position.set(jx, this._introLogoBaseY + jy);

          this._introRealLogoSprite.scale.set(this._introLogoBaseScale);

        } else {

          this._introLogoSprite.alpha = 1;

          this._introRealLogoSprite.alpha = 0;

          this._introLogoSprite.position.set(0, this._introLogoBaseY);

          this._introLogoSprite.scale.set(this._introLogoBaseScale);

        }



        if (mt < 16.3) {

          this._introGlitchSoundPlayed1 = false;

        }

        if (mt < 16.65) {

          this._introGlitchSoundPlayed2 = false;

        }



        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 5: logoDisperseTime - logoFadeOutTime: Alien-style dispersion and slow fade out into the void

      else if (mt >= profile.logoDisperseTime && mt < profile.logoFadeOutTime) {



        const fadeDur = profile.logoFadeOutTime - profile.logoDisperseTime;

        const fade = Math.max(0, 1 - (mt - profile.logoDisperseTime) / fadeDur);



        this._introLogoSprite.alpha = fade;

        this._introRealLogoSprite.alpha = 0;

        this._introStudiosText.alpha = fade;

        this._introPresentsText.alpha = fade;

        this._introPresentsText.text = 'PRESENTS';

        this._introPresentsText.style.letterSpacing = Math.round((4 + (mt - profile.logoDisperseTime) * 1.5) * this._introFontScale);



        this._introSeriesContainer.alpha = 0;

        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 6: logoFadeOutTime - titleDropTime: THEATRICAL PAUSE IN THE VOID



      // Tension valley in audio, cosmic video drifts silently, audience holds breath



      else if (mt >= profile.logoFadeOutTime && mt < profile.titleDropTime) {



        this._introLogoSprite.alpha = 0;

        this._introRealLogoSprite.alpha = 0;



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

        this._introRealLogoSprite.alpha = 0;



        this._introStudiosText.alpha = 0;



        this._introPresentsText.alpha = 0;



        const isDesolate = profile.trackKey === 'desolate_cry';

        let p: number;

        let punchScale: number;



        if (isDesolate) {

          p = Math.min(1, (mt - profile.titleDropTime) / 2.5);

          punchScale = 0.95 + p * 0.05;

        } else {

          // Titan Forge: heavy drum impact strike on 24.0s sharp!

          // Logo appears IMMEDIATELY at 24.0s with explosive punch impact (1.07 -> 1.0)

          const elapsed = mt - profile.titleDropTime;

          p = Math.min(1, 0.85 + (elapsed / 0.1) * 0.15); // Already 85% on 24.0s frame, 100% within 100ms

          const punch = Math.max(0, 1 - elapsed / 0.25);

          punchScale = 1.0 + punch * 0.07;

        }



        this._introSeriesContainer.alpha = p;



        this._introSeriesContainer.scale.set(punchScale);



        this._introCycleSubtitle.alpha = 0;



        // Subtitle typing letter-by-letter with typewriter tick sound, exactly like disclaimer



        const fullSubText = '[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]';



        const typeStart = 28.0;



        const typeDuration = isDesolate ? 1.8 : 1.5;



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

        this._introRealLogoSprite.alpha = 0;



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

        this._introRealLogoSprite.alpha = 0;



        this._introStudiosText.alpha = 0;



        this._introPresentsText.alpha = 0;



        this._introSeriesContainer.alpha = 0;



        this._introCycleSubtitle.alpha = 0;



      }



      // Phase 10: cycleStartTime - cycleFadeOutTime: "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" APPEARS IN CENTER OF SCREEN!



      else if (mt >= profile.cycleStartTime && mt < profile.cycleFadeOutTime) {



        this._introLogoSprite.alpha = 0;

        this._introRealLogoSprite.alpha = 0;



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

        this._introRealLogoSprite.alpha = 0;



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

        this._introRealLogoSprite.alpha = 0;



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



      this.goToAct(this._currentActIndex + 1, undefined, crossfadeSec, true);



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

      AmbientManager.setPaused(false);

      const introTrack = AmbientManager.getIntroTrack();

      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack || !AmbientManager.getCurrentAudio() || AmbientManager.getCurrentAudio()?.paused) {

        this._introAmbientStarted = true;

        AmbientManager.playTrack(introTrack, 1.0, 1.5);

        AmbientManager.seekCurrent(this._actTime);

      } else {

        AmbientManager.resumeCurrent();

      }

      if (this._videoElement && this._actTime >= 7.5) {

        this._videoElement.play().catch(() => {});

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



      const isSong = act && (act.category === "song" || act.id === "act_7_song");
      if (isSong) {
        AmbientManager.stopAllAmbientImmediately();
      } else {
        AmbientManager.setPaused(false);
        AmbientManager.resumeCurrent();
      }



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



  public get voiceVolume(): number {

    return this._voiceVolume;

  }



  public get musicVolume(): number {

    return this._musicVolume;

  }



  public get sfxVolume(): number {

    return this._sfxVolume;

  }



  public setVoiceVolume(v: number): void {

    this._voiceVolume = Math.max(0, Math.min(1, v));

    const act = STORY_ACTS[this._currentActIndex];

    const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

    if (!isSong && this._voiceAudio) {

      this._voiceAudio.volume = AudioController.isMuted() ? 0 : this._voiceVolume;

    }

    if (this._wsVoiceSlider) this._wsVoiceSlider.setVol(this._voiceVolume);

    if (this._voiceVolControl) this._voiceVolControl.setVolumeDisplay(this._voiceVolume);

  }



  public setMusicVolume(v: number): void {

    this._musicVolume = Math.max(0, Math.min(1, v));

    AmbientManager.setMusicVolume(this._musicVolume);

    const act = STORY_ACTS[this._currentActIndex];

    const isSong = act && (act.category === 'song' || act.id === 'act_7_song');

    if (isSong && this._voiceAudio) {

      this._voiceAudio.volume = AudioController.isMuted() ? 0 : this._musicVolume;

    }

    if (this._wsMusicSlider) this._wsMusicSlider.setVol(this._musicVolume);

    if (this._musicVolControl) this._musicVolControl.setVolumeDisplay(this._musicVolume);

  }



  public setSfxVolume(v: number): void {

    this._sfxVolume = Math.max(0, Math.min(1, v));

    SFX.setVolume(this._sfxVolume);

    if (this._wsSfxSlider) this._wsSfxSlider.setVol(this._sfxVolume);

    if (this._sfxVolControl) this._sfxVolControl.setVolumeDisplay(this._sfxVolume);

  }



  public update(dt: number): void {



    AmbientManager.update(dt);



    if (this._debugExpandedPanel && this._debugExpandedPanel.visible) {

      const TRACK_X = -255;

      const TRACK_W = 530;

      const actDur = Math.max(1, this._actDuration);

      if (this._dawPlayhead) {

        this._dawPlayhead.position.x = TRACK_X + Math.max(0, Math.min(1.0, this._actTime / actDur)) * TRACK_W;

      }

      if (this._directorNowPlayingText) {

        if (AmbientManager.isCuePlaying()) {

          const a = AmbientManager.getCueAudio();

          const k = AmbientManager.getCueTrackKey();

          const optDread = MovieApp.DREAD_OPTIONS.find((o) => o.key === k);

          const optPeace = MovieApp.PEACE_OPTIONS.find((o) => o.key === k);

          const isDread = Boolean(optDread);

          const name = optDread ? optDread.name : (optPeace ? optPeace.name : (k || 'Музыкальный отрезок'));

          const el = a ? Math.max(0, a.currentTime).toFixed(1) : '0.0';

          const tot = (optDread ? optDread.dur : (optPeace ? optPeace.dur : (a && Number.isFinite(a.duration) ? a.duration : 30))).toFixed(1);

          this._directorNowPlayingText.text = `СЕЙЧАС ЗВУЧИТ: [ ${isDread ? '💀' : '🕊️'} ${name} • ${el}s / ${tot}s ]`;

          this._directorNowPlayingText.style.fill = isDread ? '#ef476f' : '#06d6a0';

        } else {

          const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];

          const ambKey = (this._currentActIndex === 0) ? AmbientManager.getIntroTrack() : (AmbientManager.getLockedTrackForAct(act.id) || AmbientManager.getCurrentTrackKey() || act.audioKey);

          const optAmb = MovieApp.AMBIENT_OPTIONS.find((o) => o.key === ambKey);

          const ambName = optAmb ? optAmb.name : ambKey;

          this._directorNowPlayingText.text = `СЕЙЧАС ЗВУЧИТ: [ 📻 Базовый эмбиент: ${ambName} ]`;

          this._directorNowPlayingText.style.fill = '#00f5d4';

        }

      }

    }



    let currentTime = this._actTime;



    if (this._currentActIndex === 0) {

      const curAudio = AmbientManager.getCurrentAudio();

      if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {

        currentTime = curAudio.currentTime;

        this._actTime = currentTime;

      } else if (this._isPlaying) {

        this._actTime += dt;

        currentTime = this._actTime;

      } else {

        currentTime = this._actTime;

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



        // Seamless Handover: At 18.5s (Ark emergence & musical intensity drop), crossfade from intro track into rust_and_bone

        if (currentTime >= 18.5 && !AmbientManager.getLockedTrackForAct('prologue_space')) {

          if (AmbientManager.getCurrentTrackKey() !== 'rust_and_bone') {

            AmbientManager.playTrack('rust_and_bone', 0.28, 5.0, 15.0);

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

      // Live Premiere Audio Director Timeline synchronization for dread and peace cues

      this._checkPremiereTimelineCues(this._currentActIndex, currentTime);

      if (this._debugExpanded && this._directorActTimeText) {

        const curT = Math.max(0, this._actTime).toFixed(1);

        const totT = this._actDuration.toFixed(1);

        const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];

        this._directorActTimeText.text = `АКТ ${this._currentActIndex}: ${act.title} • ТЕКУЩИЙ КАДР: ${curT}s / ${totT}s`;

      }



      // Real-time Voice Presence Sidechain: Ducks ambient and sound cues when someone speaks or sings



      const isVoiceSpeaking = this._isPlaying && this._subtitles.isVoiceActive(currentTime);



      AmbientManager.setVoiceActive(isVoiceSpeaking);



      if (this._isPlaying) {



        this._updateQuoteBadgeTyping(dt);

        this._updateLocationBadgeTyping(dt);



      }



    }



    // Sync Premiere Audio Director timeline on EVERY frame for ALL acts including Act 0

    PremiereAudioDirector.getInstance().syncActFromApp(this._currentActIndex, currentTime);



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



    if (this._wsLcdOverrideTimer > 0) {

      this._wsLcdOverrideTimer -= dt;

    } else if (this._wsLcdText) {

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
        // PremiereAudioDirector is the master controller of timeline cues.
        // Bypassing legacy cut.ambientCueKey prevents frame cuts from interrupting dread/peace music or ducking ambient.
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



    this._wipeType = wipeTypes[this._currentActIndex % wipeTypes.length];

    this._wipeProgress = 0.0;

    this._wipeDuration = 2.4; // Stately George Lucas Star Wars optical wipe print

    this._isWiping = true;

    this._updateWipeGraphics();

    this._playStarWarsTransitionSound();

  }



  public testStarWarsTransition(soundKey?: string): void {

    const curTex = this._bgSprite.texture;

    if (!curTex) return;

    if (soundKey) {

      const actualKey = (soundKey === 'random') ? this.getRandomFinTransitionSound() : soundKey;

      const meta = MovieApp.TRANSITION_SOUNDS_METADATA.find(s => s.key === actualKey)

        || MovieApp.TRANSITION_SOUNDS_METADATA[0];

      const url = getAudioUrl(meta.key);

      if (url) {

        try {

          if (this._transitionAudio) {

            this._transitionAudio.pause();

            this._transitionAudio = null;

          }

          const audio = new Audio(url);

          audio.volume = Math.max(0, Math.min(1.0, this._sfxVolume * meta.gain));

          audio.play().catch(() => {});

          this._transitionAudio = audio;

        } catch {}

      }

    } else {

      this._playStarWarsTransitionSound();

    }

    this._startStarWarsWipe(curTex, curTex);

  }



  private _playStarWarsTransitionSound(targetActId?: string): void {

    if (AudioController.isMuted() || this._sfxVolume <= 0 || this._isSeeking || this._isTimelineDragging) return;



    const curAct = STORY_ACTS[this._currentActIndex];

    const actId = targetActId || (curAct ? curAct.id : undefined);

    const soundKey = this.getLockedTransitionSound(actId);

    const meta = MovieApp.TRANSITION_SOUNDS_METADATA.find(s => s.key === soundKey)

      || MovieApp.TRANSITION_SOUNDS_METADATA[0];



    const url = getAudioUrl(meta.key);

    if (!url) return;



    try {

      if (this._transitionAudio) {

        this._transitionAudio.pause();

        this._transitionAudio = null;

      }

      const audio = new Audio(url);

      audio.muted = AudioController.isMuted();

      // Normalized volume using calibrated gain multiplier!

      audio.volume = Math.max(0, Math.min(1.0, this._sfxVolume * meta.gain));

      audio.onended = () => {

        if (this._transitionAudio === audio) {

          this._transitionAudio = null;

        }

      };

      audio.play().catch(() => {});

      this._transitionAudio = audio;

    } catch {}

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



    // 3. Location Corner Badge (Top-left: Authentic Sci-Fi Sector Radar HUD + 2 Lines: Category & Location Title)

    this._cornerLocationBadge = new Container();

    this._cornerLocationBadge.visible = false;

    this._cornerLocationBg = new Graphics();

    this._cornerLocationBadge.addChild(this._cornerLocationBg);



    this._cornerLocationRadarContainer = new Container();

    this._cornerLocationBadge.addChild(this._cornerLocationRadarContainer);

    this._cornerLocationRadarGfx = new Graphics();

    this._cornerLocationRadarContainer.addChild(this._cornerLocationRadarGfx);



    this._cornerLocationCategory = new Text({

      text: '',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 28,

        fontWeight: 'bold',

        fill: '#ffffff',

        letterSpacing: 1.2,

        dropShadow: { alpha: 0.85, blur: 8, color: '#ff5e1a', distance: 0 },

      }),

    });

    this._cornerLocationBadge.addChild(this._cornerLocationCategory);



    this._cornerLocationTitle = new Text({

      text: '',

      style: new TextStyle({

        fontFamily: ['Share Tech Mono', 'monospace'],

        fontSize: 22,

        fontWeight: 'bold',

        fill: '#00f5d4',

        letterSpacing: 1.0,

        dropShadow: { alpha: 0.85, blur: 8, color: '#00f5d4', distance: 0 },

      }),

    });

    this._cornerLocationBadge.addChild(this._cornerLocationTitle);



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



      if (cut.slackKey) {

        this._subtitles.showSlackPopup(cut.slackKey);



      } else if (isSlackTex && cut.texKey) {



        this._subtitles.showSlackPopup(cut.texKey);



      } else {

        // Clean Picture Reveal: Any scene without a Slack screenshot must hide any open Slack popup!

        this._subtitles.hideSlackPopup(!punch);

      }



      // Intra-act Location Establishing: lower deck / catacombs / sub-sectors

      if (cut.type === 'event_illustration' && cut.label && cut.label.includes('Нижняя палуба')) {

        this._showCornerLocationBadge('СЕКТОР КОВЧЕГА', 'НИЖНЯЯ ПАЛУБА • КАТАКОМБЫ НАКАЗАНИЯ', 5.0);

        if (hasImage && cut.texKey) {

          const tex = getTexture(cut.texKey);

          this._setBgTextureWithWipe(tex, false); // Intra-act cut from narrator to catacombs must NEVER trigger Star Wars optical wipe!

        }

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

    this._hideCornerLocationBadge();

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

      this._cornerQuoteAvatarMask.rect(0, 0, avatarSize, avatarSize);

      this._cornerQuoteAvatarMask.fill({ color: 0xffffff });



      this._cornerQuoteAvatarBorder.clear();

      this._cornerQuoteAvatarBorder.rect(0, 0, avatarSize, avatarSize);

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

    this._cornerQuoteBg.rect(0, 0, badgeW, badgeH);

    this._cornerQuoteBg.fill({ color: 0x000000, alpha: 0.94 });



    const badgeX = isPortrait ? 16 : 28;

    const badgeY = isPortrait ? 24 : 28;

    this._cornerQuoteBadge.position.set(badgeX, badgeY);

  }



  private _drawLocationRadar(size: number, angle: number): void {

    const gfx = this._cornerLocationRadarGfx;

    gfx.clear();

    const half = size / 2;

    const r = half - 8;



    // Background round rect matching avatar style (0x333333 subtle border, dark background)

    gfx.rect(0, 0, size, size);

    gfx.fill({ color: 0x0a1015, alpha: 0.95 });

    gfx.stroke({ color: 0x333333, width: 2, alpha: 0.5 });



    // Concentric radar rings

    gfx.circle(half, half, r * 0.33);

    gfx.stroke({ color: 0x00f5d4, width: 1, alpha: 0.25 });

    gfx.circle(half, half, r * 0.66);

    gfx.stroke({ color: 0x00f5d4, width: 1, alpha: 0.35 });

    gfx.circle(half, half, r);

    gfx.stroke({ color: 0x00f5d4, width: 1.5, alpha: 0.5 });



    // Crosshairs

    gfx.moveTo(half - r, half);

    gfx.lineTo(half + r, half);

    gfx.stroke({ color: 0x00f5d4, width: 1, alpha: 0.3 });

    gfx.moveTo(half, half - r);

    gfx.lineTo(half, half + r);

    gfx.stroke({ color: 0x00f5d4, width: 1, alpha: 0.3 });



    // Diagonal tick marks

    const diag = r * 0.707;

    gfx.moveTo(half - 4, half - diag);

    gfx.lineTo(half + 4, half - diag);

    gfx.stroke({ color: 0x00f5d4, width: 1, alpha: 0.4 });



    // Rotating radar sweep line & fan

    const sweepX = half + Math.cos(angle) * r;

    const sweepY = half + Math.sin(angle) * r;

    gfx.moveTo(half, half);

    gfx.lineTo(sweepX, sweepY);

    gfx.stroke({ color: 0x00f5d4, width: 2, alpha: 0.9 });



    // Trailing arc sweep (radar scan phosphor decay)

    const trailAngle = angle - 0.4;

    gfx.poly([

      half, half,

      sweepX, sweepY,

      half + Math.cos(trailAngle) * r, half + Math.sin(trailAngle) * r,

    ]);

    gfx.fill({ color: 0x00f5d4, alpha: 0.15 });



    // Ship position dot in center

    gfx.circle(half, half, 3.5);

    gfx.fill({ color: 0xffaa00 });



    // Detected orbital blip

    const blipAngle = 0.8;

    const blipDist = r * 0.62;

    const blipX = half + Math.cos(blipAngle) * blipDist;

    const blipY = half + Math.sin(blipAngle) * blipDist;

    const diff = Math.abs((angle % (Math.PI * 2)) - blipAngle);

    const pingAlpha = Math.max(0.2, 1.0 - Math.min(1.0, diff * 1.5));

    gfx.circle(blipX, blipY, 3);

    gfx.fill({ color: 0x00f5d4, alpha: pingAlpha });

  }



  private _showCornerLocationBadge(category: string, title: string, duration: number = 5.5): void {

    this._hideCornerQuoteBadge();



    const fullCat = `[ ${category.toUpperCase().trim()} ]`;

    const fullTit = `[ ${title.toUpperCase().trim()} ]`;



    this._locationBadgeTyping = {

      active: true,

      elapsed: 0,

      fullCategory: fullCat,

      fullTitle: fullTit,

      lastCharCount: -1,

      displayDuration: duration,

      fadeElapsed: 0,

    };



    this._cornerLocationCategory.text = fullCat;

    this._cornerLocationTitle.text = fullTit;

    this._positionCornerLocationBadge();



    this._cornerLocationCategory.text = '▌';

    this._cornerLocationTitle.text = '';

    this._cornerLocationBadge.alpha = 1.0;

    this._cornerLocationBadge.visible = true;

  }



  private _hideCornerLocationBadge(): void {

    if (this._cornerLocationBadge) {

      this._cornerLocationBadge.visible = false;

    }

    this._locationBadgeTyping.active = false;

  }



  private _positionCornerLocationBadge(): void {

    const w = this._screenWidth;

    const h = this._screenHeight;

    const isPortrait = h > w;



    const radarSize = isPortrait ? 92 : 108;

    const pad = isPortrait ? 12 : 16;



    this._cornerLocationRadarContainer.position.set(pad, pad);

    this._drawLocationRadar(radarSize, this._radarAngle);



    const textX = pad + radarSize + (isPortrait ? 16 : 22);

    // Matched exactly to avatar badge typography hierarchy: Line 1 = 28px, Line 2 = 22px

    this._cornerLocationCategory.style.fontSize = isPortrait ? 24 : 28;

    this._cornerLocationTitle.style.fontSize = isPortrait ? 18 : 22;



    this._cornerLocationCategory.position.set(textX, pad + (isPortrait ? 8 : 12));

    this._cornerLocationTitle.position.set(textX, pad + (isPortrait ? 48 : 58));



    let textW: number;

    if (this._locationBadgeTyping.active && this._locationBadgeTyping.fullCategory) {

      const origCat = this._cornerLocationCategory.text;

      const origTit = this._cornerLocationTitle.text;

      this._cornerLocationCategory.text = this._locationBadgeTyping.fullCategory;

      this._cornerLocationTitle.text = this._locationBadgeTyping.fullTitle;

      textW = Math.max(this._cornerLocationCategory.bounds.width, this._cornerLocationTitle.bounds.width);

      this._cornerLocationCategory.text = origCat;

      this._cornerLocationTitle.text = origTit;

    } else {

      textW = Math.max(this._cornerLocationCategory.bounds.width, this._cornerLocationTitle.bounds.width);

    }



    const badgeW = Math.max(isPortrait ? 400 : 520, textX + textW + pad + 24);

    const badgeH = radarSize + pad * 2;



    this._cornerLocationBg.clear();

    this._cornerLocationBg.rect(0, 0, badgeW, badgeH);

    this._cornerLocationBg.fill({ color: 0x000000, alpha: 0.94 });

    // Clean borderless container (stroke removed per user request: "убери тут рамочку")



    const badgeX = isPortrait ? 16 : 28;

    const badgeY = isPortrait ? 24 : 28;

    this._cornerLocationBadge.position.set(badgeX, badgeY);

  }



  private _updateLocationBadgeTyping(dt: number): void {

    if (!this._cornerLocationBadge || !this._cornerLocationBadge.visible) return;



    this._radarAngle += dt * 2.5;

    const isPortrait = this._screenHeight > this._screenWidth;

    const radarSize = isPortrait ? 92 : 108;

    this._drawLocationRadar(radarSize, this._radarAngle);



    if (!this._locationBadgeTyping.active) return;



    this._locationBadgeTyping.elapsed += dt;

    const { fullCategory, fullTitle, elapsed, displayDuration } = this._locationBadgeTyping;

    const totalChars = fullCategory.length + fullTitle.length;



    if (totalChars <= 0) {

      this._locationBadgeTyping.active = false;

      return;

    }



    const charsPerSec = 32;

    const typed = Math.min(totalChars, Math.floor(elapsed * charsPerSec));



    if (typed !== this._locationBadgeTyping.lastCharCount) {

      this._locationBadgeTyping.lastCharCount = typed;

      SFX.playTypewriterTick();

    }



    const cursor = '▌';

    if (typed < fullCategory.length) {

      this._cornerLocationCategory.text = fullCategory.substring(0, typed) + cursor;

      this._cornerLocationTitle.text = '';

    } else if (typed < totalChars) {

      this._cornerLocationCategory.text = fullCategory;

      const titleTyped = typed - fullCategory.length;

      this._cornerLocationTitle.text = fullTitle.substring(0, titleTyped) + cursor;

    } else {

      this._cornerLocationCategory.text = fullCategory;

      this._cornerLocationTitle.text = fullTitle;

    }



    if (elapsed >= displayDuration) {

      this._locationBadgeTyping.fadeElapsed += dt;

      const fadeProgress = Math.min(1.0, this._locationBadgeTyping.fadeElapsed / 0.6);

      this._cornerLocationBadge.alpha = 1.0 - fadeProgress;

      if (fadeProgress >= 1.0) {

        this._cornerLocationBadge.visible = false;

        this._locationBadgeTyping.active = false;

      }

    }

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



    // Responsive reference scaling: depends directly on viewport dimensions

    const refDim = isPortrait ? Math.min(w / 414, h / 736) : Math.min(w / 1280, h / 720);

    const fontScale = Math.max(0.85, Math.min(1.65, refDim));

    this._introFontScale = fontScale;



    const contentW = Math.min(w * 0.88, isPortrait ? 560 * fontScale : 1000 * fontScale);



    // Completely clear borders, corners and backgrounds

    this._introDisclaimerBg.clear();

    this._introDisclaimerCorners.clear();



    // Balanced typography: less disparity between badge and content text

    const badgeFontSize = Math.round((isPortrait ? 20 : 26) * fontScale);

    this._introDisclaimerBadge.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introDisclaimerBadge.style.fontSize = badgeFontSize;

    this._introDisclaimerBadge.style.fill = '#00f5d4';

    this._introDisclaimerBadge.style.letterSpacing = Math.round((isPortrait ? 2 : 4) * fontScale);

    this._introDisclaimerBadge.style.align = 'center';

    this._introDisclaimerBadge.anchor.set(0.5, 0);

    this._introDisclaimerBadge.position.set(0, 0);



    const textFontSize = Math.round((isPortrait ? 22 : 28) * fontScale);

    const textLineHeight = Math.round(textFontSize * 1.55);

    const startY = Math.round(badgeFontSize * 1.8);



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



    const totalH = startY + rawLines.length * textLineHeight;

    this._introDisclaimerContainer.position.set(0, -Math.round(totalH / 2));



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

    if (this._cornerLocationBadge && this._cornerLocationBadge.visible) {

      this._positionCornerLocationBadge();

    }



    this._introContainer.position.set(w / 2, h / 2);



    // 0. Disclaimer Layout (NO FRAME / BORDER, pure green terminal text, stationary pre-centered lines!)

    this._layoutIntroDisclaimer(w, h, isPortrait);



    const refDim = isPortrait ? Math.min(w / 414, h / 736) : Math.min(w / 1280, h / 720);

    const fontScale = Math.max(0.85, Math.min(1.65, refDim));

    this._introFontScale = fontScale;



    // Playbox Skull Logo & Subtitles: Larger, responsive, minimal gap between Studios and Presents

    const logoMaxH = isPortrait ? h * 0.44 : Math.min(480, h * 0.54);

    this._introLogoBaseScale = logoMaxH / 1536;

    this._introLogoBaseY = isPortrait ? -logoMaxH * 0.22 : -logoMaxH * 0.18;

    this._introLogoSprite.scale.set(this._introLogoBaseScale);

    this._introLogoSprite.position.set(0, this._introLogoBaseY);

    this._introRealLogoSprite.scale.set(this._introLogoBaseScale);

    this._introRealLogoSprite.position.set(0, this._introLogoBaseY);



    const studiosFontSize = Math.round((isPortrait ? 30 : 42) * fontScale);

    const presentsFontSize = Math.round((isPortrait ? 24 : 34) * fontScale);



    this._introStudiosText.style.fontSize = studiosFontSize;

    this._introStudiosText.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);

    this._introStudiosText.position.set(0, isPortrait ? logoMaxH * 0.34 : logoMaxH * 0.32);



    this._introPresentsText.style.fontSize = presentsFontSize;

    this._introPresentsText.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);

    this._introPresentsText.position.set(0, this._introStudiosText.position.y + Math.round((isPortrait ? 40 : 54) * fontScale));



    // Series Title Graphic Logo & Subtitle (Cinematic Scale, balanced typography)

    this._introSeriesContainer.position.set(0, isPortrait ? -30 : -15);

    const titleMaxW = isPortrait ? w * 0.90 : Math.min(w * 0.82, 920);

    const titleMaxH = isPortrait ? h * 0.34 : Math.min(h * 0.46, 420);

    const logoTex = this._introSeriesLogoSprite.texture;

    const texW = logoTex && logoTex.width > 0 ? logoTex.width : 913;

    const texH = logoTex && logoTex.height > 0 ? logoTex.height : 374;

    const titleScale = Math.min(titleMaxW / texW, titleMaxH / texH);

    this._introSeriesLogoSprite.scale.set(titleScale);

    this._introSeriesLogoSprite.position.set(0, 0);

    const logoRenderedH = texH * titleScale;



    // Subtitle "[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]": Significantly enlarged to eliminate disparity with main logo

    const seriesSubFontSize = Math.round((isPortrait ? 22 : 32) * fontScale);

    this._introSeriesSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introSeriesSubtitle.style.fill = '#00f5d4';

    this._introSeriesSubtitle.style.fontSize = seriesSubFontSize;

    this._introSeriesSubtitle.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);

    this._introSeriesSubtitle.position.set(0, logoRenderedH / 2 + Math.round((isPortrait ? 28 : 42) * fontScale));



    // Cycle Subtitle "[ ЧЕТЫРНАДЦАТЫЙ ЦИКЛ ]": Responsive scale

    const cycleFontSize = Math.round((isPortrait ? 28 : 42) * fontScale);

    this._introCycleSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];

    this._introCycleSubtitle.style.fill = '#00f5d4';

    this._introCycleSubtitle.style.fontSize = cycleFontSize;

    this._introCycleSubtitle.style.letterSpacing = Math.round((isPortrait ? 6 : 10) * fontScale);

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



    if (this._devGearBtn) {
      this._devGearBtn.visible = false;
      this._devGearBtn.position.set(w - 36, isPortrait ? 56 : 30);
    }

    if (this._debugContainer) {

      this._debugContainer.position.set(w / 2, isPortrait ? 114 : 32);

      this._debugContainer.scale.set(w < 950 ? 0.85 : 1.0);

    }



  }



}



