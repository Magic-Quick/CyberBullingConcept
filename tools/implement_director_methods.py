import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read MovieApp.ts
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect _setupDebugUI and _updateDebugDisplay
idx_setup = content.find('private _setupDebugUI(): void {')
idx_goto = content.find('public goToAct(', idx_setup)

old_debug_block = content[idx_setup:idx_goto]

new_debug_block = '''private _initDirectorMusicCues(): void {
    const defaults: Record<string, { time: number; key: string; category: 'dread' | 'peace' | 'stop' }[]> = {
      act_1_convent: [
        { time: 17.14, key: 'dread_12_predator_digital_drug_28s', category: 'dread' },
      ],
      act_2_sarcophagus: [
        { time: 45.58, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
      act_3_timemachine: [
        { time: 108.62, key: 'peace_03_pin_drop_silence_gentle_resolution_25s', category: 'peace' },
      ],
      act_4_engine: [
        { time: 25.14, key: 'dread_04_predator_chittering_nightmare_25s', category: 'dread' },
        { time: 126.17, key: 'peace_08_pin_drop_silence_reward_grace_60s', category: 'peace' },
      ],
      act_5_clientarchs: [
        { time: 0.00, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },
        { time: 97.96, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
        { time: 140.72, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },
        { time: 208.70, key: 'dread_10_predator_nightmare_drop_52s', category: 'dread' },
      ],
      act_6_punishment: [
        { time: 25.44, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },
        { time: 53.40, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },
      ],
      act_6_reward: [
        { time: 0.00, key: 'peace_08_pin_drop_silence_reward_grace_60s', category: 'peace' },
        { time: 60.18, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
      act_8_outro: [
        { time: 30.62, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
    };

    let overrides: Record<string, { id: string; actId: string; time: number; key: string; name: string; category: 'dread' | 'peace' | 'stop' }[]> = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('cyberbulling_music_cues');
        if (raw) overrides = JSON.parse(raw);
      }
    } catch {}

    for (const act of STORY_ACTS) {
      if (overrides[act.id]) {
        this._directorMusicCues.set(act.id, overrides[act.id]);
      } else if (defaults[act.id]) {
        const cues = defaults[act.id].map((d, i) => {
          let name = d.key;
          if (d.category === 'dread') {
            const opt = MovieApp.DREAD_OPTIONS.find((o) => o.key === d.key);
            if (opt) name = opt.name;
          } else if (d.category === 'peace') {
            const opt = MovieApp.PEACE_OPTIONS.find((o) => o.key === d.key);
            if (opt) name = opt.name;
          } else {
            name = '⏹ Стоп музыки';
          }
          return {
            id: `${act.id}_${i}_${d.time}`,
            actId: act.id,
            time: d.time,
            key: d.key,
            name: name,
            category: d.category,
          };
        });
        this._directorMusicCues.set(act.id, cues);
      } else {
        this._directorMusicCues.set(act.id, []);
      }
    }
  }

  private _saveDirectorMusicCues(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, any> = {};
        for (const [k, v] of this._directorMusicCues.entries()) {
          obj[k] = v;
        }
        window.localStorage.setItem('cyberbulling_music_cues', JSON.stringify(obj));
      }
    } catch {}
  }

  public addDirectorMusicCue(category: 'dread' | 'peace' | 'stop'): void {
    const act = STORY_ACTS[this._currentActIndex];
    if (!act) return;
    const actId = act.id;
    const curTime = Math.round(Math.max(0, this._actTime) * 10) / 10;

    let key = 'stop';
    let name = '⏹ Стоп / Fade Out';

    if (category === 'dread') {
      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex] || MovieApp.DREAD_OPTIONS[0];
      key = opt.key;
      name = `💀 ${opt.name}`;
      AmbientManager.playCinematicCue(key);
    } else if (category === 'peace') {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];
      key = opt.key;
      name = `🕊️ ${opt.name}`;
      AmbientManager.playCinematicCue(key);
    } else {
      AmbientManager.stopCinematicCue(2.5);
    }

    const cues = this._directorMusicCues.get(actId) || [];
    // If a cue already exists within 0.4s, replace it
    const existingIdx = cues.findIndex((c) => Math.abs(c.time - curTime) < 0.4);
    const newCue = {
      id: `${actId}_${Date.now()}`,
      actId,
      time: curTime,
      key,
      name,
      category,
    };

    if (existingIdx !== -1) {
      cues[existingIdx] = newCue;
    } else {
      cues.push(newCue);
    }
    cues.sort((a, b) => a.time - b.time);
    this._directorMusicCues.set(actId, cues);
    this._saveDirectorMusicCues();
    this._setDirectorNotice(`✓ Зафиксировано на ${curTime.toFixed(1)}s: ${name}`);
    this._updateDebugDisplay();
  }

  public deleteDirectorMusicCue(id: string): void {
    const act = STORY_ACTS[this._currentActIndex];
    if (!act) return;
    const cues = (this._directorMusicCues.get(act.id) || []).filter((c) => c.id !== id);
    this._directorMusicCues.set(act.id, cues);
    this._saveDirectorMusicCues();
    this._setDirectorNotice(`✕ Отрезок удалён`);
    this._updateDebugDisplay();
  }

  public nudgeDirectorMusicCue(id: string, deltaSec: number): void {
    const act = STORY_ACTS[this._currentActIndex];
    if (!act) return;
    const cues = this._directorMusicCues.get(act.id) || [];
    const cue = cues.find((c) => c.id === id);
    if (!cue) return;
    cue.time = Math.round(Math.max(0, Math.min(this._actDuration, cue.time + deltaSec)) * 10) / 10;
    cues.sort((a, b) => a.time - b.time);
    this._saveDirectorMusicCues();
    this._setDirectorNotice(`↔ Сдвиг на ${cue.time.toFixed(1)}s: ${cue.name}`);
    this._updateDebugDisplay();
  }

  public exportDirectorCuesJson(): void {
    const obj: Record<string, any> = {};
    for (const [k, v] of this._directorMusicCues.entries()) {
      if (v.length > 0) obj[k] = v;
    }
    const json = JSON.stringify(obj, null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(json);
      }
    } catch {}
    console.log('[AUDIO DIRECTOR] Music Cues JSON:\n', json);
    this._setDirectorNotice(`📋 JSON скопирован в буфер обмена!`);
  }

  public resetDirectorCuesToDefaults(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('cyberbulling_music_cues');
      }
    } catch {}
    this._initDirectorMusicCues();
    this._setDirectorNotice(`↺ Сброшено к исходному канону`);
    this._updateDebugDisplay();
  }

  private _setDirectorNotice(msg: string): void {
    if (this._directorNoticeText) {
      this._directorNoticeText.text = msg;
      this._directorNoticeText.style.fill = '#00f5d4';
    }
  }

  private _checkDirectorMusicCues(currentTime: number): void {
    const act = STORY_ACTS[this._currentActIndex];
    if (!act) return;
    const cues = this._directorMusicCues.get(act.id);
    if (!cues || cues.length === 0) return;

    // Find the latest cue that should be active up to currentTime
    let activeCue: typeof cues[0] | null = null;
    for (const c of cues) {
      if (currentTime >= c.time) {
        activeCue = c;
      } else {
        break;
      }
    }

    if (activeCue && this._lastFiredMusicCueId !== activeCue.id) {
      this._lastFiredMusicCueId = activeCue.id;
      if (activeCue.category === 'stop') {
        AmbientManager.stopCinematicCue(2.5);
      } else {
        AmbientManager.playCinematicCue(activeCue.key);
      }
    }
  }

  private _setupDebugUI(): void {
    this._initDirectorMusicCues();

    // 0. Dedicated always-visible Gear button at top-right
    this._devGearBtn = new Container();
    this._devGearBtn.eventMode = 'static';
    this._devGearBtn.cursor = 'pointer';

    const gearBg = new Graphics();
    gearBg.rect(-16, -16, 32, 32);
    gearBg.fill({ color: 0x090b14, alpha: 0.90 });
    gearBg.stroke({ color: 0x00f5d4, width: 1.2 });
    this._devGearBtn.addChild(gearBg);

    const gearTxt = new Text({
      text: '⚙️',
      style: new TextStyle({ fontSize: 16, fill: '#00f5d4' }),
    });
    gearTxt.anchor.set(0.5);
    this._devGearBtn.addChild(gearTxt);

    this._devGearBtn.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      ClickTracker.exclude();
      this.toggleDevAudioDirector();
    });

    this._uiContainer.addChild(this._devGearBtn);

    // Main Debug Container
    this._debugContainer = new Container();
    this._debugContainer.visible = false;
    this._debugContainer.eventMode = 'static';

    const pill = new Container();
    pill.eventMode = 'static';
    pill.cursor = 'pointer';

    this._debugPillBg = new Graphics();
    this._debugPillBg.rect(-150, -13, 270, 26);
    this._debugPillBg.fill({ color: 0x090b14, alpha: 0.9 });
    this._debugPillBg.stroke({ color: 0x00f5d4, width: 1.2 });
    pill.addChild(this._debugPillBg);

    const pillStyle = new TextStyle({
      fontFamily: ['Share Tech Mono', 'monospace'],
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#00f5d4',
      letterSpacing: 0.5,
    });

    this._debugTrackText = new Text({ text: '🛠️ ЗВУКОВОЙ РЕЖИССЁР', style: pillStyle });
    this._debugTrackText.anchor.set(0.5);
    pill.addChild(this._debugTrackText);

    pill.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      ClickTracker.exclude();
      this.toggleDevAudioDirector();
    });

    this._debugContainer.addChild(pill);

    // Expanded Director Suite Panel (580x440 sharp rectangle, zero rounding, pro dark sci-fi HUD)
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
    this._directorCuesPanel.addChild(btnResetCues);

    // CONTAINER B: Ambient & Transitions (Tab 2)
    this._directorAmbientPanel = new Container();
    this._directorAmbientPanel.position.set(0, 60);
    this._directorAmbientPanel.visible = false;
    this._debugExpandedPanel.addChild(this._directorAmbientPanel);

    // Transition Sound Controls
    this._debugTransLabel = new Text({
      text: 'ПЕРЕХОД: [...]',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#e2e8f0',
      }),
    });
    this._debugTransLabel.anchor.set(0.5, 0);
    this._debugTransLabel.position.set(0, 20);
    this._directorAmbientPanel.addChild(this._debugTransLabel);

    const btnTransPrev = this._createDebugMiniBtn('◄ Пред', () => {
      this._selectedTransSoundIndex = (this._selectedTransSoundIndex - 1 + MovieApp.TRANSITION_SOUNDS_METADATA.length) % MovieApp.TRANSITION_SOUNDS_METADATA.length;
      this._updateDebugDisplay();
    }, 72);
    btnTransPrev.position.set(-155, 48);
    this._directorAmbientPanel.addChild(btnTransPrev);

    const btnTransNext = this._createDebugMiniBtn('След ►', () => {
      this._selectedTransSoundIndex = (this._selectedTransSoundIndex + 1) % MovieApp.TRANSITION_SOUNDS_METADATA.length;
      this._updateDebugDisplay();
    }, 72);
    btnTransNext.position.set(-72, 48);
    this._directorAmbientPanel.addChild(btnTransNext);

    const btnTransTest = this._createDebugMiniBtn('▶ Тест', () => {
      const cur = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex];
      const url = getAudioUrl(cur.key);
      if (url) {
        if (this._transitionAudio) this._transitionAudio.pause();
        const a = new Audio(url);
        a.volume = Math.max(0, Math.min(1.0, this._sfxVolume * cur.gain));
        a.play().catch(() => {});
        this._transitionAudio = a;
      }
    }, 72);
    btnTransTest.position.set(11, 48);
    this._directorAmbientPanel.addChild(btnTransTest);

    const btnTransLock = this._createDebugMiniBtn('★ Закрепить', () => {
      const cur = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex];
      this.setLockedTransitionSound(cur.key);
      this._setDirectorNotice(`★ Переход зафиксирован: ${cur.name}`);
      this._updateDebugDisplay();
    }, 98);
    btnTransLock.position.set(106, 48);
    this._directorAmbientPanel.addChild(btnTransLock);

    // Act Ambient Track Controls
    this._debugAmbientLabel = new Text({
      text: 'ЭМБИЕНТ: [...]',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#e2e8f0',
      }),
    });
    this._debugAmbientLabel.anchor.set(0.5, 0);
    this._debugAmbientLabel.position.set(0, 92);
    this._directorAmbientPanel.addChild(this._debugAmbientLabel);

    const btnAmbPrev = this._createDebugMiniBtn('◄ Пред', () => {
      this._selectedAmbientIndex = (this._selectedAmbientIndex - 1 + MovieApp.AMBIENT_OPTIONS.length) % MovieApp.AMBIENT_OPTIONS.length;
      this._updateDebugDisplay();
    }, 72);
    btnAmbPrev.position.set(-155, 120);
    this._directorAmbientPanel.addChild(btnAmbPrev);

    const btnAmbNext = this._createDebugMiniBtn('След ►', () => {
      this._selectedAmbientIndex = (this._selectedAmbientIndex + 1) % MovieApp.AMBIENT_OPTIONS.length;
      this._updateDebugDisplay();
    }, 72);
    btnAmbNext.position.set(-72, 120);
    this._directorAmbientPanel.addChild(btnAmbNext);

    const btnAmbPlay = this._createDebugMiniBtn('▶ Включить', () => {
      const cur = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex];
      AmbientManager.playTrack(cur.key as any, 0.28, 0.5);
    }, 84);
    btnAmbPlay.position.set(17, 120);
    this._directorAmbientPanel.addChild(btnAmbPlay);

    const btnAmbLock = this._createDebugMiniBtn('★ Закрепить', () => {
      const cur = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex];
      const act = STORY_ACTS[this._currentActIndex];
      const actKey = act ? act.id : `act_${this._currentActIndex}`;
      AmbientManager.setLockedTrackForAct(actKey, cur.key);
      AmbientManager.playTrack(cur.key as any, 0.28, 0.5);
      this._setDirectorNotice(`★ Эмбиент акта зафиксирован: ${cur.name}`);
      this._updateDebugDisplay();
    }, 98);
    btnAmbLock.position.set(119, 120);
    this._directorAmbientPanel.addChild(btnAmbLock);

    // Global Notice / Status Text
    this._directorNoticeText = new Text({
      text: 'Горячие клавиши режиссера: T = Начать страшную, P = Начать добрую, X = Стоп музыки, D = Скрыть панель',
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 9,
        fill: '#94a3b8',
      }),
    });
    this._directorNoticeText.anchor.set(0.5, 0);
    this._directorNoticeText.position.set(0, 418);
    this._debugExpandedPanel.addChild(this._directorNoticeText);

    this._updateDebugDisplay();
  }

  private _createDebugMiniBtn(label: string, onClick: () => void, btnW = 108): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const bg = new Graphics();
    bg.rect(-btnW / 2, -11, btnW, 22);
    bg.fill({ color: 0x141824, alpha: 0.9 });
    bg.stroke({ color: 0x2e3852, width: 1 });
    c.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: ['Share Tech Mono', 'monospace'],
        fontSize: 9,
        fontWeight: 'bold',
        fill: '#e2e8f0',
      }),
    });
    txt.anchor.set(0.5);
    c.addChild(txt);

    c.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      ClickTracker.exclude();
      onClick();
    });

    c.on('pointerenter', () => {
      bg.clear();
      bg.rect(-btnW / 2, -11, btnW, 22);
      bg.fill({ color: 0x242e44, alpha: 0.95 });
      bg.stroke({ color: 0x00f5d4, width: 1.2 });
      txt.style.fill = '#00f5d4';
    });

    c.on('pointerleave', () => {
      bg.clear();
      bg.rect(-btnW / 2, -11, btnW, 22);
      bg.fill({ color: 0x141824, alpha: 0.9 });
      bg.stroke({ color: 0x2e3852, width: 1 });
      txt.style.fill = '#e2e8f0';
    });

    return c;
  }

  public toggleIntroTrack(): void {
    AmbientManager.toggleIntroTrack();
    this._updateDebugDisplay();
  }

  private _updateDebugDisplay(): void {
    if (!this._debugContainer) return;

    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
    const isCuesTab = this._directorActiveTab === 'cues';

    if (this._directorCuesPanel) this._directorCuesPanel.visible = isCuesTab;
    if (this._directorAmbientPanel) this._directorAmbientPanel.visible = !isCuesTab;

    // Update Act HUD
    if (this._directorActTimeText) {
      const curT = Math.max(0, this._actTime).toFixed(1);
      const totT = this._actDuration.toFixed(1);
      this._directorActTimeText.text = `АКТ ${this._currentActIndex}: ${act.title} • ТЕКУЩИЙ КАДР: ${curT}s / ${totT}s`;
    }

    // Update Dread track name
    if (this._directorDreadText) {
      const opt = MovieApp.DREAD_OPTIONS[this._selectedDreadIndex] || MovieApp.DREAD_OPTIONS[0];
      this._directorDreadText.text = `💀 НАГНЕТАЮЩАЯ: [${opt.name}]`;
    }

    // Update Peace track name
    if (this._directorPeaceText) {
      const opt = MovieApp.PEACE_OPTIONS[this._selectedPeaceIndex] || MovieApp.PEACE_OPTIONS[0];
      this._directorPeaceText.text = `🕊️ ДОБРАЯ: [${opt.name}]`;
    }

    // Redraw Active Cues List
    if (this._directorCuesListContainer) {
      this._directorCuesListContainer.removeChildren();
      const cues = this._directorMusicCues.get(act.id) || [];

      if (cues.length === 0) {
        const emptyTxt = new Text({
          text: '(В этом акте пока нет музыкальных отрезков. Нажмите "Начать здесь" для фиксации)',
          style: new TextStyle({ fontFamily: ['Share Tech Mono', 'monospace'], fontSize: 9, fill: '#64748b' }),
        });
        emptyTxt.position.set(0, 4);
        this._directorCuesListContainer.addChild(emptyTxt);
      } else {
        cues.slice(0, 5).forEach((cue, idx) => {
          const row = new Container();
          row.position.set(0, idx * 24);

          const timeTxt = new Text({
            text: `[ ${cue.time.toFixed(1)}s ] ${cue.name}`,
            style: new TextStyle({
              fontFamily: ['Share Tech Mono', 'monospace'],
              fontSize: 9,
              fontWeight: 'bold',
              fill: cue.category === 'dread' ? '#ef476f' : (cue.category === 'peace' ? '#06d6a0' : '#ffd166'),
            }),
          });
          timeTxt.position.set(0, 3);
          row.addChild(timeTxt);

          const btnMinus = this._createDebugMiniBtn('-1s', () => {
            this.nudgeDirectorMusicCue(cue.id, -1.0);
          }, 32);
          btnMinus.position.set(385, 8);
          row.addChild(btnMinus);

          const btnPlus = this._createDebugMiniBtn('+1s', () => {
            this.nudgeDirectorMusicCue(cue.id, +1.0);
          }, 32);
          btnPlus.position.set(425, 8);
          row.addChild(btnPlus);

          const btnDel = this._createDebugMiniBtn('✕', () => {
            this.deleteDirectorMusicCue(cue.id);
          }, 24);
          btnDel.position.set(462, 8);
          row.addChild(btnDel);

          this._directorCuesListContainer.addChild(row);
        });
      }
    }

    // Update Ambient & Transition Labels
    if (this._debugTransLabel) {
      const lockedTrans = this.getLockedTransitionSound();
      const curTrans = MovieApp.TRANSITION_SOUNDS_METADATA[this._selectedTransSoundIndex] || MovieApp.TRANSITION_SOUNDS_METADATA[0];
      const isLocked = curTrans.key === lockedTrans;
      this._debugTransLabel.text = `ПЕРЕХОД: [${curTrans.name}] ${isLocked ? '★ ЗАКРЕПЛЁН' : ''}`;
      this._debugTransLabel.style.fill = isLocked ? '#00f5d4' : '#e2e8f0';
    }

    if (this._debugAmbientLabel) {
      const actKey = act ? act.id : `act_${this._currentActIndex}`;
      const lockedAmb = AmbientManager.getLockedTrackForAct(actKey);
      const curAmb = MovieApp.AMBIENT_OPTIONS[this._selectedAmbientIndex] || MovieApp.AMBIENT_OPTIONS[0];
      const isLocked = curAmb.key === lockedAmb;
      this._debugAmbientLabel.text = `ЭМБИЕНТ АКТА (${this._currentActIndex + 1}): [${curAmb.name}] ${isLocked ? '★ ЗАКРЕПЛЁН' : ''}`;
      this._debugAmbientLabel.style.fill = isLocked ? '#00f5d4' : '#e2e8f0';
    }
  }
'''

content = content[:idx_setup] + new_debug_block + content[idx_goto:]
print('Replaced debug UI and director suite implementation!')

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Phase 3 complete!')
