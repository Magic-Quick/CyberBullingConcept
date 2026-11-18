with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'narratorShot' in l or 'NARRATOR_SHOT_SEQUENCE' in l:
        print(f"{i+1}: {l.strip()[:100]}")
