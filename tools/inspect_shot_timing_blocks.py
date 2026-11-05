with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- LINES 5440-5480 ---")
for i in range(5438, min(len(lines), 5480)):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- LINES 6710-6745 ---")
for i in range(6708, min(len(lines), 6745)):
    print(f"{i+1}: {lines[i]}", end='')
