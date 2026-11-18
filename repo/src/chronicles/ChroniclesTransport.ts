import { Application, Assets, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { getImageUrl } from '../assetsManager';
import { ClickTracker } from '../ClickTracker';
import { SFX } from '../SoundEffects';
import { after, cancelTween, ease, tween, updateTweens } from '../tween';
import './chroniclesTransport.css';
import { packStickers } from './presentation';

export interface TransportChapter { sceneId?:string;sceneTime?:number;id: string; title: string; start: number; duration: number; sticker?: 'logo' | 'speech' | 'punishment' | 'reward' | 'song'; }
export interface TransportMarker { id: string; label: string; time: number; state?: string; }
export interface TransportState {
  playing: boolean; time: number; total: number; cc: boolean; muted: boolean;
  voiceVolume: number; musicVolume: number; sfxVolume: number;
  currentSceneId?: string; statusLabel?: string;
  chapters?: TransportChapter[]; stickers?:TransportChapter[]; markers?: TransportMarker[];
}
export interface TransportOptions {
  onPlay: () => void; onPause: () => void; onPrevious: () => void; onNext: () => void;
  onSeek: (ratio: number) => void; onCc: () => void; onFullscreen: () => void;
  onMute: () => void; onVolume: (kind: 'voice' | 'music' | 'sfx', value: number) => void;
  onDirector: () => void; onChapter: (id: string, sceneTime?:number) => void;
  onMarker: (id: string, kind: 'host' | 'game') => void;
}
interface Keycap { container: Container; sprite: Sprite; setLatched: (value: boolean) => void; pressAndRelease: () => void; }
interface ActButton { container: Container; setLatched: (value: boolean) => void; setLampActive: (value: boolean) => void; }
interface Slider { container: Container; knob: Sprite; setVol: (value: number, notify?: boolean) => void; }
interface Hotspot { element: HTMLElement; setRect: (x: number, y: number, width: number, height: number) => void; }
const TEXTURES = ['gui_chassis_left','gui_chassis_mid','gui_chassis_right','gui_btn_play','gui_btn_pause','gui_btn_prev','gui_btn_next','gui_btn_vol','gui_btn_cc','gui_btn_mode','gui_knob_voice','gui_knob_music','gui_knob_sfx','gui_knob_timeline','gui_track_cap_left','gui_track_mid','gui_track_cap_right','gui_act_btn_hole','gui_act_btn_shadow','gui_act_btn','gui_act_lamp_off','gui_act_lamp_on','gui_sticker_logo','gui_sticker_speech','gui_sticker_punishment','gui_sticker_reward','gui_sticker_song'];
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clock = (value: number) => { const seconds = Math.max(0, Math.floor(value || 0)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; };

/** The original WS-96 console, extracted from MovieApp's native Pixi builders and geometry. */
export class ChroniclesTransport {
  readonly element = document.createElement('div');
  private readonly access = document.createElement('div');
  private readonly tooltip = document.createElement('div');
  private readonly console = new Container();
  private readonly left = new Container();
  private readonly middle = new Container();
  private readonly right = new Container();
  private chassisMiddle: Sprite;
  private readonly track = new Container();
  private capLeft: Sprite; private trackMiddle: Sprite; private capRight: Sprite;
  private readonly progress = new Graphics(); private knob: Sprite; private lcd: Text;
  private playKey: Keycap; private ccKey: Keycap; private modeKey: Keycap; private muteKey: Keycap;
  private sliders: Record<'voice' | 'music' | 'sfx', Slider>;
  private staticHotspots = new Map<string, Hotspot>();
  private chapterButtons: { chapter: TransportChapter; button: ActButton; hotspot: Hotspot }[] = [];
  private stickers: { chapter: TransportChapter; sprite: Sprite; container: Container; hotspot: Hotspot; ratio?: number }[] = [];
  private markerButtons: { marker: TransportMarker; kind: 'host' | 'game'; container: Container; graphic: Graphics; hotspot: Hotspot }[] = [];
  private chapterSignature = ''; private markerSignature = '';
  private state: TransportState = { playing: false, time: 0, total: 0, cc: true, muted: false, voiceVolume: 1, musicVolume: .5, sfxVolume: .5 };
  private width = 0; private scale = 1; private barHeight = 0; private midWidth = 0; private leftWidth = 0;
  private trackStart = 0; private trackWidth = 0; private innerStart = 0; private innerWidth = 0;
  private lcdOverrideUntil = 0; private dead = false; private dragging = false;
  private activeDrags = new Set<() => void>();
  private revealState={p:1};private revealed=true;
  private animated = new Set<object>();
  private resizeHandler = () => this.resize(window.innerWidth, window.innerHeight);

  static async create(options: TransportOptions): Promise<ChroniclesTransport> {
    await Promise.allSettled(['Share Tech Mono','DSEG7 Classic'].map(font => document.fonts.load(`14px "${font}"`)));
    const textures = new Map<string, Texture>();
    await Promise.all(TEXTURES.map(async key => {
      const url = getImageUrl(key); if (!url) throw new Error(`Не найдена исходная текстура консоли: ${key}`);
      textures.set(key, await Assets.load<Texture>(url));
    }));
    try { await document.fonts.load("14px 'DSEG7 Classic'"); await document.fonts.load("14px 'Share Tech Mono'"); } catch { /* Fonts retain the exact original fallback stack. */ }
    const app = new Application();
    await app.init({ width: window.innerWidth, height: 120, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
    return new ChroniclesTransport(app, textures, options);
  }

  private constructor(private readonly app: Application, private readonly textures: Map<string, Texture>, private readonly options: TransportOptions) {
    this.element.className = 'chronicles-transport'; this.element.setAttribute('aria-label', 'Панель воспроизведения WS-96');
    this.access.className = 'ct-access'; this.tooltip.className = 'ct-tooltip'; this.tooltip.hidden = true;
    this.element.append(app.canvas, this.access, this.tooltip); document.body.append(this.element);
    this.app.stage.addChild(this.console); this.console.addChild(this.left, this.middle, this.right);
    this.left.addChild(new Sprite(this.texture('gui_chassis_left')));
    this.chassisMiddle = new Sprite(this.texture('gui_chassis_mid')); this.middle.addChild(this.chassisMiddle);
    this.right.addChild(new Sprite(this.texture('gui_chassis_right')));
    const play = () => this.state.playing ? options.onPause() : options.onPlay();
    this.playKey = this.keycap('gui_btn_play', play); this.playKey.container.position.set(90, 83); this.left.addChild(this.playKey.container);
    const prev = this.keycap('gui_btn_prev', options.onPrevious); prev.container.position.set(152, 83); this.left.addChild(prev.container);
    const next = this.keycap('gui_btn_next', options.onNext); next.container.position.set(213.5, 83); this.left.addChild(next.container);
    this.muteKey = this.keycap('gui_btn_vol', options.onMute, true); this.muteKey.container.position.set(275, 83); this.left.addChild(this.muteKey.container);
    this.sliders = {
      voice: this.knobSlider('gui_knob_voice', 342, 390, 83, 1, v => this.volume('voice', v), 'VOICE'),
      music: this.knobSlider('gui_knob_music', 428, 480, 83, .5, v => this.volume('music', v), 'MUSIC'),
      sfx: this.knobSlider('gui_knob_sfx', 522, 569, 83, .5, v => this.volume('sfx', v), 'SFX'),
    };
    Object.values(this.sliders).forEach(s => this.left.addChild(s.container));
    this.lcd = new Text({ text: '00:00 / 00:00', style: new TextStyle({ fontFamily: ['DSEG7 Classic','Share Tech Mono','monospace'], fontSize: 14, fontWeight: 'bold', fill: '#8be194', letterSpacing: 2, dropShadow: { alpha: .55, blur: 3, color: '#33ff77', distance: 0 } }) });
    this.lcd.anchor.set(.5); this.lcd.position.set(694.5, 82.5); this.left.addChild(this.lcd);
    this.capLeft = new Sprite(this.texture('gui_track_cap_left')); this.trackMiddle = new Sprite(this.texture('gui_track_mid')); this.capRight = new Sprite(this.texture('gui_track_cap_right'));
    this.knob = new Sprite(this.texture('gui_knob_timeline')); this.knob.anchor.set(.5);
    this.track.addChild(this.capLeft, this.trackMiddle, this.capRight, this.progress, this.knob); this.middle.addChild(this.track);
    this.track.eventMode = 'static'; this.track.cursor = 'pointer';
    this.track.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); this.beginSeek(e.global.x); });
    this.track.on('pointermove', (e: FederatedPointerEvent) => { if (!this.dragging) this.showSeekTooltip(e.global.x, e.global.y); });
    this.track.on('pointerout', () => { if (!this.dragging) this.tooltip.hidden = true; });
    const socket = new Graphics(); socket.rect(156, 48, 126, 64).fill({ color: 0x080a0c }); this.right.addChild(socket);
    this.ccKey = this.keycap('gui_btn_cc', options.onCc, true, true); this.ccKey.container.position.set(189.5, 79.5); this.right.addChild(this.ccKey.container);
    this.modeKey = this.keycap('gui_btn_mode', options.onFullscreen, true); this.modeKey.container.position.set(249, 79.5); this.right.addChild(this.modeKey.container);
    const bind = (name: string, key: Keycap, action: () => void) => this.staticHotspots.set(name, this.hotspot(name, () => { key.pressAndRelease(); this.click(); action(); }));
    bind('Воспроизведение / пауза', this.playKey, play); bind('⏮', prev, options.onPrevious); bind('⏭', next, options.onNext);
    bind('Выключить звук', this.muteKey, options.onMute); bind('Субтитры', this.ccKey, options.onCc); bind('Полный экран', this.modeKey, options.onFullscreen);
    this.staticHotspots.set('Режиссёр', this.hotspot('Режиссёр', options.onDirector));
    this.staticHotspots.set('Перейти к записанному фрагменту', this.range('Перейти к записанному фрагменту', ratio => options.onSeek(ratio), event => this.beginSeek(this.screenPoint(event).x)));
    for (const [kind, title] of [['voice','Голос'],['music','Музыка'],['sfx','SFX']] as const) {
      const starts = { voice: 342, music: 428, sfx: 522 }, ends = { voice: 390, music: 480, sfx: 569 };
      this.staticHotspots.set(title, this.range(title, value => { this.sliders[kind].setVol(value); }, event => {
        this.windowDrag(event.clientX, (_x, e) => { const x = this.screenPoint(e).x / this.scale; this.sliders[kind].setVol((x - starts[kind]) / (ends[kind] - starts[kind])); });
      }));
    }
    this.resize(window.innerWidth, window.innerHeight);
    this.app.ticker.add(ticker => { updateTweens(Math.min(.1, ticker.deltaMS / 1000));this.element.style.transform=`translateY(${(this.barHeight+24)*(1-this.revealState.p)}px)`; this.drawProgress(); this.updateLcd(); });
    window.addEventListener('resize', this.resizeHandler);
  }

  get height(): number { return this.barHeight; }
  get bottomOffset():number{return Math.max(0,(this.barHeight+24)*this.revealState.p-24);}
  setRevealed(show:boolean):void{if(this.revealed===show)return;this.revealed=show;cancelTween(this.revealState);tween(this.revealState,{p:show?1:0},show?.45:.55,show?ease.outBack:ease.inBack);}
  private texture(key: string): Texture { return this.textures.get(key) || Texture.WHITE; }
  private click(): void { ClickTracker.exclude(); SFX.playClick(); }

  update(next: Partial<TransportState>): void {
    if (this.dead) return;
    const previousTotal = this.state.total;
    this.state = { ...this.state, ...next };
    const texture = this.texture(this.state.playing ? 'gui_btn_pause' : 'gui_btn_play'); if (this.playKey.sprite.texture !== texture) this.playKey.sprite.texture = texture;
    this.ccKey.setLatched(this.state.cc); this.muteKey.setLatched(this.state.muted); this.modeKey.setLatched(Boolean(document.fullscreenElement));
    this.sliders.voice.setVol(this.state.voiceVolume, false); this.sliders.music.setVol(this.state.musicVolume, false); this.sliders.sfx.setVol(this.state.sfxVolume, false);
    SFX.setMuted(this.state.muted); SFX.setVolume(this.state.sfxVolume);
    this.staticHotspots.get('Полный экран')?.element.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));
    for (const name of ['Воспроизведение / пауза','Субтитры','Выключить звук']) this.staticHotspots.get(name)?.element.setAttribute('aria-pressed', String(name === 'Субтитры' ? this.state.cc : name === 'Выключить звук' ? this.state.muted : this.state.playing));
    const setRange = (name: string, value: number) => { const input = this.staticHotspots.get(name)?.element as HTMLInputElement | undefined; if (input) input.value = String(Math.round(clamp(value) * 10000)); };
    setRange('Голос', this.state.voiceVolume); setRange('Музыка', this.state.musicVolume); setRange('SFX', this.state.sfxVolume); setRange('Перейти к записанному фрагменту', this.state.total ? this.state.time / this.state.total : 0);
    const chapters = this.state.chapters || [], markers = this.state.markers || [];
    const chapterSignature = [...chapters,...this.state.stickers??[]].map(c => `${c.id}:${c.title}:${c.start}:${c.duration}:${c.sticker || ''}`).join('|');
    const markerSignature = markers.map(m => `${m.id}:${m.label}:${m.time}`).join('|');
    if (chapterSignature !== this.chapterSignature) { this.chapterSignature = chapterSignature; this.rebuildChapters(chapters,this.state.stickers); }
    if (markerSignature !== this.markerSignature) { this.markerSignature = markerSignature; this.rebuildMarkers(markers); }
    if (previousTotal !== this.state.total) this.layoutChapterControls();
    for (const item of this.chapterButtons) { const active = item.chapter.id === this.state.currentSceneId; item.button.setLatched(active); item.button.setLampActive(active); }
    for (const item of this.stickers) item.sprite.alpha = (item.chapter.sceneId??item.chapter.id)===this.state.currentSceneId&&this.state.time>=item.chapter.start&&this.state.time<item.chapter.start+item.chapter.duration ? 1 : .88;
    for (const item of this.markerButtons) {
      const marker = markers.find(m => m.id === item.marker.id) || item.marker;
      const s = item.kind === 'host' && /В игре|game/i.test(marker.state || '') ? 'Пройдено' : marker.state || '', active = item.kind === 'host' ? /Ожидан|Передач|host|waiting/i.test(s) : /Интерактив|В игре|game/i.test(s);
      item.graphic.alpha = /Пропущ|skip/i.test(s) ? .35 : active || /Пройден|done|complete/i.test(s) ? 1 : .64;
      item.hotspot.element.setAttribute('aria-label', `${item.kind === 'host' ? '□ Слово Толе ' : '◇ Интерактив '}${marker.label}. ${s || 'Впереди'}`);
      item.hotspot.element.setAttribute('aria-pressed', String(active));
    }
    this.updateLcd(); this.drawProgress();
  }

  resize(width: number, _height: number): void {
    if (this.dead || width <= 0) return;
    this.width = width; this.scale = Math.min(Math.min(1, Math.max(.48, (width - 30) / 1535)) * .70,width/1600);
    const g = this.scale; this.barHeight = 161 * g; this.leftWidth = 841 * g;
    const rightWidth = 346 * g, pad = 10 * g; this.midWidth = Math.max(200 * g, width - this.leftWidth - rightWidth);
    this.element.style.height = `${this.barHeight}px`; this.element.style.setProperty('--transport-height', `${this.barHeight}px`);
    this.app.renderer.resize(width, Math.ceil(this.barHeight)); this.app.canvas.style.width = `${width}px`; this.app.canvas.style.height = `${this.barHeight}px`;
    this.left.position.set(0, 0); this.left.scale.set(g);
    this.middle.position.set(this.leftWidth, 0); this.chassisMiddle.width = this.midWidth; this.chassisMiddle.height = 161 * g;
    this.right.position.set(width - rightWidth, 0); this.right.scale.set(g);
    this.trackWidth = Math.max(120, (this.midWidth - pad * 2) / g);
    this.track.position.set(pad, 62 * g); this.track.scale.set(g);
    this.capLeft.position.set(0, 0); this.trackMiddle.position.set(25, 0); this.trackMiddle.width = Math.max(10, this.trackWidth - 50); this.capRight.position.set(this.trackWidth - 25, 0);
    this.track.hitArea = new Rectangle(0, -10, this.trackWidth, 59);
    this.innerStart = pad + 28 * g; this.innerWidth = Math.max(10, (this.trackWidth - 56) * g); this.trackStart = this.leftWidth + this.innerStart;
    const leftRect = (key: string, x: number, y: number, w: number, h: number) => this.staticHotspots.get(key)?.setRect((x - w / 2) * g, (y - h / 2) * g, w * g, h * g);
    leftRect('Воспроизведение / пауза', 90, 83, 62, 58); leftRect('⏮', 152, 83, 62, 58); leftRect('⏭', 213.5, 83, 61, 58); leftRect('Выключить звук', 275, 83, 62, 58);
    leftRect('Голос', 366, 83, 88, 64); leftRect('Музыка', 454, 83, 92, 64); leftRect('SFX', 545.5, 83, 87, 64);
    this.staticHotspots.get('Режиссёр')?.setRect(20 * g, 4 * g, 115 * g, 34 * g);
    this.staticHotspots.get('Субтитры')?.setRect(width - rightWidth + (189.5 - 29.5) * g, 51 * g, 59 * g, 57 * g);
    this.staticHotspots.get('Полный экран')?.setRect(width - rightWidth + (249 - 30) * g, 51 * g, 60 * g, 57 * g);
    this.staticHotspots.get('Перейти к записанному фрагменту')?.setRect(this.trackStart, 62 * g, this.innerWidth, 39 * g);
    this.layoutChapterControls(); this.drawProgress();
  }

  private updateLcd(): void { if (performance.now() >= this.lcdOverrideUntil) this.lcd.text = this.state.statusLabel || `${clock(this.state.time)} / ${clock(this.state.total)}`; }
  private volume(kind: 'voice' | 'music' | 'sfx', value: number): void {
    const v = clamp(value); this.state[kind === 'voice' ? 'voiceVolume' : kind === 'music' ? 'musicVolume' : 'sfxVolume'] = v;
    this.lcd.text = `${kind.toUpperCase()} ${Math.round(v * 100)}%`; this.lcdOverrideUntil = performance.now() + 1600;
    if (kind === 'sfx') { SFX.setVolume(v); SFX.playPreview(); }
    this.options.onVolume(kind, v);
  }

  /** Copied keycap mechanics: exact original 0.72 press / 0.86 latched scales and tints. */
  private keycap(textureKey: string, onClick: () => void, latching = false, initial = false): Keycap {
    const container = new Container(); container.eventMode = 'static'; container.cursor = 'pointer';
    const sprite = new Sprite(this.texture(textureKey)); sprite.anchor.set(.5); container.addChild(sprite); this.animated.add(sprite.scale);
    let latched = initial, pressed = false;
    const apply = (down: boolean, animate: boolean) => { cancelTween(sprite.scale); sprite.y = 0; const scale = down ? .72 : latching && latched ? .86 : 1; sprite.tint = down ? 0x8a8a8a : latching && latched ? 0xc4c4c4 : 0xffffff; if (animate) tween(sprite.scale, { x: scale, y: scale }, .15, ease.outBack); else sprite.scale.set(scale); };
    apply(false, false);
    container.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); ClickTracker.exclude(); pressed = true; apply(true, false); });
    container.on('pointerup', (e: FederatedPointerEvent) => { if (!pressed) return; e.stopPropagation(); pressed = false; this.click(); onClick(); apply(false, true); });
    const cancel = () => { if (pressed) { pressed = false; apply(false, true); } };
    container.on('pointerupoutside', cancel); container.on('pointerout', cancel);
    return { container, sprite, setLatched: value => { if (latched !== value) { latched = value; if (!pressed) apply(false, true); } }, pressAndRelease: () => { if (pressed) return; apply(true, false); after(.09, () => { if (!this.dead) apply(false, true); }); } };
  }

  /** Original socket/shadow/cap/lamp construction, with chapter metadata supplied by the caller. */
  private actButton(chapter: TransportChapter): ActButton {
    const container = new Container(); container.eventMode = 'static'; container.cursor = 'pointer'; container.hitArea = new Rectangle(-12, -30, 24, 48);
    const hole = new Sprite(this.texture('gui_act_btn_hole')); hole.anchor.set(.5);
    const shadow = new Sprite(this.texture('gui_act_btn_shadow')); shadow.anchor.set(.5); shadow.position.set(-3.5, 4.5); shadow.alpha = .65;
    const cap = new Sprite(this.texture('gui_act_btn')); cap.anchor.set(.5);
    const lamp = new Sprite(this.texture('gui_act_lamp_off')); lamp.anchor.set(.5); lamp.position.set(0, -20.5);
    container.addChild(hole, shadow, cap, lamp); this.animated.add(cap.scale); this.animated.add(shadow.scale); this.animated.add(shadow.position);
    let latched = false, pressed = false;
    const apply = (animate: boolean) => { const scale = pressed ? .72 : latched ? .86 : 1; cap.tint = pressed ? 0x8a8a8a : latched ? 0xc4c4c4 : 0xffffff; for (const target of [cap.scale, shadow.scale, shadow.position]) cancelTween(target); if (animate) { tween(cap.scale, { x: scale, y: scale }, .15, ease.outBack); tween(shadow.scale, { x: scale, y: scale }, .15, ease.outBack); tween(shadow.position, { x: -3.5 * scale, y: 4.5 * scale }, .15, ease.outBack); } else { cap.scale.set(scale); shadow.scale.set(scale); shadow.position.set(-3.5 * scale, 4.5 * scale); } };
    container.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); ClickTracker.exclude(); pressed = true; apply(false); });
    container.on('pointerup', (e: FederatedPointerEvent) => { if (!pressed) return; pressed = false; e.stopPropagation(); this.click(); this.options.onChapter(chapter.sceneId??chapter.id,chapter.sceneTime); apply(true); });
    const cancel = () => { if (pressed) { pressed = false; apply(true); } this.tooltip.hidden = true; };
    container.on('pointerupoutside', cancel); container.on('pointerout', cancel);
    container.on('pointerover', (e: FederatedPointerEvent) => this.showTooltip(chapter.title, e.global.x, e.global.y));
    return { container, setLatched: value => { if (latched !== value) { latched = value; if (!pressed) apply(true); } }, setLampActive: value => { lamp.texture = this.texture(value ? 'gui_act_lamp_on' : 'gui_act_lamp_off'); lamp.alpha = value ? .9 + Math.sin(Date.now() * .006) * .1 : .75; } };
  }

  private knobSlider(textureKey: string, start: number, end: number, y: number, initial: number, onChange: (value: number) => void, label: string): Slider {
    const container = new Container(); container.eventMode = 'static'; container.cursor = 'ew-resize'; container.hitArea = new Rectangle(start - 20, y - 32, end - start + 40, 64);
    const knob = new Sprite(this.texture(textureKey)); knob.anchor.set(.5); knob.position.set(start + initial * (end - start), y); container.addChild(knob);
    const setVol = (value: number, notify = true) => { const v = clamp(value); knob.x = start + v * (end - start); if (notify) onChange(v); };
    container.on('pointerdown', (event: FederatedPointerEvent) => { event.stopPropagation(); ClickTracker.exclude(); this.windowDrag(event.global.x, (_x, e) => { const local = container.toLocal(this.screenPoint(e)); setVol((local.x - start) / (end - start)); this.showTooltip(`${label}: ${Math.round(clamp((local.x - start) / (end - start)) * 100)}%`, this.screenPoint(e).x, this.screenPoint(e).y); }); });
    return { container, knob, setVol };
  }

  private rebuildChapters(chapters: TransportChapter[],stickers:TransportChapter[]=[]): void {
    for (const item of this.chapterButtons) { item.button.container.destroy({ children: true }); item.hotspot.element.remove(); }
    for (const item of this.stickers) { item.container.destroy({ children: true }); item.hotspot.element.remove(); }
    this.chapterButtons = []; this.stickers = [];
    for (const chapter of chapters) {
      const act = this.actButton(chapter); this.middle.addChild(act.container);
      const hotspot = this.hotspot(chapter.title, () => { this.click(); this.options.onChapter(chapter.sceneId??chapter.id,chapter.sceneTime); });
      this.chapterButtons.push({ chapter, button: act, hotspot });
    }
    const stickerDefs: { chapter: TransportChapter; key: string; ratio?: number }[] = [];
    const add = (chapter: TransportChapter | undefined, key: string) => { if (chapter && !stickerDefs.some(d => d.key === key)) stickerDefs.push({ chapter, key }); };
    for (const c of [...stickers,...chapters.filter(c => c.sticker)]) add(c, 'gui_sticker_' + c.sticker);
    add(chapters.find(c => /OPENING|PLAYBOX/i.test(c.id)) || chapters.find(c=>/INTRO/i.test(c.id)) || chapters[0], 'gui_sticker_logo');
    add(chapters.find(c => /PROLOGUE/i.test(c.id)) || chapters[1], 'gui_sticker_speech');
    add(chapters.find(c => /PUNISH|VERDICT/i.test(c.id)), 'gui_sticker_punishment');
    add(chapters.find(c => /REWARD|VERDICT/i.test(c.id)), 'gui_sticker_reward');
    add(chapters.find(c => /SONG/i.test(c.id)), 'gui_sticker_song');
    if (!stickerDefs.some(def => def.key === 'gui_sticker_song')) stickerDefs.push({ chapter: { id: 'SONG', title: 'Дополнительный трек', start: 0, duration: 0 }, key: 'gui_sticker_song', ratio: .92 });
    for (const def of stickerDefs) {
      const container = new Container(), sprite = new Sprite(this.texture(def.key)); sprite.anchor.set(.5); sprite.alpha = .9; container.addChild(sprite); this.middle.addChild(container);
      const hotspot = this.hotspot(def.chapter.title, () => { this.click(); this.options.onChapter(def.chapter.sceneId??def.chapter.id,def.chapter.sceneTime); });
      this.stickers.push({ chapter: def.chapter, sprite, container, hotspot, ratio: def.ratio });
    }
    this.layoutChapterControls();
  }

  private rebuildMarkers(markers: TransportMarker[]): void {
    for (const item of this.markerButtons) { item.container.destroy({ children: true }); item.hotspot.element.remove(); }
    this.markerButtons = [];
    for (const marker of markers) for (const kind of ['host', 'game'] as const) {
      const container = new Container(), graphic = new Graphics(); container.addChild(graphic); this.middle.addChild(container);
      const color = kind === 'host' ? 0xd9a34f : 0xa691d2;
      if (kind === 'host') graphic.rect(-4, -4, 8, 8); else graphic.poly([0,-5,5,0,0,5,-5,0]);
      graphic.fill({ color, alpha: .45 }).stroke({ color, width: 1 });
      const title = `${kind === 'host' ? '□ Слово Толе ' : '◇ Интерактив '}${marker.label}`;
      const hotspot = this.hotspot(title, () => { this.click(); this.options.onMarker(marker.id, kind); });
      this.markerButtons.push({ marker, kind, container, graphic, hotspot });
    }
    this.layoutChapterControls();
  }

  private layoutChapterControls(): void {
    const g = this.scale, ratio = (seconds: number) => this.state.total > 0 ? clamp(seconds / this.state.total) : 0;
    const chapterScale=Math.min(g,this.innerWidth/Math.max(1,this.chapterButtons.length*26));
    const chapterXs=packStickers(this.chapterButtons.map(item=>({x:this.innerStart+ratio(item.chapter.start+item.chapter.duration/2)*this.innerWidth,width:24*chapterScale})),this.innerStart,this.innerStart+this.innerWidth,2*chapterScale);
    for (const [index,item] of this.chapterButtons.entries()) {
      const x=chapterXs[index];item.button.container.position.set(x,136*g);item.button.container.scale.set(chapterScale);
      item.hotspot.setRect(this.leftWidth+x-12*chapterScale,124*g,24*chapterScale,24*g);
    }
    const stickerScale=Math.min(g,this.innerWidth/Math.max(1,this.stickers.reduce((n,item)=>n+item.sprite.width+10,0)));
    const stickerXs=packStickers(this.stickers.map(item=>({x:this.innerStart+(item.ratio??ratio(item.chapter.start+item.chapter.duration/2))*this.innerWidth,width:item.sprite.width*stickerScale})),this.innerStart,this.innerStart+this.innerWidth,10*stickerScale);
    for (const [index,item] of this.stickers.entries()) {
      const x=stickerXs[index];item.container.position.set(x,33*g);item.container.scale.set(stickerScale);
      item.hotspot.setRect(this.leftWidth+x-item.sprite.width*stickerScale/2,33*g-item.sprite.height*stickerScale/2,item.sprite.width*stickerScale,item.sprite.height*stickerScale);
    }
    for (const item of this.markerButtons) {
      const current = this.state.markers?.find(m => m.id === item.marker.id) || item.marker;
      const x = this.innerStart + ratio(current.time) * this.innerWidth + (item.kind === 'host' ? -7 : 7) * g;
      item.container.position.set(x, 108 * g); item.container.scale.set(g);
      item.hotspot.setRect(this.leftWidth + x - 6 * g, 100 * g, 12 * g, 16 * g);
    }
  }

  private drawProgress(): void {
    if (this.dead || !this.trackWidth) return;
    const ratio = this.state.total ? clamp(this.state.time / this.state.total) : 0;
    const x = 28 + ratio * Math.max(10, this.trackWidth - 56); this.knob.position.set(x, 18); this.progress.clear();
    if (ratio > .001) this.progress.roundRect(14, 16.5, Math.max(0, x - 14), 3, 1.5).fill({ color: 0xff0033, alpha: .95 });
    for (const chapter of (this.state.chapters || []).slice(1)) { const tickX = 28 + clamp(chapter.start / Math.max(1, this.state.total)) * Math.max(10, this.trackWidth - 56); this.progress.rect(tickX - 1.25, 14.5, 2.5, 7).fill({ color: 0x07080b, alpha: .8 }); this.progress.rect(tickX - .75, 14.5, 1.5, 7).fill({ color: 0xf0e9db, alpha: .95 }); }
  }

  private hotspot(title: string, action: () => void): Hotspot {
    const element = document.createElement('button'); element.type = 'button'; element.className = 'ct-hotspot'; element.setAttribute('aria-label', title); element.textContent = title; element.title = title;
    element.addEventListener('click', e => { e.stopPropagation(); action(); });
    element.addEventListener('pointerover', e => this.showTooltip(title, this.screenPoint(e).x, this.screenPoint(e).y)); element.addEventListener('pointerout', () => { this.tooltip.hidden = true; });
    this.access.append(element); return { element, setRect: (x, y, w, h) => { element.style.left = `${x}px`; element.style.top = `${y}px`; element.style.width = `${w}px`; element.style.height = `${h}px`; } };
  }
  private range(title: string, action: (value: number) => void, pointer: (event: PointerEvent) => void): Hotspot {
    const element = document.createElement('input'); element.type = 'range'; element.min = '0'; element.max = '10000'; element.step = '1'; element.className = 'ct-hotspot ct-range'; element.setAttribute('aria-label', title);
    element.addEventListener('input', () => action(Number(element.value) / 10000)); element.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); element.focus({ preventScroll: true }); pointer(event); });
    element.addEventListener('pointermove', event => { if (title === 'Перейти к записанному фрагменту' && !this.dragging) { const point = this.screenPoint(event); this.showSeekTooltip(point.x, point.y); } });
    element.addEventListener('pointerout', () => { if (!this.dragging) this.tooltip.hidden = true; }); this.access.append(element);
    return { element, setRect: (x, y, w, h) => { element.style.left = `${x}px`; element.style.top = `${y}px`; element.style.width = `${w}px`; element.style.height = `${h}px`; } };
  }
  private screenPoint(event: PointerEvent): { x: number; y: number } { const rect = this.app.canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * this.width / Math.max(1, rect.width), y: (event.clientY - rect.top) * this.barHeight / Math.max(1, rect.height) }; }
  private windowDrag(startX: number, action: (x: number, event: PointerEvent) => void, end?: () => void): void {
    const move = (event: PointerEvent) => action(event.clientX, event);
    const finish = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); this.activeDrags.delete(finish); this.tooltip.hidden = true; end?.(); };
    this.activeDrags.add(finish); window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
    const rect = this.app.canvas.getBoundingClientRect(); action(startX, { clientX: startX, clientY: rect.top + 83 * this.scale } as PointerEvent);
  }
  private beginSeek(screenX: number): void {
    if (this.dragging) return; this.dragging = true; const wasPlaying = this.state.playing; if (wasPlaying) this.options.onPause(); this.click();
    const rect = this.app.canvas.getBoundingClientRect();
    const clientX = rect.left + screenX / this.width * rect.width;
    this.windowDrag(clientX, (_x, e) => { const p = this.screenPoint(e); const ratio = clamp((p.x - this.trackStart) / Math.max(1, this.innerWidth)); this.options.onSeek(ratio); this.showSeekTooltip(p.x, p.y); }, () => { this.dragging = false; if (wasPlaying && !this.dead) this.options.onPlay(); });
  }
  private showSeekTooltip(x: number, y: number): void { const at = clamp((x - this.trackStart) / Math.max(1, this.innerWidth)) * this.state.total; const chapter = [...(this.state.chapters || [])].reverse().find(c => c.start <= at); this.showTooltip(`${clock(at)}${chapter ? ' · ' + chapter.title : ''}`, x, y, true); }
  private showTooltip(text: string, x: number, y: number, seek = false): void { this.tooltip.textContent = text; this.tooltip.classList.toggle('ct-seek-tooltip', seek); this.tooltip.hidden = false; this.tooltip.style.left = `${Math.max(100, Math.min(this.width - 100, x))}px`; this.tooltip.style.top = `${y - 11}px`; }

  destroy(): void { if (this.dead) return; this.dead = true; for (const finish of [...this.activeDrags]) finish(); window.removeEventListener('resize', this.resizeHandler); this.animated.forEach(cancelTween); cancelTween(this.revealState); this.element.remove(); this.app.destroy(true, { children: true, texture: false, textureSource: false }); }
}
