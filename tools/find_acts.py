with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '"id":' in line or "'id':" in line:
            print(f"{i+1}: {line.strip()}")
