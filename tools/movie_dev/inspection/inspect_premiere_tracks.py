with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('DEFAULT_TIMELINE_TRACKS')
if idx != -1:
    print(text[idx:idx+2500])
else:
    print("No DEFAULT_TIMELINE_TRACKS")
