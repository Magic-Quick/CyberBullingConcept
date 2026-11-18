with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'public update(' in l or ' update(' in l:
        print(f"{i+1}: {l.rstrip()}")
