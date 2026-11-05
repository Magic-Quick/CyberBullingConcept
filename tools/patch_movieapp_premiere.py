with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add import at the top
import_stmt = "import { PremiereAudioDirector } from './PremiereAudioDirector';"
if "import { PremiereAudioDirector }" not in text:
    text = import_stmt + "\n" + text
    print("SUCCESS: Added PremiereAudioDirector import")

# 2. Add callback initialization in constructor
constructor_target = "this._setupKeyboard();"
constructor_code = """this._setupKeyboard();
    const premiereDirector = PremiereAudioDirector.getInstance();
    premiereDirector.onSeekRequested = (targetSeconds: number) => {
      this.seekAudio(targetSeconds);
    };
    premiereDirector.onActChangeRequested = (actIndex: number) => {
      this.goToAct(actIndex, this._isPlaying);
    };
    (window as any).__premiereAudioDirector = premiereDirector;"""

if constructor_target in text and "__premiereAudioDirector" not in text:
    text = text.replace(constructor_target, constructor_code, 1)
    print("SUCCESS: Added PremiereAudioDirector wiring in constructor")

# 3. Update toggleDevAudioDirector
old_toggle = """  public toggleDevAudioDirector(): void {
    SFX.playClick();
    this._debugExpanded = !this._debugExpanded;
    this._debugContainer.visible = this._debugExpanded;
    this._debugExpandedPanel.visible = this._debugExpanded;
    if (this._debugContainer.visible) {
      this._updateDebugDisplay();
    }
    this.resize(this._screenWidth, this._screenHeight);
  }"""

new_toggle = """  public toggleDevAudioDirector(): void {
    SFX.playClick();
    PremiereAudioDirector.getInstance().toggle();
  }"""

if old_toggle in text:
    text = text.replace(old_toggle, new_toggle)
    print("SUCCESS: Updated toggleDevAudioDirector to open PremiereAudioDirector")
else:
    print("WARNING: old_toggle not matched exactly")

# 4. In update(dt), sync playhead
update_target = "this._subtitles.update(dt, currentTime);"
update_code = """this._subtitles.update(dt, currentTime);
    PremiereAudioDirector.getInstance().syncActFromApp(this._currentActIndex, currentTime);"""

if update_target in text and "PremiereAudioDirector.getInstance().syncActFromApp" not in text:
    text = text.replace(update_target, update_code, 1)
    print("SUCCESS: Added PremiereAudioDirector sync in update loop")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("Finished patching MovieApp.ts")
