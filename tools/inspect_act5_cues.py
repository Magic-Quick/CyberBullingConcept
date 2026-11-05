with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(700, 850):
    if 'ambientCueKey' in lines[i]:
        print(f"{i+1}: {lines[i-2].strip()} | {lines[i].strip()}")
