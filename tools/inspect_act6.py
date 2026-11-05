with open('repo/src/storyData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('"act_6_punishment"')
print(text[idx:idx+1500])
