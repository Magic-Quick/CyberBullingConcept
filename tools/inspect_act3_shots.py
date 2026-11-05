with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'act_3_timemachine', text)
if m:
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 1500)
    print(text[start:end])
