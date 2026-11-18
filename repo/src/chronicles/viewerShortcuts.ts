/** Original MovieApp keyboard contract, independent of the renderer/frame rate. */
export type ViewerCommand =
  | {kind:'toggle'|'mute'|'fullscreen'|'captions'|'director'|'introTrack'|'introTitle'}
  | {kind:'seek';seconds:number} | {kind:'percent';ratio:number}
  | {kind:'chapter';direction:number} | {kind:'cue';category:'dread'|'peace'|'stop'}
  | {kind:'nudge';seconds:number} | {kind:'answer';option:string};
export interface ShortcutKey {key:string;code?:string;shiftKey?:boolean;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean;}
export function viewerShortcut(e:ShortcutKey, director=false, choice=false):ViewerCommand|undefined {
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const key=e.key.toLowerCase(),physical=e.code??'';
  const letter=(name:string)=>key===name||physical===`Key${name.toUpperCase()}`;
  // A–D belong to the visible question while it is awaiting a choice.
  if(choice&&/^[abcd]$/i.test(key))return {kind:'answer',option:key.toUpperCase()};
  if(key===' '||e.code==='Space'||letter('k'))return {kind:'toggle'};
  if(key==='pageup'||e.shiftKey&&key==='arrowleft')return {kind:'chapter',direction:-1};
  if(key==='pagedown'||e.shiftKey&&key==='arrowright')return {kind:'chapter',direction:1};
  if(letter('j'))return {kind:'seek',seconds:-10};
  if(letter('l'))return {kind:'seek',seconds:10};
  if(key==='arrowleft')return {kind:'seek',seconds:-5};
  if(key==='arrowright')return {kind:'seek',seconds:5};
  if(letter('m'))return {kind:'mute'};
  if(letter('f'))return {kind:'fullscreen'};
  if(letter('c'))return {kind:'captions'};
  if(/^[0-9]$/.test(key))return {kind:'percent',ratio:Number(key)/10};
  if(letter('d')||key==='в')return {kind:'director'};
  if(director){
    if(letter('t')||key==='е')return {kind:'cue',category:'dread'};
    if(letter('p')||key==='з')return {kind:'cue',category:'peace'};
    if(letter('x')||key==='ч')return {kind:'cue',category:'stop'};
    if(key==='['||key==='х'||physical==='BracketLeft')return {kind:'nudge',seconds:-1};
    if(key===']'||key==='ъ'||physical==='BracketRight')return {kind:'nudge',seconds:1};
  }else{
    if(letter('t'))return {kind:'introTrack'};
    if(letter('p'))return {kind:'introTitle'};
  }
}
