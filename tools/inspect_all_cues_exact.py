with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r"time:\s*([0-9\.]+).*?ambientCueKey:\s*'([^']+)'", text)
for m in matches:
    start = max(0, m.start() - 60)
    end = min(len(text), m.end() + 80)
    print(text[start:end].replace('\n', ' '))
    print('---')
