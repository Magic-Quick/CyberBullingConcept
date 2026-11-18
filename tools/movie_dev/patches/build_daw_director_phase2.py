import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Locate _setupDebugUI start
setup_idx = -1
for i, l in enumerate(lines):
    if 'private _setupDebugUI(): void {' in l:
        setup_idx = i
        break

print(f"_setupDebugUI starts at line {setup_idx + 1}")

# Locate _updateDebugDisplay start
update_idx = -1
for i, l in enumerate(lines):
    if 'private _updateDebugDisplay(): void {' in l:
        update_idx = i
        break

print(f"_updateDebugDisplay starts at line {update_idx + 1}")
