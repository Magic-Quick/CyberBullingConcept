with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_act = False
for i, l in enumerate(lines):
    if 'act_3_timemachine:' in l:
        in_act = True
    if in_act:
        print(f"{i+1}: {l.rstrip()}")
        if l.strip().startswith('],') and i > 400:
            break
