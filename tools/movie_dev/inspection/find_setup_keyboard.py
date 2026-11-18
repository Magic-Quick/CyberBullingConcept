with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("Matches for setupKeyboard:")
for m in re.finditer(r'setupKeyboard', text):
    start = max(0, m.start() - 40)
    end = min(len(text), m.end() + 40)
    print(" ", repr(text[start:end]))

print("Matches for subtitles.update:")
for m in re.finditer(r'_subtitles\.update', text):
    start = max(0, m.start() - 40)
    end = min(len(text), m.end() + 40)
    print(" ", repr(text[start:end]))
