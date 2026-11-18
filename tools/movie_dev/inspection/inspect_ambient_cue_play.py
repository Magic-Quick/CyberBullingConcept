with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(1220, 1310):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
