with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """      this._subtitles.update(dt);
      PremiereAudioDirector.getInstance().syncActFromApp(this._currentActIndex, currentTime);

      this._subtitles.syncToTime(currentTime, this._isPlaying);"""

replacement1 = """      this._subtitles.update(dt);
      this._subtitles.syncToTime(currentTime, this._isPlaying);"""

target2 = """        this._updateQuoteBadgeTyping(dt);
        this._updateLocationBadgeTyping(dt);

      }

    }

    // Update progress bar & timecode"""

replacement2 = """        this._updateQuoteBadgeTyping(dt);
        this._updateLocationBadgeTyping(dt);

      }

    }

    // Sync Premiere Audio Director timeline on EVERY frame for ALL acts including Act 0
    PremiereAudioDirector.getInstance().syncActFromApp(this._currentActIndex, currentTime);

    // Update progress bar & timecode"""

if target1 in text:
    text = text.replace(target1, replacement1, 1)
    print("SUCCESS 1: Removed syncActFromApp from inside else")
else:
    print("WARNING 1: target1 not found")

if target2 in text:
    text = text.replace(target2, replacement2, 1)
    print("SUCCESS 2: Added syncActFromApp globally after else")
else:
    print("WARNING 2: target2 not found")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("MovieApp.ts updated successfully")
