import { Application, Container, Graphics, Sprite, Text, TextStyle, FederatedPointerEvent, Texture } from 'pixi.js';
import { STORY_ACTS, ActData } from './storyData';
import { getTexture, getAudioUrl, getIntroVideoUrl } from './assetsManager';
import { getConcertCutAtTime } from './concertSequence';
import { CosmicScene } from './CosmicScene';
import { Subtitles } from './Subtitles';
import { AudioController } from './AudioController';
import { ClickTracker } from './ClickTracker';
import { tween, cancelTween, ease, after } from './tween';
import { SFX } from './SoundEffects';
import { AmbientManager } from './AmbientManager';
import { AudioTrackAnalyzer, IntroTimingProfile } from './AudioTrackAnalyzer';

export class MovieApp {
  private _app: Application;
  private _root: Container;

  // Scene layers
  private _bgContainer: Container;
  private _bgSprite: Sprite;
  private _cosmicScene: CosmicScene;
  private _vignetteGraphics: Graphics;
  private _introContainer: Container;
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
  private _dotsContainer: Container;
  private _totalMovieDuration = 953;
  private _actStartTimes: number[] = [];

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

  // Autohide
  private _autohideTimer = 2.5;
  private _isUiHovered = false;

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
  private _concertPunchScale = 1.0;
  private _bgBaseScale = 1.0;
  private _isTransitioningAct = false;

  // Volume channels
  private _voiceVolume = 1.0;
  private _musicVolume = 0.85;
  private _sfxVolume = 0.8;
  private _voiceVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };
  private _musicVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };
  private _sfxVolControl!: { container: Container; setVolumeDisplay: (v: number) => void };

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
    this._bgSprite = new Sprite();
    this._bgSprite.anchor.set(0.5);
    this._bgContainer.addChild(this._bgSprite);

    this._cosmicScene = new CosmicScene();
    this._vignetteGraphics = new Graphics();
    this._introContainer = new Container();
    this._subtitles = new Subtitles();
    this._rippleContainer = new Container();
    this._uiContainer = new Container();

    this._canvasHitArea = new Graphics();
    this._canvasHitArea.eventMode = 'static';
    this._canvasHitArea.cursor = 'pointer';

    this._root.addChild(this._bgContainer);
    this._root.addChild(this._cosmicScene);
    this._root.addChild(this._canvasHitArea);
    this._root.addChild(this._vignetteGraphics);
    this._root.addChild(this._introContainer);
    this._root.addChild(this._subtitles);
    this._root.addChild(this._rippleContainer);
    this._root.addChild(this._uiContainer);

    // Video element setup (loops gemini_generated_video_50f3f52f)
    this._videoElement = document.getElementById('intro-video') as HTMLVideoElement | null;
    if (this._videoElement) {
      this._videoElement.src = getIntroVideoUrl();
      this._videoElement.loop = true;
      this._videoElement.muted = true;
      this._videoElement.setAttribute('playsinline', '');
      this._videoElement.load();
    }

    // 1. Skull Logo sprite
    this._introLogoSprite = new Sprite(getTexture('playbox_skull_logo'));
    this._introLogoSprite.anchor.set(0.5);
    this._introLogoSprite.alpha = 0;
    this._introContainer.addChild(this._introLogoSprite);

    // 2. STUDIOS text (no PLAYBOX repetition, as requested)
    const studiosStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
      fontSize: 34,
      fontWeight: 'bold',
      fill: '#ffffff',
      letterSpacing: 14,
      dropShadow: { alpha: 0.95, blur: 18, color: '#ff5e1a', distance: 0 },
    });
    this._introStudiosText = new Text({ text: 'S T U D I O S', style: studiosStyle });
    this._introStudiosText.anchor.set(0.5);
    this._introStudiosText.alpha = 0;
    this._introContainer.addChild(this._introStudiosText);

    // 3. P R E S E N T S text
    const presentsStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Share Tech Mono', 'monospace', 'sans-serif'],
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 14,
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
      fontFamily: ['Orbitron', 'Share Tech Mono', 'sans-serif'],
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 6,
      dropShadow: { alpha: 0.9, blur: 12, color: '#000000', distance: 2 },
    });
    this._introSeriesSubtitle = new Text({ text: 'ХРОНИКИ ПРОДАКШН-КОВЧЕГА', style: seriesSubStyle });
    this._introSeriesSubtitle.anchor.set(0.5);
    this._introSeriesContainer.addChild(this._introSeriesSubtitle);

    const cycleSubStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Share Tech Mono', 'sans-serif'],
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 10,
      dropShadow: { alpha: 0.95, blur: 16, color: '#003b36', distance: 0 },
    });
    this._introCycleSubtitle = new Text({ text: 'ЧЕТЫРНАДЦАТЫЙ ЦИКЛ', style: cycleSubStyle });
    this._introCycleSubtitle.anchor.set(0.5);
    this._introCycleSubtitle.alpha = 0;
    this._introContainer.addChild(this._introCycleSubtitle);

    // Setup HUD & UI (hidden for clean cinema look per user request)
    const badgeStyle = new TextStyle({
      fontFamily: ['Orbitron', 'monospace'],
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ff5e1a',
      letterSpacing: 2,
    });
    this._badgeText = new Text({ text: '', style: badgeStyle });
    this._badgeText.visible = false;

    const titleStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
      fontSize: 19,
      fontWeight: 'bold',
      fill: '#ffffff',
      letterSpacing: 1,
      dropShadow: { alpha: 0.7, blur: 6, color: '#000000', distance: 2 },
    });
    this._titleText = new Text({ text: '', style: titleStyle });
    this._titleText.visible = false;

    const subStyle = new TextStyle({
      fontFamily: ['Inter', 'sans-serif'],
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
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
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
    this._prevButton = this._createIconButton('⏮', () => this.previousAct());
    this._nextButton = this._createIconButton('⏭', () => this.nextAct());
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
      this._isTimelineDragging = true;
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
    this._playerBarContainer = new Container();
    this._playerBarContainer.eventMode = 'static';
    this._playerBarContainer.addChild(this._playerBarBg);
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
        this.previousAct();
      } else if ((e.shiftKey && e.key === 'ArrowRight') || e.key === 'PageDown') {
        e.preventDefault();
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

    this.goToAct(0);
  }

  private _resetAutohide(): void {
    this._autohideTimer = 2.5;
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
      fontFamily: ['Orbitron', 'Inter', 'monospace'],
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
      fontFamily: ['Inter', 'sans-serif'],
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
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
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
      fontFamily: ['Inter', 'sans-serif'],
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

  private _setupDebugUI(): void {
    this._debugContainer = new Container();
    this._debugContainer.eventMode = 'static';

    // 1. Compact Toggle Pill (always accessible)
    const pill = new Container();
    pill.eventMode = 'static';
    pill.cursor = 'pointer';

    this._debugPillBg = new Graphics();
    pill.addChild(this._debugPillBg);

    const txtStyle = new TextStyle({
      fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
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
        fontFamily: ['Orbitron', 'Inter', 'sans-serif'],
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
    AmbientManager.setIntroTrack(next, this._currentActIndex === 0);
    this._introProfile = AudioTrackAnalyzer.getProfile(next);
    if (this._currentActIndex === 0) {
      this._actDuration = this._introProfile.introEndTime;
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

  public goToAct(index: number): void {
    if (index < 0 || index >= STORY_ACTS.length) return;
    if (index !== 0) {
      SFX.playWhoosh();
    }
    this._isTransitioningAct = false;
    AmbientManager.cancelWait();
    this._currentActIndex = index;
    const act = STORY_ACTS[index];
    this._actTime = 0;
    this._actDuration = act.duration || 30;

    // Stop previous voice track if running with a smooth micro-fadeout (80ms) to eliminate audio clicks/pops
    if (this._voiceAudio) {
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
      // Soft theatrical cross-dissolve: let video smoothly fade over 4.5s instead of snapping off
      if (this._videoElement) {
        this._videoElement.style.opacity = '0';
        setTimeout(() => {
          if (this._currentActIndex !== 0 && this._videoElement) {
            this._videoElement.pause();
          }
        }, 4600);
      }
      this._introContainer.visible = false;
      this._cosmicScene.visible = false;
      this._bgContainer.visible = true;
      this._prologueCurrentTexKey = 'ship_cistam';
      this._bgSprite.texture = getTexture('ship_cistam');
      this._resizeBgSprite();
      this._bgSprite.alpha = 0;
      // Soft 4.5s dissolve into ship_cistam
      tween(this._bgSprite, { alpha: 1 }, 4.5, ease.inOutQuad);

      this._subtitles.visible = true;
      this._timeCodeText.visible = true;
      this._subtitles.setCues(act.cues, act.hasDedicatedFrame, Boolean(act.isKaraoke), act.frameTitle, act.id);

      // Start Prologue voiceover
      this._playVoiceAct(act, index);
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

      const isSong = act.category === 'song' || act.id === 'act_7_song';
      if (isSong) {
        this._concertCurrentTexKey = 'ai_lord_calm_singing';
        this._concertPunchScale = 1.0;
      } else {
        this._concertCurrentTexKey = '';
      }

      const tex = getTexture(act.imageKey);
      this._bgSprite.texture = tex;
      this._resizeBgSprite();
      this._bgSprite.alpha = 0;
      tween(this._bgSprite, { alpha: 1 }, 0.8, ease.outQuad);

      this._subtitles.setCues(act.cues, act.hasDedicatedFrame, Boolean(act.isKaraoke), act.frameTitle, act.id);

      // Start act voiceover / song
      this._playVoiceAct(act, index);
    }

    // Smooth ambient transition: Intro -> Prologue uses 4.5s ultra-soft crossfade. Song uses 0.5s mute.
    const isSong = act.category === 'song' || act.id === 'act_7_song';
    const ambientCrossfade = (index === 1) ? 4.5 : (isSong ? 0.5 : 3.0);
    AmbientManager.transitionToAct(index, ambientCrossfade, act.id);

    this._updateDots();
    this._updateDebugDisplay();
    this.resize(this._screenWidth, this._screenHeight);
  }

  private _playVoiceAct(act: (typeof STORY_ACTS)[0], index: number): void {
    if (!act.audioKey) return;
    const audioUrl = getAudioUrl(act.audioKey);
    if (!audioUrl) return;

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

    const isPrologue = index === 1;
    if (isPrologue) {
      // Voice pause in Prologue: let rust_and_bone ambient establish mood and ship emerge
      // Voice playback will be triggered in update() once _actTime >= 3.5s!
      this._isPlaying = true;
      this._playPauseIcon.text = '⏸';
      return;
    }

    this._voiceAudio.play().then(() => {
      this._isPlaying = true;
      this._playPauseIcon.text = '⏸';
    }).catch((err: unknown) => {
      console.warn('[VoiceAudio] Autoplay blocked, click play to start:', err);
    });
  }

  private _onActContentFinished(index: number): void {
    if (this._isTransitioningAct || this._currentActIndex !== index) return;
    this._isTransitioningAct = true;

    const nextIndex = index + 1;
    if (nextIndex >= STORY_ACTS.length) {
      this._isTransitioningAct = false;
      this._isPlaying = false;
      this._playPauseIcon.text = '▶';
      return;
    }

    const nextAct = STORY_ACTS[nextIndex];
    const isNextSong = nextAct && (nextAct.category === 'song' || nextAct.id === 'act_7_song');

    // Universal Musical Intensity Director:
    // Holds the handover until ambient intensity falls/decays into a valley,
    // ensuring transitions never cut off during an emotional swell or musical rise.
    AmbientManager.waitForIntensityDrop({
      minWaitSec: isNextSong ? 2.4 : 1.8,
      maxWaitSec: isNextSong ? 5.5 : 4.8,
      onReady: () => {
        if (this._currentActIndex === index && this._currentActIndex + 1 < STORY_ACTS.length) {
          this.nextAct();
        }
      },
    });
  }

  public seekAudio(targetSeconds: number): void {
    const clamped = Math.max(0, Math.min(this._actDuration, targetSeconds));
    this._actTime = clamped;

    if (this._currentActIndex === 0) {
      AmbientManager.seekCurrent(clamped);
      if (!this._isPlaying) {
        AmbientManager.resumeCurrent();
        this._isPlaying = true;
        this._playPauseIcon.text = '⏸';
      }
      this._updateIntroTimeline(clamped);
    } else {
      const act = STORY_ACTS[this._currentActIndex];
      const offset = act.audioOffset || 0;
      const isPrologue = this._currentActIndex === 1;
      const voiceDelay = isPrologue ? 3.5 : 0;

      if (this._voiceAudio) {
        if (isPrologue && clamped < voiceDelay) {
          this._voiceAudio.pause();
          this._voiceAudio.currentTime = offset;
        } else {
          this._voiceAudio.currentTime = offset + (clamped - voiceDelay);
          if (!this._isPlaying) {
            this._voiceAudio.play().catch(() => {});
            this._isPlaying = true;
            this._playPauseIcon.text = '⏸';
          }
        }
      }
      this._subtitles.syncToTime(clamped, this._isPlaying);
    }
  }

  private _playIntroAnimation(): void {
    this._introLogoSprite.alpha = 0;
    this._introStudiosText.alpha = 0;
    this._introPresentsText.alpha = 0;
    this._introPresentsText.text = '';
    this._introSeriesContainer.alpha = 0;
    this._introCycleSubtitle.alpha = 0;
    this._introCycleSubtitle.scale.set(1);
    this._cosmicScene.visible = false;

    // Cosmic background video visible from second 0
    if (this._videoElement) {
      this._videoElement.currentTime = 0;
      this._videoElement.style.opacity = '1';
      this._videoElement.play().catch(() => {});
    }
  }

  private _updateIntroTimeline(currentTime: number): void {
    const t = currentTime;
    const profile = this._introProfile;

    // Ensure background video stays active and visible
    if (this._videoElement && this._videoElement.style.opacity !== '1') {
      this._videoElement.style.opacity = '1';
    }

    // Phase 1: 0.0s - 3.0s: Space video background drift, ambient begins
    if (t < 3.0) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 2: 3.0s - 9.0s: Skull logo slowly appears over space video
    else if (t >= 3.0 && t < 9.0) {
      const p = (t - 3.0) / 6.0;
      this._introLogoSprite.alpha = Math.min(1, p);
      this._introLogoSprite.scale.set(this._introLogoBaseScale * (0.94 + p * 0.06));
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 3: 9.0s - 14.0s: "STUDIOS" glows into visibility below the skull
    else if (t >= 9.0 && t < 14.0) {
      this._introLogoSprite.alpha = 1;
      const p = (t - 9.0) / 3.5;
      this._introStudiosText.alpha = Math.min(1, p);
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 4: 11.5s - logoDisperseTime: Letters "P R E S E N T S" type out on screen
    else if (t >= 11.5 && t < profile.logoDisperseTime) {
      this._introLogoSprite.alpha = 1;
      this._introStudiosText.alpha = 1;
      const full = 'P R E S E N T S';
      const typingSpan = Math.max(1.0, profile.logoDisperseTime - 11.5);
      const p = Math.min(1, (t - 11.5) / typingSpan);
      const chars = Math.floor(p * full.length);
      this._introPresentsText.text = full.substring(0, chars);
      this._introPresentsText.alpha = 1;
      this._introPresentsText.style.letterSpacing = 10;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 5: logoDisperseTime - logoFadeOutTime: Alien-style dispersion and slow fade out into the void
    else if (t >= profile.logoDisperseTime && t < profile.logoFadeOutTime) {
      const fadeDur = profile.logoFadeOutTime - profile.logoDisperseTime;
      const fade = Math.max(0, 1 - (t - profile.logoDisperseTime) / fadeDur);
      this._introLogoSprite.alpha = fade;
      this._introStudiosText.alpha = fade;
      this._introPresentsText.alpha = fade;
      this._introPresentsText.text = 'P R E S E N T S';
      this._introPresentsText.style.letterSpacing = 10 + (t - profile.logoDisperseTime) * 3.5;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 6: logoFadeOutTime - titleDropTime: THEATRICAL PAUSE IN THE VOID
    // Tension valley in audio, cosmic video drifts silently, audience holds breath
    else if (t >= profile.logoFadeOutTime && t < profile.titleDropTime) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 7: titleDropTime - titleFadeOutTime: MAIN TITLE STRIKE ON MUSICAL DROP!
    // Shows "СЫГРАВШИЙ В ЯЩИК" and "ХРОНИКИ ПРОДАКШН-КОВЧЕГА"
    else if (t >= profile.titleDropTime && t < profile.titleFadeOutTime) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      const isDesolate = profile.trackKey === 'desolate_cry';
      const fadeSpeed = isDesolate ? 2.5 : 0.7;
      const p = Math.min(1, (t - profile.titleDropTime) / fadeSpeed);
      this._introSeriesContainer.alpha = p;
      this._introSeriesContainer.scale.set(0.95 + p * 0.05);
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 8: titleFadeOutTime - (titleFadeOutTime + 1.5): Main series logo dissolves completely into void
    else if (t >= profile.titleFadeOutTime && t < profile.titleFadeOutTime + 1.5) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      const dissolveDur = 1.5;
      const endFade = Math.max(0, 1 - (t - profile.titleFadeOutTime) / dissolveDur);
      this._introSeriesContainer.alpha = endFade;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 9: Pause in void after main logo is completely gone
    else if (t >= profile.titleFadeOutTime + 1.5 && t < profile.cycleStartTime) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 10: cycleStartTime - cycleFadeOutTime: "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" APPEARS IN CENTER OF SCREEN!
    else if (t >= profile.cycleStartTime && t < profile.cycleFadeOutTime) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      const cycleFadeSpeed = 1.0;
      const cp = Math.min(1, (t - profile.cycleStartTime) / cycleFadeSpeed);
      this._introCycleSubtitle.alpha = cp;
      // Gentle cinematic push forward (0.97 -> 1.03)
      const scaleP = 0.97 + Math.min(0.06, (t - profile.cycleStartTime) * 0.012);
      this._introCycleSubtitle.scale.set(scaleP);
    }
    // Phase 11: cycleFadeOutTime - (cycleFadeOutTime + 1.5): "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void
    else if (t >= profile.cycleFadeOutTime && t < profile.cycleFadeOutTime + 1.5) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      const dissolveDur = 1.5;
      const cycleFade = Math.max(0, 1 - (t - profile.cycleFadeOutTime) / dissolveDur);
      this._introCycleSubtitle.alpha = cycleFade;
    }
    // Phase 12: Both dissolved; intro ambient resolves naturally in calm valley until introEndTime
    else if (t >= profile.cycleFadeOutTime + 1.5 && t < profile.introEndTime) {
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase 13: introEndTime+: Seamless handover to Prologue (ambient plays down to quiet valley, then hands over)
    else if (t >= profile.introEndTime) {
      this.nextAct();
    }
  }

  public nextAct(): void {
    if (this._currentActIndex + 1 < STORY_ACTS.length) {
      this.goToAct(this._currentActIndex + 1);
    }
  }

  public previousAct(): void {
    if (this._currentActIndex > 0) {
      this.goToAct(this._currentActIndex - 1);
    }
  }

  public togglePlayPause(): void {
    this._isPlaying = !this._isPlaying;
    this._playPauseIcon.text = this._isPlaying ? '⏸' : '▶';

    if (this._isPlaying) {
      if (this._currentActIndex === 0) {
        AmbientManager.resumeCurrent();
        if (this._videoElement) this._videoElement.play().catch(() => {});
      } else {
        const isPrologue = this._currentActIndex === 1;
        const voiceDelay = isPrologue ? 3.5 : 0;
        if (this._voiceAudio && this._actTime >= voiceDelay) {
          this._voiceAudio.play().catch(() => {});
        }
        AmbientManager.resumeCurrent();
      }
    } else {
      if (this._voiceAudio) this._voiceAudio.pause();
      AmbientManager.pauseAll();
      if (this._videoElement) this._videoElement.pause();
    }
  }

  public toggleMute(): void {
    SFX.playClick();
    const isMuted = AudioController.toggle();
    this._muteIcon.text = isMuted ? '🔇' : '🔊';
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
      const curAudio = AmbientManager.getCurrentAudio();
      if (curAudio && Number.isFinite(curAudio.currentTime)) {
        currentTime = curAudio.currentTime;
        this._actTime = currentTime;
      } else if (this._isPlaying) {
        this._actTime += dt;
        currentTime = this._actTime;
      }
      this._updateIntroTimeline(currentTime);
    } else {
      const act = STORY_ACTS[this._currentActIndex];
      const offset = act.audioOffset || 0;
      const isPrologue = this._currentActIndex === 1;
      const voiceDelay = isPrologue ? 3.5 : 0;

      if (isPrologue && this._actTime < voiceDelay) {
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
        currentTime = voiceDelay + Math.max(0, this._voiceAudio.currentTime - offset);
        this._actTime = currentTime;

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
      }

      // In Prologue (Act 1): ship is fullscreen while told about (< 109.68s), then AI Lord on throne (>= 109.68s)
      if (this._currentActIndex === 1) {
        const targetTexKey = currentTime < 109.68 ? 'ship_cistam' : 'ai_lord';
        if (this._prologueCurrentTexKey !== targetTexKey) {
          this._prologueCurrentTexKey = targetTexKey;
          this._bgSprite.texture = getTexture(targetTexKey);
          this._resizeBgSprite();
          this._bgSprite.alpha = 0;
          tween(this._bgSprite, { alpha: 1 }, 0.8, ease.outQuad);
        }
      }

      // In AI-Lord Concert Sequence (act_7_song): Dynamic Montage cut system synced to drums/beats!
      const isSongAct = act && (act.id === 'act_7_song' || act.category === 'song');
      if (isSongAct) {
        const activeCut = getConcertCutAtTime(currentTime);
        if (this._concertCurrentTexKey !== activeCut.texKey) {
          const isInitial = !this._concertCurrentTexKey;
          this._concertCurrentTexKey = activeCut.texKey;
          this._applyConcertCut(activeCut.texKey, !isInitial);
        }
      }

      this._subtitles.update(dt);
      this._subtitles.syncToTime(currentTime, this._isPlaying);
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

    const progress = Math.min(1, currentTime / Math.max(1, this._actDuration));
    this._renderProgressBar(progress);

    // YouTube Autohide HUD logic
    if (this._isPlaying && !this._isUiHovered && !this._isTimelineDragging) {
      this._autohideTimer = Math.max(0, this._autohideTimer - dt);
    } else {
      this._autohideTimer = 2.5;
    }

    const targetAlpha = this._autohideTimer > 0 ? 1.0 : 0.0;
    this._playerBarContainer.alpha += (targetAlpha - this._playerBarContainer.alpha) * Math.min(1, dt * 7);
    this._badgeText.alpha = this._playerBarContainer.alpha;
    this._titleText.alpha = this._playerBarContainer.alpha;
    this._subtitleText.alpha = this._playerBarContainer.alpha;

    if (this._app.canvas) {
      if (this._playerBarContainer.alpha < 0.05 && this._isPlaying) {
        this._app.canvas.style.cursor = 'none';
      } else {
        this._app.canvas.style.cursor = 'default';
      }
    }

    // Subtle background drift & concert camera impulse
    if (this._concertPunchScale > 1.001) {
      this._concertPunchScale += (1.0 - this._concertPunchScale) * Math.min(1, dt * 10);
    } else {
      this._concertPunchScale = 1.0;
    }

    if (this._bgContainer.visible && this._bgSprite.texture && this._bgSprite.texture.width > 0) {
      const slowScale = 1.0 + Math.sin(this._actTime * 0.15) * 0.025;
      const finalScale = this._bgBaseScale * slowScale * this._concertPunchScale;
      this._bgSprite.scale.set(finalScale);
    }
  }

  private _applyConcertCut(texKey: string, punch: boolean = true): void {
    try {
      const tex = getTexture(texKey);
      if (tex && tex !== Texture.WHITE && tex.width > 1) {
        this._bgSprite.texture = tex;
      }
      this._resizeBgSprite();
      this._bgSprite.alpha = 1.0; // Hard cut on the beat! No slow fade!
      if (punch) {
        this._concertPunchScale = 1.035; // Snappy rock concert camera impulse on drum hit
      }
    } catch (err) {
      console.warn('[MovieApp] Concert cut error:', err);
    }
  }

  private _resizeBgSprite(): void {
    if (this._bgSprite.texture && this._bgSprite.texture.width > 0) {
      const texW = this._bgSprite.texture.width;
      const texH = this._bgSprite.texture.height;
      this._bgBaseScale = Math.max(this._screenWidth / texW, this._screenHeight / texH);
      this._bgSprite.scale.set(this._bgBaseScale * this._concertPunchScale);
      this._bgSprite.position.set(this._screenWidth / 2, this._screenHeight / 2);
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

  public resize(w: number, h: number): void {
    this._screenWidth = w;
    this._screenHeight = h;
    const isPortrait = h > w;

    this._cosmicScene.resize(w, h);
    this._subtitles.resize(w, h);
    this._resizeBgSprite();

    this._introContainer.position.set(w / 2, h / 2);
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
    this._introSeriesSubtitle.style.fontSize = isPortrait ? 12 : 16;
    this._introSeriesSubtitle.position.set(0, logoRenderedH / 2 + (isPortrait ? 24 : 30));

    this._introCycleSubtitle.style.fontSize = isPortrait ? 20 : 30;
    this._introCycleSubtitle.style.letterSpacing = isPortrait ? 6 : 10;
    this._introCycleSubtitle.position.set(0, 0); // Center of screen after main logo disappears

    // Vignette bottom (controls backdrop only; top is kept clean for full cinema visual)
    this._vignetteGraphics.clear();
    this._vignetteGraphics.rect(0, h - (isPortrait ? 120 : 85), w, isPortrait ? 120 : 85);
    this._vignetteGraphics.fill({ color: 0x050508, alpha: 0.95 });

    // Header layout (Top Left)
    this._badgeText.position.set(24, 14);
    this._titleText.position.set(24, 32);
    this._titleText.style.fontSize = isPortrait ? 15 : 18;
    this._subtitleText.position.set(24, isPortrait ? 54 : 58);

    // Unified Bottom Player Bar
    const barH = isPortrait ? 114 : 76;
    this._playerBarContainer.position.set(0, h - barH);

    this._playerBarBg.clear();
    this._playerBarBg.rect(0, 0, w, barH);
    this._playerBarBg.fill({ color: 0x07080e, alpha: 0.94 });
    this._playerBarBg.stroke({ color: 0x1f2436, width: 1 });

    // Progress timeline at top of player bar
    this._progressBarContainer.position.set(24, isPortrait ? 14 : 10);

    // Controls Row position
    const rowY = isPortrait ? 56 : 42;
    this._controlsRow.position.set(0, rowY);

    // Left controls (Clean non-overlapping spacing)
    this._playPauseButton.position.set(24, 0);
    this._prevButton.position.set(58, 0);
    this._nextButton.position.set(94, 0);
    this._muteButton.position.set(134, 0);

    // Volume group (Voice, Music, SFX): Voice center is at 0 (bounds -43..+43)
    // Position 208 puts left bound at 165, keeping 13px gap after mute button (134 + 18 = 152)
    const availForVol = w - 660;
    const volScale = w < 1100 ? Math.max(0.65, Math.min(1.0, availForVol / 400)) : 1.0;
    this._volumeGroup.scale.set(volScale);
    this._volumeGroup.position.set(208, 0);

    const timeX = 208 + 228 * volScale + 18;
    this._timeCodeText.position.set(timeX, 0);
    this._timeCodeText.style.fontSize = w < 950 ? 10 : 12;

    // Center Act dots / icons (compact spacing 28px)
    const dotsHalfW = 140;
    const timeRight = timeX + (this._timeCodeText.width || 80) + 16;
    if (w / 2 - dotsHalfW < timeRight || isPortrait) {
      this._dotsContainer.position.set(w / 2, isPortrait ? -34 : -22);
    } else {
      this._dotsContainer.position.set(w / 2, 0);
    }

    // Right controls (Fullscreen & CC only - clean and spacious!)
    this._fullscreenButton.position.set(w - 36, 0);
    this._ccButton.position.set(w - 76, 0);

    // Debug Mode UI (Top Center - completely out of the way of the player bar!)
    if (this._debugContainer) {
      this._debugContainer.position.set(w / 2, isPortrait ? 114 : 32);
      this._debugContainer.scale.set(w < 950 ? 0.85 : 1.0);
    }
  }
}
