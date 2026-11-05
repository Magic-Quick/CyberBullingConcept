with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(250, 285):
    print(f"{i+1}: {lines[i].rstrip()}")
