with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('// 3. Ambient Track Fade In / Out Processing')
if idx != -1:
    print(text[idx:idx+1500])
else:
    idx2 = text.find('_fadingCues')
    print(text[idx2:idx2+1500])
