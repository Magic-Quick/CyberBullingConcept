import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the entire panel building block in _setupDebugUI
target_block = """    // Expanded Director Suite Panel (580x440 sharp rectangle, zero rounding, pro dark sci-fi HUD)
    this._debugExpandedPanel = new Container();
    this._debugExpandedPanel.position.set(0, 22);
    this._debugExpandedPanel.visible = false;
    this._debugContainer.addChild(this._debugExpandedPanel);

    const panelBg = new Graphics();
    panelBg.rect(-290, 0, 580, 440);
    panelBg.fill({ color: 0x080a14, alpha: 0.98 });
    panelBg.stroke({ color: 0x00f5d4, width: 1.5 });
    this._debugExpandedPanel.addChild(panelBg);

    // Header Title
    const headerTitle = new Text({
      text: '[ 🎧 РЕЖИССЁР ЗВУКА И МУЗЫКИ • ГОТОВЫЙ ИНСТРУМЕНТ ]',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#00f5d4',
        letterSpacing: 1,
      }),
    });
    headerTitle.anchor.set(0.5, 0);
    headerTitle.position.set(0, 8);
    this._debugExpandedPanel.addChild(headerTitle);

    // Tab 1 & Tab 2 Switcher Buttons
    this._directorTabBtnCues = this._createDebugMiniBtn('🎬 Таймлайны музыки', () => {
      this._directorActiveTab = 'cues';
      this._updateDebugDisplay();
    }, 160);
    this._directorTabBtnCues.position.set(-85, 34);
    this._debugExpandedPanel.addChild(this._directorTabBtnCues);

    this._directorTabBtnAmb = this._createDebugMiniBtn('🎚️ Переходы & Эмбиент', () => {
      this._directorActiveTab = 'ambient';
      this._updateDebugDisplay();
    }, 160);
    this._directorTabBtnAmb.position.set(85, 34);
    this._debugExpandedPanel.addChild(this._directorTabBtnAmb);

    // CONTAINER A: Cues Timeline Director (Tab 1)
    this._directorCuesPanel = new Container();
    this._directorCuesPanel.position.set(0, 60);
    this._debugExpandedPanel.addChild(this._directorCuesPanel);

    // Act time HUD
    this._directorActTimeText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#ffd166',
      }),
    });
    this._directorActTimeText.anchor.set(0.5, 0);
    this._directorActTimeText.position.set(0, 0);
    this._directorCuesPanel.addChild(this._directorActTimeText);

    // --- 1. DREAD / TENSION SECTION ---
    const dreadBox = new Graphics();
    dreadBox.rect(-275, 20, 550, 72);
    dreadBox.fill({ color: 0x140a12, alpha: 0.90 });
    dreadBox.stroke({ color: 0xef476f, width: 1.0 });
    this._directorCuesPanel.addChild(dreadBox);

    this._directorDreadText = new Text({
      text: '💀 НАГНЕТАЮЩАЯ МУЗЫКА:',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#ef476f',
      }),
    });
    this._directorDreadText.anchor.set(0, 0.5);
    this._directorDreadText.position.set(-265, 34);
    this._directorCuesPanel.addChild(this._directorDreadText);

    const btnDreadPrev = this._createDebugMiniBtn('◄', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex - 1 + MovieApp.DREAD_OPTIONS.length) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadPrev.position.set(80, 34);
    this._directorCuesPanel.addChild(btnDreadPrev);

    const btnDreadNext = this._createDebugMiniBtn('►', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex + 1) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadNext.position.set(114, 34);
    this._directorCuesPanel.addChild(btnDreadNext);

    const btnDreadTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnDreadTest.position.set(166, 34);
    this._directorCuesPanel.addChild(btnDreadTest);

    const btnDreadSetStart = this._createDebugMiniBtn('💀 НАЧАТЬ ЗДЕСЬ (T)', () => {
      this.addDirectorMusicCue('dread');
    }, 150);
    btnDreadSetStart.position.set(-185, 68);
    this._directorCuesPanel.addChild(btnDreadSetStart);

    const btnDreadSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnDreadSetStop.position.set(-25, 68);
    this._directorCuesPanel.addChild(btnDreadSetStop);

    // --- 2. PEACE SECTION ---
    const peaceBox = new Graphics();
    peaceBox.rect(-275, 100, 550, 72);
    peaceBox.fill({ color: 0x0a141a, alpha: 0.90 });
    peaceBox.stroke({ color: 0x06d6a0, width: 1.0 });
    this._directorCuesPanel.addChild(peaceBox);

    this._directorPeaceText = new Text({
      text: '🕊️ ДОБРАЯ МУЗЫКА:',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#06d6a0',
      }),
    });
    this._directorPeaceText.anchor.set(0, 0.5);
    this._directorPeaceText.position.set(-265, 114);
    this._directorCuesPanel.addChild(this._directorPeaceText);

    const btnPeacePrev = this._createDebugMiniBtn('◄', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex - 1 + MovieApp.PEACE_OPTIONS.length) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeacePrev.position.set(80, 114);
    this._directorCuesPanel.addChild(btnPeacePrev);

    const btnPeaceNext = this._createDebugMiniBtn('►', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex + 1) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeaceNext.position.set(114, 114);
    this._directorCuesPanel.addChild(btnPeaceNext);

    const btnPeaceTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnPeaceTest.position.set(166, 114);
    this._directorCuesPanel.addChild(btnPeaceTest);

    const btnPeaceSetStart = this._createDebugMiniBtn('🕊️ НАЧАТЬ ЗДЕСЬ (P)', () => {
      this.addDirectorMusicCue('peace');
    }, 150);
    btnPeaceSetStart.position.set(-185, 148);
    this._directorCuesPanel.addChild(btnPeaceSetStart);

    const btnPeaceSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnPeaceSetStop.position.set(-25, 148);
    this._directorCuesPanel.addChild(btnPeaceSetStop);

    // --- 3. ACTIVE CUES LIST OF THIS ACT ---
    const listHeader = new Text({
      text: 'АКТИВНЫЕ МУЗЫКАЛЬНЫЕ ОТРЕЗКИ ЭТОГО АКТА (СДВИГ [-1s] / [+1s]):',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#e2e8f0',
      }),
    });
    listHeader.anchor.set(0, 0);
    listHeader.position.set(-275, 180);
    this._directorCuesPanel.addChild(listHeader);

    this._directorCuesListContainer = new Container();
    this._directorCuesListContainer.position.set(-275, 198);
    this._directorCuesPanel.addChild(this._directorCuesListContainer);

    // --- 4. ACTION BAR: EXPORT JSON & RESET ---
    const btnExportJson = this._createDebugMiniBtn('📋 Скопировать JSON', () => {
      this.exportDirectorCuesJson();
    }, 150);
    btnExportJson.position.set(-185, 342);
    this._directorCuesPanel.addChild(btnExportJson);

    const btnResetCues = this._createDebugMiniBtn('↺ Сбросить к канону', () => {
      this.resetDirectorCuesToDefaults();
    }, 150);
    btnResetCues.position.set(-25, 342);
    this._directorCuesPanel.addChild(btnResetCues);"""

replacement_block = """    // Expanded Director Suite Panel (620x520 sharp rectangle, zero rounding, pro dark sci-fi HUD)
    this._debugExpandedPanel = new Container();
    this._debugExpandedPanel.position.set(0, 22);
    this._debugExpandedPanel.visible = false;
    this._debugContainer.addChild(this._debugExpandedPanel);

    const panelBg = new Graphics();
    panelBg.rect(-310, 0, 620, 520);
    panelBg.fill({ color: 0x080a14, alpha: 0.98 });
    panelBg.stroke({ color: 0x00f5d4, width: 1.5 });
    this._debugExpandedPanel.addChild(panelBg);

    // Header Title
    const headerTitle = new Text({
      text: '[ 🎧 РЕЖИССЁР ЗВУКА И МУЗЫКИ • ГОТОВЫЙ ИНСТРУМЕНТ ]',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#00f5d4',
        letterSpacing: 1,
      }),
    });
    headerTitle.anchor.set(0.5, 0);
    headerTitle.position.set(0, 8);
    this._debugExpandedPanel.addChild(headerTitle);

    // Tab 1 & Tab 2 Switcher Buttons
    this._directorTabBtnCues = this._createDebugMiniBtn('🎬 Таймлайны музыки', () => {
      this._directorActiveTab = 'cues';
      this._updateDebugDisplay();
    }, 160);
    this._directorTabBtnCues.position.set(-85, 32);
    this._debugExpandedPanel.addChild(this._directorTabBtnCues);

    this._directorTabBtnAmb = this._createDebugMiniBtn('🎚️ Переходы & Эмбиент', () => {
      this._directorActiveTab = 'ambient';
      this._updateDebugDisplay();
    }, 160);
    this._directorTabBtnAmb.position.set(85, 32);
    this._debugExpandedPanel.addChild(this._directorTabBtnAmb);

    // CONTAINER A: Cues Timeline Director (Tab 1)
    this._directorCuesPanel = new Container();
    this._directorCuesPanel.position.set(0, 56);
    this._debugExpandedPanel.addChild(this._directorCuesPanel);

    // 1. Act time HUD
    this._directorActTimeText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#ffd166',
      }),
    });
    this._directorActTimeText.anchor.set(0.5, 0);
    this._directorActTimeText.position.set(0, 0);
    this._directorCuesPanel.addChild(this._directorActTimeText);

    // 2. Now Playing Live HUD
    this._directorNowPlayingText = new Text({
      text: 'СЕЙЧАС ЗВУЧИТ: [ 📻 Базовый эмбиент ]',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#00f5d4',
      }),
    });
    this._directorNowPlayingText.anchor.set(0.5, 0);
    this._directorNowPlayingText.position.set(0, 16);
    this._directorCuesPanel.addChild(this._directorNowPlayingText);

    // 3. Act 0 Dedicated Intro Variants Switcher Row
    this._dawIntroVariantsContainer = new Container();
    this._dawIntroVariantsContainer.position.set(0, 32);
    this._dawIntroVariantsContainer.visible = false;
    this._directorCuesPanel.addChild(this._dawIntroVariantsContainer);

    this._btnIntroVar1 = this._createDebugMiniBtn('★ 1: Desolate Cry', () => {
      this.setIntroTrackVariant('desolate_cry');
    }, 210);
    this._btnIntroVar1.position.set(-110, 0);
    this._dawIntroVariantsContainer.addChild(this._btnIntroVar1);

    this._btnIntroVar2 = this._createDebugMiniBtn('2: Titan Forge', () => {
      this.setIntroTrackVariant('titan_forge');
    }, 210);
    this._btnIntroVar2.position.set(110, 0);
    this._dawIntroVariantsContainer.addChild(this._btnIntroVar2);

    // 4. DAW Multi-Track Timeline Container
    this._dawTimelineContainer = new Container();
    this._dawTimelineContainer.position.set(0, 56);
    this._directorCuesPanel.addChild(this._dawTimelineContainer);

    // DAW background & click/scrub listener
    this._dawTimelineBg = new Graphics();
    this._dawTimelineBg.rect(-280, 0, 560, 96);
    this._dawTimelineBg.fill({ color: 0x090d16, alpha: 0.95 });
    this._dawTimelineBg.stroke({ color: 0x1e293b, width: 1.0 });
    this._dawTimelineBg.eventMode = 'static';
    this._dawTimelineBg.cursor = 'pointer';
    this._dawTimelineContainer.addChild(this._dawTimelineBg);

    const handleDawPointer = (e: FederatedPointerEvent) => {
      const local = e.getLocalPosition(this._dawTimelineContainer);
      const ratio = Math.max(0, Math.min(1.0, (local.x - (-255)) / 530));
      const targetTime = ratio * this._actDuration;
      this.seekAudio(targetTime);
    };

    this._dawTimelineBg.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._dawIsDraggingTimeline = true;
      handleDawPointer(e);
    });
    this._dawTimelineBg.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (this._dawIsDraggingTimeline) handleDawPointer(e);
    });
    this._dawTimelineBg.on('pointerup', () => { this._dawIsDraggingTimeline = false; });
    this._dawTimelineBg.on('pointerupoutside', () => { this._dawIsDraggingTimeline = false; });

    this._dawRulerGraphics = new Graphics();
    this._dawTimelineContainer.addChild(this._dawRulerGraphics);

    this._dawRulerLabelsContainer = new Container();
    this._dawTimelineContainer.addChild(this._dawRulerLabelsContainer);

    this._dawLanesBg = new Graphics();
    this._dawTimelineContainer.addChild(this._dawLanesBg);

    this._dawAmbientLaneContainer = new Container();
    this._dawTimelineContainer.addChild(this._dawAmbientLaneContainer);

    this._dawPeaceBlocksContainer = new Container();
    this._dawTimelineContainer.addChild(this._dawPeaceBlocksContainer);

    this._dawDreadBlocksContainer = new Container();
    this._dawTimelineContainer.addChild(this._dawDreadBlocksContainer);

    this._dawLaneLabelsContainer = new Container();
    this._dawTimelineContainer.addChild(this._dawLaneLabelsContainer);

    this._dawPlayhead = new Container();
    this._dawPlayhead.position.set(-255, 0);

    const needleLine = new Graphics();
    needleLine.rect(0, 0, 2, 94);
    needleLine.fill({ color: 0x00f5d4, alpha: 0.9 });
    this._dawPlayhead.addChild(needleLine);

    const needleHead = new Graphics();
    needleHead.moveTo(-4, 0);
    needleHead.lineTo(4, 0);
    needleHead.lineTo(0, 7);
    needleHead.closePath();
    needleHead.fill({ color: 0xffd166, alpha: 1.0 });
    this._dawPlayhead.addChild(needleHead);

    this._dawTimelineContainer.addChild(this._dawPlayhead);

    // --- 5. DREAD / TENSION SECTION ---
    const dreadBox = new Graphics();
    dreadBox.rect(-275, 158, 550, 64);
    dreadBox.fill({ color: 0x140a12, alpha: 0.90 });
    dreadBox.stroke({ color: 0xef476f, width: 1.0 });
    this._directorCuesPanel.addChild(dreadBox);

    this._directorDreadText = new Text({
      text: '💀 НАГНЕТАЮЩАЯ МУЗЫКА:',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#ef476f',
      }),
    });
    this._directorDreadText.anchor.set(0, 0.5);
    this._directorDreadText.position.set(-265, 172);
    this._directorCuesPanel.addChild(this._directorDreadText);

    const btnDreadPrev = this._createDebugMiniBtn('◄', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex - 1 + MovieApp.DREAD_OPTIONS.length) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadPrev.position.set(70, 172);
    this._directorCuesPanel.addChild(btnDreadPrev);

    const btnDreadNext = this._createDebugMiniBtn('►', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex + 1) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadNext.position.set(104, 172);
    this._directorCuesPanel.addChild(btnDreadNext);

    const btnDreadTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnDreadTest.position.set(156, 172);
    this._directorCuesPanel.addChild(btnDreadTest);

    const btnDreadSetStart = this._createDebugMiniBtn('💀 НАЧАТЬ ЗДЕСЬ (T)', () => {
      this.addDirectorMusicCue('dread');
    }, 150);
    btnDreadSetStart.position.set(-185, 202);
    this._directorCuesPanel.addChild(btnDreadSetStart);

    const btnDreadSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnDreadSetStop.position.set(-25, 202);
    this._directorCuesPanel.addChild(btnDreadSetStop);

    // --- 6. PEACE SECTION ---
    const peaceBox = new Graphics();
    peaceBox.rect(-275, 228, 550, 64);
    peaceBox.fill({ color: 0x0a141a, alpha: 0.90 });
    peaceBox.stroke({ color: 0x06d6a0, width: 1.0 });
    this._directorCuesPanel.addChild(peaceBox);

    this._directorPeaceText = new Text({
      text: '🕊️ ДОБРАЯ МУЗЫКА:',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#06d6a0',
      }),
    });
    this._directorPeaceText.anchor.set(0, 0.5);
    this._directorPeaceText.position.set(-265, 242);
    this._directorCuesPanel.addChild(this._directorPeaceText);

    const btnPeacePrev = this._createDebugMiniBtn('◄', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex - 1 + MovieApp.PEACE_OPTIONS.length) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeacePrev.position.set(70, 242);
    this._directorCuesPanel.addChild(btnPeacePrev);

    const btnPeaceNext = this._createDebugMiniBtn('►', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex + 1) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeaceNext.position.set(104, 242);
    this._directorCuesPanel.addChild(btnPeaceNext);

    const btnPeaceTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnPeaceTest.position.set(156, 242);
    this._directorCuesPanel.addChild(btnPeaceTest);

    const btnPeaceSetStart = this._createDebugMiniBtn('🕊️ НАЧАТЬ ЗДЕСЬ (P)', () => {
      this.addDirectorMusicCue('peace');
    }, 150);
    btnPeaceSetStart.position.set(-185, 272);
    this._directorCuesPanel.addChild(btnPeaceSetStart);

    const btnPeaceSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnPeaceSetStop.position.set(-25, 272);
    this._directorCuesPanel.addChild(btnPeaceSetStop);

    // --- 7. ACTIVE CUES LIST OF THIS ACT ---
    const listHeader = new Text({
      text: 'АКТИВНЫЕ МУЗЫКАЛЬНЫЕ ОТРЕЗКИ ЭТОГО АКТА (СДВИГ [-1s] / [+1s]):',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#e2e8f0',
      }),
    });
    listHeader.anchor.set(0, 0);
    listHeader.position.set(-275, 298);
    this._directorCuesPanel.addChild(listHeader);

    this._directorCuesListContainer = new Container();
    this._directorCuesListContainer.position.set(-275, 314);
    this._directorCuesPanel.addChild(this._directorCuesListContainer);

    // --- 8. ACTION BAR: EXPORT JSON & RESET ---
    const btnExportJson = this._createDebugMiniBtn('📋 Скопировать JSON', () => {
      this.exportDirectorCuesJson();
    }, 150);
    btnExportJson.position.set(-185, 412);
    this._directorCuesPanel.addChild(btnExportJson);

    const btnResetCues = this._createDebugMiniBtn('↺ Сбросить к канону', () => {
      this.resetDirectorCuesToDefaults();
    }, 150);
    btnResetCues.position.set(-25, 412);
    this._directorCuesPanel.addChild(btnResetCues);"""

if target_block in content:
    content = content.replace(target_block, replacement_block, 1)
    print("1. Replaced panel layout in _setupDebugUI")
else:
    print("ERROR: target_block not found in _setupDebugUI!")
    sys.exit(1)

# 2. Update _updateDebugDisplay to render DAW timeline and update Intro Variants
update_target = """    // Update Peace track name
    if (this._directorPeaceText) {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];
      this._directorPeaceText.text = `🕊️ ДОБРАЯ: [${opt.name}]`;
    }"""

update_replacement = """    // Update Peace track name
    if (this._directorPeaceText) {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];
      this._directorPeaceText.text = `🕊️ ДОБРАЯ: [${opt.name}]`;
    }

    // Act 0 Intro Variants Button Highlights
    if (this._currentActIndex === 0) {
      if (this._dawIntroVariantsContainer) this._dawIntroVariantsContainer.visible = true;
      const curIntro = AmbientManager.getIntroTrack();
      if (this._btnIntroVar1) {
        const txt = this._btnIntroVar1.children.find((ch): ch is Text => ch instanceof Text);
        if (txt) txt.text = curIntro === 'desolate_cry' ? '★ 1: Desolate Cry (Активен)' : '1: Desolate Cry';
      }
      if (this._btnIntroVar2) {
        const txt = this._btnIntroVar2.children.find((ch): ch is Text => ch instanceof Text);
        if (txt) txt.text = curIntro === 'titan_forge' ? '★ 2: Titan Forge (Активен)' : '2: Titan Forge';
      }
    } else {
      if (this._dawIntroVariantsContainer) this._dawIntroVariantsContainer.visible = false;
    }

    // Redraw Multi-Track DAW Timeline
    this._renderDawTimeline();"""

if update_target in content:
    content = content.replace(update_target, update_replacement, 1)
    print("2. Updated _updateDebugDisplay with DAW timeline rendering and intro variants highlights")
else:
    print("ERROR: update_target not found!")
    sys.exit(1)

# 3. In update(dt), update playhead and live "NOW PLAYING" text
update_dt_target = "    AmbientManager.update(dt);"
update_dt_replacement = """    AmbientManager.update(dt);

    if (this._debugExpandedPanel && this._debugExpandedPanel.visible) {
      const TRACK_X = -255;
      const TRACK_W = 530;
      const actDur = Math.max(1, this._actDuration);
      if (this._dawPlayhead) {
        this._dawPlayhead.position.x = TRACK_X + Math.max(0, Math.min(1.0, this._actTime / actDur)) * TRACK_W;
      }
      if (this._directorNowPlayingText) {
        if (AmbientManager.isCuePlaying()) {
          const a = AmbientManager.getCueAudio();
          const k = AmbientManager.getCueTrackKey();
          const optDread = MovieApp.DREAD_OPTIONS.find((o) => o.key === k);
          const optPeace = MovieApp.PEACE_OPTIONS.find((o) => o.key === k);
          const isDread = Boolean(optDread);
          const name = optDread ? optDread.name : (optPeace ? optPeace.name : (k || 'Музыкальный отрезок'));
          const el = a ? Math.max(0, a.currentTime).toFixed(1) : '0.0';
          const tot = (optDread ? optDread.dur : (optPeace ? optPeace.dur : (a && Number.isFinite(a.duration) ? a.duration : 30))).toFixed(1);
          this._directorNowPlayingText.text = `СЕЙЧАС ЗВУЧИТ: [ ${isDread ? '💀' : '🕊️'} ${name} • ${el}s / ${tot}s ]`;
          this._directorNowPlayingText.style.fill = isDread ? '#ef476f' : '#06d6a0';
        } else {
          const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
          const ambKey = (this._currentActIndex === 0) ? AmbientManager.getIntroTrack() : (AmbientManager.getLockedTrackForAct(act.id) || AmbientManager.getCurrentTrackKey() || act.audioKey);
          const optAmb = MovieApp.AMBIENT_OPTIONS.find((o) => o.key === ambKey);
          const ambName = optAmb ? optAmb.name : ambKey;
          this._directorNowPlayingText.text = `СЕЙЧАС ЗВУЧИТ: [ 📻 Базовый эмбиент: ${ambName} ]`;
          this._directorNowPlayingText.style.fill = '#00f5d4';
        }
      }
    }"""

if update_dt_target in content:
    content = content.replace(update_dt_target, update_dt_replacement, 1)
    print("3. Updated update(dt) with live playhead and now playing text")
else:
    print("ERROR: update_dt_target not found!")
    sys.exit(1)

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 2B applied successfully!")
