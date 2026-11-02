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

  // Simple loading indicator
  const loadingContainer = new Container();
  const loadingText = new Text({
    text: 'ЗАГРУЗКА БОРТОВЫХ СИСТЕМ КОВЧЕГА...',
    style: new TextStyle({
      fontFamily: ['Orbitron', 'monospace', 'sans-serif'],
      fontSize: 14,
      fill: '#ff5e1a',
      letterSpacing: 2,
    }),
  });
  loadingText.anchor.set(0.5);
  loadingText.position.set(window.innerWidth / 2, window.innerHeight / 2);
  loadingContainer.addChild(loadingText);
  app.stage.addChild(loadingContainer);

  const progressBar = new Graphics();
  loadingContainer.addChild(progressBar);

  // Load all assets
  await loadAllAssets((ratio) => {
    progressBar.clear();
    const w = 300;
    const h = 4;
    const x = window.innerWidth / 2 - w / 2;
    const y = window.innerHeight / 2 + 30;
    progressBar.roundRect(x, y, w, h, 2);
    progressBar.fill({ color: 0x1f2233 });
    progressBar.roundRect(x, y, w * ratio, h, 2);
    progressBar.fill({ color: 0xff5e1a });
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
