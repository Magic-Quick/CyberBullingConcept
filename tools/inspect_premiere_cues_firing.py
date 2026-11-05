with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r"playCinematicCue[^\n]+", text)
for m in matches:
    print(m)

idx = text.find('update(')
if idx != -1:
    print(text[idx:idx+800])
else:
    print("No update method in PremiereAudioDirector")
