with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'act_4_engine' in l:
        for j in range(i, min(len(lines), i+60)):
            print(f"{j+1}: {lines[j]}", end='')
        break
