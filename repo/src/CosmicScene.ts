import { Container } from 'pixi.js';

export class CosmicScene extends Container {
  constructor() {
    super();
    this.visible = false;
  }

  public update(_dt: number): void {}
  public resize(_w: number, _h: number): void {}
  public setWarp(_warp: boolean): void {}
  public setShipVisible(_visible: boolean): void {}
}
