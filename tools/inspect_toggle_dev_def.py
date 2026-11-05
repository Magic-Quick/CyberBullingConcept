with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'public toggleDevAudioDirector' in l or 'toggleDevAudioDirector()' in l:
        for j in range(max(0, i - 2), min(len(lines), i + 20)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
