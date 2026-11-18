with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'getCueAudio' in l or '_audioCache' in l:
        for j in range(max(0, i - 5), min(len(lines), i + 25)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
