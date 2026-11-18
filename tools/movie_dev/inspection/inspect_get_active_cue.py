with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('getActiveCueAtTime')
if idx != -1:
    print(text[idx:idx+1200])
