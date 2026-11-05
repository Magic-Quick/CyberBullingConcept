import sys
sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect all references to INTRO_DISCLAIMER_DURATION in MovieApp.ts
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'INTRO_DISCLAIMER_DURATION' in l or 'discFadeEnd' in l or 'disclaimer' in l.lower() and 'ambient' in l.lower():
        print(f"{i+1}: {l.strip()[:100]}")
