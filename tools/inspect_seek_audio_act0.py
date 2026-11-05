with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(5370, 5395):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
