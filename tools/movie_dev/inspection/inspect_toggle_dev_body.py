with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'toggleDevAudioDirector():' in l or 'toggleDevAudioDirector(): void' in l or 'toggleDevAudioDirector()' in l and 'void' in l:
        for j in range(max(0, i - 2), min(len(lines), i + 25)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
