with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add fields
target_fields = """  private _voiceHoldTimer = 0.0;"""
replace_fields = """  private _voiceHoldTimer = 0.0;

  // Track Mute States (Dread, Peace, Ambient) for Studio Direction
  private _isMutedDread = false;
  private _isMutedPeace = false;
  private _isMutedAmbient = false;"""

if target_fields in text:
    text = text.replace(target_fields, replace_fields, 1)
    print("SUCCESS: Added mute fields")
else:
    print("WARNING: target_fields not found")

# 2. Add public methods
target_methods = """  public resetRandomIntroTrack(): 'desolate_cry' | 'titan_forge' {"""
replace_methods = """  public isCategoryMuted(category: 'dread' | 'peace' | 'ambient'): boolean {
    if (category === 'dread') return this._isMutedDread;
    if (category === 'peace') return this._isMutedPeace;
    if (category === 'ambient') return this._isMutedAmbient;
    return false;
  }

  public setCategoryMuted(category: 'dread' | 'peace' | 'ambient', muted: boolean): void {
    if (category === 'dread') this._isMutedDread = muted;
    if (category === 'peace') this._isMutedPeace = muted;
    if (category === 'ambient') this._isMutedAmbient = muted;
    this.syncMuteVolumes();
  }

  public syncMuteVolumes(): void {
    if (this._currentAudio) {
      if (this._isMutedAmbient || this._isMuted) {
        this._currentAudio.volume = 0;
      } else {
        const baseVol = this._musicVolume * this._currentDuckFactor;
        this._currentAudio.volume = Math.max(0, Math.min(1, baseVol * this._voiceDuckingFactor));
      }
    }

    if (this._cueAudio && this._cueTrackKey) {
      const isPeace = this._cueTrackKey.startsWith('peace_');
      const isDread = !isPeace && this._cueTrackKey !== 'stop';
      if ((isDread && this._isMutedDread) || (isPeace && this._isMutedPeace) || this._isMuted) {
        this._cueAudio.volume = 0;
      } else {
        this._cueAudio.volume = Math.max(0, Math.min(1, this._cueTargetVol * this._voiceDuckingFactor));
      }
    }
  }

  public resetRandomIntroTrack(): 'desolate_cry' | 'titan_forge' {"""

if target_methods in text:
    text = text.replace(target_methods, replace_methods, 1)
    print("SUCCESS: Added mute methods")
else:
    print("WARNING: target_methods not found")

# 3. Update volume in update(dt)
target_cue_vol1 = """      this._cueAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, curVol * this._voiceDuckingFactor));"""
replace_cue_vol1 = """      const isCueMuted1 = (this._cueTrackKey?.startsWith('peace_') ? this._isMutedPeace : this._isMutedDread) || this._isMuted;
      this._cueAudio.volume = isCueMuted1 ? 0 : Math.max(0, Math.min(1, curVol * this._voiceDuckingFactor));"""

if target_cue_vol1 in text:
    text = text.replace(target_cue_vol1, replace_cue_vol1, 1)
    print("SUCCESS: Updated cue volume 1")

target_cue_vol2 = """      this._cueAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, this._cueTargetVol * this._voiceDuckingFactor));"""
replace_cue_vol2 = """      const isCueMuted2 = (this._cueTrackKey?.startsWith('peace_') ? this._isMutedPeace : this._isMutedDread) || this._isMuted;
      this._cueAudio.volume = isCueMuted2 ? 0 : Math.max(0, Math.min(1, this._cueTargetVol * this._voiceDuckingFactor));"""

if target_cue_vol2 in text:
    text = text.replace(target_cue_vol2, replace_cue_vol2, 1)
    print("SUCCESS: Updated cue volume 2")

target_amb_vol = """      this._currentAudio.volume = this._isMuted ? 0 : Math.max(0, Math.min(1, baseVol * this._voiceDuckingFactor));"""
replace_amb_vol = """      const ambientMuted = this._isMutedAmbient || this._isMuted;
      this._currentAudio.volume = ambientMuted ? 0 : Math.max(0, Math.min(1, baseVol * this._voiceDuckingFactor));"""

if target_amb_vol in text:
    text = text.replace(target_amb_vol, replace_amb_vol, 1)
    print("SUCCESS: Updated ambient volume")

with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("AmbientManager.ts patched successfully")
