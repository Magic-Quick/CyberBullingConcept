/** One visibility policy for the opening, recorded film and interactive playback. */
export class ViewerHud {
  private activeUntil=0;
  wake(now:number):void{this.activeUntil=now+2500;}
  state(phase:string,playing:boolean,director:boolean,hovered:boolean,now:number):{hidden:boolean;revealed:boolean}{
    const hidden=director||phase==='idle'||phase==='host'||phase==='game_done';
    return {hidden,revealed:!hidden&&(!playing||hovered||now<this.activeUntil)};
  }
}
