with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(5750, 5920):
    if i < len(lines):
        s = lines[i].rstrip().encode('ascii', 'replace').decode('ascii')
        print(f"{i+1}: {s}")
