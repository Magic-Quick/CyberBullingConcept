with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('playCinematicCue')
if idx != -1:
    print(text[idx:idx+1500])
