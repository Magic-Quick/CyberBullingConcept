import type { Clip, Diagnostic, Project, TimeRef, Utterance } from './model';

export interface UtteranceRange { id: string; start: number; end: number; }
const rangeCache=new WeakMap<Project,Map<string,UtteranceRange[]>>();

/** Timeline length and source trim are the same contract for playback and anchors. */
function clipLength(project: Project, clip: Clip | undefined, utterance?: Utterance): number | undefined {
  const asset = project.assets.find(a => a.id === (clip?.assetId ?? utterance?.audioAssetId));
  const sourceDuration = asset?.duration ?? utterance?.duration ?? undefined;
  // Imported music holds to its authored end (duration: 0 means no fixed
  // length). It must still play up to that end or the real source out-point.
  const requested = clip?.kind === 'audio' && clip.duration === 0 && clip.end ? undefined : clip?.duration;
  if (!clip || !['voice', 'audio', 'sfx'].includes(clip.kind) || clip.loop) {
    return requested ?? sourceDuration;
  }
  const sourceIn = clip.sourceIn ?? 0;
  const sourceEnd = clip.sourceOut !== undefined
    ? sourceDuration !== undefined ? Math.min(clip.sourceOut, sourceDuration) : clip.sourceOut
    : sourceDuration;
  const available = sourceEnd !== undefined ? Math.max(0, sourceEnd - sourceIn) : undefined;
  if (requested !== undefined && available !== undefined) return Math.min(requested, available);
  return requested ?? available;
}

export function utteranceRanges(project: Project, sceneId: string): UtteranceRange[] {
  const cached=rangeCache.get(project)?.get(sceneId);if(cached)return cached;
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) return [];
  let cursor = 0;
  const ranges=scene.utteranceIds.map(id => {
    const u = project.utterances.find(x => x.id === id);
    const voices = project.clips.filter(c => c.sceneId === sceneId && c.kind === 'voice' && c.utteranceId === id);
    const voice = voices.find(c => c.enabled !== false);
    const disabled = voices.length > 0 && !voice;
    const start = voice?.start.type === 'scene' ? voice.start.offset : cursor;
    const length = disabled ? 0 : clipLength(project, voice, u) ?? 0;
    const end = voice?.end?.type === 'scene'
      ? Math.min(voice.end.offset, start + Math.max(0, length))
      : start + Math.max(0, length);
    cursor = Math.max(cursor, end);
    return { id, start, end };
  });
  let index=rangeCache.get(project);if(!index){index=new Map();rangeCache.set(project,index);}index.set(sceneId,ranges);return ranges;
}

export function resolveTime(project: Project, sceneId: string, ref: TimeRef): number | null {
  if (!ref || !Number.isFinite(ref.offset)) return null;
  if (ref.type === 'scene') return ref.offset;
  const range = utteranceRanges(project, sceneId).find(r => r.id === ref.utteranceId);
  if (!range) return null;
  if (ref.type === 'utterance') return (ref.edge === 'end' ? range.end : range.start) + ref.offset;
  const u = project.utterances.find(x => x.id === ref.utteranceId);
  const word = u?.words?.[ref.wordIndex ?? -1];
  if (!word) return null;
  const voice = project.clips.find(c => c.sceneId === sceneId && c.kind === 'voice' && c.utteranceId === u?.id && c.enabled !== false);
  return range.start + (ref.edge === 'end' ? word.end : word.start) - (voice?.sourceIn ?? 0) + ref.offset;
}

export function clipRange(project: Project, clip: Clip): { start: number; end: number } | null {
  const start = resolveTime(project, clip.sceneId, clip.start);
  if (start === null) return null;
  const u = project.utterances.find(x => x.id === clip.utteranceId);
  const length = clipLength(project, clip, u);
  let end = clip.end ? resolveTime(project, clip.sceneId, clip.end)
    : length !== undefined && length !== null ? start + length : project.scenes.find(s => s.id === clip.sceneId)?.duration ?? start;
  if (end !== null && length !== undefined && !clip.loop && ['voice', 'audio', 'sfx'].includes(clip.kind)) {
    end = Math.min(end, start + length);
  }
  if (end !== null && end < start && start - end < .000001) end = start;
  return end === null ? null : { start, end };
}

export function sceneDuration(project: Project, sceneId: string): number {
  let duration = project.scenes.find(s => s.id === sceneId)?.duration ?? 0;
  for (const r of utteranceRanges(project, sceneId)) duration = Math.max(duration, r.end);
  for (const clip of project.clips.filter(c => c.sceneId === sceneId && c.enabled !== false)) {
    const range = clipRange(project, clip);
    if (range && Number.isFinite(range.end)) duration = Math.max(duration, range.end);
  }
  return duration;
}

/** Sticker targets stay attached to speech after voice duration/ripple edits. */
export function navigationRanges(project:Project){
  const entries=(project.navigation??[]).map(cue=>({...cue,time:resolveTime(project,cue.sceneId,cue.at)})).filter((cue):cue is typeof cue & {time:number}=>cue.time!==null);
  return entries.map(cue=>({...cue,end:Math.min(sceneDuration(project,cue.sceneId),...entries.filter(other=>other.sceneId===cue.sceneId&&other.time>cue.time).map(other=>other.time))}));
}

export function activeClips(project: Project, sceneId: string, time: number, event?: string): Clip[] {
  return project.clips.filter(clip => {
    const scene=project.scenes.find(s=>s.id===sceneId);
    if (clip.sceneId !== sceneId || clip.enabled === false || (clip.event && clip.event !== event && scene?.kind==='game')) return false;
    const track = project.tracks.find(t => t.id === clip.trackId);
    if (track?.hidden || track?.muted && ['voice','audio','sfx'].includes(clip.kind)) return false;
    const r = clipRange(project, clip);
    return r !== null && r.end > r.start && time >= r.start && time < r.end;
  }).sort((a, b) => (project.tracks.find(t => t.id === a.trackId)?.order ?? 0) - (project.tracks.find(t => t.id === b.trackId)?.order ?? 0));
}

/** Identical phrase boundaries drive the displayed captions and ⏮ / ⏭ buttons. */
const phraseCache=new WeakMap<Utterance,{words:Utterance['words'];text:string;subtitle:Utterance['subtitleText'];phrases:{start:number;text:string}[]}>();
export function captionPhrases(u: Utterance): {start:number;text:string}[] {
  if(u.subtitleText!=null||!u.words?.length)return [{start:0,text:u.subtitleText??u.text}];
  const cached=phraseCache.get(u);if(cached&&cached.words===u.words&&cached.text===u.text&&cached.subtitle===u.subtitleText)return cached.phrases;
  const out:{start:number;text:string}[]=[];let start=0;
  for(let end=0;end<u.words.length;end++)if(end===u.words.length-1||/[.!?…]$/.test(u.words[end].text)||end-start>=17){
    out.push({start:u.words[start].start,text:u.words.slice(start,end+1).map(w=>w.text).join(' ')});start=end+1;
  }
  phraseCache.set(u,{words:u.words,text:u.text,subtitle:u.subtitleText,phrases:out});return out;
}
export function spokenCaption(u: Utterance, localTime: number): string {
  if(localTime<0||u.duration!=null&&localTime>=u.duration)return '';
  if (u.subtitleText != null) return u.subtitleText;
  if (!u.words?.length) return u.text;
  // Partition once by phrase boundaries. Hold each phrase through pauses;
  // never slide the text window or blank it between adjacent spoken words.
  const phrases=captionPhrases(u);let text='';for(const p of phrases){if(p.start>localTime)break;text=p.text;}return text;
}

export function validateProject(project: Project): Diagnostic[] {
  const out: Diagnostic[] = [];
  const add = (code: string, message: string, id?: string, severity: 'error'|'warning' = 'error') => out.push({code,message,id,severity});
  for (const field of ['tracks','assets','utterances','scenes','clips','stops'] as const) {
    const seen = new Set<string>();
    for (const x of project[field]) {
      if (!x || typeof x.id !== 'string' || !x.id.trim() || seen.has(x.id)) add('duplicate_id', `Неверный или повторный ID в ${field}.`, x?.id);
      seen.add(x?.id);
    }
  }
  const utterances = new Set(project.utterances.map(u => u.id)), scenes = new Set(project.scenes.map(s => s.id));
  const tracks = new Set(project.tracks.map(t => t.id)), assets = new Set(project.assets.map(a => a.id));
  for (const scene of project.scenes) {
    if (!Number.isFinite(scene.duration) || scene.duration < 0) add('invalid_duration','Неверная длительность сцены.',scene.id);
    if(scene.transition&&(!['cut','line_lr','line_rl','line_tb','circle_iris','circle_iris_corner'].includes(scene.transition.type)||!Number.isFinite(scene.transition.duration)||scene.transition.duration<=0))add('invalid_transition','Неверные параметры оптического перехода.',scene.id);
    for (const id of scene.utteranceIds) if (!utterances.has(id)) add('missing_utterance',`Сцена ссылается на отсутствующую реплику ${id}.`,scene.id);
  }
  for (const u of project.utterances) {
    if (!u.text?.trim()) add('empty_voice','Пустая реплика.',u.id);
    if (u.subtitleText === '') add('empty_subtitle','Для скрытия субтитров используйте дорожку, а не пустую строку.',u.id);
    if (!u.audioAssetId || !assets.has(u.audioAssetId)) add('missing_voice','Нужна запись голоса.',u.id,'warning');
    if (u.textHash && u.audioTextHash && u.textHash !== u.audioTextHash) add('stale_voice','Текст изменился после записи. Нужна новая запись и выравнивание.',u.id,'warning');
    if (!u.words?.length && u.audioAssetId) add('missing_alignment','Нет выравнивания слов; привязки к словам требуют проверки.',u.id,'warning');
  }
  for (const c of project.clips) {
    if (!scenes.has(c.sceneId) || !tracks.has(c.trackId)) add('missing_owner','Не найдена сцена или дорожка клипа.',c.id);
    if (c.assetId && !assets.has(c.assetId)) add('missing_asset','Не найден ресурс клипа.',c.id);
    if (c.utteranceId && !utterances.has(c.utteranceId)) add('missing_utterance','Не найдена реплика клипа.',c.id);
    if(c.audioCommand&&(!['silence','duck'].includes(c.audioCommand.action)||!c.audioCommand.channel?.trim()||c.audioCommand.gain!==undefined&&(!Number.isFinite(c.audioCommand.gain)||c.audioCommand.gain<0||c.audioCommand.gain>1)))add('invalid_audio_command','Неверная команда музыкального канала.',c.id);
    const r = clipRange(project,c);
    if (!r) add('unresolved_anchor','Не удалось определить момент события.',c.id);
    else if (!Number.isFinite(r.start) || !Number.isFinite(r.end) || r.start < 0 || r.end < r.start) add('invalid_range','Неверные границы клипа.',c.id);
    for (const n of ['duration','sourceIn','sourceOut','gain','fadeIn','fadeOut','cleanExposure','duckBaseTo'] as const) if (c[n] !== undefined && (!Number.isFinite(c[n]) || c[n]! < 0 || n==='duckBaseTo'&&c[n]!>1)) add('invalid_number',`Неверное значение ${n}.`,c.id);
    if (c.sourceOut !== undefined && c.sourceOut < (c.sourceIn ?? 0)) add('invalid_source_range','Конец исходника раньше начала.',c.id);
    if (c.envelope?.some(p=>!Number.isFinite(p.time)||!Number.isFinite(p.value)||p.time<0||p.value<0)) add('invalid_envelope','Неверные точки огибающей.',c.id);
  }
  for(const cue of project.navigation??[]){const scene=project.scenes.find(s=>s.id===cue.sceneId),at=resolveTime(project,cue.sceneId,cue.at);if(!scene||at===null||!Number.isFinite(at)||at<0||at>sceneDuration(project,cue.sceneId)||cue.at.utteranceId&&!scene.utteranceIds.includes(cue.at.utteranceId))add('invalid_navigation','Не удалось определить адрес наклейки.',cue.id);}
  for (const stop of project.stops) {
    if (![stop.handoffSceneId,stop.gameSceneId,stop.roomSceneId].every(id=>scenes.has(id))) add('missing_stop_scene','Не найдена сцена остановки.',stop.id);
    const g=stop.game;
    if (g.kind==='choice' && !g.options?.length) add('missing_options','Не заданы варианты игры.',g.id);
    if (g.kind!=='choice' && !g.answer?.trim()) add('missing_answer','Не задан ответ.',g.id);
    for (const id of [...g.introIds,...Object.values(g.reactions).flat()]) if (!utterances.has(id)) add('missing_reaction',`Не найдена игровая реплика ${id}.`,g.id);
    if (g.id==='I-02' && (!g.revealAll || g.maxWrong)) add('househunt_rules','Househunt: один выбор, без ошибок, раскрытие всех пунктов.',g.id);
    if (g.id==='I-03' && g.maxWrong!==1) add('chgk_rules','ЧГК: один окончательный содержательный ответ.',g.id);
  }
  for (const node of [...project.sequence,...project.extras??[]]) {
    if (node.kind==='scene' && !scenes.has(node.sceneId) || node.kind==='stop' && !project.stops.some(s=>s.id===node.stopId)) add('missing_route_node','Не найден узел маршрута.');
  }
  return out;
}
