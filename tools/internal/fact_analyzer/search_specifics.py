import re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_slack_10_02 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_slack.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_slack_09_25 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_meetings.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_meet_10_02 = f.read()

with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-09-25_meetings.md', 'r', encoding='utf-8', errors='ignore') as f:
    text_meet_09_25 = f.read()

def search_in_text(name, txt, patterns):
    print(f"=== SEARCHING IN {name} ===")
    lines = txt.split('\n')
    for i, line in enumerate(lines):
        for pat in patterns:
            if re.search(pat, line, re.IGNORECASE):
                print(f"Line {i+1}: {line}")
                for j in range(max(0, i-2), min(len(lines), i+3)):
                    print(f"   [{j+1}] {lines[j]}")
                print("-" * 40)
                break

print("--- 1. Ева суббота / кик-офф ---")
search_in_text("slack_10_02", text_slack_10_02, [r"кик.?офф", r"суббот", r"выходн"])
search_in_text("slack_09_25", text_slack_09_25, [r"кик.?офф", r"суббот", r"выходн"])
search_in_text("meet_10_02", text_meet_10_02, [r"кик.?офф", r"суббот", r"выходн"])
search_in_text("meet_09_25", text_meet_09_25, [r"кик.?офф", r"суббот", r"выходн"])

print("--- 2. Толя Гранола / сотка ---")
search_in_text("meet_09_25", text_meet_09_25, [r"сотка", r"сотку", r"100", r"гранол", r"granola"])
search_in_text("meet_10_02", text_meet_10_02, [r"сотка", r"сотку", r"100", r"гранол", r"granola"])
search_in_text("slack_09_25", text_slack_09_25, [r"сотка", r"сотку", r"гранол", r"granola"])
search_in_text("slack_10_02", text_slack_10_02, [r"сотка", r"сотку", r"гранол", r"granola"])

print("--- 3. Пирамиды / Артем ---")
search_in_text("slack_10_02", text_slack_10_02, [r"пирамид"])
search_in_text("slack_09_25", text_slack_09_25, [r"пирамид"])
search_in_text("meet_10_02", text_meet_10_02, [r"пирамид"])

print("--- 4. Корова с лазером ---")
search_in_text("slack_10_02", text_slack_10_02, [r"коров", r"вымен", r"GameGears"])

print("--- 5. Женя и Вика перекраски ---")
search_in_text("slack_10_02", text_slack_10_02, [r"перекрас", r"Вика", r"Женя"])
search_in_text("slack_09_25", text_slack_09_25, [r"перекрас", r"Вика", r"Женя"])
