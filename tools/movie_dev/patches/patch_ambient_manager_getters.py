with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    c = f.read()

target = "  public getCurrentTrackKey(): AmbientTrackKey | null {"
getters = """  public getCueTrackKey(): string | null {
    return this._cueTrackKey;
  }

  public getCueAudio(): HTMLAudioElement | null {
    return this._cueAudio;
  }

  public isCuePlaying(): boolean {
    return Boolean(this._cueAudio && !this._cueAudio.paused && !this._cueAudio.ended);
  }

"""

if "public getCueTrackKey()" not in c:
    c = c.replace(target, getters + target)
    print("Added getCueTrackKey, getCueAudio, isCuePlaying to AmbientManager.ts")

with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated AmbientManager.ts!")
