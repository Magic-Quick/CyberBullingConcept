import json, sys

sys.stdout.reconfigure(encoding='utf-8')


with open(r'H:\PLBX\CyberBullingConcept\found_facts_summary.json', 'r', encoding='utf-8') as f:
    report = json.load(f)

for qname, matches in report.items():
    print(f"=== {qname} (matches: {len(matches)}) ===")
    for m in matches[:3]: # show top 3
        print(f"  [{m['doc']}:{m['line_num']}] {m['matching_line'][:120]}")
        if m['permalinks']:
            for p in m['permalinks'][:2]:
                print(f"    LINK: {p}")
    print()
