import re, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Match each act block
act_pattern = re.compile(r'\{\s*"id":\s*"([^"]+)",[\s\S]*?"title":\s*"([^"]+)",[\s\S]*?"duration":\s*([0-9.]+)', re.MULTILINE)
cumulative = 0.0
for m in act_pattern.finditer(text):
    act_id = m.group(1)
    title = m.group(2)
    dur = float(m.group(3))
    mins = int(cumulative // 60)
    secs = int(cumulative % 60)
    end_mins = int((cumulative + dur) // 60)
    end_secs = int((cumulative + dur) % 60)
    print(f'{act_id:25} | {title:35} | {mins:02d}:{secs:02d} -> {end_mins:02d}:{end_secs:02d} ({dur:.1f}s)')
    cumulative += dur

print(f'Total duration: {int(cumulative//60):02d}:{int(cumulative%60):02d}')
