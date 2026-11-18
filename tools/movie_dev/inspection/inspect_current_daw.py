with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if '_daw' in l or '_debugExpanded' in l or '_devGearBtn' in l:
        print(f"{i+1}: {l.rstrip()}")
