with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update render() method
old_render = """  public render(): void {
    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
    this._currentActDuration = act.duration || 45.5;
    const actId = act.id;
    const currentCues = this._cuesByAct[actId] || [];

    // Filter cues by type
    const dreadCues = currentCues.filter(c => c.type === 'dread');
    const peaceCues = currentCues.filter(c => c.type === 'peace');
    const ambientCue = {
      id: 'ambient_base_lane',
      actId: actId,
      type: 'ambient' as const,
      cueKey: (this._currentActIndex === 0) ? AmbientManager.getIntroTrack() : (AmbientManager.getLockedTrackForAct(actId) || act.audioKey || 'desolate_cry'),
      title: (this._currentActIndex === 0)
        ? `📻 ФОН: ${AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Эмбиент бездны)' : 'Titan Forge (Кузница титанов)'}`
        : `📻 БАЗОВЫЙ ЭМБИЕНТ: [ ${act.title} ]`,
      startTime: 0,
      duration: this._currentActDuration
    };

    const selectedCue = currentCues.find(c => c.id === this._selectedCueId);

    // Generate Act Tabs HTML
    const actTabsHtml = STORY_ACTS.map((a, idx) => {
      const activeCls = (idx === this._currentActIndex) ? 'active' : '';
      return `<button class="pr-act-tab ${activeCls}" data-act-idx="${idx}">[ ${idx}: ${a.badge || a.title} ]</button>`;
    }).join('');

    // Generate Inspector HTML
    let inspectorHtml = '';
    if (selectedCue) {
      const badgeCls = selectedCue.type === 'dread' ? 'pr-badge-dread' : 'pr-badge-peace';
      const typeLabel = selectedCue.type === 'dread' ? '💀 НАГНЕТАНИЕ' : '🕊️ ДОБРАЯ МУЗЫКА';
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge ${badgeCls}">${typeLabel}</span>
          <span style="font-weight: bold; color: #f8fafc;">${selectedCue.title}</span>
          <span style="color: #64748b;">|</span>
          <span>Начало:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-start="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-start="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.startTime.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-start="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-start="+1.0">+1s</button>
          </div>
          <span>Длительность:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-dur="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.duration.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-dur="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="+1.0">+1s</button>
          </div>
          <span>Конец: <b style="color: #38bdf8; font-family: monospace;">${(selectedCue.startTime + selectedCue.duration).toFixed(2)}s</b></span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ТРЕК</button>
          <button class="pr-btn pr-btn-close" id="pr-delete-cue-btn">🗑️ УДАЛИТЬ</button>
        </div>
      `;
    } else {
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span style="color: #94a3b8;">💡 Кликните на любой отрезок трека для выделения, растягивайте края или двигайте блок.</span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-primary" id="pr-add-cue-btn">➕ ДОБАВИТЬ ОТРЕЗОК</button>
        </div>
      `;
    }

    // Generate Ruler Ticks HTML (every 5 seconds / 1 second)
    const totalSec = Math.ceil(this._currentActDuration);
    let rulerTicksHtml = '';
    const stepSec = totalSec <= 60 ? 5 : 10;
    for (let s = 0; s <= totalSec; s += stepSec) {
      const pct = (s / this._currentActDuration) * 100;
      if (pct > 100) break;
      const m = Math.floor(s / 60);
      const remS = s % 60;
      const timeStr = `${m}:${remS < 10 ? '0' : ''}${remS}`;
      rulerTicksHtml += `
        <div class="pr-ruler-tick major" style="left: ${pct}%;"></div>
        <div class="pr-ruler-label" style="left: ${pct}%;">${timeStr}</div>
      `;
    }

    // Render HTML structure
    this._container.innerHTML = `
      <!-- TOP TOOLBAR -->
      <div class="pr-toolbar">
        <div class="pr-toolbar-left">
          <span class="pr-logo">PREMIERE AUDIO STUDIO</span>
          <div class="pr-act-tabs">${actTabsHtml}</div>
        </div>
        <div class="pr-toolbar-actions">
          <button class="pr-btn pr-btn-primary" id="pr-save-btn">💾 СОХРАНИТЬ</button>
          <button class="pr-btn pr-btn-warning" id="pr-copy-config-btn">📋 СКОПИРОВАТЬ КОНФИГ</button>
          <button class="pr-btn" id="pr-fullscreen-btn">${this._isFullscreen ? '🗗 СВЕРНУТЬ' : '⛶ НА ВЕСЬ ЭКРАН'}</button>
          <button class="pr-btn pr-btn-close" id="pr-close-btn">✖ ЗАКРЫТЬ (ESC)</button>
        </div>
      </div>

      <!-- INSPECTOR BAR -->
      <div class="pr-inspector">${inspectorHtml}</div>

      <!-- MAIN TIMELINE -->
      <div class="pr-workspace">
        <!-- TRACK HEADERS -->
        <div class="pr-track-headers">
          <div class="pr-track-header-spacer">TRACKS / СЛОИ</div>
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-dread"></div>
              <span>💀 Нагнетание</span>
            </div>
            <span style="font-size: 10px; color: #f43f5e; font-weight: bold;">Т1</span>
          </div>
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-peace"></div>
              <span>🕊️ Добрая музыка</span>
            </div>
            <span style="font-size: 10px; color: #10b981; font-weight: bold;">Т2</span>
          </div>
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-ambient"></div>
              <span>📻 Базовый эмбиент</span>
            </div>
            <span style="font-size: 10px; color: #38bdf8; font-weight: bold;">Т3</span>
          </div>
        </div>

        <!-- TIMELINE AREA -->
        <div class="pr-timeline-scroll" id="pr-timeline-scroll">
          <!-- RULER -->
          <div class="pr-ruler" id="pr-ruler">${rulerTicksHtml}</div>

          <!-- LANE 1: DREAD -->
          <div class="pr-lane" id="pr-lane-dread"></div>

          <!-- LANE 2: PEACE -->
          <div class="pr-lane" id="pr-lane-peace"></div>

          <!-- LANE 3: AMBIENT -->
          <div class="pr-lane" id="pr-lane-ambient"></div>

          <!-- PLAYHEAD NEEDLE -->
          <div class="pr-playhead" id="pr-playhead" style="left: 0%;">
            <div class="pr-playhead-cap"></div>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
    this._attachEventListeners();
    this._renderClips(dreadCues, peaceCues, ambientCue);
    this.updatePlayhead(this._currentTime);
  }"""

new_render = """  public render(): void {
    const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
    this._currentActDuration = act.duration || 45.5;
    const actId = act.id;
    const currentCues = this._cuesByAct[actId] || [];

    // Filter cues by type
    const dreadCues = currentCues.filter(c => c.type === 'dread');
    const peaceCues = currentCues.filter(c => c.type === 'peace');
    const ambientCue = {
      id: 'ambient_base_lane',
      actId: actId,
      type: 'ambient' as const,
      cueKey: (this._currentActIndex === 0) ? AmbientManager.getIntroTrack() : (AmbientManager.getLockedTrackForAct(actId) || act.audioKey || 'desolate_cry'),
      title: (this._currentActIndex === 0)
        ? `📻 ФОН: ${AmbientManager.getIntroTrack() === 'desolate_cry' ? 'Desolate Cry (Эмбиент бездны)' : 'Titan Forge (Кузница титанов)'}`
        : `📻 БАЗОВЫЙ ЭМБИЕНТ: [ ${act.title} ]`,
      startTime: 0,
      duration: this._currentActDuration
    };

    // Video / Montage Cuts for current act
    let videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string }[] = [];
    if (this._currentActIndex === 0) {
      videoCuts = INTRO_SHOTS;
    } else if (act.id === 'act_7_song') {
      videoCuts = CONCERT_SEQUENCE_CUTS;
    } else if (NARRATOR_CUTS[act.id]) {
      videoCuts = NARRATOR_CUTS[act.id];
    }

    const selectedCue = currentCues.find(c => c.id === this._selectedCueId);
    const isAmbientSelected = this._selectedCueId === 'ambient_base_lane';

    // Generate Act Tabs HTML
    const actTabsHtml = STORY_ACTS.map((a, idx) => {
      const activeCls = (idx === this._currentActIndex) ? 'active' : '';
      return `<button class="pr-act-tab ${activeCls}" data-act-idx="${idx}">[ ${idx}: ${a.badge || a.title} ]</button>`;
    }).join('');

    // Generate Inspector HTML
    let inspectorHtml = '';
    if (isAmbientSelected) {
      const currentAmbKey = (this._currentActIndex === 0)
        ? AmbientManager.getIntroTrack()
        : (AmbientManager.getLockedTrackForAct(act.id) || act.audioKey || 'desolate_cry');
      const opt = AVAILABLE_TRACK_OPTIONS.find(o => o.key === currentAmbKey);
      const name = (this._currentActIndex === 0)
        ? (currentAmbKey === 'desolate_cry' ? 'Desolate Cry (Эмбиент бездны)' : 'Titan Forge (Кузница титанов)')
        : (opt ? opt.name : currentAmbKey);

      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge pr-badge-ambient">📻 БАЗОВЫЙ ЭМБИЕНТ</span>
          <span style="font-weight: bold; color: #f8fafc;">${name}</span>
          <span style="color: #64748b;">|</span>
          <span style="color: #94a3b8;">Длительность: <b style="color: #38bdf8; font-family: monospace;">${this._currentActDuration.toFixed(1)}s (Весь акт)</b></span>
          <span style="color: #64748b;">|</span>
          <span style="color: #94a3b8;">Режим: <b style="color: #38bdf8;">Непрерывная подложка</b></span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ТРЕК</button>
        </div>
      `;
    } else if (selectedCue) {
      const badgeCls = selectedCue.type === 'dread' ? 'pr-badge-dread' : 'pr-badge-peace';
      const typeLabel = selectedCue.type === 'dread' ? '💀 НАГНЕТАНИЕ' : '🕊️ ДОБРАЯ МУЗЫКА';
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span class="pr-inspector-badge ${badgeCls}">${typeLabel}</span>
          <span style="font-weight: bold; color: #f8fafc;">${selectedCue.title}</span>
          <span style="color: #64748b;">|</span>
          <span>Начало:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-start="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-start="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.startTime.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-start="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-start="+1.0">+1s</button>
          </div>
          <span>Длительность:</span>
          <div class="pr-nudge-group">
            <button class="pr-nudge-btn" data-nudge-dur="-1.0">-1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="-0.1">-0.1s</button>
            <span class="pr-nudge-val">${selectedCue.duration.toFixed(2)}s</span>
            <button class="pr-nudge-btn" data-nudge-dur="+0.1">+0.1s</button>
            <button class="pr-nudge-btn" data-nudge-dur="+1.0">+1s</button>
          </div>
          <span>Конец: <b style="color: #38bdf8; font-family: monospace;">${(selectedCue.startTime + selectedCue.duration).toFixed(2)}s</b></span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-warning" id="pr-replace-track-btn">🔄 ЗАМЕНИТЬ ТРЕК</button>
          <button class="pr-btn pr-btn-close" id="pr-delete-cue-btn">🗑️ УДАЛИТЬ</button>
        </div>
      `;
    } else {
      inspectorHtml = `
        <div class="pr-inspector-info">
          <span style="color: #94a3b8;">💡 Кликните на любой отрезок (или базовый эмбиент) для выделения, обрезки или замены трека.</span>
        </div>
        <div class="pr-inspector-actions">
          <button class="pr-btn pr-btn-primary" id="pr-add-cue-btn">➕ ДОБАВИТЬ ОТРЕЗОК</button>
        </div>
      `;
    }

    // Generate Ruler Ticks HTML (every 5 seconds / 1 second)
    const totalSec = Math.ceil(this._currentActDuration);
    let rulerTicksHtml = '';
    const stepSec = totalSec <= 60 ? 5 : 10;
    for (let s = 0; s <= totalSec; s += stepSec) {
      const pct = (s / this._currentActDuration) * 100;
      if (pct > 100) break;
      const m = Math.floor(s / 60);
      const remS = s % 60;
      const timeStr = `${m}:${remS < 10 ? '0' : ''}${remS}`;
      rulerTicksHtml += `
        <div class="pr-ruler-tick major" style="left: ${pct}%;"></div>
        <div class="pr-ruler-label" style="left: ${pct}%;">${timeStr}</div>
      `;
    }

    // Ruler Cut Markers
    videoCuts.forEach(cut => {
      const cutPct = (cut.time / this._currentActDuration) * 100;
      if (cutPct >= 0 && cutPct <= 100) {
        const labelText = cut.label || cut.characterName || cut.texKey || 'Склейка';
        rulerTicksHtml += `<div class="pr-ruler-cut-mark" style="left: ${cutPct}%;" title="🎬 ${labelText} [ ${cut.time.toFixed(1)}s ]" data-cut-time="${cut.time}"></div>`;
      }
    });

    // Mute states
    const dreadMuted = AmbientManager.isCategoryMuted('dread');
    const peaceMuted = AmbientManager.isCategoryMuted('peace');
    const ambientMuted = AmbientManager.isCategoryMuted('ambient');

    // Render HTML structure
    this._container.innerHTML = `
      <!-- TOP TOOLBAR -->
      <div class="pr-toolbar">
        <div class="pr-toolbar-left">
          <span class="pr-logo">PREMIERE AUDIO STUDIO</span>
          <div class="pr-act-tabs">${actTabsHtml}</div>
        </div>
        <div class="pr-toolbar-actions">
          <button class="pr-btn pr-btn-primary" id="pr-save-btn">💾 СОХРАНИТЬ</button>
          <button class="pr-btn pr-btn-warning" id="pr-copy-config-btn">📋 СКОПИРОВАТЬ КОНФИГ</button>
          <button class="pr-btn" id="pr-fullscreen-btn">${this._isFullscreen ? '🗗 СВЕРНУТЬ' : '⛶ НА ВЕСЬ ЭКРАН'}</button>
          <button class="pr-btn pr-btn-close" id="pr-close-btn">✖ ЗАКРЫТЬ (ESC)</button>
        </div>
      </div>

      <!-- INSPECTOR BAR -->
      <div class="pr-inspector">${inspectorHtml}</div>

      <!-- MAIN TIMELINE -->
      <div class="pr-workspace">
        <!-- TRACK HEADERS -->
        <div class="pr-track-headers">
          <div class="pr-track-header-spacer">TRACKS / СЛОИ</div>
          
          <!-- V1: VIDEO CUTS -->
          <div class="pr-track-header pr-track-header-video">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-video"></div>
              <span>🎬 Кадры / Склейки</span>
            </div>
            <span style="font-size: 10px; color: #c084fc; font-weight: bold;">V1</span>
          </div>

          <!-- T1: DREAD -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-dread"></div>
              <span>💀 Нагнетание</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="pr-track-btn-mute ${dreadMuted ? 'active' : ''}" data-mute-track="dread" title="${dreadMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #f43f5e; font-weight: bold;">Т1</span>
            </div>
          </div>

          <!-- T2: PEACE -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-peace"></div>
              <span>🕊️ Добрая музыка</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="pr-track-btn-mute ${peaceMuted ? 'active' : ''}" data-mute-track="peace" title="${peaceMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #10b981; font-weight: bold;">Т2</span>
            </div>
          </div>

          <!-- T3: AMBIENT -->
          <div class="pr-track-header">
            <div class="pr-header-title">
              <div class="pr-color-tag tag-ambient"></div>
              <span>📻 Базовый эмбиент</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="pr-track-btn-mute ${ambientMuted ? 'active' : ''}" data-mute-track="ambient" title="${ambientMuted ? 'Включить звук' : 'Замутить дорожку'}">M</button>
              <span style="font-size: 10px; color: #38bdf8; font-weight: bold;">Т3</span>
            </div>
          </div>
        </div>

        <!-- TIMELINE AREA -->
        <div class="pr-timeline-scroll" id="pr-timeline-scroll">
          <!-- RULER -->
          <div class="pr-ruler" id="pr-ruler">${rulerTicksHtml}</div>

          <!-- LANE 0: VIDEO / CUTS -->
          <div class="pr-lane pr-lane-video" id="pr-lane-video"></div>

          <!-- LANE 1: DREAD -->
          <div class="pr-lane" id="pr-lane-dread"></div>

          <!-- LANE 2: PEACE -->
          <div class="pr-lane" id="pr-lane-peace"></div>

          <!-- LANE 3: AMBIENT -->
          <div class="pr-lane" id="pr-lane-ambient"></div>

          <!-- PLAYHEAD NEEDLE -->
          <div class="pr-playhead" id="pr-playhead" style="left: 0%;">
            <div class="pr-playhead-cap"></div>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
    this._attachEventListeners();
    this._renderClips(videoCuts, dreadCues, peaceCues, ambientCue);
    this.updatePlayhead(this._currentTime);
  }"""

if old_render in text:
    text = text.replace(old_render, new_render, 1)
    print("SUCCESS: Replaced render()")
else:
    print("WARNING: old_render not found")

# 2. Update _renderClips
old_render_clips = """  private _renderClips(dreadCues: PremiereCue[], peaceCues: PremiereCue[], ambientCue: PremiereCue): void {
    const laneDread = this._container.querySelector('#pr-lane-dread') as HTMLDivElement;
    const lanePeace = this._container.querySelector('#pr-lane-peace') as HTMLDivElement;
    const laneAmbient = this._container.querySelector('#pr-lane-ambient') as HTMLDivElement;
    if (!laneDread || !lanePeace || !laneAmbient) return;

    // 1. Render Dread Clips
    dreadCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-dread');
      laneDread.appendChild(el);
    });

    // 2. Render Peace Clips
    peaceCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-peace');
      lanePeace.appendChild(el);
    });

    // 3. Render Ambient Strip (Full-width base track)
    const ambEl = document.createElement('div');
    ambEl.className = 'pr-clip clip-ambient';
    ambEl.style.left = '0%';
    ambEl.style.width = '100%';
    ambEl.innerHTML = `<span>${ambientCue.title}</span><span style="font-size: 10px; opacity: 0.8;">[ Непрерывный слой ]</span>`;
    laneAmbient.appendChild(ambEl);
  }"""

new_render_clips = """  private _renderClips(
    videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string }[],
    dreadCues: PremiereCue[],
    peaceCues: PremiereCue[],
    ambientCue: PremiereCue
  ): void {
    const laneVideo = this._container.querySelector('#pr-lane-video') as HTMLDivElement;
    const laneDread = this._container.querySelector('#pr-lane-dread') as HTMLDivElement;
    const lanePeace = this._container.querySelector('#pr-lane-peace') as HTMLDivElement;
    const laneAmbient = this._container.querySelector('#pr-lane-ambient') as HTMLDivElement;
    if (!laneDread || !lanePeace || !laneAmbient) return;

    // 0. Render Video / Montage Cuts
    if (laneVideo && videoCuts) {
      for (let i = 0; i < videoCuts.length; i++) {
        const cut = videoCuts[i];
        const nextTime = (i + 1 < videoCuts.length) ? videoCuts[i + 1].time : this._currentActDuration;
        const dur = Math.max(0.4, nextTime - cut.time);
        const leftPct = (cut.time / this._currentActDuration) * 100;
        const widthPct = (dur / this._currentActDuration) * 100;

        const cutEl = document.createElement('div');
        cutEl.className = 'pr-clip clip-video';
        cutEl.style.left = `${Math.max(0, leftPct)}%`;
        cutEl.style.width = `${Math.min(100 - leftPct, Math.max(1.2, widthPct))}%`;
        const labelText = cut.label || cut.characterName || cut.texKey || 'Кадр';
        cutEl.title = `🎬 ${labelText} [ ${cut.time.toFixed(1)}s - ${nextTime.toFixed(1)}s ] (Кликните для перехода)`;
        cutEl.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; pointer-events: none;">
            🎬 ${labelText}
          </span>
          <span style="font-size: 9px; opacity: 0.7; font-family: monospace; margin-left: 4px; pointer-events: none;">${cut.time.toFixed(1)}s</span>
        `;
        cutEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.seek(cut.time);
        });
        laneVideo.appendChild(cutEl);
      }
    }

    // 1. Render Dread Clips
    dreadCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-dread');
      laneDread.appendChild(el);
    });

    // 2. Render Peace Clips
    peaceCues.forEach(cue => {
      const el = this._createClipElement(cue, 'clip-peace');
      lanePeace.appendChild(el);
    });

    // 3. Render Ambient Strip (Full-width base track with interactive selection)
    const isAmbSelected = this._selectedCueId === 'ambient_base_lane';
    const ambEl = document.createElement('div');
    ambEl.className = `pr-clip clip-ambient ${isAmbSelected ? 'selected' : ''}`;
    ambEl.style.left = '0%';
    ambEl.style.width = '100%';
    ambEl.title = 'Кликните для выделения и смены базового эмбиента';
    ambEl.innerHTML = `
      <span style="font-weight: bold;">${ambientCue.title}</span>
      <span style="font-size: 10px; opacity: 0.85; font-family: monospace;">[ 0.0s - ${this._currentActDuration.toFixed(1)}s ] • [ Кликните для выбора/замены ]</span>
    `;
    ambEl.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      this._selectedCueId = 'ambient_base_lane';
      this.render();
    });
    laneAmbient.appendChild(ambEl);
  }"""

if old_render_clips in text:
    text = text.replace(old_render_clips, new_render_clips, 1)
    print("SUCCESS: Replaced _renderClips()")
else:
    print("WARNING: old_render_clips not found")

with open('repo/src/PremiereAudioDirector.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("render and _renderClips updated")
