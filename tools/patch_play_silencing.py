with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re

target = """    if (this._currentActIndex === 0) {

      if (this._actTime < INTRO_DISCLAIMER_DURATION) {

        this._introAmbientStarted = false;

        //       

        AmbientManager.playTrack(null, 0.0, 0.2);

      } else {

        if (!this._introAmbientStarted) {

          this._introAmbientStarted = true;

          AmbientManager.playTrack(this._introProfile.trackKey, 1.0, 1.5);

          const mt = Math.max(0, this._actTime - INTRO_DISCLAIMER_DURATION);

          AmbientManager.seekCurrent(mt);

        } else {

          AmbientManager.resumeCurrent();

        }

        if (this._videoElement) this._videoElement.play().catch(() => {});

      }

    } else {"""

replacement = """    if (this._currentActIndex === 0) {
      AmbientManager.setPaused(false);
      const introTrack = AmbientManager.getIntroTrack();
      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack || !AmbientManager.getCurrentAudio() || AmbientManager.getCurrentAudio()?.paused) {
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, 1.5);
        AmbientManager.seekCurrent(this._actTime);
      } else {
        AmbientManager.resumeCurrent();
      }
      if (this._videoElement && this._actTime >= 7.5) {
        this._videoElement.play().catch(() => {});
      }
    } else {"""

if target in text:
    text = text.replace(target, replacement)
    with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Replaced play() silencing logic with direct audio start!")
else:
    print("WARNING: Exact target not found, trying regex")
    pattern = r"if\s*\(this\._currentActIndex\s*===\s*0\)\s*\{\s*if\s*\(this\._actTime\s*<\s*INTRO_DISCLAIMER_DURATION\)[\s\S]*?if\s*\(this\._videoElement\)\s*this\._videoElement\.play\(\)\.catch\(\(\)\s*=>\s*\{\}\);\s*\}\s*\}\s*else\s*\{"
    if re.search(pattern, text):
        text = re.sub(pattern, replacement, text)
        with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
            f.write(text)
        print("SUCCESS (regex): Replaced play() silencing logic!")
    else:
        print("FAILED: Regex also did not match")
