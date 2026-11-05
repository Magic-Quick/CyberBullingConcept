with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "let videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string }[] = [];"
replace1 = "let videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string | null }[] = [];"

target2 = "videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string }[],"
replace2 = "videoCuts: { time: number; label?: string; type?: string; characterName?: string; texKey?: string | null }[],"

if target1 in text:
    text = text.replace(target1, replace1, 1)
    print("SUCCESS 1: Updated videoCuts type in render")
else:
    print("WARNING 1: target1 not found")

if target2 in text:
    text = text.replace(target2, replace2, 1)
    print("SUCCESS 2: Updated videoCuts type in _renderClips")
else:
    print("WARNING 2: target2 not found")

with open('repo/src/PremiereAudioDirector.ts', 'w', encoding='utf-8') as f:
    f.write(text)
