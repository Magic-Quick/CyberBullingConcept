import os, re, json, urllib.request, urllib.parse

token = 'xoxp-10081763545335-11034618403413-12285649394804-a2d08736f8f685ca405198b2275871ed'

def slack_api(endpoint, params=None):
    url = f"https://slack.com/api/{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'ok': False, 'error': str(e)}

# 1. Load facts files to extract exact permalinks for all our topics
with open(r'H:\PLBX\CyberBullingConcept\Файлы от Толи\facts_2026-10-02_slack.md', 'r', encoding='utf-8') as f:
    facts_text = f.read()

topics = [
    ("Jnghfdbk", ["Jnghfdbk"]),
    ("демоблил", ["демоблил"]),
    ("долгий ящик", ["долгий ящик"]),
    ("блокнули клода", ["блокнули", "глазами смотреть"]),
    ("11 пунктов / ТЗ Эдика", ["11 пунктов", "Интересные плееблы пошли"]),
    ("тент / как родного брата", ["как родного брата", "тент прям зачет"]),
    ("корова с лазером", ["без лишнего усложнения", "вымени", "коров"]),
    ("филлинга 0", ["филлинга 0", "филинга 0"]),
    ("Mavis legs", ["Mavis", "legs are broken"]),
    ("не яйцо / сундук", ["не яйцо", "звук такой же как при тапе на яйцо"]),
    ("пирамиды музей", ["Пирамиды это музей", "пирамиды и турист"]),
    ("Гранола / сотка", ["гранол", "пробить сотню", "сотку"]),
    ("Ева кик-офф / суббота", ["Idletopia", "Zombie Miner", "кик-офф"]),
    ("Даниал 3А проект", ["падению акций", "8сп"])
]

results = {}

for name, keywords in topics:
    print(f"=== Searching facts for: {name} ===")
    lines = facts_text.split('\n')
    found_links = []
    for i, line in enumerate(lines):
        if any(kw.lower() in line.lower() for kw in keywords):
            # scan +-10 lines for permalinks
            block = "\n".join(lines[max(0, i-5):min(len(lines), i+10)])
            links = re.findall(r'https://plbx\.slack\.com/archives/([A-Z0-9]+)/p([0-9]+)(?:\?thread_ts=([0-9\.]+))?', block)
            for cid, pts, tts in links:
                ts = pts[:10] + "." + pts[10:]
                found_links.append({
                    'channel': cid,
                    'ts': ts,
                    'thread_ts': tts if tts else ts,
                    'raw_url': f"https://plbx.slack.com/archives/{cid}/p{pts}"
                })
    results[name] = found_links
    print(f"  Found {len(found_links)} permalinks")

with open(r'H:\PLBX\CyberBullingConcept\extracted_song_permalinks.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Saved extracted_song_permalinks.json")
