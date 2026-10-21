import urllib.request, urllib.parse, json

token = 'xoxp-10081763545335-11034618403413-12285649394804-a2d08736f8f685ca405198b2275871ed'

channel = 'C0C3RTPML5T'
thread_ts = '1790170504.180939'

params = urllib.parse.urlencode({'channel': channel, 'ts': thread_ts, 'limit': 20})
req = urllib.request.Request(f'https://slack.com/api/conversations.replies?{params}', headers={'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print('ok:', data.get('ok'))
        if data.get('ok'):
            msgs = data.get('messages', [])
            print('Found messages in thread:', len(msgs))
            for m in msgs:
                user = m.get('user', '')
                text = m.get('text', '')
                ts = m.get('ts', '')
                print(f"[{ts}] {user}: {text[:100]}")
        else:
            print('error:', data.get('error'))
except Exception as e:
    print('Exception:', e)
