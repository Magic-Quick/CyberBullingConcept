import sys, re

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/narratorShotSequence.ts', 'r', encoding='utf-8') as f:
    text = f.read()

act_blocks = re.findall(r'(\w+):\s*\[([\s\S]*?)\]\s*,', text)
for act, body in act_blocks:
    cues = re.findall(r'time:\s*([0-9.]+)[^}]+ambientCueKey:\s*[\'"]([^\'"]+)[\'"]', body)
    if cues:
        print(f'Act: {act}')
        for t, k in cues:
            print(f'   {float(t):6.2f}s -> {k}')
