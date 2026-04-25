import urllib.request, json
url = 'https://api.elevenlabs.io/v1/voices'
headers = {'xi-api-key': 'sk_e416995838804ecd738956dd0b79eebdb12e59f356e2a661'}
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        voices = data.get('voices', [])
        for v in voices[:10]:
            print(f"Name: {v['name']} - ID: {v['voice_id']}")
except Exception as e:
    print('ERROR:', e)
