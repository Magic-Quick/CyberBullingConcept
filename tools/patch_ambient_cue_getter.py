with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = """  public getCurrentAudio(): HTMLAudioElement | null {

    return this._currentAudio;

  }"""

replacement = """  public getCurrentAudio(): HTMLAudioElement | null {

    return this._currentAudio;

  }

  public getAudioElementForCue(key: string): HTMLAudioElement | null {
    return this._getOrCreateCueAudio(key) || this._getOrCreateAudio(key as any);
  }"""

if target in text:
    text = text.replace(target, replacement)
    with open('repo/src/AmbientManager.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Added getAudioElementForCue to AmbientManager")
else:
    print("FAILED: Target not found")
