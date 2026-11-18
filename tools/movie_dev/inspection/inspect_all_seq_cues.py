with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r"(\w+):\s*\[(.*?)\]", text, re.DOTALL)
for act_name, body in matches:
    if 'ambientCueKey' in body:
        cues = re.findall(r"time:\s*([0-9.]+).*?ambientCueKey:\s*'([^']+)'", body, re.DOTALL)
        for t, k in cues:
            print(f"{act_name:25} | t={float(t):6.2f}s | {k}")
