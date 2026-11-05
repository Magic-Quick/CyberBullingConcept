with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'ручной зачистке', text)]
for idx in matches:
    print(text[max(0, idx-200):min(len(text), idx+300)])
