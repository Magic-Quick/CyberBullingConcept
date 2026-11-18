/** The authoring model is shared by playback, the director and Markdown storage. */
export type TrackKind = 'frame' | 'image' | 'nameplate' | 'screen' | 'subtitle' | 'voice' | 'audio' | 'sfx' | 'interactive';
export interface Track { id: string; label: string; kind: TrackKind; order: number; channel?: string; muted?: boolean; locked?: boolean; hidden?: boolean; }
export interface Asset { id: string; kind: 'image' | 'audio' | 'video'; key?: string; path?: string; label?: string; duration?: number; sha256?: string; }
export interface WordTiming { text: string; start: number; end: number; }
export interface Utterance { id: string; text: string; subtitleText?: string | null; speakerId?: string; audioAssetId?: string; duration?: number | null; words?: WordTiming[]; textHash?: string; audioTextHash?: string; sourceLine?: number; }
export interface TimeRef { type: 'scene' | 'utterance' | 'word'; offset: number; utteranceId?: string; wordIndex?: number; edge?: 'start' | 'end'; }
export interface Transform { x?: number; y?: number; width?: number; height?: number; scale?: number; rotation?: number; opacity?: number; crop?: { x: number; y: number; width: number; height: number }; }
export interface EnvelopePoint { time: number; value: number; }
export interface Clip { id: string; sceneId: string; trackId: string; kind: TrackKind; label?: string; assetId?: string; utteranceId?: string; start: TimeRef; end?: TimeRef; duration?: number; sourceIn?: number; sourceOut?: number; gain?: number; duckBaseTo?: number; audioCommand?: { action: 'silence' | 'duck'; channel: string; gain?: number }; cleanExposure?: number; layout?: 'character' | 'screenshot' | 'manual'; avatarAssetId?: string; typewriter?: boolean; loop?: boolean; fadeIn?: number; fadeOut?: number; transform?: Transform; text?: string; title?: string; color?: string; event?: string; enabled?: boolean; envelope?: EnvelopePoint[]; }
export interface OpeningConfig { trackKey:'desolate_cry'|'titan_forge';logoDisperseTime:number;logoFadeOutTime:number;titleDropTime:number;titleFadeOutTime:number;cycleStartTime:number;cycleFadeOutTime:number;introEndTime:number;disclaimerStart:number;disclaimerTypeEnd:number;disclaimerHoldEnd:number;disclaimerFadeEnd:number;disclaimerText:string;skullLogoKey:string;studioLogoKey:string;seriesLogoKey:string;studiosText:string;presentsText:string;seriesSubtitle:string;cycleText:string; }
export interface Scene { id: string; title: string; kind: 'intro' | 'room' | 'shared' | 'handoff' | 'game' | 'verdict' | 'epilogue' | 'song'; utteranceIds: string[]; duration: number; opening?:OpeningConfig; transition?:{type:'cut'|'line_lr'|'line_rl'|'line_tb'|'circle_iris'|'circle_iris_corner';duration:number;randomSound?:boolean}; }
export interface GameOption { id: string; text: string; correct?: boolean; }
export interface Game { id: string; kind: 'choice' | 'word' | 'free'; question: string; answer?: string; acceptedAnswers?: string[]; options?: GameOption[]; maxWrong?: number | null; revealAll?: boolean; introIds: string[]; reactions: Record<string, string[]>; contextAssetId?: string; thinkingAssetId?: string; correctAssetId?: string; wrongAssetId?: string; winAssetId?: string; }
export interface Stop { id: string; label: string; theme: string; handoffSceneId: string; gameSceneId: string; roomSceneId: string; game: Game; }
export type RouteNode = { kind: 'scene'; sceneId: string } | { kind: 'stop'; stopId: string };
export interface NavigationCue {id:string;sceneId:string;title:string;sticker:'logo'|'speech'|'punishment'|'reward';at:TimeRef;}
export interface Project { schemaVersion: 1; id: string; title: string; sourceScript?: string; tracks: Track[]; assets: Asset[]; utterances: Utterance[]; scenes: Scene[]; clips: Clip[]; stops: Stop[]; sequence: RouteNode[]; extras?: RouteNode[]; navigation?:NavigationCue[]; }
export interface Diagnostic { severity: 'error' | 'warning'; code: string; message: string; id?: string; }

export const DEFAULT_TRACKS: Track[] = [
  { id: 'V1', label: 'Основной кадр', kind: 'frame', order: 1 },
  { id: 'V2', label: 'Скриншоты', kind: 'image', order: 2 },
  { id: 'V3', label: 'Имена и титулы', kind: 'nameplate', order: 3 },
  { id: 'V4', label: 'Экранные подписи', kind: 'screen', order: 4 },
  { id: 'T1', label: 'Субтитры', kind: 'subtitle', order: 5 },
  { id: 'A1', label: 'Голос', kind: 'voice', channel: 'VOICE', order: 6 },
  { id: 'A2', label: 'Атмосфера', kind: 'audio', channel: 'BASE', order: 7 },
  { id: 'A3', label: 'Нагнетание', kind: 'audio', channel: 'DREAD', order: 8 },
  { id: 'A4', label: 'Передышка', kind: 'audio', channel: 'PEACE', order: 9 },
  { id: 'A5', label: 'Музыка игры', kind: 'audio', channel: 'GAME_THINK', order: 10 },
  { id: 'A6', label: 'Звуковые эффекты', kind: 'sfx', channel: 'SFX', order: 11 },
  { id: 'I1', label: 'Живые блоки и игры', kind: 'interactive', order: 12 },
];
