import os, re, json

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_slack_10_02 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_slack.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_slack_09_25 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_meetings.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_meet_10_02 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_meetings.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_meet_09_25 = f.read()

all_docs = {
    'slack_10_02': text_slack_10_02,
    'slack_09_25': text_slack_09_25,
    'meet_10_02': text_meet_10_02,
    'meet_09_25': text_meet_09_25,
}

items = [
    ("1. Горин 'демоблил'", [r"демоблил"]),
    ("2. Горин 'Jnghfdbk'", [r"Jnghfdbk"]),
    ("3. Ева кик-офф / суббота / плейбл в работу", [r"Ева.*кик.?офф", r"кик.?офф.*Ева", r"пашем в субботу", r"суббот", r"кик.?офф пять минут"]),
    ("4. Эдик 11 правок / свиток", [r"11 пунктов", r"11 правок", r"одиннадцать"]),
    ("5. Дисней / Mintegral / Егор 'долгий ящик'", [r"Disney", r"долгий ящик", r"Mintegral"]),
    ("6. Павел Самойленко / Клод забанили / PR", [r"Самойленко", r"бло(?:к|кну)ли.*клод", r"код ревью на PR"]),
    ("7. Толя Гранола / сотка", [r"Гранол", r"Granola", r"пробить сотню", r"сотку"]),
    ("8. Плейбл без проджекта / даты", [r"без даты", r"без проджекта", r"100% разработки без"]),
    ("9. Артём Хухро / пирамиды / пиксели добывают пиксели", [r"Хухро.*пирамид", r"пирамид", r"пиксели добывают пиксели"]),
    ("10. Женя и Вика планшеты / перекраски", [r"перекрас", r"Женя", r"Вика.*арт"]),
    ("11. Корова с лазером из вымени", [r"вымен", r"коров.*лазер"]),
    ("12. Эдик: Капец, был нормальный / тент", [r"тент.*брат", r"капец.*тент", r"был нормальный"]),
    ("13. Клиент: филинг / Royal Ark", [r"филлинга 0", r"филинга 0", r"Royal Ark.*мясо"]),
    ("14. Supercell: Mavis legs are broken", [r"Mavis", r"legs are broken"]),
    ("15. Сундук с яйцом", [r"звук.*яйц", r"не яйцо", r"сундук.*яйц"]),
    ("16. 346 копий / 22 ГБ мусора (Кирилл и Кристиан)", [r"22 ГБ", r"346 копий"]),
    ("17. Даниал Искаков: 3А проект / падение акций", [r"падению акций", r"8сп.*3А"]),
    ("18. Машина времени / Ник Егоров / правьте даты", [r"правьте даты", r"попровил", r"2,25"])
]

out = []
for title, pats in items:
    out.append(f"## {title}\n")
    found_any = False
    for doc_name, doc_text in all_docs.items():
        lines = doc_text.split('\n')
        for idx, line in enumerate(lines):
            for pat in pats:
                if re.search(pat, line, re.IGNORECASE):
                    found_any = True
                    start = max(0, idx - 2)
                    end = min(len(lines), idx + 5)
                    context = "\n".join(lines[start:end])
                    # find permalinks
                    surrounding = "\n".join(lines[max(0, idx-8):min(len(lines), idx+12)])
                    perms = re.findall(r'https://plbx\.slack\.com/archives/[^\s\)\`\]\"]+', surrounding)
                    perms_unique = list(dict.fromkeys(perms))
                    out.append(f"**Doc**: `{doc_name}` (Line {idx+1})\n")
                    out.append(f"```markdown\n{context}\n```\n")
                    if perms_unique:
                        out.append(f"**Permalinks**:\n" + "\n".join(f"- {p}" for p in perms_unique) + "\n")
                    out.append("\n---\n")
                    break
    if not found_any:
        out.append("*Ничего не найдено по фильтрам*\n\n---\n")

with open(r'H:\PLBX\CyberBullingConcept\song_facts_mapped.md', 'w', encoding='utf-8') as f:
    f.write("\n".join(out))

print("Saved H:\\PLBX\\CyberBullingConcept\\song_facts_mapped.md")
