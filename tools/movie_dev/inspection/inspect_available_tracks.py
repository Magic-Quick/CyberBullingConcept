with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("AMBIENT TRACKS:")
for m in re.finditer(r"['\"](retro_ambient_[^'\"]+|desolate_cry|titan_forge|0[0-9]_[^'\"]+|dread_[^'\"]+|peace_[^'\"]+|melodic_[^'\"]+|braam_[^'\"]+|trailer_[^'\"]+)['\"]", text):
    print(" ", m.group(1))
