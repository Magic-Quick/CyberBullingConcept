import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/Subtitles.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'syncToTime\([^\)]*\)[\s\S]*?\{[\s\S]*?activeCue', text)
if m:
    print(m.group(0)[:1000])
