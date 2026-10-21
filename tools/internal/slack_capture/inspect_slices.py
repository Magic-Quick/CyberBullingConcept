import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'H:\PLBX\CyberBullingConcept\data\facts_dataset\all_song_context_slices.json', 'r', encoding='utf-8') as f:
    slices = json.load(f)

for s in slices:
    target = s['target']
    print(f"=== {target['id']} ({target['title']}) ===")
    for m in s['messages']:
        name = m.get('author_name', m.get('user', ''))
        text = m.get('text', '').replace('\n', ' ')
        is_t = '>>> ' if m.get('ts') == s.get('target_ts') else '    '
        print(f"{is_t}{name}: {text[:90]}")
    print()
