with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add this._updateIntroTimeline(currentTime) into Act 0 block in update()
target1 = """    if (this._currentActIndex === 0) {
      const curAudio = AmbientManager.getCurrentAudio();
      if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {
        currentTime = curAudio.currentTime;
        this._actTime = currentTime;
      } else if (this._isPlaying) {
        this._actTime += dt;
        currentTime = this._actTime;
      } else {
        currentTime = this._actTime;
      }
    } else {"""

replacement1 = """    if (this._currentActIndex === 0) {
      const curAudio = AmbientManager.getCurrentAudio();
      if (this._isPlaying && curAudio && !curAudio.paused && Number.isFinite(curAudio.currentTime)) {
        currentTime = curAudio.currentTime;
        this._actTime = currentTime;
      } else if (this._isPlaying) {
        this._actTime += dt;
        currentTime = this._actTime;
      } else {
        currentTime = this._actTime;
      }
      this._updateIntroTimeline(currentTime);
    } else {"""

if target1 in text:
    text = text.replace(target1, replacement1)
    print("SUCCESS: Added this._updateIntroTimeline(currentTime) to update() for Act 0")
else:
    print("WARNING: target1 not found exactly in MovieApp.ts")

# 2. In _updateIntroTimeline: don't loop playTrack if already started
target2 = """    // Ensure initial music is playing from second 0.0
    const introKey = profile.trackKey || AmbientManager.getIntroTrack();
    if (this._isPlaying && (!this._introAmbientStarted || !AmbientManager.getCurrentAudio() || AmbientManager.getCurrentAudio()?.paused)) {
      this._introAmbientStarted = true;
      AmbientManager.playTrack(introKey, 1.0, 1.5);
    }"""

replacement2 = """    // Ensure initial music is ignited once from second 0.0
    const introKey = profile.trackKey || AmbientManager.getIntroTrack();
    if (this._isPlaying && !this._introAmbientStarted) {
      this._introAmbientStarted = true;
      AmbientManager.playTrack(introKey, 1.0, 1.5);
    }"""

if target2 in text:
    text = text.replace(target2, replacement2)
    print("SUCCESS: Fixed intro ambient ignite condition in _updateIntroTimeline")
else:
    print("WARNING: target2 not found exactly in MovieApp.ts")

# 3. Remove rogue this._checkDirectorMusicCues(currentTime);
target3 = "      this._checkDirectorMusicCues(currentTime);"
if target3 in text:
    text = text.replace(target3, "      // Old experimental cue check disabled in favor of Premiere Director and shot sequence\n      // this._checkDirectorMusicCues(currentTime);")
    print("SUCCESS: Disabled rogue _checkDirectorMusicCues")
else:
    print("WARNING: target3 not found in MovieApp.ts")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Finished updating MovieApp.ts")
