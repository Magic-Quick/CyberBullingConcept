with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'private _getAudio' in l:
        for j in range(max(0, i - 2), min(len(lines), i + 30)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
