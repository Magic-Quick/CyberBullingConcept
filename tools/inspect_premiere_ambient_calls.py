with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'AmbientManager\.[A-Za-z0-9_]+', text)
for m in matches:
    start = max(0, m.start() - 40)
    end = min(len(text), m.end() + 40)
    print(text[start:end].replace('\n', ' '))
