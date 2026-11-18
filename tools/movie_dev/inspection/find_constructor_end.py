with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
for m in re.finditer(r'this\.goToAct\(0\);', text):
    start = max(0, m.start() - 150)
    end = min(len(text), m.end() + 150)
    print(" ", repr(text[start:end]))
