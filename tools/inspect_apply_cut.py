with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('_applyNarratorShotCut')
if idx != -1:
    print(text[idx:idx+1500])
