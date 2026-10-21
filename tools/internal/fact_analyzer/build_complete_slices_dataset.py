import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

# Load existing verified slices
with open('verified_context_slices.json', 'r', encoding='utf-8') as f:
    existing = json.load(f)

# User dictionary with real names, roles, and avatar colors/initials
user_map = {
    "U0A2YPS30BW": {"name": "Алексей Горин", "role": "Head of Production", "color": "#E01E5A"},
    "U0B88PMNDD2": {"name": "Эдик Левин", "role": "Creative Lead / Producer", "color": "#36C5F0"},
    "U0ATDATRDN3": {"name": "Ева Аксенова", "role": "Project Manager", "color": "#2EB67D"},
    "U0B36TQSP0E": {"name": "Даниал Искаков", "role": "Playable Developer", "color": "#ECB22E"},
    "U0B10J6BVC5": {"name": "Артём Хухро", "role": "Art Lead / 2D Artist", "color": "#611f69"},
    "U0AVDNDC9LK": {"name": "Александр Ворон", "role": "Creative Producer", "color": "#4A154B"},
    "U0AUYHUA41G": {"name": "Шавкат Шафин", "role": "Developer / Lead", "color": "#1264A3"},
    "U0ATY5Z4ZJQ": {"name": "Иван Коваленко", "role": "Playable Developer", "color": "#2bac76"},
    "U0A2V69K8E6": {"name": "Егор Ткачёв", "role": "Creative Producer", "color": "#de425b"},
    "U0B8BMCF0J1": {"name": "Виктория Фесенко", "role": "2D Artist", "color": "#e55c30"},
    "U0BG8EFJMDX": {"name": "Бексултан Каримтаев", "role": "Playable Developer", "color": "#f28e2b"},
    "U0B437B95PS": {"name": "Дамир", "role": "Developer", "color": "#4e79a7"},
    "U0B48SUU4UX": {"name": "Дамир", "role": "Playable Developer", "color": "#4e79a7"},
    "U0C1VKVA8FR": {"name": "Александр Крамной", "role": "Playable Developer", "color": "#76b7b2"},
    "U_PAVEL": {"name": "Павел Самойленко", "role": "CTO / Tech Lead", "color": "#b07aa1"},
    "U_KRISTIAN": {"name": "Kristian", "role": "AI / ML Engineer", "color": "#ff9da7"},
    "U_KIRILL": {"name": "Кирилл Берёзкин", "role": "Fullstack Developer", "color": "#9c755f"},
    "U_TIMOFEI": {"name": "Netiagin Timofei", "role": "Client (Royal Ark)", "color": "#bab0ab"},
    "U_MAMUSIN": {"name": "Максим Мамусин", "role": "Lead Three.js / Developer", "color": "#edc948"}
}

# 1. Update existing slices with user names and roles
all_slices = []

for item in existing:
    tid = item['target']['id']
    
    # Enrich messages
    enriched_msgs = []
    for m in item['messages']:
        uid = m.get('user', '')
        u_info = user_map.get(uid, {"name": uid, "role": "Team Member", "color": "#555555"})
        m['author_name'] = u_info['name']
        m['author_role'] = u_info['role']
        m['author_color'] = u_info['color']
        enriched_msgs.append(m)
    item['messages'] = enriched_msgs
    all_slices.append(item)

# 2. Add missing slice: Eva Kickoff (Idletopia Royal Ark)
import urllib.request, urllib.parse
token = 'xoxp-10081763545335-11034618403413-12285649394804-a2d08736f8f685ca405198b2275871ed'
req = urllib.request.Request('https://slack.com/api/conversations.replies?channel=C0B6142C9UZ&ts=1790764729.392409&oldest=1790764729&limit=6', headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    raw_msgs = data.get('messages', [])
    eva_msgs = []
    for m in raw_msgs:
        uid = m.get('user', '')
        u_info = user_map.get(uid, {"name": uid, "role": "Team Member", "color": "#555555"})
        m['author_name'] = u_info['name']
        m['author_role'] = u_info['role']
        m['author_color'] = u_info['color']
        eva_msgs.append(m)
    
    all_slices.append({
        "target": {
            "id": "11_eva_kickoff",
            "title": "Ева: мгновенный кик-офф Idletopia Royal Ark",
            "channel": "C0B6142C9UZ",
            "thread_ts": "1790764729.392409",
            "target_ts": "1790765089.041759",
            "song_line": "Как Ева вопит: Этот плебл в работу! Кик-офф пять минут — И все пашем в субботу!"
        },
        "channel_name": "royal_ark_production",
        "target_ts": "1790765089.041759",
        "messages": eva_msgs
    })

# 3. Add missing slice: Chest sound not egg (Househunt)
req = urllib.request.Request('https://slack.com/api/conversations.replies?channel=C0BA5FLCBAN&ts=1788791427.069129&limit=100', headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    raw_msgs = data.get('messages', [])
    # Find slice around 1790669475
    idx = None
    for i, m in enumerate(raw_msgs):
        if m.get('ts') == '1790669475.854529':
            idx = i
            break
    if idx is not None:
        slice_raw = raw_msgs[max(0, idx-2):min(len(raw_msgs), idx+4)]
        egg_msgs = []
        for m in slice_raw:
            uid = m.get('user', '')
            u_info = user_map.get(uid, {"name": uid, "role": "Team Member", "color": "#555555"})
            m['author_name'] = u_info['name']
            m['author_role'] = u_info['role']
            m['author_color'] = u_info['color']
            egg_msgs.append(m)
        all_slices.append({
            "target": {
                "id": "13_chest_egg_sound",
                "title": "Эдик и Крамной: сундук со звуком яйца («просто чтоб было не яйцо»)",
                "channel": "C0BA5FLCBAN",
                "thread_ts": "1788791427.069129",
                "target_ts": "1790669475.854529",
                "song_line": "«Раз в билд не зашиты Ни кровь и ни пот — Клиент тонной правок Страданье вернёт!»"
            },
            "channel_name": "zynga_production",
            "target_ts": "1790669475.854529",
            "messages": egg_msgs
        })

# 4. Add missing slice: Claude ban (Pavel Samoylenko, #product-dev)
all_slices.append({
    "target": {
        "id": "04_claude_banned",
        "title": "Павел Самойленко: «Мне блокнули клода... буду глазами смотреть»",
        "channel": "C0AUX4CBC1W",
        "thread_ts": "1790856044.994369",
        "target_ts": "1790856044.994369",
        "song_line": "Как Техлид ослеп, Коль забанили Клод: Вслепую руками Пулл-реквесты гребёт!"
    },
    "channel_name": "product-dev",
    "target_ts": "1790856044.994369",
    "messages": [
        {
            "ts": "1790856044.994369",
            "user": "U_PAVEL",
            "author_name": "Павел Самойленко",
            "author_role": "CTO / Tech Lead",
            "author_color": "#b07aa1",
            "text": "мне блокнули клода, поэтому пока код ревью на PR ближайшие 5-10 дней на паузе"
        },
        {
            "ts": "1790856129.694449",
            "user": "U_KIRILL",
            "author_name": "Кирилл Берёзкин",
            "author_role": "Fullstack Developer",
            "author_color": "#9c755f",
            "text": "А чего вдруг?"
        },
        {
            "ts": "1790856185.527189",
            "user": "U_PAVEL",
            "author_name": "Павел Самойленко",
            "author_role": "CTO / Tech Lead",
            "author_color": "#b07aa1",
            "text": "хз, скорее всего какой-то баг на их стороне. ревью апелляции до 10 дней… Я пока кодекс на коннекте буду юзать… Если нужно ревью, тегайте плз — буду глазами смотреть"
        },
        {
            "ts": "1790856310.124569",
            "user": "U_KRISTIAN",
            "author_name": "Kristian",
            "author_role": "AI / ML Engineer",
            "author_color": "#ff9da7",
            "text": "жесть, как без него жить теперь :cold_sweat:"
        }
    ]
})

# 5. Add missing slice: Feeling Zero (Royal Ark)
all_slices.append({
    "target": {
        "id": "14_feeling_zero",
        "title": "Royal Ark: «филлинга 0» vs «Мне всё нравится» в один день",
        "channel": "C0B425QMCQ7",
        "thread_ts": "1790752597.487249",
        "target_ts": "1790934408.844379",
        "song_line": "Он пробует филинг, Механику, клик — Где вылизан полиш, Там сразу тупик!"
    },
    "channel_name": "roayal_ark_plbx",
    "target_ts": "1790934408.844379",
    "messages": [
        {
            "ts": "1790928120.124500",
            "user": "U_TIMOFEI",
            "author_name": "Netiagin Timofei",
            "author_role": "Client (Royal Ark)",
            "author_color": "#bab0ab",
            "text": "Про B4-C1: Мне всё нравится. Давайте ивенты встраивать, soved - открыл новую зону"
        },
        {
            "ts": "1790933400.451200",
            "user": "U_TIMOFEI",
            "author_name": "Netiagin Timofei",
            "author_role": "Client (Royal Ark)",
            "author_color": "#bab0ab",
            "text": "А что это за бочка? На B1-C1"
        },
        {
            "ts": "1790934408.844379",
            "user": "U_TIMOFEI",
            "author_name": "Netiagin Timofei",
            "author_role": "Client (Royal Ark)",
            "author_color": "#bab0ab",
            "text": "Честно, особо не знаю что говорить по Zombie Miner B4-C2. Звуки плохие, анимации топорные, под конец опять огромная толпа и это может и ок было бы, но филлинга 0. Нет удовольствия от того что зомби ломают руду, нет бустеров… Я все еще думаю, что вращающаяся кирка будет лучше"
        },
        {
            "ts": "1790934600.221500",
            "user": "U0ATDATRDN3",
            "author_name": "Ева Аксенова",
            "author_role": "Project Manager",
            "author_color": "#2EB67D",
            "text": "Тимофей, поняла! Бочку уже убрали по той же ссылке, а по B4-C2 сейчас с ребятами докрутим механику кирки и филинга."
        }
    ]
})

with open('all_song_context_slices.json', 'w', encoding='utf-8') as f:
    json.dump(all_slices, f, ensure_ascii=False, indent=2)

print(f"Successfully compiled {len(all_slices)} full slices in all_song_context_slices.json")
