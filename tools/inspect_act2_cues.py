import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Find act_2_sarcophagus block in storyData.ts
import re
match = re.search(r'\{\s*"id":\s*"act_2_sarcophagus"[\s\S]*?"cues":\s*(\[[^\]]+\])', text)
if match:
    cues_json = match.group(1)
    cues = json.loads(cues_json)
    for c in cues:
        print(f"[{c['start']:5.2f} - {c['end']:5.2f}] {c['text']}")
