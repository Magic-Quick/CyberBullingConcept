with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('// Case 2: New cue or switching cues during seek')
print(text[idx:idx+800])
