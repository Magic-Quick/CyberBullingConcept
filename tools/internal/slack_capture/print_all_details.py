import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'H:\PLBX\CyberBullingConcept\data\facts_dataset\all_song_context_slices.json', 'r', encoding='utf-8') as f:
    slices = json.load(f)

for s in slices[:3]:
    print(f"\n==================== {s['target']['id']} ====================")
    for i, m in enumerate(s['messages']):
        mark = ">>> " if m.get('ts') == s.get('target_ts') else "    "
        name = m.get('author_name', m.get('user', ''))
        txt = m.get('text', '').replace('\n', ' ')
        print(f"{mark}[{i}] {name}: {txt}")
