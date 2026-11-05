import sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Update AmbientManager.ts
with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    amb_lines = f.readlines()

# Replace unlockAudio lines in AmbientManager.ts
# Lines 233-251:
new_unlock = """  public unlockAudio(): void {
    if (this._isPaused) return;
    if (this._currentAudio) {
      if (this._currentAudio.paused && this._currentDuckFactor > 0) {
        this._currentAudio.play().catch(() => {});
      }
    } else if (this._currentTrackKey) {
      this.playTrack(this._currentTrackKey, this._currentDuckFactor, 0.4);
    } else {
      this.playTrack(this.getIntroTrack(), 1.0, 1.5);
    }
  }
"""

start_idx = -1
end_idx = -1
for i, l in enumerate(amb_lines):
    if 'public unlockAudio(): void {' in l:
        start_idx = i
    if start_idx != -1 and i > start_idx and 'public resetRandomIntroTrack' in l:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    amb_lines[start_idx:end_idx] = [new_unlock, '\n']
    print(f"1. Replaced unlockAudio in AmbientManager.ts (lines {start_idx+1}-{end_idx})")
    with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
        f.writelines(amb_lines)
else:
    print("ERROR finding unlockAudio in AmbientManager.ts")

# 2. Update MovieApp.ts
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    app_lines = f.readlines()

# Section A: seekAudio in Act 0
# Find "if (this._currentActIndex === 0) {" around line 5374
seek_start = -1
seek_end = -1
for i, l in enumerate(app_lines):
    if 'if (this._currentActIndex === 0) {' in l and i > 5300 and i < 5450:
        seek_start = i
    if seek_start != -1 and i > seek_start and '} else {' in l and 'const act = STORY_ACTS[this._currentActIndex];' in app_lines[i+2]:
        seek_end = i
        break

if seek_start != -1 and seek_end != -1:
    new_seek_block = """    if (this._currentActIndex === 0) {
      const introTrack = AmbientManager.getIntroTrack();
      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack) {
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, 0.0);
      }
      AmbientManager.seekCurrent(clamped);
      if (this._isPlaying) {
        AmbientManager.resumeCurrent();
        if (this._videoElement && clamped >= 7.5) {
          this._videoElement.style.opacity = '1';
          this._videoElement.play().catch(() => {});
        }
      }
    }"""
    app_lines[seek_start:seek_end] = [new_seek_block + '\n']
    print(f"2. Replaced seekAudio Act 0 in MovieApp.ts (lines {seek_start+1}-{seek_end})")
else:
    print("ERROR finding seekAudio Act 0")

# Section B: _updateIntroTimeline disclaimer block
# Find "private _updateIntroTimeline(currentTime: number): void {" around line 5780
timeline_start = -1
timeline_end = -1
for i, l in enumerate(app_lines):
    if 'private _updateIntroTimeline(currentTime: number): void {' in l:
        timeline_start = i
    if timeline_start != -1 and i > timeline_start and '// Phase A: 0.0s - 0.6s' in l:
        timeline_end = i
        break

if timeline_start != -1 and timeline_end != -1:
    new_timeline_head = """  private _updateIntroTimeline(currentTime: number): void {
    const t = currentTime;
    const profile = this._introProfile;
    const discStart = 0.4;
    const discTypeEnd = 5.4;
    const discHoldEnd = 6.8;
    const discFadeEnd = 7.8;

    // Ensure initial music is playing from second 0.0
    const introKey = profile.trackKey || AmbientManager.getIntroTrack();
    if (this._isPlaying && (!this._introAmbientStarted || !AmbientManager.getCurrentAudio() || AmbientManager.getCurrentAudio()?.paused)) {
      this._introAmbientStarted = true;
      AmbientManager.playTrack(introKey, 1.0, 1.5);
    }
"""
    app_lines[timeline_start:timeline_end] = [new_timeline_head]
    print(f"3. Replaced _updateIntroTimeline head in MovieApp.ts (lines {timeline_start+1}-{timeline_end})")
else:
    print("ERROR finding _updateIntroTimeline head")

# Section C: play() in Act 0
# Find "if (this._currentActIndex === 0) {" around line 6430
play_start = -1
play_end = -1
for i, l in enumerate(app_lines):
    if 'if (this._currentActIndex === 0) {' in l and i > 6350 and i < 6550:
        play_start = i
    if play_start != -1 and i > play_start and '} else {' in l and 'const act = STORY_ACTS[this._currentActIndex];' in app_lines[i+2]:
        play_end = i
        break

if play_start != -1 and play_end != -1:
    new_play_block = """    if (this._currentActIndex === 0) {
      const introTrack = AmbientManager.getIntroTrack();
      if (!this._introAmbientStarted || AmbientManager.getCurrentTrackKey() !== introTrack) {
        this._introAmbientStarted = true;
        AmbientManager.playTrack(introTrack, 1.0, 1.5);
        AmbientManager.seekCurrent(this._actTime);
      } else {
        AmbientManager.resumeCurrent();
      }
      if (this._videoElement && this._actTime >= 7.5) {
        this._videoElement.play().catch(() => {});
      }
    }"""
    app_lines[play_start:play_end] = [new_play_block + '\n']
    print(f"4. Replaced play() Act 0 in MovieApp.ts (lines {play_start+1}-{play_end})")
else:
    print("ERROR finding play() Act 0")

# Section D: update(dt) in Act 0
# Find "if (this._currentActIndex === 0) {" around line 6600
update_start = -1
update_end = -1
for i, l in enumerate(app_lines):
    if 'if (this._currentActIndex === 0) {' in l and i > 6500 and i < 6700:
        update_start = i
    if update_start != -1 and i > update_start and '} else {' in l and 'const act = STORY_ACTS[this._currentActIndex];' in app_lines[i+2]:
        update_end = i
        break

if update_start != -1 and update_end != -1:
    new_update_block = """    if (this._currentActIndex === 0) {
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
    }"""
    app_lines[update_start:update_end] = [new_update_block + '\n']
    print(f"5. Replaced update(dt) Act 0 in MovieApp.ts (lines {update_start+1}-{update_end})")
else:
    print("ERROR finding update(dt) Act 0")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.writelines(app_lines)

print("Exact script replacement completed!")
