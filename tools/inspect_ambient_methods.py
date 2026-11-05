with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'public\s+([A-Za-z0-9_]+)\s*\(', text)
print("Public methods on AmbientManager:")
for m in matches:
    print(" ", m)
