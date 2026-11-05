with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- LINES 7000-7020 ---")
for i in range(6998, min(len(lines), 7025)):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- LINES 7535-7555 ---")
for i in range(7535, min(len(lines), 7560)):
    print(f"{i+1}: {lines[i]}", end='')
