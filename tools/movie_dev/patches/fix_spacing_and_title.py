import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Spacing: nowPlaying at y=13, introVariants at y=46
text = text.replace(
    'this._directorNowPlayingText.position.set(0, 16);',
    'this._directorNowPlayingText.position.set(0, 13);'
)
text = text.replace(
    'this._dawIntroVariantsContainer.position.set(0, 42);',
    'this._dawIntroVariantsContainer.position.set(0, 46);'
)

# 2. Block title check
target_title = "const blockTitle = (cue.actId === 'intro_playbox' && cue.time === 24.0) ? '🎬 ДРОП ЛОГОТИПА' : (opt ? opt.name : cue.name);"
replacement_title = """const isDrop = (cue.name && cue.name.includes('ДРОП')) || (cue.actId === 'intro_playbox' && Math.abs(cue.time - 24.0) < 1.0);
      const blockTitle = isDrop ? '🎬 ДРОП ЛОГОТИПА' : (opt ? opt.name : cue.name);"""

if target_title in text:
    text = text.replace(target_title, replacement_title, 1)
    print("Found and replaced blockTitle")
else:
    print("WARNING: target_title not found")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated spacing and drop title detection successfully!")
