import sys, re

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'\{\s*"id":\s*"act_3_timemachine"[\s\S]*?"cues":\s*\[([\s\S]*?)\]\s*,\s*"hasDedicatedFrame"', text)
if m:
    cues_str = m.group(1)
    cue_blocks = re.findall(r'\{[^{}]+', cues_str)
    for cb in cue_blocks:
        st = re.search(r'"start":\s*([0-9.]+)', cb)
        en = re.search(r'"end":\s*([0-9.]+)', cb)
        tx = re.search(r'"text":\s*"([^"]+)"', cb)
        sl = re.search(r'"slackScreenshotKey":\s*"([^"]+)"', cb)
        s_val = float(st.group(1)) if st else 0
        e_val = float(en.group(1)) if en else 0
        t_val = tx.group(1) if tx else ''
        sl_val = sl.group(1) if sl else ''
        print(f"[{s_val:5.2f} - {e_val:5.2f}] {t_val}")
        if sl_val:
            print(f"    slack: {sl_val}")
