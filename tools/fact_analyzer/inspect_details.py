import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'H:\PLBX\CyberBullingConcept\found_facts_summary.json', 'r', encoding='utf-8') as f:
    report = json.load(f)

for q in [
    "3. Ева кик-офф / суббота",
    "4. Эдик 11 правок",
    "5. Дисней / Mintegral / Егор долгий ящик",
    "6. Павел Самойленко / Клод забанили / пулл-реквесты",
    "7. Толя Гранола / сотка",
    "8. Плейбл без проджекта / даты",
    "9. Артём Хухро пирамиды",
    "10. Женя и Вика планшеты / перекраски",
    "11. Корова с лазером",
    "12. Эдик боль / тент / капец был нормальный"
]:
    matches = report.get(q, [])
    print(f"\n==================== {q} ====================")
    for m in matches[:5]:
        print(f"[{m['doc']}:{m['line_num']}] {m['matching_line']}")
        for p in m['permalinks'][:3]:
            print(f"   LINK: {p}")
        print("   SNIPPET:\n" + "\n".join("     " + l for l in m['snippet'].split("\n")[:4]))
