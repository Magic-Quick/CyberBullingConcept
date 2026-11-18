import os

for root, dirs, files in os.walk(r'media/visual/prompts'):
    for f in files:
        if 'egorov' in f or 'speedrun' in f:
            full = os.path.join(root, f)
            print('===', f, '===')
            with open(full, 'r', encoding='utf-8') as pf:
                print(pf.read()[:800])
