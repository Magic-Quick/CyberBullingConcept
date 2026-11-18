with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_act = ''
for i, l in enumerate(lines):
    if l.strip().endswith(': ['):
        current_act = l.strip().split(':')[0]
    if 'ambientCueKey' in l or 'time:' in l and ('dread' in l or 'peace' in l):
        print(f"{current_act:25} | line {i+1:4d}: {l.strip()}")
