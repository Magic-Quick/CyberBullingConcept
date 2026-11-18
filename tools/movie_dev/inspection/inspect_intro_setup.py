with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- goToAct(0) setup ---")
for i in range(4900, 4945):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")

print("\n--- _playIntroAnimation ---")
for i in range(5545, 5585):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
