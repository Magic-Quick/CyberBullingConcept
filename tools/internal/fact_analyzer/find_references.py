import sys, os, re

sys.stdout.reconfigure(encoding='utf-8')

files = [
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_slack.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_meetings.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_meetings.md'
]

for fname in files:
    if os.path.exists(fname):
        with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
        links = re.findall(r'https://plbx\.slack\.com/archives/[^\s\)\`\]\"]+', text)
        print(f"{os.path.basename(fname)}: size={len(text)}, permalinks={len(links)}")
