with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('syncCinematicCue')
print(text[idx+500:idx+1500])
