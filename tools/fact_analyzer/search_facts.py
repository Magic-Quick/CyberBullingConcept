import sys, os, re

sys.stdout.reconfigure(encoding='utf-8')

fact_files = [
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_slack.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_meetings.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_meetings.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_antirepeat.md',
    r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_antirepeat.md'
]

search_terms = [
    ("демоблил", ["демоблил"]),
    ("Jnghfdbk", ["Jnghfdbk", "jnghfdbk"]),
    ("корова с лазером", ["коров", "лазер", "GameGears", "вымен"]),
    ("Эдик боль / тент / капец", ["тент", "капец", "Househunt", "Zynga", "11 правок", "одиннадцать"]),
    ("Ева кик-офф / суббота", ["Ева", "кик-офф", "кикофф", "суббот"]),
    ("Дисней / долгий ящик", ["Disney", "Mintegral", "долгий ящик", "129", "130"]),
    ("Павел Самойленко / Клод забанили", ["Самойленко", "блокнули", "забанили", "PR", "глазами"]),
    ("Толя Гранола / сотка", ["Гранол", "Granola", "сотку", "сотка", "пробить сотню"]),
    ("Артем пирамиды", ["Хухро", "пирамид"]),
    ("Женя и Вика", ["Вика", "Женя", "перекрас", "кнопок"]),
    ("плейбл без проджекта", ["без даты", "без проджекта", "StartDate"]),
    ("филинг / Royal Ark", ["филинг", "филлинг", "Royal Ark"]),
    ("Мэвис / Supercell", ["Mavis", "Supercell"]),
    ("сундук / яйцо", ["яйцо", "сундук"]),
    ("22 ГБ / 346 копий", ["22 ГБ", "346", "Кирилл", "Кристиан"]),
]

corpus = {}
for ff in fact_files:
    if os.path.exists(ff):
        with open(ff, 'r', encoding='utf-8', errors='ignore') as f:
            corpus[os.path.basename(ff)] = f.read()

for title, terms in search_terms:
    print(f"\n==========================================")
    print(f"SEARCH: {title}")
    print(f"==========================================")
    found = False
    for fname, text in corpus.items():
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(t.lower() in line.lower() for t in terms):
                found = True
                print(f"[{fname}:{i+1}] {line[:200]}")
                # Print context (previous line, next line if helpful)
                start = max(0, i-2)
                end = min(len(lines), i+4)
                for j in range(start, end):
                    prefix = "--> " if j == i else "    "
                    print(f"{prefix}L{j+1}: {lines[j]}")
                print("-" * 30)
    if not found:
        print("NOT FOUND")
