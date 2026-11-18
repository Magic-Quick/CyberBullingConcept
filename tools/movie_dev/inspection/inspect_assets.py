import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/assetsManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'[\'"]([^\'"]*dashboard[^\'"]*|.*danial.*|.*altar.*)[\'"]:\s*[\'"]([^\'"]+)[\'"]', text)
for k, v in matches:
    print(f'{k:50} -> {v}')
