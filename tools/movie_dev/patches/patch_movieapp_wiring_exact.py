with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "    this.goToAct(0);"
code1 = """    const premiereDirector = PremiereAudioDirector.getInstance();
    premiereDirector.onSeekRequested = (targetSeconds: number) => {
      this.seekAudio(targetSeconds);
    };
    premiereDirector.onActChangeRequested = (actIndex: number) => {
      this.goToAct(actIndex, this._isPlaying);
    };
    (window as any).__premiereAudioDirector = premiereDirector;
    this.goToAct(0);"""

if target1 in text and "__premiereAudioDirector" not in text:
    text = text.replace(target1, code1, 1)
    print("SUCCESS: target1 replaced in constructor")

target2 = "      this._subtitles.update(dt);"
code2 = """      this._subtitles.update(dt);
      PremiereAudioDirector.getInstance().syncActFromApp(this._currentActIndex, currentTime);"""

if target2 in text and "PremiereAudioDirector.getInstance().syncActFromApp" not in text:
    text = text.replace(target2, code2, 1)
    print("SUCCESS: target2 replaced in update loop")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("Finished patching MovieApp.ts with constructor wiring and update sync")
