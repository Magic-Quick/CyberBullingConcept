import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find timeline / time display code
for m in re.finditer(r'currentActTime|formatTime|_totalElapsedTime|getActStartTime', text):
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 100)
    print('--- MATCH ---')
    print(text[start:end])
    break
