import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'\{\s*"id":\s*"act_2_sarcophagus"[\s\S]*?"cues"', text)
if m:
    print(m.group(0))
