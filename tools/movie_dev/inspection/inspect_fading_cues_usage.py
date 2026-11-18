with open('repo/src/AmbientManager.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('this._fadingCues')
while idx != -1:
    print("--- FOUND AT", idx, "---")
    print(text[idx:idx+400])
    idx = text.find('this._fadingCues', idx+1)
