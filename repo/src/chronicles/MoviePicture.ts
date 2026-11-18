import type { Scene } from './model';

/** Original five 2.4 s optical wipes, driven by film time so pause/seek remain exact. */
export class MoviePicture {
  readonly element=document.createElement('div');
  private previous?:HTMLImageElement;
  private source='';
  private sceneId='';
  private pendingScene='';
  private start=0;
  private transition?:Scene['transition'];
  constructor(readonly image:HTMLImageElement){this.element.className='chronicles-picture';this.element.append(image);}
  setSource(url:string|undefined,scene:Scene,time:number,seek:boolean,preview:boolean):void{
    if(seek||preview)this.cancel();
    if(!url){this.image.hidden=true;this.image.removeAttribute('src');this.source='';this.sceneId=scene.id;this.cancel();return;}
    this.image.hidden=false;
    if(url===this.source){this.update(time);return;}
    const canWipe=this.source&&this.sceneId!==scene.id&&scene.transition&&scene.transition.type!=='cut'&&!seek&&!preview;
    const outgoing=this.image.cloneNode() as HTMLImageElement;
    this.cancel();this.source=url;this.sceneId=scene.id;
    if(canWipe){
      outgoing.style.width=this.image.offsetWidth+'px';outgoing.style.height=this.image.offsetHeight+'px';outgoing.style.left=this.image.offsetLeft+'px';outgoing.style.top=this.image.offsetTop+'px';
      outgoing.removeAttribute('data-clip-id');outgoing.className='chronicles-frame chronicles-previous-picture';outgoing.hidden=false;
      this.previous=outgoing;this.element.before(outgoing);this.pendingScene=scene.id;this.element.style.clipPath='inset(0 100% 0 0)';
      this.image.onload=()=>{if(this.pendingScene!==scene.id)return;this.pendingScene='';this.transition=scene.transition;this.start=time;this.update(time);};
    }
    this.image.src=url;this.update(time);
  }
  private update(time:number):void{if(!this.transition)return;const p=Math.max(0,Math.min(1,(time-this.start)/(this.transition.duration||2.4)));if(p>=1){this.cancel();return;}this.element.style.clipPath=opticalWipe(this.transition.type,p,this.element.clientWidth,this.element.clientHeight);}
  cancel():void{this.pendingScene='';this.transition=undefined;this.previous?.remove();this.previous=undefined;this.element.style.clipPath='';this.image.onload=null;}
}

export function opticalWipe(type:NonNullable<Scene['transition']>['type'],progress:number,w:number,h:number):string{
  const p=Math.max(0,Math.min(1,progress));
  if(type==='line_lr')return `inset(0 ${(1-p)*100}% 0 0)`;
  if(type==='line_rl')return `inset(0 0 0 ${(1-p)*100}%)`;
  if(type==='line_tb')return `inset(0 0 ${(1-p)*100}% 0)`;
  if(type==='circle_iris')return `circle(${Math.hypot(w/2,h/2)*p}px at 50% 50%)`;
  if(type==='circle_iris_corner')return `circle(${Math.hypot(w*.85,h*.8)*1.15*p}px at 85% 20%)`;
  return '';
}
