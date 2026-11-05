with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update playCinematicCue fading logic
target1 = """    // Smoothly fade out previous cue via fading queue (Zero audio chop, cinematic crossfade!)
    if (this._cueAudio && this._cueAudio !== this._cueAudioCache.get(normKey)) {
      const oldAudio = this._cueAudio;
      this._fadingCues.push({
        audio: oldAudio,
        startVol: oldAudio.volume,
        targetVol: 0.0,
        duration: 2.5,
        elapsed: 0.0,
      });
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
    }"""

replacement1 = """    // Smoothly and swiftly fade out previous cue (Zero audio clash, 0.4s fast musical transition!)
    if (this._cueAudio && this._cueAudio !== this._cueAudioCache.get(normKey)) {
      const oldAudio = this._cueAudio;
      for (const f of this._fadingCues) {
        f.audio.pause();
        f.audio.currentTime = 0;
      }
      this._fadingCues = [];
      this._fadingCues.push({
        audio: oldAudio,
        startVol: oldAudio.volume,
        targetVol: 0.0,
        duration: 0.4,
        elapsed: 0.0,
      });
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
    }"""

if target1 in text:
    text = text.replace(target1, replacement1)
    print("SUCCESS: Patched playCinematicCue fading logic")
else:
    print("WARNING: target1 not found")

# 2. Update stopCinematicCue default duration
target2 = """  public stopCinematicCue(fadeSec: number = 2.5): void {
    if (this._cueAudio) {
      const oldAudio = this._cueAudio;
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
      this._cueMaxDuration = 0;
      this._cuePlayElapsed = 0.0;

      if (fadeSec <= 0) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      } else {
        this._fadingCues.push({
          audio: oldAudio,
          startVol: oldAudio.volume,
          targetVol: 0.0,
          duration: Math.max(0.5, fadeSec),
          elapsed: 0.0,
        });
      }
    }"""

replacement2 = """  public stopCinematicCue(fadeSec: number = 0.5): void {
    if (this._cueAudio) {
      const oldAudio = this._cueAudio;
      this._cueAudio = null;
      this._cueTrackKey = null;
      this._cueIsFading = false;
      this._cueMaxDuration = 0;
      this._cuePlayElapsed = 0.0;

      if (fadeSec <= 0) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      } else {
        for (const f of this._fadingCues) {
          f.audio.pause();
          f.audio.currentTime = 0;
        }
        this._fadingCues = [];
        this._fadingCues.push({
          audio: oldAudio,
          startVol: oldAudio.volume,
          targetVol: 0.0,
          duration: Math.max(0.2, fadeSec),
          elapsed: 0.0,
        });
      }
    }"""

if target2 in text:
    text = text.replace(target2, replacement2)
    print("SUCCESS: Patched stopCinematicCue logic")
else:
    print("WARNING: target2 not found")

with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("AmbientManager.ts updated successfully")
