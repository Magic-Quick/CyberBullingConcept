import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add fields to MovieApp class
fields_target = "  private _directorNoticeText!: Text;\nprivate _debugExpanded = false;"
fields_replacement = """  private _directorNoticeText!: Text;
  private _debugExpanded = false;

  // DAW Multi-Track Timeline & Act 0 Intro Variants
  private _dawTimelineContainer!: Container;
  private _dawTimelineBg!: Graphics;
  private _dawRulerGraphics!: Graphics;
  private _dawRulerLabelsContainer!: Container;
  private _dawLanesBg!: Graphics;
  private _dawLaneLabelsContainer!: Container;
  private _dawDreadBlocksContainer!: Container;
  private _dawPeaceBlocksContainer!: Container;
  private _dawAmbientLaneContainer!: Container;
  private _dawPlayhead!: Container;
  private _directorNowPlayingText!: Text;
  private _dawIntroVariantsContainer!: Container;
  private _btnIntroVar1!: Container;
  private _btnIntroVar2!: Container;
  private _dawIsDraggingTimeline: boolean = false;"""

if fields_target in content:
    content = content.replace(fields_target, fields_replacement, 1)
    print("1. Added DAW fields to MovieApp class")
else:
    print("WARNING: fields_target not found!")

# 2. Update _initDirectorMusicCues with intro_playbox and prologue_space defaults
defaults_target = """    const defaults: Record<string, { time: number; key: string; category: 'dread' | 'peace' | 'stop' }[]> = {
      act_1_convent: ["""

defaults_replacement = """    const defaults: Record<string, { time: number; key: string; category: 'dread' | 'peace' | 'stop' }[]> = {
      intro_playbox: [
        { time: 0.0, key: AmbientManager.getIntroTrack(), category: 'peace' },
        { time: 24.0, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
      prologue_space: [
        { time: 60.0, key: 'dread_05_rust_and_bone_maximum_grimdark_25s', category: 'dread' },
      ],
      act_1_convent: ["""

if defaults_target in content:
    content = content.replace(defaults_target, defaults_replacement, 1)
    print("2. Added intro_playbox and prologue_space to defaults")
else:
    print("WARNING: defaults_target not found!")

# Also ensure act_7_song is in defaults
song_target = """      act_8_outro: [
        { time: 30.62, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
    };"""

song_replacement = """      act_8_outro: [
        { time: 30.62, key: 'dread_03_predator_instant_terror_drop_25s', category: 'dread' },
      ],
      act_7_song: [
        { time: 0.0, key: 'dread_11_morlock_war_march_climax_50s', category: 'dread' },
      ],
    };"""

if song_target in content:
    content = content.replace(song_target, song_replacement, 1)
    print("3. Added act_7_song to defaults")
else:
    print("WARNING: song_target not found!")

# Ensure intro_playbox fallback logic in defaults mapping
fallback_target = """    for (const act of STORY_ACTS) {
      if (overrides[act.id]) {
        this._directorMusicCues.set(act.id, overrides[act.id]);
      } else if (defaults[act.id]) {"""

fallback_replacement = """    for (const act of STORY_ACTS) {
      const savedList = overrides[act.id];
      if (savedList && savedList.length > 0) {
        this._directorMusicCues.set(act.id, savedList);
      } else if (defaults[act.id]) {"""

if fallback_target in content:
    content = content.replace(fallback_target, fallback_replacement, 1)
    print("4. Updated fallback logic in _initDirectorMusicCues")
else:
    print("WARNING: fallback_target not found!")

# Add setIntroTrackVariant method right before _saveDirectorMusicCues
method_target = "  private _saveDirectorMusicCues(): void {"
method_replacement = """  public setIntroTrackVariant(variant: 'desolate_cry' | 'titan_forge'): void {
    AmbientManager.setIntroTrack(variant, this._currentActIndex === 0);
    const cues = this._directorMusicCues.get('intro_playbox');
    if (cues && cues.length > 0) {
      cues[0].key = variant;
      cues[0].name = variant === 'desolate_cry' ? 'Desolate Cry (Вступление)' : 'Titan Forge (Вступление)';
    }
    this._saveDirectorMusicCues();
    this._setDirectorNotice(`★ Выбран вариант интро: ${variant === 'desolate_cry' ? 'Desolate Cry' : 'Titan Forge'}`);
    this._updateDebugDisplay();
  }

  private _saveDirectorMusicCues(): void {"""

if method_target in content:
    content = content.replace(method_target, method_replacement, 1)
    print("5. Added setIntroTrackVariant method")
else:
    print("WARNING: method_target not found!")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 1 applied successfully!")
