import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add _renderDawTimeline method before _setupDebugUI
setup_needle = "  private _setupDebugUI(): void {"

daw_render_code = """  private _renderDawTimeline(): void {
    if (!this._dawTimelineContainer) return;

    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
    const actDuration = Math.max(1, this._actDuration || act.duration || 60);
    const cues = this._directorMusicCues.get(act.id) || [];

    // Clear dynamic layers
    this._dawRulerGraphics.clear();
    this._dawRulerLabelsContainer.removeChildren();
    this._dawLanesBg.clear();
    this._dawLaneLabelsContainer.removeChildren();
    this._dawAmbientLaneContainer.removeChildren();
    this._dawPeaceBlocksContainer.removeChildren();
    this._dawDreadBlocksContainer.removeChildren();

    const DAW_X = -280;
    const DAW_W = 560;
    const TRACK_X = -255;
    const TRACK_W = 530;

    // 1. Ruler
    this._dawRulerGraphics.rect(DAW_X, 0, DAW_W, 18);
    this._dawRulerGraphics.fill({ color: 0x0f172a, alpha: 0.9 });
    this._dawRulerGraphics.stroke({ color: 0x334155, width: 0.8 });

    const stepSec = actDuration <= 50 ? 5 : (actDuration <= 130 ? 10 : (actDuration <= 250 ? 20 : 30));
    const labelStep = stepSec * 2;

    for (let t = 0; t <= actDuration + 0.1; t += stepSec) {
      const rx = TRACK_X + (t / actDuration) * TRACK_W;
      const isMajor = Math.round(t) % labelStep === 0 || t === 0;

      this._dawRulerGraphics.moveTo(rx, isMajor ? 5 : 10);
      this._dawRulerGraphics.lineTo(rx, 17);
      this._dawRulerGraphics.stroke({ color: isMajor ? 0x94a3b8 : 0x475569, width: isMajor ? 1.0 : 0.6 });

      if (isMajor && rx < DAW_X + DAW_W - 25) {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        const timeLabel = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const lbl = new Text({
          text: timeLabel,
          style: new TextStyle({ fontFamily: ['Share Tech Mono', 'monospace'], fontSize: 8, fill: '#94a3b8' }),
        });
        lbl.anchor.set(0.5, 0);
        lbl.position.set(rx, 1);
        this._dawRulerLabelsContainer.addChild(lbl);
      }
    }

    // 2. Lanes Background
    // Lane 1: Dread
    this._dawLanesBg.rect(DAW_X, 20, DAW_W, 22);
    this._dawLanesBg.fill({ color: 0x190b14, alpha: 0.95 });
    this._dawLanesBg.stroke({ color: 0x3d1222, width: 0.6 });

    // Lane 2: Peace
    this._dawLanesBg.rect(DAW_X, 44, DAW_W, 22);
    this._dawLanesBg.fill({ color: 0x091a14, alpha: 0.95 });
    this._dawLanesBg.stroke({ color: 0x133827, width: 0.6 });

    // Lane 3: Ambient
    this._dawLanesBg.rect(DAW_X, 68, DAW_W, 24);
    this._dawLanesBg.fill({ color: 0x0d1a29, alpha: 0.95 });
    this._dawLanesBg.stroke({ color: 0x1a334d, width: 0.6 });

    // Lane Badges
    const badgeDread = new Text({
      text: '💀',
      style: new TextStyle({ fontSize: 11 }),
    });
    badgeDread.anchor.set(0.5);
    badgeDread.position.set(DAW_X + 12, 31);
    this._dawLaneLabelsContainer.addChild(badgeDread);

    const badgePeace = new Text({
      text: '🕊️',
      style: new TextStyle({ fontSize: 11 }),
    });
    badgePeace.anchor.set(0.5);
    badgePeace.position.set(DAW_X + 12, 55);
    this._dawLaneLabelsContainer.addChild(badgePeace);

    const badgeAmb = new Text({
      text: '📻',
      style: new TextStyle({ fontSize: 11 }),
    });
    badgeAmb.anchor.set(0.5);
    badgeAmb.position.set(DAW_X + 12, 80);
    this._dawLaneLabelsContainer.addChild(badgeAmb);

    // 3. Ambient Lane Strip
    const ambStrip = new Graphics();
    ambStrip.rect(TRACK_X, 70, TRACK_W, 20);
    ambStrip.fill({ color: 0x11273f, alpha: 0.85 });
    ambStrip.stroke({ color: 0x00f5d4, width: 0.8 });
    this._dawAmbientLaneContainer.addChild(ambStrip);

    let ambTitle = 'Базовый эмбиент';
    if (this._currentActIndex === 0) {
      ambTitle = `ВСТУПЛЕНИЕ: ${AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Distortion)' : 'Titan Forge'}`;
    } else {
      const curAmbKey = AmbientManager.getLockedTrackForAct(act.id) || AmbientManager.getCurrentTrackKey() || act.audioKey;
      const opt = MovieApp.AMBIENT_OPTIONS.find((o) => o.key === curAmbKey);
      ambTitle = `ЭМБИЕНТ: ${opt ? opt.name : curAmbKey}`;
    }

    const ambTxt = new Text({
      text: ambTitle,
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 9,
        fontWeight: 'bold',
        fill: '#00f5d4',
      }),
    });
    ambTxt.anchor.set(0, 0.5);
    ambTxt.position.set(TRACK_X + 6, 80);
    this._dawAmbientLaneContainer.addChild(ambTxt);

    // 4. Dread Blocks
    const dreadCues = cues.filter((c) => c.category === 'dread');
    dreadCues.forEach((cue) => {
      const opt = MovieApp.DREAD_OPTIONS.find((o) => o.key === cue.key);
      const dur = opt ? opt.dur : 25;
      const startX = TRACK_X + (cue.time / actDuration) * TRACK_W;
      const blockW = Math.max(26, Math.min(TRACK_X + TRACK_W - startX, (dur / actDuration) * TRACK_W));

      const blk = new Graphics();
      blk.rect(startX, 21, blockW, 20);
      blk.fill({ color: 0x470c1b, alpha: 0.90 });
      blk.stroke({ color: 0xef476f, width: 1.2 });
      blk.eventMode = 'static';
      blk.cursor = 'pointer';
      blk.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.seekAudio(cue.time);
      });
      this._dawDreadBlocksContainer.addChild(blk);

      const titleTxt = new Text({
        text: `[${cue.time.toFixed(1)}s] ${opt ? opt.name : cue.name}`,
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: 8,
          fontWeight: 'bold',
          fill: '#ff94aa',
        }),
      });
      titleTxt.anchor.set(0, 0.5);
      titleTxt.position.set(startX + 4, 31);
      this._dawDreadBlocksContainer.addChild(titleTxt);
    });

    // 5. Peace Blocks
    const peaceCues = cues.filter((c) => c.category === 'peace');
    peaceCues.forEach((cue) => {
      const opt = MovieApp.PEACE_OPTIONS.find((o) => o.key === cue.key);
      const dur = opt ? opt.dur : 30;
      const startX = TRACK_X + (cue.time / actDuration) * TRACK_W;
      const blockW = Math.max(26, Math.min(TRACK_X + TRACK_W - startX, (dur / actDuration) * TRACK_W));

      const blk = new Graphics();
      blk.rect(startX, 45, blockW, 20);
      blk.fill({ color: 0x093325, alpha: 0.90 });
      blk.stroke({ color: 0x06d6a0, width: 1.2 });
      blk.eventMode = 'static';
      blk.cursor = 'pointer';
      blk.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.seekAudio(cue.time);
      });
      this._dawPeaceBlocksContainer.addChild(blk);

      const titleTxt = new Text({
        text: `[${cue.time.toFixed(1)}s] ${opt ? opt.name : cue.name}`,
        style: new TextStyle({
          fontFamily: ['Share Tech Mono', 'monospace'],
          fontSize: 8,
          fontWeight: 'bold',
          fill: '#52ffce',
        }),
      });
      titleTxt.anchor.set(0, 0.5);
      titleTxt.position.set(startX + 4, 55);
      this._dawPeaceBlocksContainer.addChild(titleTxt);
    });
  }

  private _setupDebugUI(): void {"""

if setup_needle in content:
    content = content.replace(setup_needle, daw_render_code, 1)
    print("1. Inserted _renderDawTimeline method")
else:
    print("ERROR: setup_needle not found!")
    sys.exit(1)

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 2A applied successfully!")
