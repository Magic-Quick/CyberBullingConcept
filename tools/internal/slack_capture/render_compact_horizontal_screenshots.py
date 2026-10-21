import json, os, sys, html, re
from playwright.sync_api import sync_playwright

output_dir = r"H:\PLBX\CyberBullingConcept\Slack_Screenshots"
os.makedirs(output_dir, exist_ok=True)

# Curated compact slices: minimal text, maximum clarity, zero bloat
curated_slices = [
    {
        "id": "01_jnghfdbk",
        "messages": [
            {
                "user_name": "Иван Коваленко",
                "user_color": "#2bac76",
                "time": "29 сен в 10:25",
                "text": "Собрал тестовый билд для ревью: playbox.play.plbx.ai/vizor/pinespeak-b1-c4-ru",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 10:29",
                "text": "Jnghfdbk",
                "is_target": True
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 10:30",
                "text": "Все хорошо, собираем",
                "is_target": False
            }
        ]
    },
    {
        "id": "02_demoblil",
        "messages": [
            {
                "user_name": "Дамир",
                "user_color": "#4e79a7",
                "time": "29 сен в 14:15",
                "text": "@Алексей Горин привет! смотрел билд?",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 14:22",
                "text": "Привет! Не успел вчера, сегодня гляну",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 14:23",
                "text": "дай демоблил, плиз @Дамир",
                "is_target": True
            }
        ]
    },
    {
        "id": "03_disney_long_box",
        "messages": [
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "28 сен в 15:40",
                "text": "Распишу клиенту все после синка. Проект висит в QA уже 129 дней",
                "is_target": False
            },
            {
                "user_name": "Егор Ткачёв",
                "user_color": "#de425b",
                "time": "28 сен в 15:42",
                "text": "Видимо тут мы пометочку не сделали @Алексей Горин. Может нам нужен статус “долгий ящик” для таких плейблов?)",
                "is_target": True
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "28 сен в 15:45",
                "text": "Надо обсудить нужен ли отдельный статус, у нас он один такой этот плеебл. Который и не отменяют и не продолжают",
                "is_target": False
            }
        ]
    },
    {
        "id": "04_claude_banned",
        "messages": [
            {
                "user_name": "Павел Самойленко",
                "user_color": "#b07aa1",
                "time": "1 окт в 15:00",
                "text": "мне блокнули клода, поэтому пока код ревью на PR ближайшие 5-10 дней на паузе",
                "is_target": True
            },
            {
                "user_name": "Кирилл Берёзкин",
                "user_color": "#9c755f",
                "time": "1 окт в 15:02",
                "text": "А чего вдруг?",
                "is_target": False
            },
            {
                "user_name": "Павел Самойленко",
                "user_color": "#b07aa1",
                "time": "1 окт в 15:03",
                "text": "хз, скорее всего какой-то баг. ревью апелляции до 10 дней… Если нужно ревью, тегайте плз — буду глазами смотреть",
                "is_target": False
            },
            {
                "user_name": "Kristian",
                "user_color": "#ff9da7",
                "time": "1 окт в 15:05",
                "text": "жесть, как без него жить теперь 😰",
                "is_target": False
            }
        ]
    },
    {
        "id": "05_edik_11_points",
        "messages": [
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "29 сен в 12:45",
                "text": "@Александр Ворон Привет! Тараканы жесть, у меня вчера в окно похожий залетел, оч триггерит. Напишу список правок для разраба, тут мелочь по сути:",
                "is_target": False
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "29 сен в 12:50",
                "text": "1. Вступление с лого 2. Убрать Starter 3. Счетчик House Value 4. Адаптив UI 5. Переделать губку 6. Звуки на все действия 7. Ремонт объектов 8. VFX кухни 9. Кнопка “Hold to Sell” 10. Переработать пэкшот 11. Цены в карточки домов",
                "is_target": True
            },
            {
                "user_name": "Ярослав Филимонов",
                "user_color": "#76b7b2",
                "time": "29 сен в 12:55",
                "text": "Интересные плееблы пошли...",
                "is_target": False
            }
        ]
    },
    {
        "id": "06_tent_brother",
        "messages": [
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "30 сен в 10:10",
                "text": "@Бексултан Каримтаев привет. Очень нравится концепт, но клиент пишет, что строительный тент выглядит не очень привлекательно. Придется убирать...",
                "is_target": False
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "30 сен в 10:11",
                "text": "капец, я уже полюбил этот тент, как родного брата",
                "is_target": True
            },
            {
                "user_name": "Бексултан Каримтаев",
                "user_color": "#f28e2b",
                "time": "30 сен в 10:34",
                "text": "Привет! Эх, жалко тент наш разработанный( Сейчас сделаю правки 😌",
                "is_target": False
            }
        ]
    },
    {
        "id": "07_cow_laser",
        "messages": [
            {
                "user_name": "Шавкат Шафин",
                "user_color": "#1264A3",
                "time": "30 сен в 17:15",
                "text": "Та самая корова, которую Ник уменьшал",
                "is_target": False
            },
            {
                "user_name": "Артём Хухро",
                "user_color": "#611f69",
                "time": "30 сен в 17:18",
                "text": "я б поиграл в то, как корова роботизированная летает над городом пришельцев и забирает их лучом притягивающим из вымени на переработку",
                "is_target": True
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "30 сен в 17:25",
                "text": "Артем слишком буквально принял мою просьбу 😅",
                "is_target": False
            }
        ]
    },
    {
        "id": "08_mavis_legs",
        "messages": [
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 11:20",
                "text": "Тут есть фид от Supercell из Фокала, висел несколько дней:",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "29 сен в 11:22",
                "text": "1. train assets 2. Mavis legs are broken 3. ground contrast 4. ui should be from the game",
                "is_target": True
            },
            {
                "user_name": "Иван Коваленко",
                "user_color": "#2bac76",
                "time": "29 сен в 11:25",
                "text": "@Алексей Горин понял, чиним ноги Мэйвис и подставляем ассеты 👍",
                "is_target": False
            }
        ]
    },
    {
        "id": "09_danial_3a_project",
        "messages": [
            {
                "user_name": "Даниал Искаков",
                "user_color": "#ECB22E",
                "time": "28 сен в 14:27",
                "text": "я как будто бы не над плееблом за 8сп работаю а над 3А проектом где любая деталь может привести к падению акций на пару миллиардов 😅",
                "is_target": True
            },
            {
                "user_name": "Ева Аксенова",
                "user_color": "#2EB67D",
                "time": "28 сен в 14:32",
                "text": "Если мы это не поправим внутри, на это укажет клиент - они каждую мелочь видят",
                "is_target": False
            },
            {
                "user_name": "Александр Ворон",
                "user_color": "#4A154B",
                "time": "28 сен в 15:06",
                "text": "@Даниал Искаков на самом деле это очень близко, только не к падению акций, а к тому что клиент скажет “ну че то не очень” и уйдет забрав заказы. Мы тут как по минному полю.",
                "is_target": False
            }
        ]
    },
    {
        "id": "10_pyramids_museum",
        "messages": [
            {
                "user_name": "Артём Хухро",
                "user_color": "#611f69",
                "time": "12 окт в 16:40",
                "text": "Клиент написал, чтобы пирамиды были соразмерны зданиям и персонажам. Пирамиды это музей?",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "12 окт в 16:42",
                "text": "Не, я думаю тут надо увеличивать пирамиды. Можно скомбинировать с увеличением входа",
                "is_target": True
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "12 окт в 16:43",
                "text": "расширяем карту",
                "is_target": False
            }
        ]
    },
    {
        "id": "11_eva_kickoff",
        "messages": [
            {
                "user_name": "Ева Аксенова",
                "user_color": "#2EB67D",
                "time": "30 сен в 14:50",
                "text": "🐷 Idletopia Drive-thru / C1 — оплата зашла, берем сразу!",
                "is_target": False
            },
            {
                "user_name": "Ева Аксенова",
                "user_color": "#2EB67D",
                "time": "30 сен в 14:52",
                "text": "@Дамир Привет! Возьми в работу этот плейбл. Кик-офф: КП @Егор Ткачёв, Техлид @Иван Коваленко. Собрать сцену прямо сейчас.",
                "is_target": True
            },
            {
                "user_name": "Дамир",
                "user_color": "#4e79a7",
                "time": "30 сен в 14:55",
                "text": "Привет! Хорошо, уже открыл проект 👍",
                "is_target": False
            }
        ]
    },
    {
        "id": "12_nick_time_machine",
        "messages": [
            {
                "user_name": "Шавкат Шафин",
                "user_color": "#1264A3",
                "time": "2 окт в 11:20",
                "text": "@Алексей Горин тут Нику можем засчитать ачивку за скорость? В ноушене даты немного не так стоят",
                "is_target": False
            },
            {
                "user_name": "Алексей Горин",
                "user_color": "#E01E5A",
                "time": "2 окт в 11:22",
                "text": "Ок, даю добро, правьте даты",
                "is_target": True
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "2 окт в 11:24",
                "text": "поправил",
                "is_target": False
            }
        ]
    },
    {
        "id": "13_chest_egg_sound",
        "messages": [
            {
                "user_name": "Александр Крамной",
                "user_color": "#76b7b2",
                "time": "29 сен в 10:45",
                "text": "@Эдик Левин Убрал этот звук яйца, но на всякий перепроверь пожалуйста",
                "is_target": False
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "29 сен в 10:50",
                "text": "@Александр Крамной вот как будто все равно не хватает звука на тапе... можешь что то другое подобрать? просто чтоб было не яйцо",
                "is_target": True
            },
            {
                "user_name": "Александр Крамной",
                "user_color": "#76b7b2",
                "time": "29 сен в 11:10",
                "text": "Попробовал вот такой — вроде неплохо",
                "is_target": False
            },
            {
                "user_name": "Эдик Левин",
                "user_color": "#36C5F0",
                "time": "29 сен в 11:12",
                "text": "Апрув! Го билдить)",
                "is_target": False
            }
        ]
    },
    {
        "id": "14_feeling_zero",
        "messages": [
            {
                "user_name": "Netiagin Timofei",
                "user_color": "#bab0ab",
                "time": "2 окт в 09:30",
                "text": "Про B4-C1: Мне всё нравится. Давайте ивенты встраивать 👍",
                "is_target": False
            },
            {
                "user_name": "Netiagin Timofei",
                "user_color": "#bab0ab",
                "time": "2 окт в 10:46",
                "text": "Честно, особо не знаю что говорить по B4-C2. Звуки плохие, анимации топорные, под конец опять толпа... но филлинга 0. Нет удовольствия.",
                "is_target": True
            },
            {
                "user_name": "Ева Аксенова",
                "user_color": "#2EB67D",
                "time": "2 окт в 10:55",
                "text": "Тимофей, поняла! С ребятами докрутим механику кирки и филинга.",
                "is_target": False
            }
        ]
    }
]

known_names = [
    "Иван Коваленко", "Алексей Горин", "Эдик Левин", "Ева Аксенова",
    "Даниал Искаков", "Артём Хухро", "Александр Ворон", "Шавкат Шафин",
    "Егор Ткачёв", "Виктория Фесенко", "Бексултан Каримтаев", "Дамир",
    "Александр Крамной", "Павел Самойленко", "Кирилл Берёзкин", "Kristian",
    "Ярослав Филимонов", "Netiagin Timofei"
]

def format_text(text):
    t = html.escape(text)
    # Highlight known mentions precisely
    for name in sorted(known_names, key=len, reverse=True):
        t = t.replace(f"@{name}", f'<span class="slack-mention">@{name}</span>')
    # Link
    t = re.sub(r'(playbox\.play\.plbx\.ai/[^\s]+)', r'<a class="slack-link" href="#">\1</a>', t)
    return t

def generate_html(slice_data):
    messages_html = ""
    for m in slice_data['messages']:
        is_target = m.get('is_target', False)
        user_name = m['user_name']
        user_color = m.get('user_color', '#611f69')
        initials = "".join([part[0] for part in user_name.split()[:2]]).upper()
        if not initials:
            initials = "U"
        
        time_str = m['time']
        body = format_text(m['text'])
        
        target_class = " target-message" if is_target else ""
        
        messages_html += f"""
        <div class="message-row{target_class}">
            <div class="avatar" style="background-color: {user_color};">{initials}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="user-name">{user_name}</span>
                    <span class="message-time">{time_str}</span>
                </div>
                <div class="message-body">{body}</div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
    * {{
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }}
    body {{
        background-color: transparent;
        color: #D1D2D3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        padding: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
    }}
    .slack-window {{
        width: 880px;
        background: #1A1D21;
        border: 1px solid #2C2D30;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }}
    .messages-container {{
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }}
    .message-row {{
        display: flex;
        padding: 8px 18px;
        gap: 12px;
        transition: background 0.1s ease;
    }}
    .message-row:hover {{
        background: #222529;
    }}
    .message-row.target-message {{
        background: rgba(236, 178, 46, 0.09);
        border-left: 4px solid #ECB22E;
        padding-left: 14px;
    }}
    .avatar {{
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
    }}
    .message-content {{
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
    }}
    .message-header {{
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 2px;
    }}
    .user-name {{
        font-size: 15px;
        font-weight: 700;
        color: #FFFFFF;
    }}
    .message-time {{
        font-size: 12px;
        color: #ABABAD;
    }}
    .message-body {{
        font-size: 15px;
        color: #D1D2D3;
        word-break: break-word;
    }}
    .slack-mention {{
        background: rgba(29, 155, 209, 0.2);
        color: #1D9BD1;
        padding: 0 4px;
        border-radius: 3px;
        font-weight: 600;
    }}
    .slack-link {{
        color: #1D9BD1;
        text-decoration: none;
    }}
</style>
</head>
<body>
<div class="slack-window">
    <div class="messages-container">
        {messages_html}
    </div>
</div>
</body>
</html>
"""
    return html_content

def main():
    print(f"Generating {len(curated_slices)} compact horizontal screenshots...")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless=True)
        page = browser.new_page(viewport={"width": 960, "height": 600}, device_scale_factor=2)
        
        for i, s in enumerate(curated_slices):
            tid = s['id']
            html_content = generate_html(s)
            
            tmp_html = f"H:/PLBX/CyberBullingConcept/tmp_{tid}.html"
            with open(tmp_html, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            out_png = os.path.join(output_dir, f"{tid}.png").replace("\\", "/")
            
            page.goto(f"file:///{tmp_html}")
            slack_window = page.locator(".slack-window")
            slack_window.screenshot(path=out_png)
            
            try:
                os.remove(tmp_html)
            except Exception:
                pass
                
            print(f"[{i+1}/{len(curated_slices)}] Generated: {out_png}")
            
        browser.close()
    print("All compact horizontal screenshots generated successfully!")

if __name__ == '__main__':
    main()
