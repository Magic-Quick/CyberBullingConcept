import urllib.request, urllib.parse, json, os, sys

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

# Load permalinks
with open(r'H:\PLBX\CyberBullingConcept\extracted_song_permalinks.json', 'r', encoding='utf-8') as f:
    permalinks = json.load(f)

# Let's inspect each topic and find the exact message
for topic, items in permalinks.items():
    print(f"\n==================== {topic} ====================")
    found = False
    for item in items[:5]:
        ch = item['channel']
        ts = item['ts']
        tts = item.get('thread_ts', ts)
        
        # Try thread replies
        r = api('conversations.replies', {'channel': ch, 'ts': tts, 'limit': 100})
        if r.get('ok'):
            msgs = r.get('messages', [])
            for i, m in enumerate(msgs):
                # Check if this message or its text matches
                m_ts = m.get('ts')
                m_text = m.get('text', '')
                if m_ts == ts or any(w.lower() in m_text.lower() for w in topic.split()):
                    print(f"  [FOUND in ch {ch} thread {tts}]")
                    # print slice
                    start = max(0, i-2)
                    end = min(len(msgs), i+3)
                    for j in range(start, end):
                        cur = msgs[j]
                        marker = "-> TARGET: " if j == i else "           "
                        print(f"{marker}[{cur.get('ts')}] {cur.get('user')}: {cur.get('text')[:80].replace(chr(10), ' ')}")
                    found = True
                    break
        if found:
            break
    if not found:
        print("  Not found in first 5 permalinks, checking history...")
