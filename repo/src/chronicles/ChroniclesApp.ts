import source from './default-project.md?raw';
import './chronicles.css';
import { DirectorPanel } from './DirectorPanel';
import { ProjectStorage } from './persistence';
import { parseProject, serializeProject, sha256 } from './markdown';
import type { Clip, Project, Stop } from './model';
import { activeClips, clipRange, resolveTime, sceneDuration, spokenCaption, utteranceRanges, validateProject } from './timeline';
import { assetUrl } from './assets';
import { AudioMixer } from './audioMixer';
import { GameRound, reactionCandidates } from './gameRound';
import { ChroniclesTransport } from './ChroniclesTransport';

type Phase='idle'|'scene'|'handoff'|'host'|'game_intro'|'game_wait'|'reaction'|'game_done'|'end';
const node=<T extends HTMLElement=HTMLElement>(tag:string,className='',text=''):T=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n as T};
const button=(text:string,callback:()=>void,className=''):HTMLButtonElement=>{const b=node<HTMLButtonElement>('button',className,text);b.type='button';b.addEventListener('click',callback);return b};
const clock=(time:number):string=>`${Math.floor(time/60).toString().padStart(2,'0')}:${Math.floor(time%60).toString().padStart(2,'0')}`;

/** V15 player and director use one project, one clock and one renderer. */
export class ChroniclesApp {
  private project:Project;
  private markdown:string;
  private storage=new ProjectStorage();
  private version:string|undefined;
  private dirty=false;
  private editGeneration=0;
  private documentGeneration=0;
  private panel:DirectorPanel;
  private shell=node('section','chronicles-shell');
  private stage=node('div','chronicles-stage');
  private frame=node<HTMLImageElement>('img','chronicles-frame');
  private captions=node('div','chronicles-captions');
  private status=node('div','chronicles-status');
  private previewControls=node('div','chronicles-preview-controls');
  private previewPlay=button('▶ Воспроизвести',()=>this.toggle());
  private overlay=node('div','chronicles-overlay');
  private overlayTitle=node('h1');
  private overlayText=node('p');
  private overlayButton=node<HTMLButtonElement>('button','primary','Начать просмотр');
  private gameView=node('section','chronicles-game');
  private gameQuestion=node('h2');
  private context=node<HTMLImageElement>('img','context');
  private choices=node('div','chronicles-choices');
  private board=node('div','chronicles-wordboard');
  private answerForm=node<HTMLFormElement>('form','chronicles-answerline');
  private answer=node<HTMLInputElement>('input');
  private answerButton=node<HTMLButtonElement>('button','','Проверить · Enter');
  private gameActions=node('div','chronicles-game-actions');
  private feedback=node('p','chronicles-feedback');
  private gameContinue=button('К хроникам',()=>this.finishGame(),'primary');
  private missing=node('div','chronicles-textual');
  private missingText=node('div');
  private missingNext=button('Следующая фраза',()=>this.advanceManual());
  private title=node('strong');
  private playButton=button('▶',()=>this.toggle());
  private ccButton=button('CC',()=>{this.cc=!this.cc;this.render()});
  private timeLabel=node('span','clock');
  private progress=node<HTMLInputElement>('input','chronicles-progress');
  private stopBar=node('div','chronicles-stops');
  private markers=new Map<string,{host:HTMLButtonElement;game:HTMLButtonElement}>();
  private layers=new Map<string,HTMLElement>();
  private audio:AudioMixer;
  private phase:Phase='idle';
  private sceneId='';
  private time=0;
  private playing=false;
  private cc=true;
  private route=0;
  private epoch=0;
  private event:string|undefined;
  private stop:Stop|undefined;
  private round:GameRound|undefined;
  private stopState=new Map<string,string>();
  private queue:string[]=[];
  private queueDone:(()=>void)|undefined;
  private segmentId:string|undefined;
  private segmentEnd:number|undefined;
  private manualIndex=0;
  private manual=false;
  private manualDone:(()=>void)|undefined;
  private preview=false;
  private extra=false;
  private draggingPreviewId='';
  private last=performance.now();
  private animation=0;
  private disposed=false;
  private hiddenPaused=false;
  private reactionCount=new Map<string,number>();
  private transport?:ChroniclesTransport;
  private transportChapters:Parameters<ChroniclesTransport['update']>[0]['chapters']=[];
  private transportStopPositions:{id:string;label:string;time:number}[]=[];
  private routeRecordedStarts:number[]=[];
  private recordedDuration=0;

  static async create():Promise<ChroniclesApp>{
    const app=new ChroniclesApp(source);
    app.overlayButton.disabled=true;
    try{const loaded=await app.storage.load();if(loaded){app.version=loaded.version;app.replace(loaded.markdown);app.panel.markSaved();if(app.panel.isVisible)app.seekScene(app.project.scenes[0].id,0);else app.showOverlay('Хроники Продакшен-Ковчега','Пять залов. Пять игровых вступлений. Живое слово Толи — между главами.','Начать просмотр',()=>app.start());}}
    catch(error){app.message(error instanceof Error?error.message:String(error));}
    app.overlayButton.disabled=true;await app.setupTransport();app.overlayButton.disabled=false;
    return app;
  }
  constructor(markdown:string){
    const doc=parseProject(markdown);this.project=doc.project;this.markdown=doc.markdown;
    this.audio=new AudioMixer(id=>assetUrl(this.project,id));
    this.audio.onAudioError=id=>{this.message('Не загрузилась запись. Доступен текст реплики.');this.showMissing(this.segmentId??this.project.clips.find(c=>c.id===id)?.utteranceId,()=>this.endSegment());};
    this.build();
    this.panel=new DirectorPanel({
      getProject:()=>this.project,
      onChange:(next,label)=>{this.project=next;this.dirty=true;this.editGeneration++;this.audio.stop();this.buildMarkers();this.render(true);this.message(label);},
      onSeek:(scene,time,event)=>this.seekScene(scene,time,event),
      onSave:()=>this.save(),onImport:text=>this.import(text),onExport:()=>{void this.storage.export(this.getMarkdown())},
      assetUrl:id=>assetUrl(this.project,id),onClose:()=>this.leaveDirector(),getMarkdown:()=>this.getMarkdown(),
      onEditSpeech:(id,text)=>{void this.editSpeech(id,text)},diagnostics:()=>validateProject(this.project),
    });
    this.buildMarkers();this.showOverlay('Хроники Продакшен-Ковчега','Пять залов. Пять игровых вступлений. Живое слово Толи — между главами.','Начать просмотр',()=>this.start());
    document.addEventListener('keydown',this.keydown);
    document.addEventListener('visibilitychange',this.visibility);
    window.addEventListener('beforeunload',this.beforeUnload);
    this.animation=requestAnimationFrame(this.tick);
    if(new URLSearchParams(location.search).has('director')){this.seekScene(this.project.scenes[0].id,0);this.panel.show(this.sceneId,0);}
  }
  get isPlaying():boolean{return this.playing;}
  play():void{if(this.phase==='idle'||this.phase==='end'){this.start();return;}this.playing=true;this.last=performance.now();this.render();}
  pause():void{this.playing=false;this.render();}
  resize(_width:number,_height:number):void{this.resizeTransport();}
  update(_dt:number):void{}
  private async setupTransport():Promise<void>{
    this.transport=await ChroniclesTransport.create({
      onPlay:()=>this.play(),onPause:()=>this.pause(),onPrevious:()=>this.phrase(-1),onNext:()=>this.phrase(1),onSeek:ratio=>this.seekGlobal(ratio),
      onCc:()=>{this.cc=!this.cc;this.render();},onFullscreen:()=>{if(document.fullscreenElement)void document.exitFullscreen();else void this.shell.requestFullscreen();},
      onMute:()=>{this.audio.muted=!this.audio.muted;this.render();},
      onVolume:(kind,value)=>{if(kind==='voice')this.audio.voiceVolume=value;else if(kind==='music')this.audio.musicVolume=value;else this.audio.effectsVolume=value;this.render();},
      onDirector:()=>this.toggleDirector(),onChapter:id=>{if(id==='SONG'){this.playExtra();return;}const route=this.project.sequence.findIndex(n=>n.kind==='scene'&&n.sceneId===id);if(route>=0){this.seekRecorded(route,0);this.play();}},
      onMarker:(id,kind)=>{const stop=this.project.stops.find(s=>s.id===id);if(stop)this.startStop(stop,kind==='game');},
    });
    this.shell.append(this.transport.element);window.addEventListener('resize',this.resizeTransport);this.resizeTransport();this.render(true);
  }
  private resizeTransport=():void=>{this.transport?.resize(window.innerWidth,window.innerHeight);this.shell.style.paddingBottom=this.transport&&!this.panel.isVisible?this.transport.height+'px':'0px';};
  private toggleDirector():void{if(this.panel.isVisible){this.panel.hide();this.leaveDirector();}else{this.overlay.hidden=true;this.panel.show(this.sceneId||this.project.scenes[0].id,this.time);this.render();}}
  private build():void{
    this.shell.setAttribute('aria-label','Хроники · фильм и режим режиссёра');
    const toolbar=node('header','chronicles-toolbar');toolbar.append(this.title);
    const tools=node('div');tools.append(button('Режиссёр',()=>{this.overlay.hidden=true;this.panel.show(this.sceneId||this.project.scenes[0].id,this.time);this.render();}),button('Открыть проект',()=>{void this.openFile()}),button('Доп. трек',()=>this.playExtra()));toolbar.append(tools);
    this.frame.alt='';this.stage.append(this.frame,this.captions,this.status);
    this.stage.addEventListener('pointerdown',e=>this.dragPreview(e));
    this.previewControls.append(this.previewPlay,button('↤ К началу',()=>{this.time=0;this.render(true)}));this.stage.append(this.previewControls);
    this.overlay.append(this.overlayTitle,this.overlayText,this.overlayButton);this.stage.append(this.overlay);
    this.gameQuestion.id='chronicles-game-question';this.gameView.setAttribute('aria-labelledby',this.gameQuestion.id);
    this.context.alt='Контекст из исходного сообщения; разгадка скрыта';this.context.hidden=true;
    this.answer.setAttribute('aria-label','Буква, слово или окончательный ответ');this.answer.autocomplete='off';this.answer.spellcheck=false;
    this.answerButton.type='submit';this.answerForm.append(this.answer,this.answerButton);
    this.answerForm.addEventListener('submit',e=>{e.preventDefault();void this.submit()});
    this.answer.addEventListener('input',()=>{if(this.round?.draft){if(this.answer.value.normalize('NFC').trim().length===this.round.letters?.answer.length)this.round.draft.startAt(0);this.round.draft.update(this.answer.value);this.renderBoard();}});
    this.answer.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!this.answer.value&&this.round?.draft){this.round.draft.clear();this.renderBoard();}});
    this.gameActions.append(button('Одна буква',()=>this.prompt('letter_prompt')),button('Слово целиком',()=>this.prompt('word_prompt')));
    const zoom=button('Увеличить контекст',()=>this.zoomContext(),'chronicles-context-zoom');this.gameView.append(zoom);
    this.feedback.setAttribute('aria-live','polite');this.gameView.append(this.gameQuestion,this.context,this.choices,this.board,this.answerForm,this.gameActions,this.feedback,this.gameContinue);this.gameView.hidden=true;this.stage.append(this.gameView);
    this.missing.hidden=true;this.missing.append(this.missingText,this.missingNext);this.stage.append(this.missing);
    const bar=node('footer','chronicles-bar'),controls=node('div','chronicles-controls');
    this.playButton.setAttribute('aria-label','Воспроизведение / пауза');this.ccButton.setAttribute('aria-label','Субтитры');
    controls.append(this.playButton,button('⏮',()=>this.phrase(-1)),button('⏭',()=>this.phrase(1)),this.ccButton,this.timeLabel);
    this.progress.type='range';this.progress.min='0';this.progress.max='10000';this.progress.value='0';this.progress.setAttribute('aria-label','Перейти к записанному фрагменту');this.progress.addEventListener('input',()=>this.seekGlobal(Number(this.progress.value)/10000));controls.append(this.progress);
    for(const [label,key]of [['Голос','voiceVolume'],['Музыка','musicVolume'],['SFX','effectsVolume']] as const){const l=node<HTMLLabelElement>('label','chronicles-volume',label),range=node<HTMLInputElement>('input');range.type='range';range.min='0';range.max='1';range.step='.01';range.value=String(this.audio[key]);range.setAttribute('aria-label',label);range.addEventListener('input',()=>{this.audio[key]=Number(range.value);this.render()});l.append(range);controls.append(l);}
    controls.append(button('⛶',()=>{if(document.fullscreenElement)void document.exitFullscreen();else void this.shell.requestFullscreen()}));
    bar.append(controls,this.stopBar);this.shell.append(toolbar,this.stage,bar);document.body.append(this.shell);
  }
  private getMarkdown():string{return serializeProject(this.project,this.markdown);}
  private async save():Promise<void>{
    const markdown=this.getMarkdown(), generation=this.editGeneration, documentGeneration=this.documentGeneration;
    const saved=await this.storage.save(markdown,this.version);
    if(this.documentGeneration===documentGeneration){this.markdown=markdown;this.version=saved.version;this.dirty=this.editGeneration!==generation;}
    this.message(this.dirty?'Снимок сохранён; более новые правки ещё не записаны.':'Сохранено в файл: '+saved.path);this.render();
  }
  private async openFile():Promise<void>{try{const text=await this.storage.pickAndOpen();if(text)await this.import(text);}catch(e){this.message(e instanceof Error?e.message:String(e));}}
  private async import(text:string):Promise<void>{
    const doc=parseProject(text),errors=validateProject(doc.project).filter(d=>d.severity==='error'&&d.code!=='unresolved_anchor');
    if(errors.length)throw new Error(errors.slice(0,3).map(e=>e.message).join(' '));
    this.replace(text);this.version=undefined;this.dirty=true;this.editGeneration++;this.seekScene(this.project.scenes[0].id,0);this.panel.refresh();this.message('Проект импортирован. Сохраните файл после проверки.');
  }
  private replace(text:string):void{const d=parseProject(text);this.cancel();this.documentGeneration++;this.project=d.project;this.markdown=d.markdown;this.stopState.clear();this.phase='idle';this.buildMarkers();this.render();}
  private async editSpeech(id:string,text:string):Promise<void>{
    const u=this.project.utterances.find(u=>u.id===id);if(!u||u.text===text)return;
    u.text=text;u.textHash=await sha256(text);u.words=[];this.dirty=true;this.editGeneration++;this.audio.stop();this.panel.refresh();this.render();this.message('Текст изменён: запись и привязки к словам требуют обновления.');
  }
  private showOverlay(title:string,text:string,label:string,action:()=>void):void{this.overlayTitle.textContent=title;this.overlayText.textContent=text;this.overlayButton.textContent=label;this.overlayButton.onclick=action;this.overlayButton.disabled=false;this.overlay.hidden=false;}
  private message(text:string):void{this.status.textContent=text;}
  private cancel():void{if(this.stop&&this.stopState.has(this.stop.id)&&this.stopState.get(this.stop.id)!=='Пройдено')this.stopState.set(this.stop.id,'Пропущено');this.epoch++;this.audio.stop();this.queue=[];this.queueDone=undefined;this.segmentId=undefined;this.segmentEnd=undefined;this.manualDone=undefined;this.missing.hidden=true;this.manual=false;this.gameView.hidden=true;this.overlay.hidden=true;this.captions.textContent='';this.layers.forEach(n=>n.remove());this.layers.clear();}
  private start():void{this.stopState.clear();this.preview=false;this.playing=true;this.route=0;this.enterRoute(0);}
  private enterRoute(index:number):void{
    this.cancel();this.preview=false;this.extra=false;this.route=index;this.event=undefined;this.stop=undefined;this.round=undefined;
    const target=this.project.sequence[index];
    if(!target){this.phase='end';this.playing=false;this.showOverlay('Смена закрыта','Хроники завершены.','Начать заново',()=>this.start());this.render();return;}
    if(target.kind==='stop'){const stop=this.project.stops.find(s=>s.id===target.stopId);if(stop)this.startStop(stop,false);return;}
    this.phase='scene';this.sceneId=target.sceneId;this.time=0;this.manualIndex=0;
    const scene=this.project.scenes.find(s=>s.id===this.sceneId)!;
    this.manual=false;
    if(scene.utteranceIds.length){this.playQueue(scene.utteranceIds,()=>this.finishRecordedScene(index),true);return;}
    this.render();
  }
  private startStop(stop:Stop,directGame:boolean):void{
    this.cancel();this.stop=stop;this.preview=false;this.route=this.project.sequence.findIndex(n=>n.kind==='stop'&&n.stopId===stop.id);this.playing=true;
    this.stopState.set(stop.id,directGame?'В игре':'Передача');
    if(directGame){this.beginGame();return;}
    this.phase='handoff';this.sceneId=stop.handoffSceneId;this.time=0;
    this.showOverlay(stop.label,stop.theme,'Продолжить',()=>{if(this.phase==='host')this.beginGame()});this.overlayButton.disabled=true;
    // The handoff voice plays over its clean frame; the host UI appears only afterwards.
    this.overlay.hidden=true;
    const ids=this.project.scenes.find(s=>s.id===this.sceneId)?.utteranceIds??[];
    this.playQueue(ids,()=>this.waitForHost(),true);
  }
  private waitForHost():void{
    if(!this.stop)return;this.audio.stop();this.phase='host';this.segmentEnd=undefined;this.captions.textContent='';this.stopState.set(this.stop.id,'Ожидание');
    this.showOverlay(this.stop.label,this.stop.theme,'Продолжить',()=>{if(this.phase==='host'&&this.playing)this.beginGame()});this.render();
  }
  private beginGame():void{
    if(!this.stop)return;this.overlay.hidden=true;this.audio.stop();this.phase='game_intro';this.sceneId=this.stop.gameSceneId;this.round=new GameRound(this.stop.game);this.stopState.set(this.stop.id,'В игре');this.feedback.textContent='';this.answer.value='';this.gameContinue.hidden=true;
    this.playQueue(this.stop.game.introIds,()=>this.waitForAnswer(),true);
  }
  private waitForAnswer():void{
    if(!this.stop||!this.round)return;
    this.phase='game_wait';this.segmentEnd=undefined;this.segmentId=undefined;this.event='WAIT_'+this.stop.game.id;this.captions.textContent='';
    this.gameView.hidden=false;this.gameQuestion.textContent=this.stop.game.question;
    this.context.hidden=true;
    this.choices.replaceChildren();
    for(const option of this.stop.game.options??[]){const b=button(option.id+' · '+option.text,()=>{this.answer.value=option.id;void this.submit()});b.dataset.option=option.id;b.disabled=this.round.attempted.has(option.id);this.choices.append(b);}
    this.choices.hidden=this.stop.game.kind!=='choice';this.board.hidden=this.stop.game.kind!=='word';this.answerForm.hidden=this.stop.game.kind==='choice';
    this.answer.classList.toggle('tile-input',this.stop.game.kind==='word');this.answer.placeholder=this.stop.game.kind==='free'?'Один окончательный ответ':'Буква или слово';this.gameActions.hidden=this.stop.game.kind!=='word';
    this.gameContinue.hidden=true;this.answerButton.disabled=false;this.answer.disabled=false;this.answer.value='';if(this.round.draft&&this.round.letters){this.round.draft.clear();const next=this.round.letters.cells.findIndex(letter=>!letter);this.round.draft.startAt(next<0?0:next);}this.renderBoard();
    const bed=this.project.clips.find(c=>c.sceneId===this.sceneId&&c.trackId==='A5'&&c.assetId&&c.enabled!==false&&c.event==='WAIT_'+this.stop!.game.id);
    this.audio.setGameBed(bed?.assetId??this.stop.game.thinkingAssetId,bed?.gain??.2,this.stop.game.kind==='free');
    this.render();if(this.stop.game.kind!=='choice')this.answer.focus({preventScroll:true});
  }
  private renderBoard():void{
    if(!this.round?.letters||!this.round.draft)return;
    const round=this.round, known=round.letters!.cells, selected=document.activeElement===this.answer;
    this.board.replaceChildren();known.forEach((letter,i)=>{const b=button(round.draft!.cells[i]||letter||'＿',()=>{if(this.phase!=='game_wait')return;round.draft!.startAt(i);this.answer.value='';this.answer.focus();this.renderBoard();b.classList.add('selected')});b.setAttribute('aria-label',`Буква ${i+1}: ${letter||'пусто'}`);b.disabled=this.phase!=='game_wait';this.board.append(b)});
    if(selected)this.answer.focus({preventScroll:true});
  }
  private async submit():Promise<void>{
    if(this.phase!=='game_wait'||!this.round||!this.stop||!this.playing)return;
    const game=this.stop.game, result=this.round.submit(this.round.draft?this.round.draft.submission(this.round.letters!.cells).value:this.answer.value);
    this.phase='reaction';this.answer.disabled=true;this.answerButton.disabled=true;
    this.choices.querySelectorAll('button').forEach(b=>{b.disabled=true;if(b.dataset.option===result.optionId)b.classList.add('chosen')});this.renderBoard();
    this.feedback.textContent=result.event==='exhausted'?'Попытки завершены':result.event==='correct'?'Верно':result.event==='reveal_all'?'Выбор принят':this.round.wrong?`Ошибок: ${this.round.wrong} из ${game.maxWrong??3}`:'Ответ принят';
    const candidates=reactionCandidates(game,result),key=candidates.join('|'),count=this.reactionCount.get(key)??0;
    const chosen=candidates.length?[candidates[count%candidates.length]]:[];this.reactionCount.set(key,count+1);
    let ids=[...chosen];
    if(result.event==='reveal_all'||game.kind==='free'&&result.event==='wrong')ids.push(...game.reactions.reveal??[]);
    if(result.final)this.audio.clearBed();
    this.playQueue(ids,()=>{
      if(result.event==='reveal_all')this.choices.querySelectorAll('button').forEach(b=>b.classList.add('removed'));
      if(result.final){this.stopState.set(this.stop!.id,'Пройдено');if(result.event==='exhausted'||game.kind==='free'&&result.event==='wrong'){this.finishGame();return;}this.phase='game_done';this.gameContinue.hidden=false;this.render();}
      else this.waitForAnswer();
    });
  }
  private prompt(kind:string):void{if(this.phase!=='game_wait'||!this.stop)return;const ids=this.stop.game.reactions[kind]??[];this.phase='reaction';this.playQueue(ids,()=>this.waitForAnswer());}
  private finishGame():void{if(!this.stop)return;this.stopState.set(this.stop.id,'Пройдено');this.enterRoute(this.route+1);}
  private finishRecordedScene(route:number):void{if(sceneDuration(this.project,this.sceneId)>this.time+.001){this.phase='scene';this.segmentId=undefined;this.segmentEnd=undefined;this.render();}else this.enterRoute(route+1);}
  private playQueue(ids:string[],done:()=>void,prelude=false):void{this.queue=[...ids];this.queueDone=done;this.nextSegment(prelude);}
  private nextSegment(prelude=false):void{
    const id=this.queue.shift();if(!id){this.endQueue();return;}
    const scene=this.project.scenes.find(s=>s.utteranceIds.includes(id));
    if(!scene){this.nextSegment();return;}
    const previousScene=this.sceneId,previousTime=this.time;
    this.sceneId=scene.id;this.segmentId=id;this.event=id;
    if(this.phase==='reaction')this.audio.resetSfx();
    const r=utteranceRanges(this.project,this.sceneId).find(r=>r.id===id)!;
    const sequential=['scene','handoff','game_intro'].includes(this.phase)&&previousScene===scene.id&&previousTime<=r.start;
    this.time=prelude?0:sequential?previousTime:r.start;this.segmentEnd=r.end;
    const u=this.project.utterances.find(u=>u.id===id)!;
    if(!u.audioAssetId||!u.duration||!assetUrl(this.project,u.audioAssetId)||u.textHash&&u.audioTextHash&&u.textHash!==u.audioTextHash){this.showMissing(id,()=>this.endSegment());this.render();return;}
    this.missing.hidden=true;this.render();
  }
  private endSegment():void{if(this.phase==='reaction'&&this.stop?.game.revealAll&&this.stop.game.reactions.first_choice?.includes(this.segmentId??''))this.choices.querySelectorAll('button').forEach(b=>b.classList.add('removed'));this.missing.hidden=true;this.manualDone=undefined;this.segmentEnd=undefined;this.segmentId=undefined;this.nextSegment();}
  private endQueue():void{this.segmentEnd=undefined;this.segmentId=undefined;const fn=this.queueDone;this.queueDone=undefined;fn?.();}
  private showMissing(id:string|undefined,done:()=>void):void{const u=this.project.utterances.find(u=>u.id===id);this.missingText.textContent='Запись этой реплики пока недоступна. Проверка текста:\n\n'+(u?.text??'');this.manualDone=done;this.missing.hidden=false;}
  private manualScene():void{const scene=this.project.scenes.find(s=>s.id===this.sceneId)!;const id=scene.utteranceIds[this.manualIndex];if(!id){this.enterRoute(this.route+1);return;}this.segmentId=id;this.time=utteranceRanges(this.project,this.sceneId).find(r=>r.id===id)?.start??0;this.showMissing(id,()=>{this.manualIndex++;this.manualScene()});}
  private advanceManual():void{if(this.playing||this.panel.isVisible){const fn=this.manualDone;this.manualDone=undefined;fn?.();this.render(true)}}
  private toggle():void{if(this.playing)this.pause();else this.play();}
  private seekScene(sceneId:string,time:number,event?:string):void{this.cancel();this.sceneId=sceneId;this.time=Math.max(0,Math.min(sceneDuration(this.project,sceneId),time));this.event=event;this.phase='scene';this.preview=true;this.playing=false;this.stop=undefined;this.render(true);}
  private leaveDirector():void{
    this.message('');
    if(!this.preview){this.render();return;}
    const scene=this.project.scenes.find(s=>s.id===this.sceneId),time=this.time;
    const stop=this.project.stops.find(s=>s.gameSceneId===this.sceneId||s.handoffSceneId===this.sceneId);
    if(stop){this.startStop(stop,scene?.kind==='game');this.pause();return;}
    const route=this.project.sequence.findIndex(n=>n.kind==='scene'&&n.sceneId===this.sceneId);
    if(route>=0){this.seekRecorded(route,time);return;}
    if(this.project.extras?.some(n=>n.kind==='scene'&&n.sceneId===this.sceneId)){this.preview=false;this.extra=true;this.route=this.project.sequence.length;this.render();return;}
    this.enterRoute(0);this.pause();
  }
  private seekGlobal(ratio:number):void{
    if(this.extra){this.time=ratio*sceneDuration(this.project,this.sceneId);this.render(true);return;}
    const nodes=this.project.sequence.map((n,i)=>({n,i})).filter(x=>x.n.kind==='scene');let position=ratio*this.totalDuration();
    for(const {n,i}of nodes){if(n.kind!=='scene')continue;const d=sceneDuration(this.project,n.sceneId);if(position<=d){for(let j=0;j<i;j++){const p=this.project.sequence[j];if(p.kind==='stop'&&!this.stopState.has(p.stopId))this.stopState.set(p.stopId,'Пропущено')}this.seekRecorded(i,position);return;}position-=d;}
  }
  private seekRecorded(route:number,time:number):void{
    const target=this.project.sequence[route];if(!target||target.kind!=='scene')return;
    const playing=this.playing;this.cancel();this.preview=false;this.extra=false;this.stop=undefined;this.round=undefined;this.route=route;this.sceneId=target.sceneId;this.phase='scene';this.time=time;this.playing=playing;
    const scene=this.project.scenes.find(s=>s.id===this.sceneId)!;const ranges=utteranceRanges(this.project,this.sceneId);
    if(scene.utteranceIds.length&&time<ranges[ranges.length-1].end){let index=ranges.findIndex(r=>r.end>time);if(index<0)index=ranges.findIndex(r=>r.start>=time);if(index<0)index=ranges.length-1;const r=ranges[index];this.segmentId=r.id;this.segmentEnd=r.end;this.event=r.id;this.queue=scene.utteranceIds.slice(index+1);this.queueDone=()=>this.finishRecordedScene(route);const u=this.project.utterances.find(u=>u.id===r.id)!;if(!u.audioAssetId||!u.duration||u.textHash&&u.audioTextHash&&u.textHash!==u.audioTextHash)this.showMissing(u.id,()=>this.endSegment());}
    this.render(true);
  }
  private phrase(direction:number):void{
    if(this.phase==='game_wait'){this.prompt('word_prompt');return;}
    if(!this.sceneId)return;const ranges=utteranceRanges(this.project,this.sceneId);const i=ranges.findIndex(r=>this.time>=r.start&&this.time<r.end);const target=ranges[Math.max(0,Math.min(ranges.length-1,(i<0?0:i)+direction))];if(!target)return;
    if(this.phase==='scene'&&!this.preview&&!this.extra){this.seekRecorded(this.route,target.start);return;}
    if(this.segmentEnd!==undefined){if(direction>0){this.time=this.segmentEnd;this.endSegment();this.render(true);return;}this.time=Math.max(target.start,utteranceRanges(this.project,this.sceneId).find(r=>r.id===this.segmentId)?.start??0);}
    else{this.time=target.start;this.manualIndex=ranges.indexOf(target);if(this.manual)this.manualScene();}
    this.audio.resetSfx();this.render(true);
  }
  private totalDuration():number{if(this.extra)return sceneDuration(this.project,this.sceneId);return this.recordedDuration;}
  private globalTime():number{if(this.extra)return this.time;return(this.routeRecordedStarts[this.route]??(this.route>=this.project.sequence.length?this.recordedDuration:0))+(this.phase==='scene'&&!this.preview?this.time:0);}
  private playExtra():void{const entry=this.project.extras?.find(n=>n.kind==='scene');if(!entry||entry.kind!=='scene')return;this.cancel();this.extra=true;this.preview=false;this.stop=undefined;this.round=undefined;this.route=this.project.sequence.length;this.phase='scene';this.sceneId=entry.sceneId;this.time=0;this.playing=true;this.render();}
  private zoomContext():void{const stop=this.stop;if(!stop)return;const clip=this.project.clips.find(c=>c.id==='context.'+stop.game.id);if(!clip||clip.enabled===false||this.project.tracks.find(t=>t.id===clip.trackId)?.hidden)return;const url=clip.assetId?assetUrl(this.project,clip.assetId):undefined;if(!url)return;const modal=node<HTMLDialogElement>('dialog','chronicles-context-dialog'),image=node<HTMLImageElement>('img');image.src=url;image.alt='Исходный контекст с сохранённой маской';modal.append(image,button('Закрыть',()=>modal.close()));modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();}
  private buildMarkers():void{
    this.markers.clear();this.stopBar.replaceChildren();
    for(const stop of this.project.stops){const group=node('div','chronicles-stop'),n=stop.id.replace('STOP-','');const host=button('□ Слово Толе '+n,()=>this.startStop(stop,false)),game=button('◇ Интерактив '+n,()=>this.startStop(stop,true),'game-marker');host.title='Передача слова и живой блок';game.title='Запустить игровое вступление';group.append(host,game);this.stopBar.append(group);this.markers.set(stop.id,{host,game});}
    let cursor=0;this.transportChapters=[];this.transportStopPositions=[];this.routeRecordedStarts=[];for(const route of this.project.sequence){this.routeRecordedStarts.push(cursor);if(route.kind==='scene'){const scene=this.project.scenes.find(s=>s.id===route.sceneId)!;const duration=sceneDuration(this.project,scene.id);this.transportChapters.push({id:scene.id,title:scene.title,start:cursor,duration});cursor+=duration;}else this.transportStopPositions.push({id:route.stopId,label:route.stopId.replace('STOP-',''),time:cursor});}this.recordedDuration=cursor;
  }
  private render(seek=false):void{
    const scene=this.project.scenes.find(s=>s.id===this.sceneId);
    this.title.textContent=(this.phase==='reaction'&&this.stop&&!this.preview?this.stop.label:scene?.title??'Хроники Продакшен-Ковчега')+(this.dirty?' · есть несохранённые правки':'');
    this.playButton.textContent=this.playing?'Ⅱ':'▶';this.playButton.setAttribute('aria-pressed',String(this.playing));this.ccButton.setAttribute('aria-pressed',String(this.cc));
    this.previewPlay.textContent=this.playing?'Ⅱ Пауза':'▶ Воспроизвести';
    const waiting=this.phase==='host'?'Ожидание':this.phase.startsWith('game')||this.phase==='reaction'?'Интерактив':clock(this.globalTime());
    if(this.transport){const markers=this.transportStopPositions.map(p=>({...p,state:this.stopState.get(p.id)??'Впереди'}));this.transport.element.hidden=this.panel.isVisible;this.shell.style.paddingBottom=this.panel.isVisible?'0px':this.transport.height+'px';this.transport.update({playing:this.playing,time:this.globalTime(),total:this.totalDuration(),cc:this.cc,muted:this.audio.muted,voiceVolume:this.audio.voiceVolume,musicVolume:this.audio.musicVolume,sfxVolume:this.audio.effectsVolume,currentSceneId:this.sceneId,chapters:this.transportChapters,markers,statusLabel:waiting==='Ожидание'||waiting==='Интерактив'?waiting:undefined});}
    this.timeLabel.textContent=`${waiting} / ${this.totalDuration()?clock(this.totalDuration()):'—'}`;this.progress.value=String(this.totalDuration()?10000*this.globalTime()/this.totalDuration():0);
    for(const [id,m]of this.markers){const state=this.stopState.get(id);for(const b of [m.host,m.game]){const game=b===m.game,hostPhase=['handoff','host'].includes(this.phase),current=this.stop?.id===id&&(game?!hostPhase:hostPhase),done=state==='Пройдено'||!game&&state==='В игре';b.classList.toggle('current',current);const base=game?'◇ Интерактив ':'□ Слово Толе ';b.textContent=base+id.replace('STOP-','')+(done?' ✓':state==='Пропущено'?' ↷':'');const description=current?(game?'В игре':state??'Передача'):done?'Пройдено':state==='Пропущено'?'Пропущено':'Впереди';b.setAttribute('aria-label',base+id.replace('STOP-','')+'. '+description);}}
    if(this.phase==='host'){this.overlayButton.disabled=!this.playing;this.audio.stop();this.captions.textContent='';return;}
    if(!scene)return;
    let clips=activeClips(this.project,this.sceneId,this.time,this.event);
    if(!this.missing.hidden&&this.segmentId){
      const current=scene.utteranceIds.indexOf(this.segmentId);
      const visuals=this.project.clips.filter(c=>c.sceneId===scene.id&&c.enabled!==false&&c.kind==='frame'&&c.start.utteranceId&&scene.utteranceIds.indexOf(c.start.utteranceId)<=current);
      const latest=visuals[visuals.length-1];clips=latest?[latest]:[];
    }
    if(this.stop&&!this.gameView.hidden){
      const contextClip=this.project.clips.find(c=>c.id==='context.'+this.stop!.game.id);
      if(contextClip&&contextClip.enabled!==false&&!this.project.tracks.find(t=>t.id===contextClip.trackId)?.hidden&&!clips.some(c=>c.id===contextClip.id))clips=[...clips,contextClip];
    }
    const frames=clips.filter(c=>c.kind==='frame');let frame=frames[frames.length-1];
    if(!frame&&this.stop&&['game_intro','game_wait','reaction','game_done'].includes(this.phase)&&!this.project.tracks.find(t=>t.id==='V1')?.hidden){
      const introEnd=Math.max(0,...utteranceRanges(this.project,this.stop.gameSceneId).filter(r=>this.stop!.game.introIds.includes(r.id)).map(r=>r.end));
      const allowed=this.project.clips.filter(c=>c.sceneId===this.stop!.gameSceneId&&c.kind==='frame'&&c.enabled!==false&&(!c.event||this.stop!.game.introIds.includes(c.event))&&(resolveTime(this.project,c.sceneId,c.start)??Infinity)<=(this.phase==='game_intro'?Math.min(this.time,introEnd):introEnd));
      frame=allowed[allowed.length-1];
    }
    if(frame){const url=frame.assetId?assetUrl(this.project,frame.assetId):undefined;if(url&&this.frame.getAttribute('src')!==url)this.frame.src=url;if(!url)this.frame.removeAttribute('src');if(this.draggingPreviewId!==frame.id)this.transform(this.frame,frame);this.frame.dataset.clipId=frame.id;}
    else{this.frame.removeAttribute('src');delete this.frame.dataset.clipId;}
    const frameStart=frame?resolveTime(this.project,frame.sceneId,frame.start):null;
    const cleanPicture=frameStart!==null&&frame?.sceneId===this.sceneId&&this.time-frameStart<(frame?.cleanExposure??0);
    const keep=new Set<string>();
    for(const c of clips.filter(c=>!cleanPicture&&['image','nameplate','screen'].includes(c.kind))){
      keep.add(c.id);let layer=this.layers.get(c.id);
      if(!layer){layer=c.kind==='image'?node('img','chronicles-layer'):node('div',c.kind==='nameplate'?'chronicles-name':'chronicles-screen-text');this.layers.set(c.id,layer);this.stage.insertBefore(layer,this.captions);}
      layer.dataset.clipId=c.id;
      if(layer instanceof HTMLImageElement){const url=c.assetId?assetUrl(this.project,c.assetId):undefined;if(url&&layer.getAttribute('src')!==url)layer.src=url;layer.alt='Исходный материал хроник';}
      else layer.textContent=c.title?c.title+'\n'+(c.text??''):c.text??'';
      layer.style.zIndex=String(this.project.tracks.find(t=>t.id===c.trackId)?.order??1);if(this.draggingPreviewId!==c.id)this.transform(layer,c);layer.classList.toggle('chronicles-game-context',c.id.startsWith('context.'));
      if(c.id.startsWith('context.')&&!this.gameView.hidden)layer.style.opacity=String(c.transform?.opacity??1);
    }
    for(const [id,layer]of this.layers)if(!keep.has(id)){layer.remove();this.layers.delete(id)}
    const sub=clips.find(c=>c.kind==='subtitle');const u=this.project.utterances.find(u=>u.id===sub?.utteranceId);
    const voice=u?utteranceRanges(this.project,this.sceneId).find(r=>r.id===u.id):undefined;
    const sourceIn=u?this.project.clips.find(c=>c.sceneId===this.sceneId&&c.kind==='voice'&&c.utteranceId===u.id&&c.enabled!==false)?.sourceIn??0:0;
    const hideCC=this.project.tracks.find(t=>t.id==='T1')?.hidden;
    this.captions.textContent=this.cc&&!hideCC&&this.missing.hidden?(u&&voice?spokenCaption(u,this.time-voice.start+sourceIn):sub?.text??''):'';
    if(sub?.transform){this.captions.style.right='auto';this.captions.style.bottom='auto';this.transform(this.captions,sub);}else for(const prop of ['right','bottom','left','top','width','height','transform','opacity','clip-path'])this.captions.style.removeProperty(prop);
    this.captions.style.color=sub?.color??'';
    this.captions.style.zIndex='15';this.gameView.style.zIndex='12';this.overlay.style.zIndex='20';this.missing.style.zIndex='25';
    const audible=clips.filter(c=>!(c.kind==='voice'&&this.project.utterances.some(u=>u.id===c.utteranceId&&u.textHash&&u.audioTextHash&&u.textHash!==u.audioTextHash)));
    if(this.stop&&this.round&&!this.round.finished&&['game_wait','reaction'].includes(this.phase)){
      const bed=this.project.clips.find(c=>c.sceneId===this.stop!.gameSceneId&&c.trackId==='A5'&&c.assetId&&c.event==='WAIT_'+this.stop!.game.id);
      this.audio.setGameBed(bed?.assetId??this.stop.game.thinkingAssetId,bed?.gain??.2,this.stop.game.kind==='free',bed,this.project);
    }
    this.audio.sync(this.project,audible,this.time,this.playing&&this.missing.hidden&&this.phase!=='game_done',String(this.epoch),seek);
    if(this.panel.isVisible)this.panel.sync(this.sceneId,this.time);
  }
  private transform(element:HTMLElement,c:Clip):void{
    const t=c.transform??{};element.style.left=(t.x??.5)*100+'%';element.style.top=(t.y??.5)*100+'%';element.style.width=(t.width??(c.kind==='frame'?1:.55))*100+'%';element.style.height=t.height!==undefined?t.height*100+'%':c.kind==='frame'?'100%':'auto';element.style.transform=`translate(-50%,-50%) scale(${t.scale??1}) rotate(${t.rotation??0}deg)`;let opacity=t.opacity??1;const r=clipRange(this.project,c);if(r){if(c.fadeIn)opacity*=Math.min(1,Math.max(0,(this.time-r.start)/c.fadeIn));if(c.fadeOut)opacity*=Math.min(1,Math.max(0,(r.end-this.time)/c.fadeOut));}element.style.opacity=String(opacity);element.style.color=c.color??'';element.style.clipPath=t.crop?`inset(${t.crop.y*100}% ${(1-t.crop.x-t.crop.width)*100}% ${(1-t.crop.y-t.crop.height)*100}% ${t.crop.x*100}%)`:'';
  }
  private dragPreview(e:PointerEvent):void{
    if(!this.panel.isVisible||e.button!==0)return;
    const target=(e.target as HTMLElement).closest<HTMLElement>('[data-clip-id]');const id=target?.dataset.clipId;if(!target||!id)return;
    const clip=this.project.clips.find(c=>c.id===id);if(!clip||this.project.tracks.find(t=>t.id===clip.trackId)?.locked)return;
    e.preventDefault();this.draggingPreviewId=id;this.panel.selectClip(id);const bounds=this.stage.getBoundingClientRect(),x=e.clientX,y=e.clientY,base={...clip.transform};let nx=base.x??.5,ny=base.y??.5;
    const move=(event:PointerEvent)=>{nx=Math.max(0,Math.min(1,(base.x??.5)+(event.clientX-x)/bounds.width));ny=Math.max(0,Math.min(1,(base.y??.5)+(event.clientY-y)/bounds.height));target.style.left=nx*100+'%';target.style.top=ny*100+'%';};
    const up=()=>{this.draggingPreviewId='';window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);this.panel.updateClip(id,{transform:{...base,x:nx,y:ny}},'Положение объекта на экране');};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }
  private tick=(now:number):void=>{
    if(this.disposed)return;const dt=Math.min(.1,(now-this.last)/1000);this.last=now;
    if(this.playing&&this.missing.hidden&&!this.audio.buffering&&!['host','game_wait','game_done','idle','end'].includes(this.phase)){
      this.time+=dt;
      if(this.segmentEnd!==undefined&&this.time>=this.segmentEnd)this.endSegment();
      else if(this.segmentEnd===undefined&&this.phase==='scene'&&this.time>=sceneDuration(this.project,this.sceneId)){
        if(this.preview){this.playing=false;this.time=sceneDuration(this.project,this.sceneId);}else this.enterRoute(this.route+1);
      }
    }
    this.render();this.animation=requestAnimationFrame(this.tick);
  };
  private keydown=(e:KeyboardEvent):void=>{
    const target=e.target as HTMLElement;if(target.closest('input,textarea,select,[contenteditable=true]'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){if(this.panel.isVisible)return;e.preventDefault();void this.save().catch(err=>this.message(String(err)));return;}
    if(!e.ctrlKey&&!e.metaKey&&['d','в'].includes(e.key.toLowerCase())&&!(this.phase==='game_wait'&&this.stop?.game.kind==='choice')){e.preventDefault();this.toggleDirector();return;}
    if(this.panel.isVisible){if(e.code==='Space'&&!target.closest('button')){e.preventDefault();this.toggle();}return;}
    if(e.code==='Space'&&!target.closest('button')){e.preventDefault();this.toggle();}
    if(this.phase==='game_wait'&&this.stop?.game.kind==='choice'&&/^[abcd]$/i.test(e.key)){e.preventDefault();this.answer.value=e.key;void this.submit();}
  };
  private visibility=():void=>{if(document.hidden){this.hiddenPaused=this.playing;this.pause();}else if(this.hiddenPaused){this.hiddenPaused=false;this.play();}};
  private beforeUnload=(e:BeforeUnloadEvent):void=>{if(this.dirty){e.preventDefault();e.returnValue='';}};
  destroy():void{this.disposed=true;cancelAnimationFrame(this.animation);this.audio.stop();this.panel.destroy();this.transport?.destroy();this.shell.remove();document.removeEventListener('keydown',this.keydown);document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('beforeunload',this.beforeUnload);window.removeEventListener('resize',this.resizeTransport);}
}
