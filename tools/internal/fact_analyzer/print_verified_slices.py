import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('verified_context_slices.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total verified targets: {len(data)}")
for i, d in enumerate(data):
    t = d['target']
    print(f"{i+1}. [{t['id']}] #{d['channel_name']}: {t['title']} ({len(d['messages'])} msgs)")
