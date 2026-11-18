import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Wire checkDirectorMusicCues into _update
target_update = "this._subtitles.syncToTime(currentTime, this._isPlaying);"
replacement_update = """this._subtitles.syncToTime(currentTime, this._isPlaying);
      this._checkDirectorMusicCues(currentTime);
      if (this._debugExpanded && this._directorActTimeText) {
        const curT = Math.max(0, this._actTime).toFixed(1);
        const totT = this._actDuration.toFixed(1);
        const act = STORY_ACTS[this._currentActIndex] || STORY_ACTS[0];
        this._directorActTimeText.text = `АКТ ${this._currentActIndex}: ${act.title} • ТЕКУЩИЙ КАДР: ${curT}s / ${totT}s`;
      }"""

if target_update in c:
    c = c.replace(target_update, replacement_update, 1)
    print('Wired _checkDirectorMusicCues into _update!')
else:
    print('WARNING: target_update not found!')

# 2. Wire keydown handlers for Director hotkeys
target_keys = """      } else if (e.key === 't' || e.key === 'T') {

        SFX.playClick();

        this.toggleIntroTrack();

      } else if (e.key === 'p' || e.key === 'P') {

        if (this._currentActIndex === 0) {

          this.seekAudio(24.0);

        }

      }"""

replacement_keys = """      } else if (this._debugExpanded && (e.code === 'KeyT' || e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е')) {
        e.preventDefault();
        this.addDirectorMusicCue('dread');
      } else if (this._debugExpanded && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
        e.preventDefault();
        this.addDirectorMusicCue('peace');
      } else if (this._debugExpanded && (e.code === 'KeyX' || e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч')) {
        e.preventDefault();
        this.addDirectorMusicCue('stop');
      } else if (this._debugExpanded && (e.code === 'BracketLeft' || e.key === '[' || e.key === 'х')) {
        e.preventDefault();
        const act = STORY_ACTS[this._currentActIndex];
        const cues = this._directorMusicCues.get(act.id) || [];
        if (cues.length) this.nudgeDirectorMusicCue(cues[cues.length - 1].id, -1.0);
      } else if (this._debugExpanded && (e.code === 'BracketRight' || e.key === ']' || e.key === 'ъ')) {
        e.preventDefault();
        const act = STORY_ACTS[this._currentActIndex];
        const cues = this._directorMusicCues.get(act.id) || [];
        if (cues.length) this.nudgeDirectorMusicCue(cues[cues.length - 1].id, +1.0);
      } else if (e.key === 't' || e.key === 'T') {
        SFX.playClick();
        this.toggleIntroTrack();
      } else if (e.key === 'p' || e.key === 'P') {
        if (this._currentActIndex === 0) {
          this.seekAudio(24.0);
        }
      }"""

if target_keys in c:
    c = c.replace(target_keys, replacement_keys)
    print('Wired director hotkeys (T, P, X, [, ])!')
else:
    print('WARNING: target_keys not found!')

# 3. Reset _lastFiredMusicCueId when changing acts or seeking
target_seek = "this._isSeeking = true;"
replacement_seek = "this._isSeeking = true;\n    this._lastFiredMusicCueId = null;"
if target_seek in c:
    c = c.replace(target_seek, replacement_seek)
    print('Wired seek reset for cue tracking!')

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('Wiring patch finished!')
