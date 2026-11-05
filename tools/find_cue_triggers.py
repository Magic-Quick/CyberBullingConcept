with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'playCinematicCue' in l or 'syncCinematicCue' in l:
        print(f"{i+1}: {l.rstrip()}")
