import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ensure 24.0s cue in intro_playbox is named '🎬 КУЛЬМИНАЦИЯ / ДРОП ЛОГОТИПА'
intro_cues_old = """          if (act.id === 'intro_playbox') {
            if (d.time === 0.0) {
              name = (AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Вступление)' : 'Titan Forge (Вступление)');
            } else if (d.time === 24.0) {
              name = '🎬 КУЛЬМИНАЦИЯ / ДРОП ЛОГОТИПА';
            }
          }"""

# Check if intro_playbox defaults has name set
target_default = """      intro_playbox: [
        { time: 0.0, key: AmbientManager.getIntroTrack(), category: 'peace' },
        { time: 24.0, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],"""

replacement_default = """      intro_playbox: [
        { time: 0.0, key: AmbientManager.getIntroTrack(), category: 'peace' },
        { time: 24.0, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],"""

# 2. Adjust coordinates in _setupDebugUI
setup_old = """    // 2. Now Playing Live HUD
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
    this._directorCuesPanel.addChild(this._dawTimelineContainer);"""

setup_new = """    // 2. Now Playing Live HUD
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
    this._directorNowPlayingText.position.set(0, 15);
    this._directorCuesPanel.addChild(this._directorNowPlayingText);

    // 3. Act 0 Dedicated Intro Variants Switcher Row
    this._dawIntroVariantsContainer = new Container();
    this._dawIntroVariantsContainer.position.set(0, 40);
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
    this._dawTimelineContainer.position.set(0, 68);
    this._directorCuesPanel.addChild(this._dawTimelineContainer);"""

if setup_old in content:
    content = content.replace(setup_old, setup_new, 1)
    print("1. Adjusted HUD and Timeline Y-offsets")
else:
    print("ERROR: setup_old not found!")
    sys.exit(1)

# Adjust remaining Y-offsets for sections and notice text
sections_old = """    // --- 5. DREAD / TENSION SECTION ---
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

sections_new = """    // --- 5. DREAD / TENSION SECTION ---
    const dreadBox = new Graphics();
    dreadBox.rect(-275, 170, 550, 60);
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
    this._directorDreadText.position.set(-265, 182);
    this._directorCuesPanel.addChild(this._directorDreadText);

    const btnDreadPrev = this._createDebugMiniBtn('◄', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex - 1 + MovieApp.DREAD_OPTIONS.length) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadPrev.position.set(70, 182);
    this._directorCuesPanel.addChild(btnDreadPrev);

    const btnDreadNext = this._createDebugMiniBtn('►', () => {
      this._selectedDreadIndex = (this._selectedDreadIndex + 1) % MovieApp.DREAD_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnDreadNext.position.set(104, 182);
    this._directorCuesPanel.addChild(btnDreadNext);

    const btnDreadTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnDreadTest.position.set(156, 182);
    this._directorCuesPanel.addChild(btnDreadTest);

    const btnDreadSetStart = this._createDebugMiniBtn('💀 НАЧАТЬ ЗДЕСЬ (T)', () => {
      this.addDirectorMusicCue('dread');
    }, 150);
    btnDreadSetStart.position.set(-185, 208);
    this._directorCuesPanel.addChild(btnDreadSetStart);

    const btnDreadSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnDreadSetStop.position.set(-25, 208);
    this._directorCuesPanel.addChild(btnDreadSetStop);

    // --- 6. PEACE SECTION ---
    const peaceBox = new Graphics();
    peaceBox.rect(-275, 236, 550, 60);
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
    this._directorPeaceText.position.set(-265, 248);
    this._directorCuesPanel.addChild(this._directorPeaceText);

    const btnPeacePrev = this._createDebugMiniBtn('◄', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex - 1 + MovieApp.PEACE_OPTIONS.length) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeacePrev.position.set(70, 248);
    this._directorCuesPanel.addChild(btnPeacePrev);

    const btnPeaceNext = this._createDebugMiniBtn('►', () => {
      this._selectedPeaceIndex = (this._selectedPeaceIndex + 1) % MovieApp.PEACE_OPTIONS.length;
      this._updateDebugDisplay();
    }, 28);
    btnPeaceNext.position.set(104, 248);
    this._directorCuesPanel.addChild(btnPeaceNext);

    const btnPeaceTest = this._createDebugMiniBtn('▶ Тест', () => {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex];
      if (opt) AmbientManager.playCinematicCue(opt.key);
    }, 62);
    btnPeaceTest.position.set(156, 248);
    this._directorCuesPanel.addChild(btnPeaceTest);

    const btnPeaceSetStart = this._createDebugMiniBtn('🕊️ НАЧАТЬ ЗДЕСЬ (P)', () => {
      this.addDirectorMusicCue('peace');
    }, 150);
    btnPeaceSetStart.position.set(-185, 274);
    this._directorCuesPanel.addChild(btnPeaceSetStart);

    const btnPeaceSetStop = this._createDebugMiniBtn('⏹ СТОП / FADE OUT (X)', () => {
      this.addDirectorMusicCue('stop');
    }, 150);
    btnPeaceSetStop.position.set(-25, 274);
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
    listHeader.position.set(-275, 302);
    this._directorCuesPanel.addChild(listHeader);

    this._directorCuesListContainer = new Container();
    this._directorCuesListContainer.position.set(-275, 318);
    this._directorCuesPanel.addChild(this._directorCuesListContainer);

    // --- 8. ACTION BAR: EXPORT JSON & RESET ---
    const btnExportJson = this._createDebugMiniBtn('📋 Скопировать JSON', () => {
      this.exportDirectorCuesJson();
    }, 150);
    btnExportJson.position.set(-185, 416);
    this._directorCuesPanel.addChild(btnExportJson);

    const btnResetCues = this._createDebugMiniBtn('↺ Сбросить к канону', () => {
      this.resetDirectorCuesToDefaults();
    }, 150);
    btnResetCues.position.set(-25, 416);
    this._directorCuesPanel.addChild(btnResetCues);"""

if sections_old in content:
    content = content.replace(sections_old, sections_new, 1)
    print("2. Adjusted Sections Y-offsets")
else:
    print("ERROR: sections_old not found!")
    sys.exit(1)

# Adjust notice text Y position so it doesn't collide with cues list
notice_old = """    this._directorNoticeText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#00f5d4',
      }),
    });
    this._directorNoticeText.anchor.set(0.5, 0);
    this._directorNoticeText.position.set(0, 396);
    this._debugExpandedPanel.addChild(this._directorNoticeText);"""

notice_new = """    this._directorNoticeText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#00f5d4',
      }),
    });
    this._directorNoticeText.anchor.set(0.5, 0);
    this._directorNoticeText.position.set(0, 442);
    this._debugExpandedPanel.addChild(this._directorNoticeText);"""

if notice_old in content:
    content = content.replace(notice_old, notice_new, 1)
    print("3. Moved notice text to y=442")
else:
    print("ERROR: notice_old not found!")
    sys.exit(1)

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Spacing fix applied successfully!")
