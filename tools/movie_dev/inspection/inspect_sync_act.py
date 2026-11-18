with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('syncActFromApp')
if idx != -1:
    print(text[idx:idx+800])
