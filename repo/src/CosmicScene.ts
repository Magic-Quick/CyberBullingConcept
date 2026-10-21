import { Container, Graphics, Sprite } from 'pixi.js';
import { getTexture } from './assetsManager';

interface Star {
  g: Graphics;
  x: number;
  y: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class CosmicScene extends Container {
  private _stars: Star[] = [];
  private _nebulaContainer: Container;
  private _starContainer: Container;
  private _shipContainer: Container;
  private _shipSprite: Sprite;
  private _time = 0;
  private _width = 1280;
  private _height = 720;
  private _isWarping = false;

  constructor() {
    super();

    this._nebulaContainer = new Container();
    this._starContainer = new Container();
    this._shipContainer = new Container();

    this.addChild(this._nebulaContainer);
    this.addChild(this._starContainer);
    this.addChild(this._shipContainer);

    this._shipSprite = new Sprite(getTexture('ship_cistam'));
    this._shipSprite.anchor.set(0.5);
    this._shipContainer.addChild(this._shipSprite);

    this._initStars(180);
    this._initNebula();
  }

  private _initStars(count: number): void {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const z = Math.random() * 0.85 + 0.15; // depth 0.15 to 1.0
      const size = (1 - z) * 2.8 + 0.8;
      const baseAlpha = (1 - z) * 0.6 + 0.4;
      
      const isCyan = Math.random() < 0.2;
      const isAmber = Math.random() < 0.15;
      const color = isCyan ? 0x90e0ef : isAmber ? 0xffb703 : 0xffffff;

      g.circle(0, 0, size);
      g.fill({ color, alpha: 1 });
      this._starContainer.addChild(g);

      this._stars.push({
        g,
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        z,
        size,
        baseAlpha,
        twinkleSpeed: Math.random() * 2.5 + 1.0,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private _initNebula(): void {
    this._nebulaContainer.removeChildren();
    
    // Ambient cosmic glow blobs
    const nebulaColors = [0x480ca8, 0x3a0ca3, 0x7209b7, 0xf72585, 0x03045e];
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      const color = nebulaColors[i % nebulaColors.length];
      const radius = 260 + i * 80;
      g.circle(0, 0, radius);
      g.fill({ color, alpha: 0.08 });
      g.position.set(
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 600
      );
      this._nebulaContainer.addChild(g);
    }
  }

  public update(dt: number): void {
    this._time += dt;

    // Cosmic starfield drift
    const speed = this._isWarping ? 180 : 35;
    for (const star of this._stars) {
      star.x -= speed * (1.2 - star.z) * dt * 2.5;
      star.y += speed * 0.4 * (1.2 - star.z) * dt;

      // Wrap around screen bounds
      const halfW = this._width / 2 + 120;
      const halfH = this._height / 2 + 120;
      if (star.x < -halfW) star.x = halfW;
      if (star.x > halfW) star.x = -halfW;
      if (star.y < -halfH) star.y = halfH;
      if (star.y > halfH) star.y = -halfH;

      star.g.position.set(this._width / 2 + star.x, this._height / 2 + star.y);
      const twinkle = Math.sin(this._time * star.twinkleSpeed + star.twinkleOffset);
      star.g.alpha = star.baseAlpha * (0.65 + 0.35 * twinkle);
    }

    // Ship idle hovering and slow rotation in the cosmic storm
    const hoverY = Math.sin(this._time * 1.2) * 12;
    const hoverX = Math.cos(this._time * 0.8) * 8;
    const tilt = Math.sin(this._time * 0.9) * 0.04;

    this._shipContainer.position.set(this._width / 2 + hoverX, this._height / 2 - 40 + hoverY);
    this._shipSprite.rotation = tilt;

    // Slow nebula rotation
    this._nebulaContainer.position.set(this._width / 2, this._height / 2);
    this._nebulaContainer.rotation = this._time * 0.015;
  }

  public resize(w: number, h: number): void {
    this._width = w;
    this._height = h;

    // Scale ship nicely based on screen size
    const isPortrait = h > w;
    const baseDim = isPortrait ? w * 0.85 : Math.min(w * 0.55, h * 0.6);
    const shipTex = this._shipSprite.texture;
    if (shipTex && shipTex.width > 0) {
      const scale = baseDim / Math.max(shipTex.width, shipTex.height);
      this._shipSprite.scale.set(scale);
    }
  }

  public setWarp(warp: boolean): void {
    this._isWarping = warp;
  }
}
