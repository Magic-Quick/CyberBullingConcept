import type { Asset, Clip, Diagnostic, Project, Scene, Stop, TimeRef, Track, TrackKind } from './model';
import { clipRange, resolveTime, sceneDuration, utteranceRanges } from './timeline';
import { editClipRange } from './directorEditing';
import css from './directorPanel.css?inline';

export interface DirectorPanelOptions {
  getProject: () => Project;
  onChange: (next: Project, label: string) => void;
  onSeek: (sceneId: string, time: number, event?: string) => void;
  onSave: () => Promise<void>;
  onImport: (text: string) => Promise<void>;
  onExport: () => void;
  assetUrl: (id: string) => string | undefined;
  onClose: () => void;
  getMarkdown: () => string;
  onEditSpeech: (id: string, text: string) => void;
  diagnostics: () => Diagnostic[];
  music: { dread:readonly {key:string;name:string;dur:number}[];peace:readonly {key:string;name:string;dur:number}[];transitions:readonly {key:string;name:string;gain:number}[];onCue:(category:'dread'|'peace'|'stop')=>void; onSelect:(category:'dread'|'peace',key:string)=>void; selected:(category:'dread'|'peace')=>string; onIntro:(variant:'desolate_cry'|'titan_forge')=>void; onTransition:(key:string,sceneId:string)=>void; onTest:(key?:string)=>void; onExport:()=>void; onReset:()=>void; };
}

type InspectorTab = 'clip' | 'speech' | 'game' | 'route' | 'source' | 'diagnostics' | 'music';
type DragMode = 'move' | 'left' | 'right';
const KINDS: TrackKind[] = ['frame', 'image', 'nameplate', 'screen', 'subtitle', 'voice', 'audio', 'sfx', 'interactive'];
const AUDIO = new Set<TrackKind>(['voice', 'audio', 'sfx']);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const freshId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const time = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}` : '—';
const number = (n: number) => Math.round(n * 1000) / 1000;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function button(text: string, callback: () => void, title = text): HTMLButtonElement {
  const b = element('button', 'cd-button', text);
  b.type = 'button'; b.title = title;
  b.addEventListener('click', callback);
  return b;
}
function label(text: string, input: HTMLElement): HTMLLabelElement {
  const wrapper = element('label', 'cd-field');
  wrapper.append(element('span', '', text), input);
  return wrapper;
}
function select(items: { value: string; label: string }[], value: string, callback: (value: string) => void): HTMLSelectElement {
  const input = element('select');
  for (const item of items) { const option = element('option', '', item.label); option.value = item.value; input.append(option); }
  input.value = value;
  input.addEventListener('change', () => callback(input.value));
  return input;
}

/** Visual editing uses the same project objects that the public player executes. */
export class DirectorPanel {
  private readonly host = element('section', 'chronicles-director');
  private readonly header = element('header', 'cd-header');
  private readonly toolbar = element('div', 'cd-toolbar');
  private readonly library = element('aside', 'cd-library');
  private readonly inspector = element('aside', 'cd-inspector');
  private readonly timeline = element('section', 'cd-timeline');
  private readonly lanes = element('div', 'cd-lanes');
  private readonly status = element('span', 'cd-status', 'Проект открыт');
  private readonly clock = element('span', 'cd-clock', '0:00.00');
  private readonly importInput = element('input');
  private sceneId = '';
  private currentTime = 0;
  private selectedEvent = '';
  private selected = new Set<string>();
  private selectedTrack = '';
  private selectedAsset = '';
  private soloTrackId = '';
  private soloMuteStates = new Map<string, boolean>();
  private search = '';
  private assetFilter = '';
  private tab: InspectorTab = 'clip';
  private pixelsPerSecond = 24;
  private snap = true;
  private ripple = false;
  private clipboard: Clip[] = [];
  private history: { project: Project; label: string }[] = [];
  private future: { project: Project; label: string }[] = [];
  private savedSnapshot: string;
  private visible = false;
  private saving = false;
  private dragActive = false;
  private dragCleanup?: () => void;
  private previewAudio?: HTMLAudioElement;
  private previewDialog?: HTMLDialogElement;
  private style: HTMLStyleElement;
  private keyHandler = (event: KeyboardEvent) => this.onKey(event);

  constructor(private readonly options: DirectorPanelOptions) {
    this.savedSnapshot = options.getMarkdown();
    this.style = element('style'); this.style.textContent = css;
    document.head.append(this.style);
    this.host.setAttribute('aria-label', 'Режим режиссёра');
    this.host.hidden = true;
    this.importInput.type = 'file'; this.importInput.accept = '.md,.txt'; this.importInput.hidden = true;
    this.importInput.addEventListener('change', async () => {
      const file = this.importInput.files?.[0]; if (!file) return;
      try { await this.importDocument(await file.text()); } finally { this.importInput.value = ''; }
    });
    this.host.append(this.header, this.toolbar, this.library, this.inspector, this.timeline, this.importInput);
    this.host.addEventListener('keydown', event => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable=true]')) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') this.onKey(event);
        event.stopPropagation();
      }
    });
    document.body.append(this.host);
    document.addEventListener('keydown', this.keyHandler);
    this.renderHeader();
  }

  get isVisible(): boolean { return this.visible; }
  get selectedClipId(): string|undefined { return [...this.selected][0]; }
  get selectedAssetId(): string { return this.selectedAsset; }

  /** Keyboard commands and older public controls share undo/redo and file persistence. */
  changeProject(title:string, action:(project:Project)=>void):void { this.mutate(title,action); }

  /** Loading/replacing a confirmed file establishes the same clean baseline as Save. */
  markSaved(): void {
    this.savedSnapshot = this.options.getMarkdown();
    this.renderHeader();
    this.updateDirty();
  }

  /** Select the object under the shared film preview without seeking or changing playback. */
  selectClip(id: string): void {
    const project = this.options.getProject(), clip = project.clips.find(c => c.id === id);
    if (!clip) return;
    this.sceneId = clip.sceneId; this.selected = new Set([id]); this.selectedTrack = ''; this.selectedAsset = ''; this.tab = 'clip';
    if (clip.event) this.selectedEvent = clip.event;
    if (this.visible) { this.renderToolbar(); this.renderTimeline(); this.renderInspector(); }
    if (project.tracks.find(t => t.id === clip.trackId)?.locked) this.inform('Объект выбран; его дорожка заблокирована.');
  }

  /** Preview drags commit once, through the same history and project callback as inspector edits. */
  updateClip(id: string, patch: Partial<Clip>, title: string): void {
    const project = this.options.getProject(), original = project.clips.find(c => c.id === id);
    if (!original) { this.inform('Объект больше не существует в проекте', true); return; }
    if (project.tracks.find(t => t.id === original.trackId)?.locked || patch.trackId && project.tracks.find(t => t.id === patch.trackId)?.locked) {
      this.inform('Дорожка заблокирована; изменение не применено', true); return;
    }
    if (patch.sceneId && !project.scenes.some(s => s.id === patch.sceneId) || patch.trackId && !project.tracks.some(t => t.id === patch.trackId)) {
      this.inform('Не найдена целевая сцена или дорожка', true); return;
    }
    this.clipChange(id, title, target => {
      const values = clone(patch);
      if (values.transform) { const placed=['x','y','width','height','scale','rotation'].some(key=>key in values.transform!); values.transform = { ...target.transform, ...values.transform }; if(placed)values.layout='manual'; }
      Object.assign(target, values, { id: original.id });
    });
  }

  show(sceneId?: string, at?: number): void {
    const project = this.options.getProject();
    this.sceneId = sceneId && project.scenes.some(s => s.id === sceneId) ? sceneId : this.sceneId || project.scenes[0]?.id || '';
    if (at !== undefined) this.currentTime = Math.max(0, at);
    this.visible = true; this.host.hidden = false;
    document.body.classList.add('chronicles-director-open');
    this.refresh();
  }

  hide(): void {
    this.dragCleanup?.(); this.stopAssetPreview();
    this.visible = false; this.host.hidden = true;
    document.body.classList.remove('chronicles-director-open');
  }

  destroy(): void {
    this.hide(); document.removeEventListener('keydown', this.keyHandler);
    this.host.remove(); this.style.remove();
  }

  sync(sceneId: string, at: number): void {
    // Playback never changes the author's selected branch or overwrites a text field.
    if (!this.visible || this.dragActive) return;
    this.currentTime = Math.max(0, at);
    if (sceneId && sceneId !== this.sceneId && this.options.getProject().scenes.some(s => s.id === sceneId)) {
      this.sceneId = sceneId; this.selected.clear(); this.selectedEvent = ''; this.refresh();
    }
    this.updateCursor();
  }

  refresh(): void {
    if (!this.visible || this.dragActive) return;
    const p = this.options.getProject();
    if (!p.scenes.some(s => s.id === this.sceneId)) this.sceneId = p.scenes[0]?.id || '';
    this.selected = new Set([...this.selected].filter(id => p.clips.some(c => c.id === id)));
    this.renderToolbar(); this.renderLibrary(); this.renderTimeline(); this.renderInspector(); this.updateDirty();
  }

  private inform(message: string, error = false): void {
    this.status.textContent = message; this.status.classList.toggle('cd-error', error);
  }

  private renderHeader(): void {
    this.header.replaceChildren();
    const heading = element('div', 'cd-brand');
    heading.append(element('strong', '', 'РЕЖИССЁР'), element('span', '', 'Хроники · монтаж проекта'));
    const save = button('Сохранить', () => void this.save(), 'Сохранить текстовый проект · Ctrl+S'); save.dataset.action = 'save';
    const exportButton = button('Экспорт .md', () => { try { this.options.onExport(); this.inform('Текстовый проект экспортирован'); } catch (e) { this.fail(e); } });
    this.header.append(heading, this.status, save, exportButton,
      button('Открыть .md', () => this.importInput.click()),
      button('Режим зрителя', () => { this.hide(); this.options.onClose(); }));
  }

  private renderToolbar(): void {
    const p = this.options.getProject(); this.toolbar.replaceChildren();
    this.toolbar.append(select(p.scenes.map(s => ({ value: s.id, label: `${s.title} · ${s.id}` })), this.sceneId, value => {
      this.sceneId = value; this.currentTime = 0; this.selectedEvent = ''; this.selected.clear(); this.selectedTrack = '';
      this.options.onSeek(value, 0); this.refresh();
    }));
    const events = [...new Set(p.clips.filter(c => c.sceneId === this.sceneId && c.event).map(c => c.event!))];
    const stop = p.stops.find(s => s.gameSceneId === this.sceneId);
    if (stop) for (const key of Object.keys(stop.game.reactions)) if (!events.includes(key)) events.push(key);
    const branch = select([{ value: '', label: 'Линейные события' }, ...events.map(e => ({ value: e, label: `Ветка: ${e}` })), { value: '__all', label: 'Все ветки · служебный обзор' }], this.selectedEvent, value => {
      this.selectedEvent = value; this.selected.clear(); this.options.onSeek(this.sceneId, this.currentTime, value && value !== '__all' ? value : undefined); this.refresh();
    });
    branch.setAttribute('aria-label', 'Ветка игры'); this.toolbar.append(branch);
    const undo = button('↶', () => this.undo(), 'Отменить · Ctrl+Z'); undo.disabled = !this.history.length;
    const redo = button('↷', () => this.redo(), 'Повторить · Ctrl+Shift+Z'); redo.disabled = !this.future.length;
    const zoom = element('input'); zoom.type = 'range'; zoom.min = '4'; zoom.max = '120'; zoom.value = String(this.pixelsPerSecond);
    zoom.setAttribute('aria-label', 'Масштаб таймлайна'); zoom.addEventListener('input', () => { this.pixelsPerSecond = Number(zoom.value); this.renderTimeline(); });
    this.toolbar.append(undo, redo, this.clock, this.toggle('Магнит', this.snap, value => { this.snap = value; }),
      this.toggle('Сдвиг следующих', this.ripple, value => { this.ripple = value; }), label('Масштаб', zoom));
  }

  private toggle(text: string, value: boolean, change: (value: boolean) => void): HTMLLabelElement {
    const input = element('input'); input.type = 'checkbox'; input.checked = value;
    input.addEventListener('change', () => change(input.checked));
    const wrapper = element('label', 'cd-toggle'); wrapper.append(input, document.createTextNode(text)); return wrapper;
  }

  private renderLibrary(): void {
    const scroll = this.library.scrollTop;
    this.library.replaceChildren();
    this.library.append(element('h3', '', 'Ресурсы проекта'));
    const search = element('input'); search.type = 'search'; search.value = this.search; search.placeholder = 'Найти ресурс…'; search.setAttribute('aria-label', 'Найти ресурс');
    search.addEventListener('input', () => { this.search = search.value; this.renderAssetList(); });
    this.library.append(search, select([{ value: '', label: 'Все ресурсы' }, { value: 'image', label: 'Изображения' }, { value: 'audio', label: 'Аудио' }, { value: 'video', label: 'Видео' }], this.assetFilter, value => { this.assetFilter = value; this.renderAssetList(); }));
    this.library.append(element('p', 'cd-hint', 'Перетащите ресурс на дорожку. Двойной клик — предпросмотр.'));
    const list = element('div', 'cd-asset-list'); this.library.append(list); this.renderAssetList();
    this.library.append(button('+ Дорожка', () => this.addTrack()), button('+ Текст / подпись', () => this.addTextClip()), button('Живые блоки / игры', () => this.openGameInspector()));
    this.library.scrollTop = scroll;
  }

  private renderAssetList(): void {
    const list = this.library.querySelector<HTMLElement>('.cd-asset-list'); if (!list) return;
    list.replaceChildren(); const p = this.options.getProject();
    const query = this.search.toLocaleLowerCase('ru');
    const matches = p.assets.filter(a => (!this.assetFilter || a.kind === this.assetFilter) && `${a.label || ''} ${a.id} ${a.key || ''} ${a.path || ''}`.toLocaleLowerCase('ru').includes(query));
    list.append(element('p', 'cd-hint', `${matches.length} ресурсов`));
    for (const asset of matches.slice(0, 200)) {
      const row = button('', () => { this.selectedAsset = asset.id; this.tab = 'clip'; this.selected.clear(); this.selectedTrack = ''; this.renderInspector(); });
      row.className = 'cd-asset'; row.draggable = true; row.title = asset.path || asset.key || asset.id;
      const icon = element('span', 'cd-asset-icon', asset.kind === 'audio' ? '♫' : asset.kind === 'video' ? '▶' : '▧');
      const title = element('span', 'cd-asset-title'); title.append(element('span', '', asset.label || asset.key || asset.id), element('small', '', asset.duration === undefined ? asset.kind : `${time(asset.duration)} · ${asset.kind}`));
      row.append(icon, title);
      row.addEventListener('dragstart', event => { event.dataTransfer?.setData('application/x-chronicles-asset', asset.id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'; });
      row.addEventListener('dblclick', () => this.previewAsset(asset)); list.append(row);
    }
    if (matches.length > 200) list.append(element('p', 'cd-hint', 'Показаны первые 200. Уточните поиск.'));
  }

  private duration(): number { return Math.max(10, sceneDuration(this.options.getProject(), this.sceneId)); }

  private visibleClips(): Clip[] {
    return this.options.getProject().clips.filter(c => c.sceneId === this.sceneId && (this.selectedEvent === '__all' || !c.event || c.event === this.selectedEvent));
  }

  private renderTimeline(): void {
    const previous = this.timeline.querySelector<HTMLElement>('.cd-timeline-scroll');
    const scrollLeft = previous?.scrollLeft || 0, scrollTop = previous?.scrollTop || 0;
    this.timeline.replaceChildren();
    const resize = element('div', 'cd-resize'); resize.title = 'Изменить высоту монтажного стола'; resize.addEventListener('pointerdown', event => this.resizeTimeline(event));
    const tools = element('div', 'cd-timeline-tools');
    tools.append(element('strong', '', 'МОНТАЖ'), button('Копировать', () => this.copy()), button('Вставить', () => this.paste()), button('Дублировать', () => this.duplicate()), button('Удалить клипы', () => this.deleteSelected()), button('Убрать здесь', () => this.endSelectedAtCursor()));
    tools.append(element('span', 'cd-hint', 'Shift — несколько клипов · края — обрезка · Alt — без магнита'));
    const scroll = element('div', 'cd-timeline-scroll');
    const content = element('div', 'cd-timeline-content');
    const width = Math.max(720, (this.duration() + 5) * this.pixelsPerSecond);
    content.style.setProperty('--cd-lane-width', `${width}px`);
    const ruler = element('div', 'cd-ruler-row'); const name = element('div', 'cd-ruler-label', 'ДОРОЖКИ');
    const ticks = element('div', 'cd-ruler'); ticks.style.width = `${width}px`;
    const step = this.pixelsPerSecond >= 70 ? 1 : this.pixelsPerSecond >= 18 ? 5 : 15;
    for (let at = 0; at < width / this.pixelsPerSecond; at += step) { const tick = element('span', 'cd-tick', time(at).slice(0, -3)); tick.style.left = `${at * this.pixelsPerSecond}px`; ticks.append(tick); }
    ticks.addEventListener('pointerdown', event => this.scrub(event, ticks)); ruler.append(name, ticks); content.append(ruler);
    this.lanes.replaceChildren();
    const p = this.options.getProject(), clips = this.visibleClips();
    for (const track of [...p.tracks].sort((a, b) => a.order - b.order)) {
      const row = element('div', `cd-track-row${track.locked ? ' cd-locked' : ''}`); row.dataset.trackId = track.id;
      const controls = element('div', 'cd-track-controls');
      const title = button(`${track.id} · ${track.label}`, () => { this.selectedTrack = track.id; this.selectedAsset = ''; this.selected.clear(); this.tab = 'clip'; this.renderInspector(); }); title.className = 'cd-track-title';
      controls.append(title);
      for (const [key, text, help] of [['locked', 'L', 'Заблокировать дорожку'], [AUDIO.has(track.kind) ? 'muted' : 'hidden', AUDIO.has(track.kind) ? 'M' : 'H', AUDIO.has(track.kind) ? 'Выключить звук дорожки' : 'Скрыть визуальный слой']] as const) {
        const b = button(text, () => this.mutate('Настройка дорожки', next => { const t = next.tracks.find(t => t.id === track.id)!; t[key] = !t[key]; }), help);
        b.className = 'cd-track-switch'; b.setAttribute('aria-pressed', String(Boolean(track[key]))); controls.append(b);
      }
      if (AUDIO.has(track.kind)) {
        const solo = button('S', () => this.soloTrack(track.id), 'Соло дорожки'); solo.className = 'cd-track-switch'; solo.setAttribute('aria-pressed', String(this.soloTrackId === track.id)); controls.append(solo);
      }
      const lane = element('div', 'cd-lane'); lane.style.width = `${width}px`; lane.dataset.trackId = track.id;
      lane.addEventListener('pointerdown', event => { if (event.target === lane) { this.selected.clear(); this.selectedTrack = track.id; this.scrub(event, lane); this.renderInspector(); this.updateSelection(); } });
      lane.addEventListener('dragover', event => { if (!track.locked && event.dataTransfer?.types.includes('application/x-chronicles-asset')) { event.preventDefault(); lane.classList.add('cd-drop-target'); } });
      lane.addEventListener('dragleave', () => lane.classList.remove('cd-drop-target'));
      lane.addEventListener('drop', event => { event.preventDefault(); lane.classList.remove('cd-drop-target'); const id = event.dataTransfer?.getData('application/x-chronicles-asset'); if (id && !track.locked) this.dropAsset(id, track, Math.max(0, (event.clientX - lane.getBoundingClientRect().left) / this.pixelsPerSecond)); });
      for (const clip of clips.filter(c => c.trackId === track.id)) lane.append(this.clipElement(p, clip, track));
      const cursor = element('div', 'cd-playhead'); lane.append(cursor); row.append(controls, lane); this.lanes.append(row);
    }
    content.append(this.lanes); scroll.append(content); this.timeline.append(resize, tools, scroll);
    scroll.scrollLeft = scrollLeft; scroll.scrollTop = scrollTop; this.updateCursor();
  }

  private clipElement(p: Project, clip: Clip, track: Track): HTMLElement {
    const range = clipRange(p, clip), start = Math.max(0, range?.start || 0), length = range ? Math.max(0, range.end - range.start) : 0;
    const el = element('div', `cd-clip cd-kind-${clip.kind}${this.selected.has(clip.id) ? ' cd-selected' : ''}${clip.enabled === false ? ' cd-disabled' : ''}${!range ? ' cd-unresolved' : ''}`);
    el.dataset.clipId = clip.id; el.tabIndex = 0; el.setAttribute('role', 'button');
    el.style.left = `${start * this.pixelsPerSecond}px`; el.style.width = `${Math.max(length * this.pixelsPerSecond, clip.kind === 'interactive' ? 28 : 24)}px`;
    const title = clip.label || clip.title || p.utterances.find(u => u.id === clip.utteranceId)?.text || p.assets.find(a => a.id === clip.assetId)?.label || clip.id;
    el.title = `${title}\n${range ? `${time(range.start)} — ${time(range.end)}` : 'Не разрешена привязка'}${clip.event ? `\n${clip.event}` : ''}`;
    el.setAttribute('aria-label', `${title}. ${el.title.split('\n')[1]}`);
    el.append(element('span', 'cd-clip-label', `${clip.kind === 'interactive' ? '◇ ' : ''}${title}`));
    if (!length) el.append(element('span', 'cd-point-label', clip.kind === 'interactive' ? 'Остановка' : 'Нет длительности'));
    for (const side of ['left', 'right'] as const) { const handle = element('span', `cd-handle cd-handle-${side}`); handle.dataset.edge = side; handle.setAttribute('aria-hidden', 'true'); el.append(handle); }
    el.addEventListener('pointerdown', event => this.startClipDrag(event, clip, track));
    el.addEventListener('dblclick', () => { this.selected = new Set([clip.id]); this.tab = clip.utteranceId ? 'speech' : 'clip'; this.renderInspector(); const r = clipRange(this.options.getProject(), clip); this.currentTime = r?.start || 0; this.options.onSeek(this.sceneId, this.currentTime, clip.event); });
    el.addEventListener('keydown', event => { if (event.key === 'Enter') { this.selected = new Set([clip.id]); this.tab = 'clip'; this.renderInspector(); this.updateSelection(); } });
    return el;
  }

  private updateCursor(): void {
    this.clock.textContent = time(this.currentTime);
    for (const cursor of this.timeline.querySelectorAll<HTMLElement>('.cd-playhead')) cursor.style.left = `${this.currentTime * this.pixelsPerSecond}px`;
  }

  private updateSelection(): void {
    for (const el of this.timeline.querySelectorAll<HTMLElement>('[data-clip-id]')) el.classList.toggle('cd-selected', this.selected.has(el.dataset.clipId!));
  }

  private scrub(event: PointerEvent, lane: HTMLElement): void {
    if (event.button !== 0) return;
    const at = Math.max(0, (event.clientX - lane.getBoundingClientRect().left) / this.pixelsPerSecond);
    this.currentTime = number(at); this.updateCursor(); this.options.onSeek(this.sceneId, this.currentTime, this.selectedEvent && this.selectedEvent !== '__all' ? this.selectedEvent : undefined);
  }

  private snapTime(at: number, exclude: Set<string>, p: Project): number {
    if (!this.snap) return at;
    const candidates = [0, ...utteranceRanges(p, this.sceneId).flatMap(r => [r.start, r.end])];
    for (const clip of p.clips.filter(c => c.sceneId === this.sceneId && !exclude.has(c.id))) { const r = clipRange(p, clip); if (r) candidates.push(r.start, r.end); }
    for (const r of utteranceRanges(p, this.sceneId)) {
      const utterance = p.utterances.find(u => u.id === r.id);
      const sourceIn = p.clips.find(c => c.sceneId === this.sceneId && c.kind === 'voice' && c.utteranceId === r.id)?.sourceIn || 0;
      for (const w of utterance?.words || []) candidates.push(r.start + w.start - sourceIn, r.start + w.end - sourceIn);
    }
    let best = at, distance = 9 / this.pixelsPerSecond;
    for (const candidate of candidates) if (candidate >= 0 && Math.abs(at - candidate) < distance) { best = candidate; distance = Math.abs(at - candidate); }
    return best;
  }

  private startClipDrag(event: PointerEvent, clip: Clip, track: Track): void {
    if (event.button !== 0) return; event.stopPropagation();
    if (event.shiftKey || event.metaKey || event.ctrlKey) { if (this.selected.has(clip.id)) this.selected.delete(clip.id); else this.selected.add(clip.id); }
    else if (!this.selected.has(clip.id)) this.selected = new Set([clip.id]);
    this.selectedTrack = ''; this.selectedAsset = ''; this.tab = 'clip'; this.updateSelection(); this.renderInspector();
    if (track.locked || !this.selected.has(clip.id)) return;
    if (clip.kind === 'interactive') { this.inform('Остановка перемещается между сценами во вкладке «Маршрут»; её ожидание не занимает секунды.'); return; }
    const before = clone(this.options.getProject()), origin = clipRange(before, clip);
    if (!origin) { this.inform('Сначала восстановите привязку клипа в инспекторе', true); return; }
    const edge = (event.target as HTMLElement).dataset.edge;
    const mode: DragMode = edge === 'left' || edge === 'right' ? edge : 'move';
    const ids = mode === 'move' ? new Set([...this.selected].filter(id => !before.tracks.find(t => t.id === before.clips.find(c => c.id === id)?.trackId)?.locked)) : new Set([clip.id]);
    const selected = before.clips.filter(c => ids.has(c.id));
    const x = event.clientX; let next = before, moved = false;
    this.dragActive = true; this.host.classList.add('cd-dragging');
    const update = (move: PointerEvent) => {
      if(!moved&&Math.abs(move.clientX-x)<=2)return;
      let delta = (move.clientX - x) / this.pixelsPerSecond;
      const anchor = mode === 'right' ? origin.end : origin.start;
      if (!move.altKey) delta = this.snapTime(anchor + delta, ids, before) - anchor;
      if (mode === 'move') {
        const earliest = Math.min(...selected.map(c => clipRange(before, c)?.start ?? 0)); delta = Math.max(-earliest, delta);
      } else if (mode === 'left') delta = Math.max(-origin.start, AUDIO.has(clip.kind) ? -(clip.sourceIn || 0) : -Infinity, Math.min(delta, Math.max(0, origin.end - origin.start - .02)));
      else delta = Math.max(-(origin.end - origin.start) + .02, delta);
      next = clone(before); moved = moved || Math.abs(move.clientX - x) > 2;
      next.clips = next.clips.map(c => {
        if (!ids.has(c.id)) return c;
        const r = clipRange(before, c)!;
        const asset = before.assets.find(a => a.id === c.assetId), u = before.utterances.find(u => u.id === c.utteranceId);
        return editClipRange(c, r, mode, delta, asset?.duration ?? u?.duration);
      });
      if (this.ripple && mode !== 'move') {
        const updated = clipRange(next, next.clips.find(c => c.id === clip.id)!);
        const shift = updated ? updated.end - origin.end : 0;
        for (const c of next.clips.filter(c => c.sceneId === this.sceneId && !ids.has(c.id) && c.start.type === 'scene' && c.start.offset >= origin.end && !next.tracks.find(t => t.id === c.trackId)?.locked)) { c.start.offset = number(c.start.offset + shift); if (c.end?.type === 'scene') c.end.offset = number(c.end.offset + shift); }
      }
      for (const el of this.timeline.querySelectorAll<HTMLElement>('[data-clip-id]')) {
        const c = next.clips.find(c => c.id === el.dataset.clipId); if (!c) continue; const r = clipRange(next, c); if (!r) continue;
        el.style.left = `${Math.max(0, r.start) * this.pixelsPerSecond}px`; el.style.width = `${Math.max(24, (r.end - r.start) * this.pixelsPerSecond)}px`;
      }
      this.inform(`${mode === 'move' ? 'Перемещение' : 'Обрезка'} · ${time(Math.max(0, anchor + delta))}${this.ripple ? ' · сдвиг следующих' : ''}`);
    };
    const finish = () => { cleanup(); if (moved) this.applyProject(next, mode === 'move' ? 'Перемещение клипов' : 'Обрезка клипа', before); else this.updateSelection(); };
    const cancel = (key: KeyboardEvent) => { if (key.key === 'Escape') { key.preventDefault(); cleanup(); this.refresh(); this.inform('Перетаскивание отменено'); } };
    const cleanup = () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); window.removeEventListener('keydown', cancel); this.dragActive = false; this.host.classList.remove('cd-dragging'); this.dragCleanup = undefined; };
    this.dragCleanup = cleanup; window.addEventListener('pointermove', update); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true }); window.addEventListener('keydown', cancel);
  }

  private resizeTimeline(event: PointerEvent): void {
    event.preventDefault();
    const update = (move: PointerEvent) => { const h = Math.max(190, Math.min(window.innerHeight - 190, window.innerHeight - move.clientY)); this.host.style.setProperty('--cd-timeline-height', `${h}px`); document.body.style.setProperty('--chronicles-director-timeline-height', `${h}px`); };
    const finish = () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', finish); };
    window.addEventListener('pointermove', update); window.addEventListener('pointerup', finish, { once: true });
  }

  private renderInspector(): void {
    const scroll = this.inspector.scrollTop; this.inspector.replaceChildren();
    const tabs = element('div', 'cd-tabs');
    for (const [id, title] of [['clip', 'Клип'], ['speech', 'Речь'], ['game', 'Игра'], ['music','Музыка'], ['route', 'Маршрут'], ['source', 'Текст'], ['diagnostics', 'Проверка']] as [InspectorTab, string][]) {
      const b = button(title, () => { this.tab = id; this.renderInspector(); }); b.classList.toggle('cd-active', this.tab === id); tabs.append(b);
    }
    this.inspector.append(tabs); const body = element('div', 'cd-inspector-body'); this.inspector.append(body);
    if (this.tab === 'clip') this.inspectClip(body);
    if (this.tab === 'speech') this.inspectSpeech(body);
    if (this.tab === 'music') this.inspectMusic(body);
    if (this.tab === 'game') this.inspectGame(body);
    if (this.tab === 'route') this.inspectRoute(body);
    if (this.tab === 'source') this.inspectSource(body);
    if (this.tab === 'diagnostics') this.inspectDiagnostics(body);
    this.inspector.scrollTop = scroll;
  }

  private input(value: string | undefined, update: (value: string) => void, multiline = false): HTMLInputElement | HTMLTextAreaElement {
    const input = multiline ? element('textarea') : element('input'); input.value = value || '';
    if (multiline) (input as HTMLTextAreaElement).rows = 4;
    input.addEventListener('change', () => update(input.value)); return input;
  }

  private numeric(value: number | undefined, update: (value: number | undefined) => void, min?: number, max?: number): HTMLInputElement {
    const input = element('input'); input.type = 'number'; input.step = '.01'; input.value = value === undefined ? '' : String(number(value)); if (min !== undefined) input.min = String(min); if (max !== undefined) input.max = String(max);
    input.addEventListener('change', () => { const n = input.value === '' ? undefined : Number(input.value); if (n !== undefined && (!Number.isFinite(n) || min !== undefined && n < min || max !== undefined && n > max)) { this.inform('Число вне допустимого диапазона', true); input.value = value === undefined ? '' : String(value); return; } update(n); }); return input;
  }

  private clipChange(id: string, title: string, change: (clip: Clip) => void): void { this.mutate(title, next => { const clip = next.clips.find(c => c.id === id); if (clip && !next.tracks.find(t => t.id === clip.trackId)?.locked) change(clip); }); }

  private inspectMusic(body:HTMLElement):void{
    const p=this.options.getProject(),scene=p.scenes.find(s=>s.id===this.sceneId),m=this.options.music;
    body.append(element('h3','','Музыкальная режиссура'),element('p','cd-hint','T — нагнетание · P — передышка · X — стоп · [ / ] — сдвиг выбранного cue на секунду. Все команды отменяются Ctrl+Z и сохраняются в текст проекта.'));
    body.append(element('h4','','Исходная заставка'),button('Desolate Cry',()=>m.onIntro('desolate_cry')),button('Titan Forge',()=>m.onIntro('titan_forge')));
    for(const category of ['dread','peace'] as const){const options=category==='dread'?m.dread:m.peace;body.append(label(category==='dread'?'Нагнетание · T':'Передышка · P',select(options.map(o=>({value:o.key,label:o.name})),m.selected(category),value=>m.onSelect(category,value))),button('Вставить в точке курсора',()=>m.onCue(category)));}
    body.append(button('Стоп / Fade Out · X',()=>m.onCue('stop')));
    if(scene){const current=scene.transition?.type??'cut';body.append(element('h4','','Переход в текущую сцену'),label('Оптический переход',select([{value:'cut',label:'Склейка'},{value:'line_lr',label:'Слева направо'},{value:'line_rl',label:'Справа налево'},{value:'line_tb',label:'Сверху вниз'},{value:'circle_iris',label:'Диафрагма по центру'},{value:'circle_iris_corner',label:'Диафрагма из угла'}],current,value=>this.mutate('Вид оптического перехода',next=>{const target=next.scenes.find(s=>s.id===scene.id)!;target.transition={...target.transition,type:value as NonNullable<Scene['transition']>['type'],duration:target.transition?.duration??2.4};}))),label('Длительность перехода, с',this.numeric(scene.transition?.duration??2.4,value=>this.mutate('Длительность перехода',next=>{const target=next.scenes.find(s=>s.id===scene.id)!;target.transition={type:target.transition?.type??'line_lr',...target.transition,duration:value??2.4};}),.1,10)));
      const clip=p.clips.find(c=>c.id===`transition.${scene.id}`),key=scene.transition?.randomSound?'random':p.assets.find(a=>a.id===clip?.assetId)?.key??'random';body.append(label('Звук перехода',select(m.transitions.map(o=>({value:o.key,label:o.name})),key,value=>m.onTransition(value,scene.id))),button('Прослушать переход',()=>m.onTest(key)));
    }
    body.append(button('Копировать музыку как JSON',()=>m.onExport()),button('Восстановить музыку открытого файла',()=>m.onReset()));
  }

  private inspectClip(body: HTMLElement): void {
    const p = this.options.getProject();
    if (this.selectedTrack && !this.selected.size) { this.inspectTrack(body, p.tracks.find(t => t.id === this.selectedTrack)); return; }
    if (this.selectedAsset && !this.selected.size) { const a = p.assets.find(a => a.id === this.selectedAsset); if (a) { body.append(element('h3', '', a.label || a.id), element('p', 'cd-hint', a.path || a.key || a.id), button('Предпросмотр ресурса', () => this.previewAsset(a)), button('Добавить в точке курсора', () => { const track = p.tracks.find(t => t.id === this.selectedTrack && !t.locked) || p.tracks.find(t => !t.locked && (a.kind === 'audio' ? t.kind === 'audio' : t.kind === 'image')); if (track) this.dropAsset(a.id, track, this.currentTime); })); } return; }
    const clip = p.clips.find(c => this.selected.has(c.id));
    if (!clip) { this.inspectScene(body, p.scenes.find(s => s.id === this.sceneId)); body.append(element('p', 'cd-hint', 'Выберите клип на дорожке для изменения параметров.')); return; }
    body.append(element('h3', '', this.selected.size > 1 ? `${this.selected.size} клипов · параметры первого` : 'Параметры клипа'), element('p', 'cd-id', clip.id));
    if (clip.kind === 'interactive') {
      body.append(element('p', 'cd-hint', 'Живой блок и игра — узлы маршрута. Они перемещаются вместе с переходами; длительность ожидания неизвестна.'), button('Изменить положение в маршруте', () => { this.tab = 'route'; this.renderInspector(); }), button('Изменить игру и живой блок', () => { this.tab = 'game'; this.renderInspector(); }));
      return;
    }
    const update = (title: string, fn: (c: Clip) => void) => this.clipChange(clip.id, title, fn);
    body.append(label('Название', this.input(clip.label, value => update('Название клипа', c => { c.label = value; }))));
    body.append(label('Дорожка', select(p.tracks.map(t => ({ value: t.id, label: `${t.id} · ${t.label}` })), clip.trackId, value => update('Дорожка клипа', c => { c.trackId = value; }))));
    body.append(label('Тип', select(KINDS.map(k => ({ value: k, label: k })), clip.kind, value => update('Тип клипа', c => { c.kind = value as TrackKind; }))));
    body.append(label('Ресурс', select([{ value: '', label: 'Без ресурса' }, ...p.assets.map(a => ({ value: a.id, label: a.label || a.key || a.id }))], clip.assetId || '', value => update('Ресурс клипа', c => { if (value) c.assetId = value; else delete c.assetId; }))));
    body.append(this.toggle('Клип включён', clip.enabled !== false, value => update('Видимость клипа', c => { c.enabled = value; })));
    this.inspectRef(body, 'Начало', clip.start, ref => update('Начало клипа', c => { c.start = ref; }));
    const r = clipRange(p, clip); body.append(element('p', 'cd-hint', r ? `${time(r.start)} → ${time(r.end)}` : 'Привязка не разрешена. Выберите существующую реплику/слово.'));
    if (clip.end) { this.inspectRef(body, 'Конец', clip.end, ref => update('Конец клипа', c => { c.end = ref; })); body.append(button('Задать длительностью', () => update('Тип конца клипа', c => { c.duration = r ? Math.max(0, r.end - r.start) : 0; delete c.end; }))); }
    else { body.append(label('Длительность, с', this.numeric(clip.duration, value => update('Длительность клипа', c => { c.duration = value; }), 0)), button('Привязать конец', () => update('Привязка конца', c => { c.end = { type: 'scene', offset: r?.end || 0 }; }))); }
    body.append(label('Условие / событие', this.input(clip.event, value => update('Событие клипа', c => { if (value.trim()) c.event = value.trim(); else delete c.event; }))));
    body.append(label('Связанная реплика', select([{ value: '', label: 'Нет' }, ...p.utterances.map(u => ({ value: u.id, label: `${u.id} · ${u.text.slice(0, 45)}` }))], clip.utteranceId || '', value => update('Реплика клипа', c => { if (value) c.utteranceId = value; else delete c.utteranceId; }))));
    if (clip.kind !== 'audio' || clip.assetId) for (const [key, title] of [['fadeIn', 'Плавный вход, с'], ['fadeOut', 'Плавный выход, с']] as const) body.append(label(title, this.numeric(clip[key], value => update(title, c => { c[key] = value; }), 0)));
    if (AUDIO.has(clip.kind)) {
      if (clip.kind === 'audio' && !clip.assetId) {
        const command = clip.audioCommand;
        body.append(element('h4', '', 'Управление музыкальным каналом'), label('Действие', select([{ value: '', label: 'Без команды' }, { value: 'silence', label: 'Тишина' }, { value: 'duck', label: 'Приглушить' }], command?.action || '', value => update('Звуковая команда', c => {
          if (!value) delete c.audioCommand;
          else c.audioCommand = { ...c.audioCommand, action: value as 'silence' | 'duck', channel: c.audioCommand?.channel || p.tracks.find(t => t.id === c.trackId)?.channel || 'BASE' };
        }))));
        if (command) {
          const channels = ['BASE', 'DREAD', 'PEACE', 'GAME_THINK', 'ALL_MUSIC'];
          if (!channels.includes(command.channel)) channels.push(command.channel);
          body.append(label('Канал команды', select(channels.map(value => ({ value, label: value === 'ALL_MUSIC' ? 'ALL_MUSIC · вся музыка' : value })), command.channel, value => update('Канал звуковой команды', c => { if (c.audioCommand) c.audioCommand.channel = value; }))));
          if (command.action === 'duck') {
            const ceiling = this.numeric(command.gain, value => update('Потолок приглушения', c => { if (c.audioCommand) { if (value === undefined) delete c.audioCommand.gain; else c.audioCommand.gain = value; } }), 0, 1);
            ceiling.step = '.001'; ceiling.placeholder = '0.05';
            body.append(label('Потолок громкости до мастер-регулятора', ceiling));
          }
          body.append(element('p', 'cd-hint', 'Команда действует до конца этого клипа. Новый музыкальный источник на канале отменяет более раннюю команду. ALL_MUSIC сохраняет голос и звуковые эффекты. Приглушение без значения — 0.05.'));
        }
      }
      if (clip.kind !== 'audio' || clip.assetId) {
      body.append(label('Громкость · 1 = 100%', this.numeric(clip.gain, value => update('Громкость клипа', c => { c.gain = value; }), 0, 3)), this.toggle('Повторять по кругу', Boolean(clip.loop), value => update('Петля звука', c => { c.loop = value; })));
      if (clip.kind !== 'voice') {
        const duck = this.numeric(clip.duckBaseTo, value => update('Приглушение базовой атмосферы', c => { if (value === undefined) delete c.duckBaseTo; else c.duckBaseTo = value; }), 0, 1);
        duck.step = '.001'; duck.placeholder = 'Без дополнительного приглушения';
        body.append(label('BASE под этим cue · потолок 0–1', duck), element('p', 'cd-hint', 'Для DREAD/PEACE и SFX. 0 — тишина BASE, 0.005 — слабый фон. Пустое поле сохраняет обычный микс.'));
      }
      for (const [key, title] of [['sourceIn', 'Начало в исходнике, с'], ['sourceOut', 'Конец в исходнике, с']] as const) body.append(label(title, this.numeric(clip[key], value => update(title, c => { c[key] = value; if (c.sourceOut !== undefined) c.duration = Math.max(0, c.sourceOut - (c.sourceIn || 0)); }), 0)));
      const envelope = this.input(JSON.stringify(clip.envelope || [], null, 2), () => {}, true);
      body.append(label('Огибающая: [{time, value}]', envelope), button('Применить огибающую', () => {
        try { const points = JSON.parse(envelope.value) as unknown; if (!Array.isArray(points) || points.some(v => !v || typeof v !== 'object' || !Number.isFinite(v.time) || !Number.isFinite(v.value) || v.time < 0 || v.value < 0 || v.value > 3)) throw new Error('Точки: time ≥ 0, value от 0 до 3.'); update('Огибающая громкости', c => { c.envelope = points.sort((a, b) => a.time - b.time); }); } catch (e) { this.fail(e); }
      }));
      }
    } else {
      body.append(element('h4', '', 'Размещение на экране'));
      if (clip.kind === 'frame') {
        const exposure = this.numeric(clip.cleanExposure, value => update('Чистая экспозиция кадра', c => { if (value === undefined) delete c.cleanExposure; else c.cleanExposure = value; }), 0);
        exposure.placeholder = '0';
        body.append(label('Чистый кадр до появления плашек, с', exposure), element('p', 'cd-hint', 'До конца этого интервала скриншоты, имена и экранные подписи не закрывают новый кадр. Пусто — 0 секунд.'));
      }
      if(clip.kind==='image'||clip.kind==='nameplate')body.append(label('Композиция',select([{value:'manual',label:'Вручную'},{value:clip.kind==='image'?'screenshot':'character',label:'Автоматически по экрану'}],clip.layout??'manual',value=>update('Размещение',c=>{c.layout=value as Clip['layout'];}))));
      if(clip.kind==='nameplate')body.append(label('Аватарка',select([{value:'',label:'Без аватарки'},...p.assets.filter(a=>a.kind==='image').map(a=>({value:a.id,label:a.label??a.key??a.path??a.id}))],clip.avatarAssetId??'',value=>update('Аватарка',c=>{c.avatarAssetId=value||undefined;}))),this.toggle('Эффект печати',clip.typewriter!==false,value=>update('Эффект печати',c=>{c.typewriter=value;})));
      for (const [key, title, fallback] of [['x', 'Центр X · 0–1', .5], ['y', 'Центр Y · 0–1', .5], ['width', 'Ширина · доля экрана', 1], ['height', 'Высота · доля экрана', 1], ['scale', 'Масштаб', 1], ['opacity', 'Непрозрачность · 0–1', 1], ['rotation', 'Поворот, градусы', 0]] as const) {
        const input = this.numeric(clip.transform?.[key], value => update(title, c => { c.transform = { ...c.transform, [key]: value }; if(!['opacity'].includes(key))c.layout='manual'; }), key === 'rotation' ? undefined : 0, key === 'opacity' ? 1 : undefined); input.placeholder = String(fallback); body.append(label(title, input));
      }
      const crop = this.input(clip.transform?.crop ? JSON.stringify(clip.transform.crop) : '', () => {});
      body.append(label('Кадрирование: {x,y,width,height}', crop), button('Применить кадрирование', () => { try { const value = crop.value.trim() ? JSON.parse(crop.value) : undefined; if (value && (['x', 'y', 'width', 'height'].some(k => !Number.isFinite(value[k])) || value.width <= 0 || value.height <= 0 || value.x < 0 || value.y < 0 || value.x + value.width > 1 || value.y + value.height > 1)) throw new Error('Кадрирование задаётся долями изображения в пределах 0–1.'); update('Кадрирование', c => { c.transform = { ...c.transform, crop: value }; }); } catch (e) { this.fail(e); } }));
      body.append(label('Текст / подпись', this.input(clip.text, value => update('Текст плашки', c => { c.text = value; }), true)), label('Имя / заголовок', this.input(clip.title, value => update('Имя плашки', c => { c.title = value; }))), label('Цвет', this.input(clip.color, value => update('Цвет плашки', c => { if (/^#[0-9a-f]{3,8}$/i.test(value) || !value) c.color = value; else throw new Error('Цвет в формате #RRGGBB.'); }))));
    }
  }

  private inspectRef(body: HTMLElement, title: string, ref: TimeRef, update: (ref: TimeRef) => void,ownerSceneId=this.sceneId): void {
    const p = this.options.getProject(), field = element('fieldset', 'cd-ref'); field.append(element('legend', '', title));
    field.append(label('Привязка', select([{ value: 'scene', label: 'Время внутри сцены' }, { value: 'utterance', label: 'Граница реплики' }, { value: 'word', label: 'Слово в записи' }], ref.type, value => {
      const next = clone(ref); const resolved = resolveTime(p, ownerSceneId, ref); next.type = value as TimeRef['type'];
      if (next.type === 'scene') { next.offset = Math.max(0, resolved || 0); delete next.utteranceId; delete next.wordIndex; delete next.edge; }
      else { next.utteranceId ||= p.scenes.find(s => s.id === ownerSceneId)?.utteranceIds[0] || ''; next.edge ||= 'start'; next.offset = 0; if (next.type === 'word') next.wordIndex ||= 0; }
      update(next);
    })));
    if (ref.type !== 'scene') {
      const ids = p.scenes.find(s => s.id === ownerSceneId)?.utteranceIds || [];
      field.append(label('Реплика', select(ids.map(id => ({ value: id, label: `${id} · ${p.utterances.find(u => u.id === id)?.text.slice(0, 36) || ''}` })), ref.utteranceId || '', value => update({ ...ref, utteranceId: value, wordIndex: ref.type === 'word' ? 0 : undefined }))), label('Край', select([{ value: 'start', label: 'Начало' }, { value: 'end', label: 'Конец' }], ref.edge || 'start', value => update({ ...ref, edge: value as 'start' | 'end' }))));
      if (ref.type === 'word') {
        const u = p.utterances.find(u => u.id === ref.utteranceId);
        field.append(label('Слово', select((u?.words || []).map((w, i) => ({ value: String(i), label: `${i + 1}. ${w.text} · ${time(w.start)}` })), String(ref.wordIndex || 0), value => update({ ...ref, wordIndex: Number(value) }))));
        if (!u?.words?.length) field.append(element('p', 'cd-error', 'У реплики нет выравнивания слов. Сначала нужна запись и выравнивание.'));
      }
    }
    field.append(label(ref.type === 'scene' ? 'Секунды' : 'Сдвиг, с', this.numeric(ref.offset, value => update({ ...ref, offset: value ?? 0 }), ref.type === 'scene' ? 0 : undefined))); body.append(field);
  }

  private inspectTrack(body: HTMLElement, track?: Track): void {
    if (!track) return;
    body.append(element('h3', '', `Дорожка ${track.id}`));
    const change = (title: string, fn: (t: Track) => void) => this.mutate(title, p => fn(p.tracks.find(t => t.id === track.id)!));
    body.append(label('Название', this.input(track.label, value => change('Название дорожки', t => { t.label = value; }))), label('Тип', select(KINDS.map(k => ({ value: k, label: k })), track.kind, value => change('Тип дорожки', t => { t.kind = value as TrackKind; }))), label('Порядок слоя', this.numeric(track.order, value => change('Порядок дорожки', t => { t.order = value ?? 0; }), 0)), label('Канал', this.input(track.channel, value => change('Канал звука', t => { t.channel = value; }))));
    for (const [key, title] of [['locked', 'Заблокировать'], ['muted', 'Без звука'], ['hidden', 'Скрыть визуальный слой']] as const) body.append(this.toggle(title, Boolean(track[key]), value => change(title, t => { t[key] = value; })));
  }

  private inspectScene(body: HTMLElement, scene?: Scene): void {
    if (!scene) return; body.append(element('h3', '', 'Текущая сцена'), element('p', 'cd-id', scene.id));
    if(scene.opening){const source=this.input(JSON.stringify(scene.opening,null,2),()=>{},true) as HTMLTextAreaElement;source.rows=16;body.append(label('Исходная заставка · текст, ресурсы и тайминг',source),button('Применить параметры заставки',()=>{try{const settings=JSON.parse(source.value);if(!settings.disclaimerText||!Number.isFinite(settings.introEndTime)||settings.introEndTime<=0)throw new Error('Нужны текст дисклеймера и длительность заставки.');this.mutate('Параметры исходной заставки',p=>{const target=p.scenes.find(s=>s.id===scene.id)!;target.opening=settings;target.duration=settings.introEndTime;const music=p.clips.find(c=>c.sceneId===scene.id&&c.kind==='audio'&&c.assetId);if(music)music.duration=settings.introEndTime;});}catch(e){this.fail(e);}}));}
    body.append(label('Название сцены', this.input(scene.title, value => this.mutate('Название сцены', p => { p.scenes.find(s => s.id === scene.id)!.title = value; }))), label('Монтажный интервал, с', this.numeric(scene.duration, value => this.mutate('Длительность сцены', p => { p.scenes.find(s => s.id === scene.id)!.duration = value || 0; }), 0)));
    body.append(element('p', 'cd-hint', `Длительность по клипам: ${time(sceneDuration(this.options.getProject(), scene.id))}. Живое ожидание не имеет фиксированной длительности.`));
  }

  private inspectSpeech(body: HTMLElement): void {
    const p = this.options.getProject(), scene = p.scenes.find(s => s.id === this.sceneId);
    body.append(element('h3', '', 'Речь и субтитры'));
    const selectedClip = p.clips.find(c => this.selected.has(c.id));
    const ids = scene?.utteranceIds || [];
    for (const id of ids) {
      const u = p.utterances.find(u => u.id === id); if (!u) continue;
      const card = element('section', `cd-speech${selectedClip?.utteranceId === id ? ' cd-speech-selected' : ''}`);
      const r = utteranceRanges(p, this.sceneId).find(r => r.id === id);
      card.append(button(`${id} · ${r ? time(r.start) : '—'}`, () => { this.currentTime = r?.start || 0; this.options.onSeek(this.sceneId, this.currentTime, this.selectedEvent || undefined); this.updateCursor(); }));
      const text = this.input(u.text, () => {}, true); text.setAttribute('aria-label', `Текст ${id}`); card.append(text);
      card.append(button('Применить речь', () => { if (!text.value.trim()) { this.inform('Речь не может быть пустой', true); return; } const before = clone(this.options.getProject()); this.history.push({ project: before, label: 'Правка речи' }); this.future = []; this.options.onEditSpeech(id, text.value.trim()); this.refresh(); this.inform('Речь обновлена. Проверьте запись и выравнивание.'); }));
      const separate = this.toggle('Отдельный текст субтитров', u.subtitleText != null, value => this.mutate('Текст субтитров', next => { const target = next.utterances.find(x => x.id === id)!; target.subtitleText = value ? target.text : null; })); card.append(separate);
      if (u.subtitleText != null) card.append(label('Субтитры', this.input(u.subtitleText, value => { if (!value.trim()) { this.inform('Для скрытия субтитров используйте дорожку', true); return; } this.mutate('Правка субтитров', next => { next.utterances.find(x => x.id === id)!.subtitleText = value; }); }, true)));
      card.append(element('p', 'cd-hint', `${u.audioAssetId ? 'Запись назначена' : 'Нужна запись'} · ${u.words?.length || 0} выровненных слов${u.textHash && u.audioTextHash && u.textHash !== u.audioTextHash ? ' · ЗАПИСЬ УСТАРЕЛА' : ''}`)); body.append(card);
    }
    if (!ids.length) body.append(element('p', 'cd-hint', 'В этой сцене нет речевых блоков. Добавление новой реплики доступно через импорт текстового проекта.'));
  }

  private inspectGame(body: HTMLElement): void {
    const p = this.options.getProject();
    const stop = p.stops.find(s => s.gameSceneId === this.sceneId || s.handoffSceneId === this.sceneId || s.roomSceneId === this.sceneId);
    if (!stop) { body.append(element('p', 'cd-hint', 'Выберите игровую сцену или зал со вступлением.')); return; }
    body.append(element('h3', '', `Остановка ${stop.label}`), element('p', 'cd-hint', 'Служебный режим: ответы и условия видны только режиссёру.'));
    const change = (title: string, fn: (s: Stop) => void) => this.mutate(title, next => fn(next.stops.find(s => s.id === stop.id)!));
    body.append(label('Тема Толи', this.input(stop.theme, value => change('Тема живого блока', s => { s.theme = value; }))), label('Формат', select([{ value: 'choice', label: 'Выбор ответа' }, { value: 'word', label: 'Буквы / слово' }, { value: 'free', label: 'Один содержательный ответ' }], stop.game.kind, value => change('Формат игры', s => { s.game.kind = value as typeof s.game.kind; }))), label('Вопрос', this.input(stop.game.question, value => change('Вопрос игры', s => { s.game.question = value; }), true)), label('Ответ', this.input(stop.game.answer, value => change('Ответ игры', s => { s.game.answer = value; }))), label('Принимаемые формы · по одной на строку', this.input((stop.game.acceptedAnswers || []).join('\n'), value => change('Принимаемые ответы', s => { s.game.acceptedAnswers = value.split('\n').map(v => v.trim()).filter(Boolean); }), true)), label('Лимит ошибок · пусто = нет', this.numeric(stop.game.maxWrong ?? undefined, value => change('Лимит игры', s => { s.game.maxWrong = value ?? null; }), 1)), this.toggle('Первый выбор раскрывает все пункты', Boolean(stop.game.revealAll), value => change('Раскрытие игры', s => { s.game.revealAll = value; })));
    for (const [key, title] of [['handoffSceneId', 'Передача слова'], ['gameSceneId', 'Игровая сцена'], ['roomSceneId', 'Зал продолжения']] as const) body.append(label(title, select(p.scenes.map(s => ({ value: s.id, label: s.title })), stop[key], value => change(title, s => { s[key] = value; }))));
    const json = this.input(JSON.stringify(stop.game, null, 2), () => {}, true) as HTMLTextAreaElement; json.rows = 12;
    body.append(label('Все параметры и ветки игры · JSON', json), button('Применить параметры игры', () => {
      try {
        const value = JSON.parse(json.value) as typeof stop.game;
        const strings = (item: unknown): item is string[] => Array.isArray(item) && item.every(v => typeof v === 'string');
        if (!value || value.id !== stop.game.id || !['choice', 'word', 'free'].includes(value.kind) || typeof value.question !== 'string' || !strings(value.introIds) || !value.reactions || typeof value.reactions !== 'object' || Array.isArray(value.reactions) || Object.values(value.reactions).some(v => !strings(v))) throw new Error('Сохраните ID игры; introIds и все реакции должны быть массивами ID реплик.');
        if (value.options !== undefined && (!Array.isArray(value.options) || value.options.some(v => !v || typeof v.id !== 'string' || typeof v.text !== 'string' || v.correct !== undefined && typeof v.correct !== 'boolean'))) throw new Error('Варианты игры: массив объектов id/text/correct.');
        if (value.acceptedAnswers !== undefined && !strings(value.acceptedAnswers)) throw new Error('Принимаемые ответы должны быть массивом строк.');
        if (value.answer !== undefined && typeof value.answer !== 'string' || value.maxWrong != null && (!Number.isInteger(value.maxWrong) || value.maxWrong < 1) || value.revealAll !== undefined && typeof value.revealAll !== 'boolean') throw new Error('Проверьте тип ответа, лимит попыток и revealAll.');
        change('Параметры игры', s => { s.game = value; });
      } catch (e) { this.fail(e); }
    }));
  }

  private inspectRoute(body: HTMLElement): void {
    const p = this.options.getProject(); body.append(element('h3', '', 'Порядок показа'), element('p', 'cd-hint', 'Перемещение узла сохраняет ID сцен, клипы и локальные привязки.'));
    p.sequence.forEach((node, index) => {
      const row = element('div', 'cd-route-row');
      const title = node.kind === 'scene' ? p.scenes.find(s => s.id === node.sceneId)?.title || node.sceneId : `◇ ${p.stops.find(s => s.id === node.stopId)?.label || node.stopId}`;
      row.append(element('span', '', `${index + 1}. ${title}`));
      for (const [offset, text] of [[-1, '↑'], [1, '↓']] as const) { const b = button(text, () => this.mutate('Порядок маршрута', next => { const target = index + offset; if (target >= 0 && target < next.sequence.length) [next.sequence[index], next.sequence[target]] = [next.sequence[target], next.sequence[index]]; })); b.disabled = index + offset < 0 || index + offset >= p.sequence.length; row.append(b); }
      body.append(row);
    });
    body.append(element('h3','','Наклейки навигации'));
    for(const cue of p.navigation??[]){const card=element('article','cd-speech-card');card.append(label('Подсказка',this.input(cue.title,value=>this.mutate('Подсказка навигации',next=>{next.navigation!.find(c=>c.id===cue.id)!.title=value;}))),label('Целевая сцена',select(p.scenes.filter(s=>s.kind!=='game'&&s.kind!=='handoff').map(s=>({value:s.id,label:s.title})),cue.sceneId,value=>this.mutate('Адрес наклейки',next=>{const target=next.navigation!.find(c=>c.id===cue.id)!;target.sceneId=value;target.at={type:'scene',offset:0};}))));this.inspectRef(card,'Точка перехода',cue.at,ref=>this.mutate('Привязка навигации',next=>{next.navigation!.find(c=>c.id===cue.id)!.at=ref;}),cue.sceneId);card.append(button('Показать точку',()=>{const at=resolveTime(this.options.getProject(),cue.sceneId,cue.at);if(at!==null){this.sceneId=cue.sceneId;this.currentTime=at;this.options.onSeek(cue.sceneId,at);this.refresh();}}));body.append(card);}
  }

  private inspectSource(body: HTMLElement): void {
    body.append(element('h3', '', 'Единый текстовый проект'), element('p', 'cd-hint', 'Речь и встроенный chronicles-config. Применение изменяет открытый проект; Ctrl+S сохраняет файл.'));
    const source = element('textarea', 'cd-source'); source.rows = 22; source.spellcheck = false; source.value = this.options.getMarkdown(); source.setAttribute('aria-label', 'Markdown проекта');
    body.append(source, button('Применить текст проекта', () => void this.importDocument(source.value)));
  }

  private inspectDiagnostics(body: HTMLElement): void {
    const diagnostics = this.options.diagnostics();
    body.append(element('h3', '', `Проверка · ${diagnostics.length}`));
    if (!diagnostics.length) body.append(element('p', 'cd-success', 'Ошибок модели не найдено.'));
    for (const d of diagnostics) {
      const item = element('div', `cd-diagnostic cd-diagnostic-${d.severity}`);
      item.append(element('strong', '', d.severity === 'error' ? 'Ошибка' : 'Проверить'), element('p', '', d.message));
      if (d.id) item.append(button(d.id, () => {
        const p = this.options.getProject(), clip = p.clips.find(c => c.id === d.id || c.utteranceId === d.id);
        if (clip) { this.sceneId = clip.sceneId; this.selected = new Set([clip.id]); this.selectedEvent = clip.event || ''; this.tab = clip.utteranceId === d.id ? 'speech' : 'clip'; const r = clipRange(p, clip); this.currentTime = r?.start || 0; this.options.onSeek(this.sceneId, this.currentTime, clip.event); this.refresh(); }
      })); body.append(item);
    }
  }

  private mutate(title: string, action: (project: Project) => void): void {
    try { const before = clone(this.options.getProject()), next = clone(before); action(next); this.applyProject(next, title, before); } catch (e) { this.fail(e); }
  }

  private applyProject(next: Project, title: string, before = clone(this.options.getProject())): void {
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    this.history.push({ project: before, label: title }); if (this.history.length > 60) this.history.shift(); this.future = [];
    this.options.onChange(clone(next), title); this.inform(title); this.refresh();
  }

  private updateDirty(): void {
    const dirty = this.options.getMarkdown() !== this.savedSnapshot;
    this.host.dataset.dirty = String(dirty);
    const b = this.header.querySelector<HTMLButtonElement>('[data-action=save]'); if (b) { b.textContent = this.saving ? 'Сохраняется…' : dirty ? 'Сохранить ●' : 'Сохранить'; b.disabled = this.saving; }
  }

  private undo(): void {
    const prior = this.history.pop(); if (!prior) return;
    this.future.push({ project: clone(this.options.getProject()), label: prior.label }); this.options.onChange(clone(prior.project), `Отмена: ${prior.label}`); this.refresh(); this.inform(`Отменено: ${prior.label}`);
  }

  private redo(): void {
    const next = this.future.pop(); if (!next) return;
    this.history.push({ project: clone(this.options.getProject()), label: next.label }); this.options.onChange(clone(next.project), `Повтор: ${next.label}`); this.refresh(); this.inform(`Повторено: ${next.label}`);
  }

  private async save(): Promise<void> {
    if (this.saving) return; this.saving = true; this.updateDirty();
    const snapshot = this.options.getMarkdown();
    try { await this.options.onSave(); this.savedSnapshot = snapshot; this.inform('Сохранение проекта подтверждено'); } catch (e) { this.fail(e); } finally { this.saving = false; this.updateDirty(); }
  }

  private async importDocument(text: string): Promise<void> {
    try { await this.options.onImport(text); this.history = []; this.future = []; this.soloTrackId = ''; this.soloMuteStates.clear(); this.sceneId = this.options.getProject().scenes[0]?.id || ''; this.selected.clear(); this.selectedEvent = ''; this.refresh(); this.inform('Проект открыт; начата новая история монтажа. Сохранение в файл — отдельно.'); } catch (e) { this.fail(e); }
  }

  private fail(error: unknown): void { this.inform(error instanceof Error ? error.message : String(error), true); }

  private addTrack(): void {
    const id = freshId('TRACK'); this.selectedTrack = id; this.selected.clear(); this.selectedAsset = ''; this.tab = 'clip';
    this.mutate('Новая дорожка', p => { p.tracks.push({ id, label: 'Новая дорожка', kind: 'image', order: Math.max(0, ...p.tracks.map(t => t.order)) + 1 }); });
  }

  private dropAsset(assetId: string, track: Track, at: number): void {
    const p = this.options.getProject(), asset = p.assets.find(a => a.id === assetId); if (!asset || track.locked) return;
    if (asset.kind === 'audio' && !AUDIO.has(track.kind) || asset.kind !== 'audio' && AUDIO.has(track.kind)) { this.inform('Аудио перетаскивается на звуковую дорожку, изображение — на визуальную', true); return; }
    const id = freshId('clip'), start = this.snapTime(at, new Set(), p);
    this.selected = new Set([id]); this.selectedAsset = ''; this.selectedTrack = ''; this.tab = 'clip';
    this.mutate('Добавлен ресурс на дорожку', next => { next.clips.push({ id, sceneId: this.sceneId, trackId: track.id, kind: track.kind, assetId, start: { type: 'scene', offset: number(start) }, duration: asset.kind === 'audio' || asset.kind === 'video' ? asset.duration || 0 : 3, label: asset.label || asset.key || asset.id, event: this.selectedEvent && this.selectedEvent !== '__all' ? this.selectedEvent : undefined, gain: asset.kind === 'audio' ? 1 : undefined }); });
  }

  private addTextClip(): void {
    const p = this.options.getProject(), track = p.tracks.find(t => t.kind === 'screen' && !t.locked); if (!track) { this.inform('Создайте незаблокированную дорожку screen', true); return; }
    const id = freshId('text'); this.selected = new Set([id]); this.selectedTrack = ''; this.selectedAsset = ''; this.tab = 'clip';
    this.mutate('Новая экранная подпись', next => { next.clips.push({ id, sceneId: this.sceneId, trackId: track.id, kind: 'screen', label: 'Экранная подпись', text: 'Новая подпись', start: { type: 'scene', offset: this.currentTime }, duration: 3, transform: { x: .5, y: .3, width: .6, opacity: 1 } }); });
  }

  private openGameInspector(): void {
    const p = this.options.getProject();
    if (!p.stops.some(s => [s.gameSceneId, s.handoffSceneId, s.roomSceneId].includes(this.sceneId))) this.sceneId = p.stops[0]?.gameSceneId || this.sceneId;
    this.selected.clear(); this.selectedEvent = ''; this.tab = 'game'; this.currentTime = 0;
    this.options.onSeek(this.sceneId, 0); this.refresh();
  }

  private copy(): void { this.clipboard = clone(this.options.getProject().clips.filter(c => this.selected.has(c.id))); this.inform(`Скопировано клипов: ${this.clipboard.length}`); }

  private paste(): void {
    if (!this.clipboard.length) return;
    const p = this.options.getProject();
    const origin = Math.min(...this.clipboard.map(c => clipRange(p, c)?.start || 0)), ids = new Set<string>();
    this.mutate('Вставка клипов', next => { for (const original of this.clipboard) { const track = next.tracks.find(t => t.id === original.trackId); if (!track || track.locked) continue; const c = clone(original), r = clipRange(p, original); c.id = freshId(original.id); c.sceneId = this.sceneId; c.start = { type: 'scene', offset: number(Math.max(0, this.currentTime + (r?.start || 0) - origin)) }; if (c.end) c.end = { type: 'scene', offset: number(c.start.offset + Math.max(0, (r?.end || 0) - (r?.start || 0))) }; next.clips.push(c); ids.add(c.id); } });
    this.selected = ids; this.tab = 'clip'; this.refresh();
  }

  private duplicate(): void { this.copy(); if (!this.clipboard.length) return; const p = this.options.getProject(); this.currentTime = Math.max(...this.clipboard.map(c => clipRange(p, c)?.end || 0)); this.paste(); }

  private deleteSelected(): void {
    if (!this.selected.size) return;
    this.mutate('Удаление клипов из монтажа', next => { next.clips = next.clips.filter(c => !this.selected.has(c.id) || next.tracks.find(t => t.id === c.trackId)?.locked); }); this.selected.clear(); this.refresh();
  }

  private endSelectedAtCursor(): void {
    const p = this.options.getProject();
    this.mutate('Убрать выбранные слои в точке курсора', next => { for (const c of next.clips.filter(c => this.selected.has(c.id) && !next.tracks.find(t => t.id === c.trackId)?.locked)) { const r = clipRange(p, c); if (r && this.currentTime >= r.start) { c.end = { type: 'scene', offset: this.currentTime }; if (AUDIO.has(c.kind) && !c.loop) { c.sourceOut = (c.sourceIn || 0) + this.currentTime - r.start; c.duration = this.currentTime - r.start; } } } });
  }

  private soloTrack(trackId: string): void {
    const restore = this.soloTrackId === trackId;
    if (!this.soloTrackId) this.soloMuteStates = new Map(this.options.getProject().tracks.map(t => [t.id, Boolean(t.muted)]));
    this.soloTrackId = restore ? '' : trackId;
    this.mutate('Соло звуковой дорожки', next => { for (const t of next.tracks.filter(t => AUDIO.has(t.kind))) t.muted = restore ? this.soloMuteStates.get(t.id) || false : t.id !== trackId; });
  }

  private previewAsset(asset: Asset): void {
    this.stopAssetPreview(); const url = this.options.assetUrl(asset.id); if (!url) { this.inform('Файл ресурса не найден', true); return; }
    const dialog = element('dialog', 'cd-preview-dialog'); dialog.append(element('h3', '', asset.label || asset.id));
    if (asset.kind === 'audio') { const audio = element('audio'); audio.controls = true; audio.src = url; this.previewAudio = audio; dialog.append(audio); }
    else if (asset.kind === 'video') { const video = element('video'); video.controls = true; video.src = url; dialog.append(video); }
    else { const image = element('img'); image.src = url; image.alt = asset.label || asset.id; dialog.append(image); }
    dialog.append(button('Закрыть предпросмотр', () => this.stopAssetPreview())); dialog.addEventListener('close', () => this.stopAssetPreview()); document.body.append(dialog); this.previewDialog = dialog; dialog.showModal();
  }

  private stopAssetPreview(): void { this.previewAudio?.pause(); this.previewAudio = undefined; const dialog = this.previewDialog; this.previewDialog = undefined; if (dialog) { for (const media of dialog.querySelectorAll<HTMLMediaElement>('audio,video')) { media.pause(); media.removeAttribute('src'); } dialog.remove(); } }

  private onKey(event: KeyboardEvent): void {
    if (!this.visible) return;
    const target = event.target as HTMLElement | null;
    const typing = Boolean(target?.closest('input,textarea,select,[contenteditable=true]'));
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === 's') { event.preventDefault(); event.stopPropagation(); void this.save(); return; }
    if (typing) return;
    if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); event.stopPropagation(); if (event.shiftKey) this.redo(); else this.undo(); }
    else if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); event.stopPropagation(); this.redo(); }
    else if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); event.stopPropagation(); this.copy(); }
    else if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); event.stopPropagation(); this.paste(); }
    else if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); event.stopPropagation(); this.duplicate(); }
    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); event.stopPropagation(); this.deleteSelected(); }
    else if (event.key === 'Escape' && !this.dragActive) { event.preventDefault(); this.hide(); this.options.onClose(); }
  }
}
