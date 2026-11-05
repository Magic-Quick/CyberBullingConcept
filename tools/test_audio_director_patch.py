import re

# Read MovieApp.ts
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Check that TRANSITION_SOUNDS_METADATA is found
assert 'TRANSITION_SOUNDS_METADATA' in code, "TRANSITION_SOUNDS_METADATA missing!"
print("Found TRANSITION_SOUNDS_METADATA!")
