import os, re, json

with open(r'H:\PLBX\CyberBullingConcept\AI_LORD_RAP_TRACK.md', 'r', encoding='utf-8') as f:
    song_text = f.read()

fact_files = {
    'slack_10_02': r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md',
    'slack_09_25': r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_slack.md',
    'meetings_10_02': r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_meetings.md',
    'meetings_09_25': r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_meetings.md',
}

corpus = {}
for k, path in fact_files.items():
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            corpus[k] = f.read()

queries = {
    "1. Горин 'демоблил'": ["демоблил"],
    "2. Горин 'Jnghfdbk'": ["Jnghfdbk"],
    "3. Ева кик-офф / суббота": ["Ева", "кик-офф", "кикофф", "суббот"],
    "4. Эдик 11 правок": ["11 правок", "одиннадцать правок", "Эдик", "11", "одиннадцать"],
    "5. Дисней / Mintegral / Егор долгий ящик": ["Disney", "Mintegral", "долгий ящик", "129", "130", "132"],
    "6. Павел Самойленко / Клод забанили / пулл-реквесты": ["Самойленко", "блокнули клода", "банили", "код ревью на PR", "глазами смотреть"],
    "7. Толя Гранола / сотка": ["Гранол", "Granola", "пробить сотню", "сотку"],
    "8. Плейбл без проджекта / даты": ["без даты", "без проджекта", "StartDate", "на ощупь"],
    "9. Артём Хухро пирамиды": ["Хухро", "пирамид"],
    "10. Женя и Вика планшеты / перекраски": ["Женя", "Вика", "перекрас", "кнопок", "планшет"],
    "11. Корова с лазером": ["коров", "лазер", "GameGears", "вымен"],
    "12. Эдик боль / тент / капец был нормальный": ["тент", "капец", "Househunt", "нормальный"],
    "13. Клиентархи / филинг / Royal Ark": ["филинг", "филлинг", "Royal Ark"],
    "14. Мэвис ноги сломаны / Supercell": ["Mavis", "legs", "Supercell", "Фокал"],
    "15. Сундук с яйцом / хруст яйца": ["яйц", "сундук"],
    "16. 346 копий / 22 ГБ": ["22 ГБ", "346", "Кирилл", "Кристиан"],
    "17. Даниал Искаков / 3А проект / падение акций": ["Искаков", "3А", "падению акций"],
    "18. Машина времени / Ник Егоров / правьте даты": ["Ник", "Егоров", "2.5", "правьте даты", "попровил"]
}

report = {}

for qname, terms in queries.items():
    matches = []
    for doc_name, text in corpus.items():
        # find matching sections or lines
        lines = text.split('\n')
        for i, line in enumerate(lines):
            for t in terms:
                if re.search(r'\b' + re.escape(t) + r'\b', line, re.IGNORECASE) or (len(t) > 4 and t.lower() in line.lower()):
                    # grab block around line
                    start = max(0, i - 3)
                    end = min(len(lines), i + 6)
                    context_block = "\n".join(lines[start:end])
                    
                    # find any permalinks in or near this block
                    surrounding = "\n".join(lines[max(0, i-10):min(len(lines), i+15)])
                    permalinks = re.findall(r'https://plbx\.slack\.com/archives/[^\s\)\`\]\"]+', surrounding)
                    
                    matches.append({
                        'doc': doc_name,
                        'line_num': i + 1,
                        'matching_line': line.strip(),
                        'snippet': context_block,
                        'permalinks': list(set(permalinks))
                    })
                    break
    report[qname] = matches

with open(r'H:\PLBX\CyberBullingConcept\found_facts_summary.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("Saved found_facts_summary.json")
