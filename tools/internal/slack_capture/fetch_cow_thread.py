import urllib.request, urllib.parse, json, sys

sys.stdout.reconfigure(encoding='utf-8')

token = 'xoxp-10081763545335-11034618403413-12285649394804-a2d08736f8f685ca405198b2275871ed'
ch = 'C0BE26APYFN'
tts = '1790771820.722329'

req = urllib.request.Request(f'https://slack.com/api/conversations.replies?channel={ch}&ts={tts}&limit=100', headers={'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print('ok:', data.get('ok'))
        msgs = data.get('messages', [])
        print(f'Total messages in thread: {len(msgs)}')
        for i, m in enumerate(msgs):
            ts = m.get('ts')
            u = m.get('user')
            t = m.get('text', '').replace('\n', ' ')
            print(f"[{i}] {ts} | {u}: {t}")
except Exception as e:
    print('Error:', e)
