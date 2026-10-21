import urllib.request, urllib.parse, json, sys

sys.stdout.reconfigure(encoding='utf-8')
token = 'xoxp-10081763545335-11034618403413-12285649394804-a2d08736f8f685ca405198b2275871ed'

def api(method, params=None):
    url = f'https://slack.com/api/{method}'
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'ok': False, 'error': str(e)}

# Targets: exact channel and message ts from facts
targets = [
    {
        "id": "01_jnghfdbk",
        "title": "Горин «Jnghfdbk» (опечатка раскладки)",
        "channel": "C0C3RTPML5T",
        "thread_ts": "1790170504.180939",
        "target_ts": "1790666969.230039",
        "song_line": "Как в чат на английской «Jnghfdbk» влупил!"
    },
    {
        "id": "02_demoblil",
        "title": "Горин «демоблил» (опечатка демобилд)",
        "channel": "C0B8HFLP370",
        "thread_ts": "1788767278.453619",
        "target_ts": "1790683544.534799",
        "song_line": "Как Горин на синке Втирал «демоблил»"
    },
    {
        "id": "03_disney_long_box",
        "title": "Disney / Mintegral 130 дней и статус «долгий ящик»",
        "channel": "C0ATNGFRY12",
        "thread_ts": "1779176540.431309",
        "target_ts": "1790596481.881709",
        "song_line": "Как в банке забытый Томится Дисней — Сто тридцать ночей Без живых новостей! Егор для Диснея Пристроил отсек..."
    },
    {
        "id": "04_claude_banned",
        "title": "Техлид ослеп, коль забанили Клод (ревью глазами)",
        "channel": "C0AUX4CBC1W",
        "thread_ts": "1790856044.994369",
        "target_ts": "1790856044.994369",
        "song_line": "Как Техлид ослеп, Коль забанили Клод: Вслепую руками Пулл-реквесты гребёт!"
    },
    {
        "id": "05_edik_11_points",
        "title": "Эдик: 11 пунктов правок / ТЗ Househunt",
        "channel": "C0BA5FLCBAN",
        "thread_ts": "1790084094.723139",
        "target_ts": "1790677909.561369",
        "song_line": "Как Эдик принёс От клиента свиток: Одиннадцать правок, Одиннадцать пыток!"
    },
    {
        "id": "06_tent_brother",
        "title": "Эдик: Тент как родного брата («Капец, был нормальный!»)",
        "channel": "C0BA5FLCBAN",
        "thread_ts": "1790084119.605479",
        "target_ts": "1790752209.501429",
        "song_line": "«Капец, был нормальный!» — У Эдика боль!"
    },
    {
        "id": "07_cow_laser",
        "title": "Корова с лазером из вымени (Game Gears UFO)",
        "channel": "C0BE26APYFN",
        "thread_ts": "1790771820.722329",
        "target_ts": "1790777309.465779",
        "song_line": "Корову с лазером, Что выжжет квартал!"
    },
    {
        "id": "08_mavis_legs",
        "title": "Supercell фидбек: «Mavis legs are broken»",
        "channel": "C0B8HFLP370",
        "thread_ts": "1788189211.665769",
        "target_ts": "1790671747.219849",
        "song_line": "Отрежет конечности Билду под ноль..."
    },
    {
        "id": "09_danial_3a_project",
        "title": "Даниал: 8сп vs 3А проект и падение акций",
        "channel": "C0B94PE0FHB",
        "thread_ts": "1789373517.772419",
        "target_ts": "1790594859.003279",
        "song_line": "Чуть сложная таска — И джуниор сник: Нейроночка, хелп! У меня тут тупик!"
    },
    {
        "id": "10_pyramids_museum",
        "title": "Хухро и Горин: «Пирамиды это музей»",
        "channel": "C0ATNGFRY12",
        "thread_ts": "1787731772.276189",
        "target_ts": "1791810355.471809",
        "song_line": "Как Артем пирамиды До кости полощет!"
    },
    {
        "id": "11_eva_kickoff",
        "title": "Ева: кик-офф Idletopia Royal Ark в тот же день",
        "channel": "C0B6142C9UZ",
        "thread_ts": "1790764729.392409",
        "target_ts": "1790765089.041759",
        "song_line": "Как Ева вопит: Этот плебл в работу! Кик-офф пять минут — И все пашем в субботу!"
    },
    {
        "id": "12_nick_time_machine",
        "title": "Машина времени для Ника Егорова («Ок, даю добро, правьте даты»)",
        "channel": "C0BGEMYQMEH",
        "thread_ts": "1783691998.386199",
        "target_ts": "1790931733.131519",
        "song_line": "«Пятьдесят итераций Загонят сюда!» / Ачивка скорости Ника"
    }
]

# Fetch context for all
results = []
for t in targets:
    print(f"\n--- Fetching {t['id']}: {t['title']} ---")
    ch = t['channel']
    tts = t['thread_ts']
    target_ts = t['target_ts']
    
    # 1. Fetch channel info
    ch_info = api('conversations.info', {'channel': ch})
    ch_name = ch_info.get('channel', {}).get('name', ch)
    print(f"Channel: #{ch_name}")
    
    # 2. Fetch thread replies
    r = api('conversations.replies', {'channel': ch, 'ts': tts, 'limit': 100})
    if not r.get('ok'):
        print(f"Error fetching thread: {r.get('error')}")
        # Try history
        r = api('conversations.history', {'channel': ch, 'latest': str(float(target_ts)+300), 'oldest': str(float(target_ts)-300), 'limit': 20})
    
    msgs = r.get('messages', [])
    print(f"Fetched {len(msgs)} messages.")
    
    target_idx = None
    for i, m in enumerate(msgs):
        if m.get('ts') == target_ts:
            target_idx = i
            break
            
    if target_idx is None:
        # try finding by text snippet
        for i, m in enumerate(msgs):
            if any(w.lower() in m.get('text', '').lower() for w in t['title'].split()[:2]):
                target_idx = i
                break
                
    if target_idx is not None:
        start = max(0, target_idx - 3)
        end = min(len(msgs), target_idx + 4)
        slice_msgs = msgs[start:end]
        print(f"Target found at index {target_idx}! Slice has {len(slice_msgs)} messages.")
        for j, sm in enumerate(slice_msgs):
            mark = "==> " if sm.get('ts') == msgs[target_idx].get('ts') else "    "
            print(f"{mark}[{sm.get('ts')}] {sm.get('user')}: {sm.get('text')[:80].replace(chr(10), ' ')}")
            
        results.append({
            "target": t,
            "channel_name": ch_name,
            "target_ts": msgs[target_idx].get('ts'),
            "messages": slice_msgs
        })
    else:
        print(f"Target TS {target_ts} not directly found in thread. Printing last 3 messages:")
        for sm in msgs[-3:]:
            print(f"    [{sm.get('ts')}] {sm.get('user')}: {sm.get('text')[:80].replace(chr(10), ' ')}")

with open(r'H:\PLBX\CyberBullingConcept\verified_context_slices.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(results)} verified context slices to verified_context_slices.json")
