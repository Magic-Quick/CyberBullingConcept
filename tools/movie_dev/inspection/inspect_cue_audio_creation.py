with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'this._cueAudio =' in l:
        for j in range(max(0, i - 5), min(len(lines), i + 20)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
