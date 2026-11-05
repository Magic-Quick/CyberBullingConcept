import os
with open('tools/internal/scripts/render_master_slack_cards.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace 09_danial_3a_project
t_danial = '''    {
        "id": "09_danial_3a_project",
        "channel": "vizor_production",
        "user_name": "Даниал Искаков",
        "avatar_img": None,
        "user_color": "#2EB67D",
        "time": "29 сен в 16:20",
        "text": "я как будто бы не над плееблом за 8сп работаю а над 3А проектом где любое неверное движение роняет акции компании на миллиарды",
        "min_width": 640
    },
    {
        "id": "09_voron_minnoe_pole",
        "channel": "vizor_production",
        "user_name": "Александр Ворон",
        "avatar_img": None,
        "user_color": "#E01E5A",
        "time": "28 сен в 16:22",
        "text": "Там минное поле? Да это просто рабочий вторник",
        "min_width": 500
    },'''

r_danial = '''    {
        "id": "09_danial_3a_project",
        "channel": "stillfront_production",
        "user_name": "Даниал Искаков",
        "avatar_img": "avatar_danial.jpg",
        "user_color": "#2EB67D",
        "time": "28 сен в 16:15",
        "text": "я как будто бы не над плееблом за 8сп работаю а над 3А проектом где любая деталь может привести к падению акций на пару миллиардов 😅",
        "min_width": 640
    },
    {
        "id": "09_voron_minnoe_pole",
        "channel": "stillfront_production",
        "user_name": "Александр Ворон",
        "avatar_img": None,
        "user_color": "#E01E5A",
        "time": "28 сен в 16:55",
        "text": "как по минному полю… ну так себе ребята делают)))))",
        "min_width": 520
    },'''

if t_danial in text:
    text = text.replace(t_danial, r_danial, 1)
    print("Replaced Danial & Voron cards in render_master_slack_cards.py")
else:
    print("WARNING: t_danial not found")

with open('tools/internal/scripts/render_master_slack_cards.py', 'w', encoding='utf-8') as f:
    f.write(text)

# Also check render_all_slack_cards.py
if os.path.exists('tools/internal/scripts/render_all_slack_cards.py'):
    with open('tools/internal/scripts/render_all_slack_cards.py', 'r', encoding='utf-8') as f:
        t_all = f.read()
    
    t_danial_fake = "Я не понял ничего из таски, сделаю 3А-проект, чтобы не ошибиться"
    r_danial_real = "я как будто бы не над плееблом за 8сп работаю а над 3А проектом где любая деталь может привести к падению акций на пару миллиардов 😅"
    if t_danial_fake in t_all:
        t_all = t_all.replace(t_danial_fake, r_danial_real)
        t_all = t_all.replace("Там минное поле?", "как по минному полю… ну так себе ребята делают)))))")
        with open('tools/internal/scripts/render_all_slack_cards.py', 'w', encoding='utf-8') as f:
            f.write(t_all)
        print("Updated render_all_slack_cards.py as well!")
