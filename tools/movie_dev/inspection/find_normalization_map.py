with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'CUE_NORMALIZATION' in l or 'NORMALIZATION_MAP' in l:
        for j in range(i, min(len(lines), i + 40)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
