import type { Clip } from './model';
import { typedBadge } from './presentation';

/** Original MovieApp corner quote badge: square avatar, white name, cyan ark title. */
export function createCharacterBadge(clip:Clip,avatar:string|undefined):HTMLElement {
  const badge=document.createElement('div');badge.className='chronicles-name chronicles-character-badge';
  if(avatar){const image=document.createElement('img');image.className='chronicles-badge-avatar';image.src=avatar;image.alt='';badge.append(image);}
  const words=document.createElement('div');words.className='chronicles-badge-words';
  const full=typedBadge(clip.text??'',clip.title??'',0,false);
  for(const [key,text] of [['name',full.name],['title',full.title]]){
    const line=document.createElement('div');line.className='chronicles-badge-'+key;
    const measure=document.createElement('span');measure.className='chronicles-badge-measure';measure.textContent=text;measure.setAttribute('aria-hidden','true');
    const typed=document.createElement('span');typed.className='chronicles-badge-typed';line.append(measure,typed);words.append(line);
  }
  badge.append(words);return badge;
}
export function updateCharacterBadge(badge:HTMLElement,clip:Clip,elapsed:number,playTick:boolean,tick:()=>void,avatar?:string):void{
  if(badge.dataset.avatar!==avatar){let image=badge.querySelector<HTMLImageElement>('.chronicles-badge-avatar');if(!avatar)image?.remove();else{if(!image){image=document.createElement('img');image.className='chronicles-badge-avatar';image.alt='';badge.prepend(image);}image.src=avatar;}badge.dataset.avatar=avatar??'';}
  const text=typedBadge(clip.text??'',clip.title??'',elapsed,clip.typewriter!==false);
  const signature=clip.text+'|'+clip.title;
  const previous=badge.dataset.signature===signature?Number(badge.dataset.typedCount??-1):-1;
  if(previous===text.count)return;
  badge.dataset.signature=signature;
  const full=typedBadge(clip.text??'',clip.title??'',0,false),measure=badge.querySelectorAll('.chronicles-badge-measure');measure[0].textContent=full.name;measure[1].textContent=full.title;
  const lines=badge.querySelectorAll('.chronicles-badge-typed');lines[0].textContent=text.name;lines[1].textContent=text.title;
  badge.dataset.typedCount=String(text.count);
  if(playTick&&previous>=0&&text.count>previous&&text.count-previous<=4)tick();
}
