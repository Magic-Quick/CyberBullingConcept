with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r"act_6[^\n]+", text)
for m in matches:
    print(m)

# also check act defaults in AmbientManager
idx = text.find('DEFAULT_ACT_CUES')
if idx != -1:
    print(text[idx:idx+800])
else:
    print("no DEFAULT_ACT_CUES")
