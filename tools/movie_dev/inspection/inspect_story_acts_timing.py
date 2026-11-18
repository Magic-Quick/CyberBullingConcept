import re

with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('STORY_ACTS')
block = text[idx:]
items = re.findall(r'"id":\s*"([^"]+)".*?"title":\s*"([^"]+)".*?"duration":\s*([0-9.]+)', block, re.DOTALL)
total = 0.0
for act_id, title, dur in items:
    dur_f = float(dur)
    start = total
    total += dur_f
    print(f"{act_id:25} | {title:30} | {dur_f:6.1f}s | {int(start//60):02d}:{int(start%60):02d} ({start:6.1f}s) -> {int(total//60):02d}:{int(total%60):02d} ({total:6.1f}s)")
