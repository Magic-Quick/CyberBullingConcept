with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'CUE_NORMALIZATION_MAP\s*[:=]\s*\{([^}]+)\}', text)
if m:
    print(m.group(0))
