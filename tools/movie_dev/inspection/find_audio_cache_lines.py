with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if '_audioCache' in l:
        print(f"{i+1}: {l.rstrip()}")
