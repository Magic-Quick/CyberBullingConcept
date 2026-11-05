import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

# ==============================================================================
# 1. PATCH Subtitles.ts: Remove corner rounding on all black rectangles
# ==============================================================================
subtitles_path = 'repo/src/Subtitles.ts'
with open(subtitles_path, 'r', encoding='utf-8') as f:
    st_text = f.read()

subtitles_replacements = [
    # Dialogue background box
    (
        'this._background.roundRect(boxX, boxY, boxW, boxH, 8);',
        'this._background.rect(boxX, boxY, boxW, boxH);'
    ),
    # Slack sprite mask & popup shadow
    (
        'this._slackSpriteMask.roundRect(-imgW / 2, -imgH / 2, imgW, imgH, r);',
        'this._slackSpriteMask.rect(-imgW / 2, -imgH / 2, imgW, imgH);'
    ),
    (
        'this._slackPopupBg.roundRect(-imgW / 2, -imgH / 2 + 6, imgW, imgH, r);',
        'this._slackPopupBg.rect(-imgW / 2, -imgH / 2 + 6, imgW, imgH);'
    ),
    # Gorin typo cards background & mask
    (
        'card.bg.roundRect(-cardW / 2, -cardH / 2 + 4, cardW, cardH, 6);',
        'card.bg.rect(-cardW / 2, -cardH / 2 + 4, cardW, cardH);'
    ),
    (
        'card.mask.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);',
        'card.mask.rect(-cardW / 2, -cardH / 2, cardW, cardH);'
    ),
]

for old, new in subtitles_replacements:
    if old in st_text:
        st_text = st_text.replace(old, new, 1)
        print(f"[Subtitles.ts] Replaced: {old[:40]}...")
    else:
        print(f"[Subtitles.ts] WARNING: Not found: {old[:40]}...")

with open(subtitles_path, 'w', encoding='utf-8') as f:
    f.write(st_text)
print("Subtitles.ts updated successfully!")


# ==============================================================================
# 2. PATCH main.ts: Remove corner rounding on loading panel
# ==============================================================================
main_path = 'repo/src/main.ts'
with open(main_path, 'r', encoding='utf-8') as f:
    main_text = f.read()

old_main_panel = 'panelBg.roundRect(px, py, panelW, panelH, Math.round(8 * refScale));'
new_main_panel = 'panelBg.rect(px, py, panelW, panelH);'
if old_main_panel in main_text:
    main_text = main_text.replace(old_main_panel, new_main_panel, 1)
    print("[main.ts] Replaced loading panel roundRect with rect")
else:
    print("[main.ts] WARNING: loading panel roundRect not found")

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_text)
print("main.ts updated successfully!")


# ==============================================================================
# 3. PATCH MovieApp.ts:
#    a. _isSeeking flag & prevention of wipe/sound during seek/rewind
#    b. toggleDevAudioDirector & ⚙️ button & KeyD / KeyВ listener
#    c. Remove corner rounding on all black rectangles (Quote badge, Location badge, Debug panels)
# ==============================================================================
movieapp_path = 'repo/src/MovieApp.ts'
with open(movieapp_path, 'r', encoding='utf-8') as f:
    ma_text = f.read()

# 3a. Add _isSeeking property & _devGearBtn property
target_prop = "  private _isTransitioningAct = false;"
replace_prop = """  private _isTransitioningAct = false;
  private _isSeeking = false;
  private _devGearBtn!: Container;"""
if target_prop in ma_text:
    ma_text = ma_text.replace(target_prop, replace_prop, 1)
    print("[MovieApp.ts] Added _isSeeking and _devGearBtn properties")
else:
    print("[MovieApp.ts] WARNING: target_prop not found")

# 3b. Stop transition audio & wipe in seekAudio
target_seek_start = """  public seekAudio(targetSeconds: number): void {

    const clamped = Math.max(0, Math.min(this._actDuration, targetSeconds));

    this._actTime = clamped;

    this._narratorCurrentTexKey = '';

    this._isTransitioningAct = false;

    AmbientManager.cancelWait();

    cancelTween(this._bgSprite);"""

replace_seek_start = """  public seekAudio(targetSeconds: number): void {
    this._isSeeking = true;
    if (this._isWiping) {
      this._cancelWipe();
    }
    if (this._transitionAudio) {
      this._transitionAudio.pause();
      this._transitionAudio = null;
    }

    const clamped = Math.max(0, Math.min(this._actDuration, targetSeconds));
    this._actTime = clamped;
    this._narratorCurrentTexKey = '';
    this._isTransitioningAct = false;
    AmbientManager.cancelWait();
    cancelTween(this._bgSprite);"""

if target_seek_start in ma_text:
    ma_text = ma_text.replace(target_seek_start, replace_seek_start, 1)
    print("[MovieApp.ts] seekAudio start patched with _isSeeking = true and transitionAudio stop")
else:
    print("[MovieApp.ts] WARNING: target_seek_start not found")

# Reset _isSeeking at end of seekAudio
target_seek_end = """        if (concertCut) {

          this._concertCurrentTexKey = `${concertCut.texKey}_${concertCut.time}`;

          this._applyConcertCut(concertCut, false);

        }

      }

    }

    this._subtitles.update(clamped);

  }"""

replace_seek_end = """        if (concertCut) {
          this._concertCurrentTexKey = `${concertCut.texKey}_${concertCut.time}`;
          this._applyConcertCut(concertCut, false);
        }
      }
    }
    this._subtitles.update(clamped);
    this._isSeeking = false;
  }"""

if target_seek_end in ma_text:
    ma_text = ma_text.replace(target_seek_end, replace_seek_end, 1)
    print("[MovieApp.ts] seekAudio end patched with _isSeeking = false")
else:
    print("[MovieApp.ts] WARNING: target_seek_end not found")

# 3c. In _playStarWarsTransitionSound check _isSeeking and _isDraggingTimeline
target_play_sound = "if (AudioController.isMuted() || this._sfxVolume <= 0) return;"
replace_play_sound = "if (AudioController.isMuted() || this._sfxVolume <= 0 || this._isSeeking || this._isDraggingTimeline) return;"
if target_play_sound in ma_text:
    ma_text = ma_text.replace(target_play_sound, replace_play_sound, 1)
    print("[MovieApp.ts] _playStarWarsTransitionSound patched against seek/drag")
else:
    print("[MovieApp.ts] WARNING: target_play_sound not found")

# 3d. In goToAct only wipe if isNaturalTransition
target_goto_wipe = "const isSceneTransition = (prevActIndex !== -1 && prevActIndex !== index && !isSong && !prevActWasSong);"
replace_goto_wipe = "const isSceneTransition = isNaturalTransition && (prevActIndex !== -1 && prevActIndex !== index && !isSong && !prevActWasSong) && !this._isSeeking && !this._isDraggingTimeline;"
if target_goto_wipe in ma_text:
    ma_text = ma_text.replace(target_goto_wipe, replace_goto_wipe, 1)
    print("[MovieApp.ts] goToAct wipe restricted to isNaturalTransition")
else:
    print("[MovieApp.ts] WARNING: target_goto_wipe not found")

# 3e. In _applyCinematicCut only allow wipe if punch && !this._isSeeking
target_cut_wipe = """      if (cut.type === 'event_illustration' && cut.label && cut.label.includes('Нижняя палуба')) {
        this._showCornerLocationBadge('СЕКТОР КОВЧЕГА', 'НИЖНЯЯ ПАЛУБА • КАТАКОМБЫ НАКАЗАНИЯ', 5.0);
        if (hasImage && cut.texKey) {
          const tex = getTexture(cut.texKey);
          this._setBgTextureWithWipe(tex, true);
        }
      }"""

replace_cut_wipe = """      if (cut.type === 'event_illustration' && cut.label && cut.label.includes('Нижняя палуба')) {
        this._showCornerLocationBadge('СЕКТОР КОВЧЕГА', 'НИЖНЯЯ ПАЛУБА • КАТАКОМБЫ НАКАЗАНИЯ', 5.0);
        if (hasImage && cut.texKey) {
          const tex = getTexture(cut.texKey);
          this._setBgTextureWithWipe(tex, punch && !this._isSeeking && !this._isDraggingTimeline);
        }
      }"""

if target_cut_wipe in ma_text:
    ma_text = ma_text.replace(target_cut_wipe, replace_cut_wipe, 1)
    print("[MovieApp.ts] _applyCinematicCut wipe condition updated")
else:
    print("[MovieApp.ts] WARNING: target_cut_wipe not found")

# 3f. Remove bug where goToAct hid _debugContainer
target_hide_debug = """      this._updateDots();

      if (this._debugContainer) {
       this._debugContainer.visible = false;
     }

      this._updateDebugDisplay();"""

replace_hide_debug = """      this._updateDots();
      this._updateDebugDisplay();"""

if target_hide_debug in ma_text:
    ma_text = ma_text.replace(target_hide_debug, replace_hide_debug, 1)
    print("[MovieApp.ts] Removed force-hiding of _debugContainer in goToAct")
else:
    print("[MovieApp.ts] WARNING: target_hide_debug not found")

# 3g. Create toggleDevAudioDirector and wire KeyD / KeyВ
target_hotkey_d = """      } else if (e.key === 'd' || e.key === 'D') {

        SFX.playClick();

        this._debugExpanded = !this._debugExpanded;

        this._debugExpandedPanel.visible = this._debugExpanded;

        this.resize(this._screenWidth, this._screenHeight);"""

replace_hotkey_d = """      } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        e.preventDefault();
        this.toggleDevAudioDirector();"""

if target_hotkey_d in ma_text:
    ma_text = ma_text.replace(target_hotkey_d, replace_hotkey_d, 1)
    print("[MovieApp.ts] Hotkey KeyD / KeyВ wired to toggleDevAudioDirector")
else:
    print("[MovieApp.ts] WARNING: target_hotkey_d not found")

# Add toggleDevAudioDirector method and _devGearBtn initialization
target_setup_debug = """  private _setupDebugUI(): void {

    this._debugContainer = new Container();
    this._debugContainer.visible = false;

    this._debugContainer.eventMode = 'static';"""

replace_setup_debug = """  public toggleDevAudioDirector(): void {
    SFX.playClick();
    this._debugExpanded = !this._debugExpanded;
    this._debugContainer.visible = this._debugExpanded;
    this._debugExpandedPanel.visible = this._debugExpanded;
    if (this._debugContainer.visible) {
      this._updateDebugDisplay();
    }
    this.resize(this._screenWidth, this._screenHeight);
  }

  private _setupDebugUI(): void {
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

    this._devGearBtn.on('pointerenter', () => {
      gearBg.clear();
      gearBg.rect(-16, -16, 32, 32);
      gearBg.fill({ color: 0x141a2e, alpha: 0.98 });
      gearBg.stroke({ color: 0xffaa00, width: 1.4 });
    });

    this._devGearBtn.on('pointerleave', () => {
      gearBg.clear();
      gearBg.rect(-16, -16, 32, 32);
      gearBg.fill({ color: 0x090b14, alpha: 0.90 });
      gearBg.stroke({ color: 0x00f5d4, width: 1.2 });
    });

    this._uiContainer.addChild(this._devGearBtn);

    this._debugContainer = new Container();
    this._debugContainer.visible = false;
    this._debugContainer.eventMode = 'static';"""

if target_setup_debug in ma_text:
    ma_text = ma_text.replace(target_setup_debug, replace_setup_debug, 1)
    print("[MovieApp.ts] Added toggleDevAudioDirector and _devGearBtn")
else:
    print("[MovieApp.ts] WARNING: target_setup_debug not found")

# Resize _devGearBtn in resize()
target_resize_debug = """    if (this._debugContainer) {

      this._debugContainer.position.set(w / 2, isPortrait ? 114 : 32);

      this._debugContainer.scale.set(w < 950 ? 0.85 : 1.0);

    }"""

replace_resize_debug = """    if (this._devGearBtn) {
      this._devGearBtn.position.set(w - 36, isPortrait ? 56 : 30);
    }
    if (this._debugContainer) {
      this._debugContainer.position.set(w / 2, isPortrait ? 114 : 32);
      this._debugContainer.scale.set(w < 950 ? 0.85 : 1.0);
    }"""

if target_resize_debug in ma_text:
    ma_text = ma_text.replace(target_resize_debug, replace_resize_debug, 1)
    print("[MovieApp.ts] Added _devGearBtn positioning in resize()")
else:
    print("[MovieApp.ts] WARNING: target_resize_debug not found")

# Also wire arrowBtn in debugUI to toggleDevAudioDirector
target_arrow_toggle = "this._debugExpandedPanel.visible = this._debugExpanded;\n\n      this.resize(this._screenWidth, this._screenHeight);"
replace_arrow_toggle = "this.toggleDevAudioDirector();"
if target_arrow_toggle in ma_text:
    ma_text = ma_text.replace(target_arrow_toggle, replace_arrow_toggle, 1)
    print("[MovieApp.ts] arrowBtn wired to toggleDevAudioDirector")
else:
    print("[MovieApp.ts] WARNING: target_arrow_toggle not found")

# 3h. Remove corner rounding on all black rectangles in MovieApp.ts
movieapp_rounding_fixes = [
    # Quote badge background
    (
        'this._cornerQuoteBg.roundRect(0, 0, badgeW, badgeH, 10);',
        'this._cornerQuoteBg.rect(0, 0, badgeW, badgeH);'
    ),
    # Quote avatar mask & border
    (
        'this._cornerQuoteAvatarMask.roundRect(0, 0, avatarSize, avatarSize, 10);',
        'this._cornerQuoteAvatarMask.rect(0, 0, avatarSize, avatarSize);'
    ),
    (
        'this._cornerQuoteAvatarBorder.roundRect(0, 0, avatarSize, avatarSize, 10);',
        'this._cornerQuoteAvatarBorder.rect(0, 0, avatarSize, avatarSize);'
    ),
    (
        'gfx.roundRect(0, 0, size, size, 10);',
        'gfx.rect(0, 0, size, size);'
    ),
    # Location badge background
    (
        'this._cornerLocationBg.roundRect(0, 0, badgeW, badgeH, 10);',
        'this._cornerLocationBg.rect(0, 0, badgeW, badgeH);'
    ),
    # WS-96 socket background
    (
        'socketBg.roundRect(156, 48, 126, 64, 5);',
        'socketBg.rect(156, 48, 126, 64);'
    ),
    # Debug panel background
    (
        'panelBg.roundRect(-240, 0, 480, 222, 10);',
        'panelBg.rect(-240, 0, 480, 222);'
    ),
    # Debug mini buttons background
    (
        'bg.roundRect(-btnW / 2, -12, btnW, 24, 6);',
        'bg.rect(-btnW / 2, -12, btnW, 24);'
    ),
    # Debug toggle pill background
    (
        'this._debugPillBg.roundRect(-150, -13, 270, 26, 13);',
        'this._debugPillBg.rect(-150, -13, 270, 26);'
    )
]

for old, new in movieapp_rounding_fixes:
    if old in ma_text:
        ma_text = ma_text.replace(old, new, 1)
        print(f"[MovieApp.ts] Replaced: {old[:40]}...")
    else:
        print(f"[MovieApp.ts] WARNING: Not found: {old[:40]}...")

with open(movieapp_path, 'w', encoding='utf-8') as f:
    f.write(ma_text)
print("MovieApp.ts updated successfully!")
