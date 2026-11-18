import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect where MovieApp class fields are declared
with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Find TRANSITION_SOUNDS_METADATA
idx = text.find('TRANSITION_SOUNDS_METADATA')
print('Found TRANSITION_SOUNDS_METADATA at', idx)
print(text[idx:idx+400])
