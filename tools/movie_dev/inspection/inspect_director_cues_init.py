with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('_directorMusicCues =')
if idx != -1:
    print(text[idx:idx+2500])
else:
    print("Not found")
