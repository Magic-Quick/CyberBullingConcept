import plbx from '@playbox-ai/playable-kit/sdk';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { loadAllAssets } from './assetsManager';
import { MovieApp } from './MovieApp';
import { AmbientManager } from './AmbientManager';
import { ClickTracker } from './ClickTracker';
import { updateTweens } from './tween';

let app: Application | undefined;
let movieApp: MovieApp | undefined;
let wasPlayingBeforePause = false;

// Network store URL hooks required by Playbox kit
plbx.set_google_play_url('https://play.google.com/store/apps/details?id=com.playbox.cyberbulling');
plbx.set_app_store_url('https://apps.apple.com/app/id6470000000');

// Handle container network events
plbx.on('pause', () => {
  app?.ticker.stop();
  if (movieApp && movieApp.isPlaying) {
    wasPlayingBeforePause = true;
    movieApp.pause();
  } else {
    wasPlayingBeforePause = false;
  }
});

plbx.on('resume', () => {
  app?.ticker.start();
  if (movieApp && wasPlayingBeforePause) {
    wasPlayingBeforePause = false;
    movieApp.play();
  }
});

plbx.on('resize', () => {
  if (app && movieApp) {
    app.resize();
    movieApp.resize(window.innerWidth, window.innerHeight);
  }
});

// Boot via Playbox SDK gateway
plbx.init(async () => {
  try {
    await (document as any).fonts?.load?.("16px 'PxPlus IBM VGA 8x16'");
    await (document as any).fonts?.load?.("16px 'Fixedsys Excelsior'");
    await (document as any).fonts?.load?.("16px 'Share Tech Mono'");
    await (document as any).fonts?.ready;
  } catch (e) {
    console.warn('[main] font load fallback', e);
  }

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  app = new Application();
  await app.init({
    canvas,
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  // Authentic Ark Terminal Loading Screen (Subtitle Box Style: clean black background, no borders, #00f5d4)
  const loadingContainer = new Container();
  app.stage.addChild(loadingContainer);

  const panelBg = new Graphics();
  loadingContainer.addChild(panelBg);

  const titleText = new Text({
    text: '[ ИНИЦИАЛИЗАЦИЯ СИСТЕМ КОВЧЕГА ]',
    style: new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 2,
    }),
  });
  titleText.anchor.set(0.5);
  loadingContainer.addChild(titleText);

  const statusText = new Text({
    text: 'ЗАГРУЗКА БОРТОВЫХ РЕЛИКВИЙ И КВАРЦЕВЫХ СТЕК...',
    style: new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 12,
      fill: '#00f5d4',
      letterSpacing: 1,
    }),
  });
  statusText.anchor.set(0.5);
  loadingContainer.addChild(statusText);

  const progressBar = new Graphics();
  loadingContainer.addChild(progressBar);

  const percentText = new Text({
    text: '[   0% ]',
    style: new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 1.5,
    }),
  });
  percentText.anchor.set(0.5);
  loadingContainer.addChild(percentText);

  const updateLoadingUI = (ratio: number) => {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const cx = sw / 2;
    const cy = sh / 2;

    const panelW = Math.min(480, sw - 40);
    const panelH = 140;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    panelBg.clear();
    // Clean black rectangle backdrop without borders or corner ticks (exact subtitle box style)
    panelBg.roundRect(px, py, panelW, panelH, 8);
    panelBg.fill({ color: 0x000000, alpha: 0.88 });

    titleText.position.set(cx, cy - 34);
    statusText.position.set(cx, cy - 8);

    const barW = Math.min(360, panelW - 60);
    const barH = 6;
    const bx = cx - barW / 2;
    const by = cy + 18;

    progressBar.clear();
    // Track without borders
    progressBar.roundRect(bx, by, barW, barH, 3);
    progressBar.fill({ color: 0x141824, alpha: 0.9 });

    // Progress fill in subtitle cyan
    const fillW = Math.max(0, Math.min(barW, barW * ratio));
    if (fillW > 0) {
      progressBar.roundRect(bx, by, fillW, barH, 3);
      progressBar.fill({ color: 0x00f5d4 });
    }

    const pct = Math.round(ratio * 100);
    percentText.text = `[ ${pct.toString().padStart(3, ' ')}% ]`;
    percentText.position.set(cx, cy + 44);
  };

  updateLoadingUI(0);

  // Load all assets
  await loadAllAssets((ratio) => {
    updateLoadingUI(ratio);
  });

  app.stage.removeChild(loadingContainer);

  console.log('[main] Assets loaded successfully, creating MovieApp...');
  // Instantiate MovieApp
  movieApp = new MovieApp(app);
  (window as any).__movieApp = movieApp;
  (window as any).__movieAppReady = true;
  console.log('[main] MovieApp created and assigned to window.__movieApp!');
  (window as any).__ambientManager = AmbientManager;
  movieApp.resize(window.innerWidth, window.innerHeight);

  // Resize listener
  window.addEventListener('resize', () => {
    if (app && movieApp) {
      app.resize();
      movieApp.resize(window.innerWidth, window.innerHeight);
    }
  });

  // Ticker loop
  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime / 60; // seconds
    updateTweens(dt);
    movieApp?.update(dt);
  });

  // First frame rendered
  app.render();
  plbx.start();

  // Start ClickTracker
  ClickTracker.start({ redirectAfterClicks: 0 });
});
