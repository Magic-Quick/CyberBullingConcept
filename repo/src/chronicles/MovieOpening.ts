import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, CanvasTextMetrics, Texture } from 'pixi.js';
import { getImageUrl, getIntroVideoUrl } from '../assetsManager';
import { SFX } from '../SoundEffects';
import type { OpeningConfig } from './model';
/** Original MovieApp opening artwork, typography, layout and animation, reused verbatim.
 * Only playback ownership moved to the same project clock as narration. */
export class MovieOpening {
  readonly element=document.createElement('div');
  private _introContainer=new Container();
  private _introDisclaimerContainer!:Container;private _introDisclaimerBg!:Graphics;private _introDisclaimerCorners!:Graphics;private _introDisclaimerBadge!:Text;private _introDisclaimerLinesContainer!:Container;
  private _introLogoSprite!:Sprite;private _introRealLogoSprite!:Sprite;private _introStudiosText!:Text;private _introPresentsText!:Text;private _introSeriesContainer!:Container;private _introSeriesLogoSprite!:Sprite;private _introSeriesSubtitle!:Text;private _introCycleSubtitle!:Text;
  private _introLogoBaseScale=.2;private _introLogoBaseY=0;private _introFontScale=1;
  private _disclaimerLineTexts:Text[]=[];private _disclaimerLines:{text:string;width:number}[]=[];private _lastDisclaimerCharCount=-1;private _lastSeriesSubCharCount=-1;
  private _introGlitchSoundPlayed1=false;private _introGlitchSoundPlayed2=false;private _introAmbientStarted=false;
  private _videoElement=document.createElement('video');private _videoPlayPending=false;
  private _introProfile:OpeningConfig;private _isPlaying=false;private _currentActIndex=0;private _actTime=0;private suppressSound=false;
  private phaseLabel=document.createElement('div');
  static async create(settings:OpeningConfig):Promise<MovieOpening>{
    await document.fonts.load('20px "Share Tech Mono"');
    const textures=new Map<string,Texture>();
    await Promise.all([settings.skullLogoKey,settings.studioLogoKey,settings.seriesLogoKey].map(async key=>{const url=getImageUrl(key);if(!url)throw new Error('Не найден исходный логотип: '+key);textures.set(key,await Assets.load<Texture>(url));}));
    const app=new Application();await app.init({backgroundAlpha:0,antialias:true,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2)});
    return new MovieOpening(app,textures,settings);
  }
  private texture(key:string):Texture{return this.textures.get(key)??Texture.EMPTY;}
  private constructor(private app:Application,private textures:Map<string,Texture>,private settings:OpeningConfig){
    this._introProfile=settings;this.element.className='movie-opening';this.element.hidden=true;
    this._videoElement.src=getIntroVideoUrl();this._videoElement.loop=true;this._videoElement.muted=true;this._videoElement.playsInline=true;this._videoElement.preload='auto';
    this.phaseLabel.className='movie-opening-access';this.phaseLabel.setAttribute('role','img');
    this.element.append(this._videoElement,app.canvas,this.phaseLabel);app.stage.addChild(this._introContainer);
    // 0. Disclaimer HUD Card (Cyberpunk Corporate Warning)
    this._introDisclaimerContainer = new Container();
    this._introDisclaimerContainer.alpha = 0;
    this._introContainer.addChild(this._introDisclaimerContainer);
    this._introDisclaimerBg = new Graphics();
    this._introDisclaimerContainer.addChild(this._introDisclaimerBg);
    this._introDisclaimerCorners = new Graphics();
    this._introDisclaimerContainer.addChild(this._introDisclaimerCorners);
    const discBadgeStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#00f5d4',
      align: 'center',
      letterSpacing: 3,
      dropShadow: { alpha: 0.85, blur: 10, color: '#00f5d4', distance: 0 },
    });
    this._introDisclaimerBadge = new Text({ text: '[ ДИСКЛЕЙМЕР ]', style: discBadgeStyle });
    this._introDisclaimerBadge.anchor.set(0.5, 0);
    this._introDisclaimerContainer.addChild(this._introDisclaimerBadge);
    this._introDisclaimerLinesContainer = new Container();
    this._introDisclaimerContainer.addChild(this._introDisclaimerLinesContainer);
    // 1. Skull Logo sprite
    this._introLogoSprite = new Sprite(this.texture(settings.skullLogoKey));
    this._introLogoSprite.anchor.set(0.5);
    this._introLogoSprite.alpha = 0;
    this._introContainer.addChild(this._introLogoSprite);
    this._introRealLogoSprite = new Sprite(this.texture(settings.studioLogoKey));
    this._introRealLogoSprite.anchor.set(0.5);
    this._introRealLogoSprite.alpha = 0;
    this._introContainer.addChild(this._introRealLogoSprite);
    // 2. STUDIOS text (no square brackets, tighter letter spacing)
    const studiosStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 34,
      fontWeight: 'bold',
      fill: '#ffffff',
      letterSpacing: 4,
      dropShadow: { alpha: 0.95, blur: 18, color: '#ff5e1a', distance: 0 },
    });
    this._introStudiosText = new Text({ text: settings.studiosText, style: studiosStyle });
    this._introStudiosText.anchor.set(0.5);
    this._introStudiosText.alpha = 0;
    this._introContainer.addChild(this._introStudiosText);
    // 3. PRESENTS text (no square brackets, tighter letter spacing)
    const presentsStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 4,
      dropShadow: { alpha: 0.95, blur: 16, color: '#00f5d4', distance: 0 },
    });
    this._introPresentsText = new Text({ text: '', style: presentsStyle });
    this._introPresentsText.anchor.set(0.5);
    this._introPresentsText.alpha = 0;
    this._introContainer.addChild(this._introPresentsText);
    // 4. Series Title & Subtitle container (massive movie title card with custom logo!)
    this._introSeriesContainer = new Container();
    this._introSeriesContainer.alpha = 0;
    this._introContainer.addChild(this._introSeriesContainer);
    this._introSeriesLogoSprite = new Sprite(this.texture(settings.seriesLogoKey));
    this._introSeriesLogoSprite.anchor.set(0.5);
    this._introSeriesContainer.addChild(this._introSeriesLogoSprite);
    const seriesSubStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 4,
      dropShadow: { alpha: 0.9, blur: 10, color: '#00f5d4', distance: 0 },
    });
    this._introSeriesSubtitle = new Text({ text: settings.seriesSubtitle, style: seriesSubStyle });
    this._introSeriesSubtitle.anchor.set(0.5);
    this._introSeriesContainer.addChild(this._introSeriesSubtitle);
    const cycleSubStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 8,
      dropShadow: { alpha: 0.95, blur: 16, color: '#00f5d4', distance: 0 },
    });
    this._introCycleSubtitle = new Text({ text: settings.cycleText, style: cycleSubStyle });
    this._introCycleSubtitle.anchor.set(0.5);
    this._introCycleSubtitle.alpha = 0;
    this._introContainer.addChild(this._introCycleSubtitle);
  }
  setConfig(settings:OpeningConfig):void{if(this.settings===settings)return;this.settings=settings;this._introProfile=settings;this._introLogoSprite.texture=this.texture(settings.skullLogoKey);this._introRealLogoSprite.texture=this.texture(settings.studioLogoKey);this._introSeriesLogoSprite.texture=this.texture(settings.seriesLogoKey);this._introStudiosText.text=settings.studiosText;this._introCycleSubtitle.text=settings.cycleText;this.resize(this.app.renderer.width,this.app.renderer.height);for(const key of [settings.skullLogoKey,settings.studioLogoKey,settings.seriesLogoKey]){const url=getImageUrl(key);if(url&&!this.textures.has(key))void Assets.load<Texture>(url).then(texture=>{this.textures.set(key,texture);if(this.settings===settings){this._introLogoSprite.texture=this.texture(settings.skullLogoKey);this._introRealLogoSprite.texture=this.texture(settings.studioLogoKey);this._introSeriesLogoSprite.texture=this.texture(settings.seriesLogoKey);this.resize(this.app.renderer.width,this.app.renderer.height);}}).catch(()=>{});}}
  render(time:number,playing:boolean,seek=false):void{this._isPlaying=playing;this.suppressSound=seek;this._actTime=time;this._introRealLogoSprite.alpha=0;this._updateIntroTimeline(time);const phase=time<this.settings.disclaimerFadeEnd?'disclaimer':time<9?'stars':time<13?'skull':time<this.settings.logoFadeOutTime?'studios':time<this.settings.titleDropTime?'stars':time<this.settings.cycleStartTime?'series':'cycle';this.element.dataset.openingPhase=phase;this.phaseLabel.setAttribute('aria-label',phase==='disclaimer'?this.settings.disclaimerText:phase==='skull'||phase==='studios'?'PLAYBOX STUDIOS PRESENTS':phase==='series'?this.settings.seriesSubtitle:phase==='cycle'?this.settings.cycleText:'Космическая заставка');if(!playing)this._videoElement.pause();}
  resize(w:number,h:number):void{if(w<=0||h<=0)return;this.app.renderer.resize(w,h);const isPortrait=h>w;
    this._introContainer.position.set(w / 2, h / 2);
    // 0. Disclaimer Layout (NO FRAME / BORDER, pure green terminal text, stationary pre-centered lines!)
    this._layoutIntroDisclaimer(w, h, isPortrait);
    const refDim = isPortrait ? Math.min(w / 414, h / 736) : Math.min(w / 1280, h / 720);
    const fontScale = Math.max(0.35, Math.min(1.25, refDim));
    this._introFontScale = fontScale;
    // Playbox Skull Logo & Subtitles: Larger, responsive, minimal gap between Studios and Presents
    const logoMaxH = isPortrait ? h * 0.44 : Math.min(480, h * 0.54);
    this._introLogoBaseScale = logoMaxH / 1536;
    this._introLogoBaseY = isPortrait ? -logoMaxH * 0.22 : -logoMaxH * 0.18;
    this._introLogoSprite.scale.set(this._introLogoBaseScale);
    this._introLogoSprite.position.set(0, this._introLogoBaseY);
    this._introRealLogoSprite.scale.set(this._introLogoBaseScale);
    this._introRealLogoSprite.position.set(0, this._introLogoBaseY);
    const studiosFontSize = Math.round((isPortrait ? 20 : 26) * fontScale);
    const presentsFontSize = Math.round((isPortrait ? 16 : 20) * fontScale);
    this._introStudiosText.style.fontSize = studiosFontSize;
    this._introStudiosText.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);
    this._introStudiosText.position.set(0, isPortrait ? logoMaxH * 0.34 : logoMaxH * 0.32);
    this._introPresentsText.style.fontSize = presentsFontSize;
    this._introPresentsText.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);
    this._introPresentsText.position.set(0, this._introStudiosText.position.y + Math.round((isPortrait ? 40 : 54) * fontScale));
    // Series Title Graphic Logo & Subtitle (Cinematic Scale, balanced typography)
    this._introSeriesContainer.position.set(0, isPortrait ? -30 : -15);
    const titleMaxW = isPortrait ? w * 0.90 : Math.min(w * 0.82, 920);
    const titleMaxH = isPortrait ? h * 0.34 : Math.min(h * 0.46, 420);
    const logoTex = this._introSeriesLogoSprite.texture;
    const texW = logoTex && logoTex.width > 0 ? logoTex.width : 913;
    const texH = logoTex && logoTex.height > 0 ? logoTex.height : 374;
    const titleScale = Math.min(titleMaxW / texW, titleMaxH / texH);
    this._introSeriesLogoSprite.scale.set(titleScale);
    this._introSeriesLogoSprite.position.set(0, 0);
    const logoRenderedH = texH * titleScale;
    // Subtitle "[ ХРОНИКИ ПРОДАКШН-КОВЧЕГА ]": Significantly enlarged to eliminate disparity with main logo
    const seriesSubFontSize = Math.round((isPortrait ? 16 : 22) * fontScale);
    this._introSeriesSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];
    this._introSeriesSubtitle.style.fill = '#00f5d4';
    this._introSeriesSubtitle.style.fontSize = seriesSubFontSize;
    this._introSeriesSubtitle.style.letterSpacing = Math.round((isPortrait ? 3 : 5) * fontScale);
    this._introSeriesSubtitle.position.set(0, logoRenderedH / 2 + Math.round((isPortrait ? 28 : 42) * fontScale));
    // Cycle Subtitle "[ ЧЕТЫРНАДЦАТЫЙ ЦИКЛ ]": Responsive scale
    const cycleFontSize = Math.round((isPortrait ? 20 : 26) * fontScale);
    this._introCycleSubtitle.style.fontFamily = ['Share Tech Mono', 'monospace'];
    this._introCycleSubtitle.style.fill = '#00f5d4';
    this._introCycleSubtitle.style.fontSize = cycleFontSize;
    this._introCycleSubtitle.style.letterSpacing = Math.round((isPortrait ? 6 : 10) * fontScale);
    this._introCycleSubtitle.position.set(0, 0); // Center of screen after main logo disappears
  }
  stop():void{this.element.hidden=true;this._videoElement.pause();this._isPlaying=false;}
  destroy():void{this.stop();this._videoElement.removeAttribute('src');this._videoElement.load();this.app.destroy(true,{children:true});this.element.remove();}
  private _clearDisclaimerLines(): void {
    for (const lineText of this._disclaimerLineTexts) {
      lineText.text = '';
    }
  }
  private _showFullDisclaimerWithCursor(cursor: string): void {
    const totalLines = this._disclaimerLines.length;
    for (let i = 0; i < totalLines; i++) {
      const lineText = this._disclaimerLineTexts[i];
      if (!lineText) continue;
      if (i === totalLines - 1) {
        lineText.text = this._disclaimerLines[i].text + cursor;
      } else {
        lineText.text = this._disclaimerLines[i].text;
      }
    }
  }
  private _showFullDisclaimerWithoutCursor(): void {
    for (let i = 0; i < this._disclaimerLines.length; i++) {
      const lineText = this._disclaimerLineTexts[i];
      if (!lineText) continue;
      lineText.text = this._disclaimerLines[i].text;
    }
  }
  private _getDisclaimerCharAt(charIndex: number): string {
    let count = 0;
    for (const l of this._disclaimerLines) {
      if (charIndex <= count + l.text.length) {
        const offset = charIndex - count - 1;
        return l.text[Math.max(0, offset)] || '';
      }
      count += l.text.length;
    }
    return '';
  }
  private _updateDisclaimerTyping(p: number, cursor: string): void {
    const totalChars = this._disclaimerLines.reduce((sum, l) => sum + l.text.length, 0);
    if (totalChars <= 0) return;
    const chars = Math.max(1, Math.min(totalChars, Math.floor(p * totalChars)));
    if (chars !== this._lastDisclaimerCharCount) {
      const activeLineChar = this._getDisclaimerCharAt(chars);
      if (chars % 2 === 0 || activeLineChar === ' ' || activeLineChar === '.' || activeLineChar === ',' || activeLineChar === ':') {
        if(this._isPlaying&&!this.suppressSound)SFX.playTypewriterTick();
      }
      this._lastDisclaimerCharCount = chars;
    }
    let remaining = chars;
    const totalLines = this._disclaimerLines.length;
    for (let i = 0; i < totalLines; i++) {
      const lineText = this._disclaimerLineTexts[i];
      if (!lineText) continue;
      const lineStr = this._disclaimerLines[i].text;
      const lineLen = lineStr.length;
      if (remaining <= 0) {
        lineText.text = '';
      } else if (remaining < lineLen) {
        lineText.text = lineStr.substring(0, remaining) + cursor;
        remaining = 0;
      } else {
        remaining -= lineLen;
        if (remaining === 0) {
          lineText.text = lineStr + cursor;
        } else {
          lineText.text = lineStr;
        }
      }
    }
  }
  private _layoutIntroDisclaimer(w: number, h: number, isPortrait: boolean): void {
    if (!this._introDisclaimerContainer) return;
    // Responsive reference scaling: depends directly on viewport dimensions
    const refDim = isPortrait ? Math.min(w / 414, h / 736) : Math.min(w / 1280, h / 720);
    const fontScale = Math.max(0.35, Math.min(1.25, refDim));
    this._introFontScale = fontScale;
    const contentW = Math.min(w * 0.88, isPortrait ? 560 * fontScale : 1000 * fontScale);
    // Completely clear borders, corners and backgrounds
    this._introDisclaimerBg.clear();
    this._introDisclaimerCorners.clear();
    // Balanced typography: less disparity between badge and content text
    const badgeFontSize = Math.round((isPortrait ? 20 : 26) * fontScale);
    this._introDisclaimerBadge.style.fontFamily = ['Share Tech Mono', 'monospace'];
    this._introDisclaimerBadge.style.fontSize = badgeFontSize;
    this._introDisclaimerBadge.style.fill = '#00f5d4';
    this._introDisclaimerBadge.style.letterSpacing = Math.round((isPortrait ? 2 : 4) * fontScale);
    this._introDisclaimerBadge.style.align = 'center';
    this._introDisclaimerBadge.anchor.set(0.5, 0);
    this._introDisclaimerBadge.position.set(0, 0);
    const textFontSize = Math.round((isPortrait ? 22 : 28) * fontScale);
    const textLineHeight = Math.round(textFontSize * 1.55);
    const startY = Math.round(badgeFontSize * 1.8);
    const measureStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: textFontSize,
      fontWeight: 'bold',
      letterSpacing: 0.6,
      wordWrap: true,
      wordWrapWidth: contentW,
    });
    const metrics = CanvasTextMetrics.measureText(this.settings.disclaimerText, measureStyle);
    const rawLines = metrics.lines;
    const rawWidths = metrics.lineWidths;
    // Destroy existing line sprites
    for (const t of this._disclaimerLineTexts) {
      t.destroy();
    }
    this._disclaimerLineTexts = [];
    this._disclaimerLines = [];
    const lineStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: textFontSize,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 0.6,
      align: 'left',
      dropShadow: { alpha: 0.85, blur: 8, color: '#00f5d4', distance: 0 },
    });
    for (let i = 0; i < rawLines.length; i++) {
      const lineStr = rawLines[i];
      // Create line text initially with full text to obtain exact Pixi bounds
      const lineText = new Text({ text: lineStr, style: lineStyle });
      const measuredW = lineText.width || rawWidths[i] || 0;
      lineText.anchor.set(0, 0);
      lineText.position.set(-measuredW / 2, startY + i * textLineHeight);
      lineText.text = ''; // Clear for typing playback
      this._introDisclaimerLinesContainer.addChild(lineText);
      this._disclaimerLineTexts.push(lineText);
      this._disclaimerLines.push({ text: lineStr, width: measuredW });
    }
    const totalH = startY + rawLines.length * textLineHeight;
    this._introDisclaimerContainer.position.set(0, -Math.round(totalH / 2));
    // If currently during disclaimer, re-render for current time
    if (this._currentActIndex === 0 && this._actTime < this.settings.disclaimerFadeEnd) {
      this._updateIntroTimeline(this._actTime);
    }
  }
  private _updateIntroTimeline(currentTime: number): void {
    const t = currentTime;
    const currentTrackKey = this.settings.trackKey;
    if (!this._introProfile || this._introProfile.trackKey !== currentTrackKey) {
      this._introProfile = this.settings;
    }
    const profile = this._introProfile;
    const discStart = this.settings.disclaimerStart;
    const discTypeEnd = this.settings.disclaimerTypeEnd;
    const discHoldEnd = this.settings.disclaimerHoldEnd;
    const discFadeEnd = this.settings.disclaimerFadeEnd;
    // Ensure initial music is ignited once from second 0.0
    const introKey = profile.trackKey || this.settings.trackKey;
    if (this._isPlaying && !this._introAmbientStarted) {
      this._introAmbientStarted = true;
      // Music is owned by the project mixer.
    }
    // Phase A: 0.0s - 0.6s: Pure black screen, disclaimer ambient drone hums
    if (t < discStart) {
      if (this._videoElement) {
        this._videoElement.style.opacity = '0';
        this._videoElement.pause();
      }
      this._introDisclaimerContainer.alpha = 0;
      this._clearDisclaimerLines();
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase B: 0.6s - 8.8s: Pure black screen, disclaimer typing out with real keyboard sounds
    else if (t >= discStart && t < discTypeEnd) {
      if (this._videoElement) {
        this._videoElement.style.opacity = '0';
        this._videoElement.pause();
      }
      const p = (t - discStart) / (discTypeEnd - discStart);
      const cursor = Math.floor(t * 5) % 2 === 0 ? ' ▌' : '  ';
      this._introDisclaimerContainer.alpha = Math.min(1, (t - discStart) / 0.4);
      this._updateDisclaimerTyping(p, cursor);
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase C: 8.8s - 11.6s: Pure black screen, disclaimer holds with blinking cursor
    else if (t >= discTypeEnd && t < discHoldEnd) {
      if (this._videoElement) {
        this._videoElement.style.opacity = '0';
        this._videoElement.pause();
      }
      const cursor = Math.floor(t * 3.5) % 2 === 0 ? ' ▌' : '  ';
      this._introDisclaimerContainer.alpha = 1;
      this._showFullDisclaimerWithCursor(cursor);
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // Phase D: 11.6s - 12.8s: Pure black screen, disclaimer dissolves into void
    else if (t >= discHoldEnd && t < discFadeEnd) {
      if (this._videoElement) {
        this._videoElement.style.opacity = '0';
        this._videoElement.pause();
      }
      const fade = Math.max(0, 1 - (t - discHoldEnd) / (discFadeEnd - discHoldEnd));
      this._introDisclaimerContainer.alpha = fade;
      this._showFullDisclaimerWithoutCursor();
      this._introLogoSprite.alpha = 0;
      this._introStudiosText.alpha = 0;
      this._introPresentsText.alpha = 0;
      this._introSeriesContainer.alpha = 0;
      this._introCycleSubtitle.alpha = 0;
    }
    // =========================================================================
    // AFTER DISCLAIMER: MUSIC BEGINS AND STARS APPEAR! (t >= discFadeEnd)
    // All intro music cues and animations are based on mt = (t - discFadeEnd)
    // =========================================================================
    else {
      this._introDisclaimerContainer.alpha = 0;
      this._clearDisclaimerLines();
      const mt = t; // Continuous music timeline from 0.0s!
      // Stars & Cosmic video ignite!
      const starsFadeIn = Math.min(1, Math.max(0, (t - discFadeEnd) / 1.5));
      if (this._videoElement) {
        this._videoElement.style.opacity = String(starsFadeIn);
        if (this._isPlaying && this._videoElement.paused && !this._videoPlayPending) {
          this._videoPlayPending = true;
          this._videoElement.play().catch(() => {}).finally(() => {
            this._videoPlayPending = false;
          });
        } else if (!this._isPlaying && !this._videoElement.paused) {
          this._videoElement.pause();
        }
      }
      // Music begins from 0.0s (ignited once smoothly, not every frame!)
      if (this._isPlaying && !this._introAmbientStarted) {
        this._introAmbientStarted = true;
        // Music is owned by the project mixer.
      }
      // Phase 1 (in music): 7.8s - 9.0s: Space video background drift, ambient begins ("не сразу" - космическая пауза)
      if (mt < 9.0) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introGlitchSoundPlayed1 = false;
        this._introGlitchSoundPlayed2 = false;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 2: 9.0s - 13.0s: Skull logo slowly and smoothly appears over space video ("плавно появлялось")
      else if (mt >= 9.0 && mt < 13.0) {
        const p = (mt - 9.0) / 4.0;
        const skullAlpha = Math.min(1, p);
        const scaleMul = 0.94 + p * 0.06;
        this._introLogoSprite.alpha = skullAlpha;
        this._introRealLogoSprite.alpha = 0;
        this._introLogoSprite.position.set(0, this._introLogoBaseY);
        this._introLogoSprite.scale.set(this._introLogoBaseScale * scaleMul);
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 3: 13.0s - 15.0s: "STUDIOS" glows into visibility
      else if (mt >= 13.0 && mt < 15.0) {
        this._introLogoSprite.alpha = 1;
        this._introRealLogoSprite.alpha = 0;
        this._introLogoSprite.position.set(0, this._introLogoBaseY);
        this._introLogoSprite.scale.set(this._introLogoBaseScale);
        const p = (mt - 13.0) / 2.0;
        this._introStudiosText.alpha = Math.min(1, p);
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 4: 15.0s - logoDisperseTime: Letters "PRESENTS" type out on screen, followed by double electric glitch!
      else if (mt >= 15.0 && mt < profile.logoDisperseTime) {
        this._introStudiosText.alpha = 1;
        const full = this.settings.presentsText;
        const typingSpan = 1.0;
        const p = Math.min(1, (mt - 15.0) / typingSpan);
        const chars = Math.floor(p * full.length);
        this._introPresentsText.text = full.substring(0, chars);
        this._introPresentsText.alpha = 1;
        this._introPresentsText.style.letterSpacing = Math.round(4 * this._introFontScale);
        // Double electric contact glitch AFTER "PRESENTS" is fully typed (mt >= 16.3s)
        // With calibrated delay between glitch 1 and glitch 2:
        // Glitch 1: 16.45s - 16.59s (140ms duration)
        // Delay between: 16.59s - 16.72s (130ms delay)
        // Glitch 2: 16.72s - 16.86s (140ms duration)
        if (mt < 16.40) {
          this._introGlitchSoundPlayed1 = false;
          this._introGlitchSoundPlayed2 = false;
        }
        const isGlitch1 = mt >= 16.45 && mt < 16.59;
        const isGlitch2 = mt >= 16.72 && mt < 16.86;
        if (isGlitch1) {
          if (!this._introGlitchSoundPlayed1) {
            this._introGlitchSoundPlayed1 = true;
            if(this._isPlaying&&!this.suppressSound)SFX.playElectricGlitch();
          }
          this._introLogoSprite.alpha = 0;
          this._introRealLogoSprite.alpha = 1;
          const jx = (Math.random() - 0.5) * 5;
          const jy = (Math.random() - 0.5) * 4;
          this._introRealLogoSprite.position.set(jx, this._introLogoBaseY + jy);
          this._introRealLogoSprite.scale.set(this._introLogoBaseScale);
        } else if (isGlitch2) {
          if (!this._introGlitchSoundPlayed2) {
            this._introGlitchSoundPlayed2 = true;
            if(this._isPlaying&&!this.suppressSound)SFX.playElectricGlitch();
          }
          this._introLogoSprite.alpha = 0;
          this._introRealLogoSprite.alpha = 1;
          const jx = (Math.random() - 0.5) * 5;
          const jy = (Math.random() - 0.5) * 4;
          this._introRealLogoSprite.position.set(jx, this._introLogoBaseY + jy);
          this._introRealLogoSprite.scale.set(this._introLogoBaseScale);
        } else {
          this._introLogoSprite.alpha = 1;
          this._introRealLogoSprite.alpha = 0;
          this._introLogoSprite.position.set(0, this._introLogoBaseY);
          this._introLogoSprite.scale.set(this._introLogoBaseScale);
        }
        if (mt < 16.3) {
          this._introGlitchSoundPlayed1 = false;
        }
        if (mt < 16.65) {
          this._introGlitchSoundPlayed2 = false;
        }
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 5: logoDisperseTime - logoFadeOutTime: Alien-style dispersion and slow fade out into the void
      else if (mt >= profile.logoDisperseTime && mt < profile.logoFadeOutTime) {
        const fadeDur = profile.logoFadeOutTime - profile.logoDisperseTime;
        const fade = Math.max(0, 1 - (mt - profile.logoDisperseTime) / fadeDur);
        this._introLogoSprite.alpha = fade;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = fade;
        this._introPresentsText.alpha = fade;
        this._introPresentsText.text = this.settings.presentsText;
        this._introPresentsText.style.letterSpacing = Math.round((4 + (mt - profile.logoDisperseTime) * 1.5) * this._introFontScale);
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 6: logoFadeOutTime - titleDropTime: THEATRICAL PAUSE IN THE VOID
      // Tension valley in audio, cosmic video drifts silently, audience holds breath
      else if (mt >= profile.logoFadeOutTime && mt < profile.titleDropTime) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introSeriesSubtitle.text = '';
        this._lastSeriesSubCharCount = -1;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 7: titleDropTime - titleFadeOutTime: MAIN TITLE STRIKE ON MUSICAL DROP!
      // Shows series title and animated typewriter subtitle
      else if (mt >= profile.titleDropTime && mt < profile.titleFadeOutTime) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        // Smooth cinematic fade-in from void (2.0s - 2.5s)
        const isDesolate = profile.trackKey === 'desolate_cry';
        const fadeDuration = isDesolate ? 2.5 : 2.0;
        const p = Math.min(1, Math.max(0, (mt - profile.titleDropTime) / fadeDuration));
        const punchScale = 0.95 + p * 0.05;
        this._introSeriesContainer.alpha = p;
        this._introSeriesContainer.scale.set(punchScale);
        this._introCycleSubtitle.alpha = 0;
        // Subtitle typing letter-by-letter with typewriter tick sound, exactly like disclaimer
        const fullSubText = this.settings.seriesSubtitle;
        const typeStart = 28.0;
        const typeDuration = isDesolate ? 1.8 : 1.5;
        if (mt < typeStart) {
          this._introSeriesSubtitle.text = '';
          this._lastSeriesSubCharCount = -1;
        } else if (mt < typeStart + typeDuration) {
          const typeProg = (mt - typeStart) / typeDuration;
          const chars = Math.max(1, Math.min(fullSubText.length, Math.floor(typeProg * fullSubText.length)));
          const cursor = Math.floor(mt * 5) % 2 === 0 ? ' ▌' : '  ';
          this._introSeriesSubtitle.text = fullSubText.substring(0, chars) + cursor;
          if (chars !== this._lastSeriesSubCharCount) {
            if(this._isPlaying&&!this.suppressSound)SFX.playTypewriterTick();
            this._lastSeriesSubCharCount = chars;
          }
        } else {
          this._introSeriesSubtitle.text = fullSubText;
        }
      }
      // Phase 8: titleFadeOutTime - (titleFadeOutTime + 1.5): Main series logo dissolves completely into void
      else if (mt >= profile.titleFadeOutTime && mt < profile.titleFadeOutTime + 1.5) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesSubtitle.text = this.settings.seriesSubtitle;
        const dissolveDur = 1.5;
        const endFade = Math.max(0, 1 - (mt - profile.titleFadeOutTime) / dissolveDur);
        this._introSeriesContainer.alpha = endFade;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 9: Pause in void after main logo is completely gone
      else if (mt >= profile.titleFadeOutTime + 1.5 && mt < profile.cycleStartTime) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 10: cycleStartTime - cycleFadeOutTime: "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" APPEARS IN CENTER OF SCREEN!
      else if (mt >= profile.cycleStartTime && mt < profile.cycleFadeOutTime) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        const cycleFadeSpeed = 1.0;
        const cp = Math.min(1, (mt - profile.cycleStartTime) / cycleFadeSpeed);
        this._introCycleSubtitle.alpha = cp;
        // Gentle cinematic push forward (0.97 -> 1.03)
        const scaleP = 0.97 + Math.min(0.06, (mt - profile.cycleStartTime) * 0.012);
        this._introCycleSubtitle.scale.set(scaleP);
      }
      // Phase 11: cycleFadeOutTime - (cycleFadeOutTime + 1.5): "ЧЕТЫРНАДЦАТЫЙ ЦИКЛ" dissolves into void
      else if (mt >= profile.cycleFadeOutTime && mt < profile.cycleFadeOutTime + 1.5) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        const dissolveDur = 1.5;
        const cycleFade = Math.max(0, 1 - (mt - profile.cycleFadeOutTime) / dissolveDur);
        this._introCycleSubtitle.alpha = cycleFade;
      }
      // Phase 12: Both dissolved; intro ambient resolves naturally in calm valley until introEndTime
      else if (mt >= profile.cycleFadeOutTime + 1.5 && mt < profile.introEndTime) {
        this._introLogoSprite.alpha = 0;
        this._introRealLogoSprite.alpha = 0;
        this._introStudiosText.alpha = 0;
        this._introPresentsText.alpha = 0;
        this._introSeriesContainer.alpha = 0;
        this._introCycleSubtitle.alpha = 0;
      }
      // Phase 13: introEndTime+: Seamless handover to Prologue (ambient plays down to quiet valley, then hands over)
      else if (mt >= profile.introEndTime) {
        // Route completion belongs to the project clock.
      }
    }
  }
}
