with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_act = ''
for i, l in enumerate(lines):
    if l.strip().endswith(': ['):
        current_act = l.strip().split(':')[0]
    if 'ambientCueKey' in l:
        s = l.strip().encode('ascii', 'replace').decode('ascii')
        print(f"{current_act:20} line {i+1:4d}: {s}")
