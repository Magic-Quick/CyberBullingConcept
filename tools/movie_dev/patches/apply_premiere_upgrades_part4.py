with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update _attachEventListeners
target_events = """    // 5. Nudge Buttons
    this._container.querySelectorAll('[data-nudge-start]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = Number((e.currentTarget as HTMLElement).getAttribute('data-nudge-start'));
        this.nudgeSelectedCue('start', val);
      });
    });"""

replace_events = """    // 4b. Track Mute Buttons
    this._container.querySelectorAll('[data-mute-track]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-mute-track') as 'dread' | 'peace' | 'ambient';
        if (cat) {
          const isMuted = AmbientManager.isCategoryMuted(cat);
          AmbientManager.setCategoryMuted(cat, !isMuted);
          this.render();
          this.showToast(!isMuted ? `🔇 ДОРОЖКА [ ${cat.toUpperCase()} ] ЗАМУЧЕНА` : `🔊 ДОРОЖКА [ ${cat.toUpperCase()} ] ВКЛЮЧЕНА`);
        }
      });
    });

    // 4c. Ruler Cut Markers Click
    this._container.querySelectorAll('[data-cut-time]').forEach(mark => {
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = Number((e.currentTarget as HTMLElement).getAttribute('data-cut-time'));
        if (Number.isFinite(t)) this.seek(t);
      });
    });

    // 5. Nudge Buttons
    this._container.querySelectorAll('[data-nudge-start]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = Number((e.currentTarget as HTMLElement).getAttribute('data-nudge-start'));
        this.nudgeSelectedCue('start', val);
      });
    });"""

if target_events in text:
    text = text.replace(target_events, replace_events, 1)
    print("SUCCESS 1: Added mute and cut mark click events")
else:
    print("WARNING 1: target_events not found")

# 2. Update openTrackReplacementModal
target_modal = """  public openTrackReplacementModal(): void {
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const cueList = this._cuesByAct[act.id] || [];
    const cue = cueList.find(c => c.id === this._selectedCueId);
    if (!cue) return;

    // Filter available alternatives matching this cue type
    const matchingTracks = AVAILABLE_TRACK_OPTIONS.filter(o => o.category === cue.type);

    let cardsHtml = '';
    matchingTracks.forEach(tr => {
      const isActive = tr.key === cue.cueKey ? 'active' : '';
      cardsHtml += `
        <div class="pr-track-card ${isActive}" data-track-key="${tr.key}">
          <div>
            <div class="pr-track-title">${tr.name}</div>
            <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
            <button class="pr-btn pr-btn-primary" data-select-key="${tr.key}">ВЫБРАТЬ</button>
          </div>
        </div>
      `;
    });

    this._modalElement.innerHTML = `
      <div class="pr-modal">
        <div class="pr-modal-header">
          <div class="pr-modal-title">🔄 ЗАМЕНА ТРЕКА ДЛЯ [ ${cue.title} ]</div>
          <button class="pr-btn pr-btn-close" id="pr-modal-close-btn">✖</button>
        </div>
        <div class="pr-modal-body">${cardsHtml}</div>
      </div>
    `;

    this._modalElement.classList.add('open');

    // Attach Modal Listeners
    const modalClose = this._modalElement.querySelector('#pr-modal-close-btn');
    if (modalClose) modalClose.addEventListener('click', () => this._closeModal());

    this._modalElement.querySelectorAll('[data-preview-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-preview-key');
        if (key) this._playPreviewAudio(key);
      });
    });

    this._modalElement.querySelectorAll('[data-select-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-select-key');
        const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
        if (chosen && cue) {
          cue.cueKey = chosen.key;
          cue.title = chosen.name;
          cue.duration = Math.min(cue.duration, chosen.durationSec);
          this._closeModal();
          this.saveToStorage();
          this.render();
          this.showToast(`✅ ТРЕК ЗАМЕНЕН НА: ${chosen.name}`);
        }
      });
    });
  }"""

replace_modal = """  public openTrackReplacementModal(): void {
    if (!this._selectedCueId) return;
    const act = STORY_ACTS[this._currentActIndex];
    const isAmbient = this._selectedCueId === 'ambient_base_lane';
    const cueList = this._cuesByAct[act.id] || [];
    const cue = isAmbient ? null : cueList.find(c => c.id === this._selectedCueId);
    if (!isAmbient && !cue) return;

    let matchingTracks: TrackOption[] = [];
    let modalTitle = '';

    if (isAmbient) {
      if (this._currentActIndex === 0) {
        modalTitle = '🔄 ВЫБОР ФОНОВОГО ЭМБИЕНТА ДЛЯ ЗАСТАВКИ (АКТ 0)';
        matchingTracks = [
          {
            key: 'desolate_cry',
            name: '📻 Desolate Cry (Пустынный вопль)',
            category: 'ambient',
            durationSec: 45.5,
            description: 'Глубокий атмосферный эмбиент темного космоса с мощной кульминацией дропа на 24с'
          },
          {
            key: 'titan_forge',
            name: '📻 Titan Forge (Кузница титанов)',
            category: 'ambient',
            durationSec: 45.5,
            description: 'Индустриальный ритмичный пульс тяжелых ковочных реакторов Цитадели'
          }
        ];
      } else {
        modalTitle = `🔄 ВЫБОР БАЗОВОГО ЭМБИЕНТА ДЛЯ [ ${act.title} ]`;
        matchingTracks = AVAILABLE_TRACK_OPTIONS.filter(o => o.category === 'ambient');
      }
    } else if (cue) {
      matchingTracks = AVAILABLE_TRACK_OPTIONS.filter(o => o.category === cue.type);
      modalTitle = `🔄 ЗАМЕНА ТРЕКА ДЛЯ [ ${cue.title} ]`;
    }

    const currentKey = isAmbient
      ? (this._currentActIndex === 0 ? AmbientManager.getIntroTrack() : (AmbientManager.getLockedTrackForAct(act.id) || act.audioKey || 'desolate_cry'))
      : (cue ? cue.cueKey : '');

    let cardsHtml = '';
    matchingTracks.forEach(tr => {
      const isActive = tr.key === currentKey ? 'active' : '';
      cardsHtml += `
        <div class="pr-track-card ${isActive}" data-track-key="${tr.key}">
          <div>
            <div class="pr-track-title">${tr.name}</div>
            <div class="pr-track-desc">${tr.description} • [ ${tr.durationSec}s ]</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="pr-btn" data-preview-key="${tr.key}">▶ ТЕСТ</button>
            <button class="pr-btn pr-btn-primary" data-select-key="${tr.key}">ВЫБРАТЬ</button>
          </div>
        </div>
      `;
    });

    this._modalElement.innerHTML = `
      <div class="pr-modal">
        <div class="pr-modal-header">
          <div class="pr-modal-title">${modalTitle}</div>
          <button class="pr-btn pr-btn-close" id="pr-modal-close-btn">✖</button>
        </div>
        <div class="pr-modal-body">${cardsHtml}</div>
      </div>
    `;

    this._modalElement.classList.add('open');

    // Attach Modal Listeners
    const modalClose = this._modalElement.querySelector('#pr-modal-close-btn');
    if (modalClose) modalClose.addEventListener('click', () => this._closeModal());

    this._modalElement.querySelectorAll('[data-preview-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-preview-key');
        if (key) this._playPreviewAudio(key);
      });
    });

    this._modalElement.querySelectorAll('[data-select-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (e.currentTarget as HTMLElement).getAttribute('data-select-key');
        if (!key) return;

        if (isAmbient) {
          if (this._currentActIndex === 0) {
            AmbientManager.setIntroTrack(key as 'desolate_cry' | 'titan_forge', true);
            if ((window as any).__movieApp) {
              (window as any).__movieApp.setIntroTrackVariant(key);
            }
            this._closeModal();
            this.render();
            this.showToast(`✅ УСТАНОВЛЕН ВАРИАНТ ИНТРО: ${key === 'desolate_cry' ? 'Desolate Cry' : 'Titan Forge'}`);
          } else {
            AmbientManager.setLockedTrackForAct(act.id, key as any);
            AmbientManager.playTrack(key as any, 0.28, 0.5);
            this._closeModal();
            this.render();
            const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
            this.showToast(`✅ БАЗОВЫЙ ЭМБИЕНТ ИЗМЕНЕН НА: ${chosen ? chosen.name : key}`);
          }
          return;
        }

        const chosen = AVAILABLE_TRACK_OPTIONS.find(o => o.key === key);
        if (chosen && cue) {
          cue.cueKey = chosen.key;
          cue.title = chosen.name;
          cue.duration = Math.min(cue.duration, chosen.durationSec);
          this._closeModal();
          this.saveToStorage();
          this.render();
          this.showToast(`✅ ТРЕК ЗАМЕНЕН НА: ${chosen.name}`);
        }
      });
    });
  }"""

if target_modal in text:
    text = text.replace(target_modal, replace_modal, 1)
    print("SUCCESS 2: Updated openTrackReplacementModal with ambient & strict category support")
else:
    print("WARNING 2: target_modal not found")

with open('repo/src/PremiereAudioDirector.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("PremiereAudioDirector.ts fully updated")
