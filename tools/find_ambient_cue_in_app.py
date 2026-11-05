with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'ambientCueKey' in l or 'playCinematicCue' in l:
        print(f"{i+1}: {l.strip()[:100]}")
