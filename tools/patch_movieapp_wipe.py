with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Star Wars transition wipe suppression on intra-act cut (Нижняя палуба)
target_wipe = "this._setBgTextureWithWipe(tex, punch && !this._isSeeking && !this._isTimelineDragging);"
replacement_wipe = "this._setBgTextureWithWipe(tex, false); // Intra-act cut from narrator to catacombs must NEVER trigger Star Wars optical wipe!"

if target_wipe in c:
    c = c.replace(target_wipe, replacement_wipe)
    print('Fixed Star Wars wipe bug on intra-act cut!')
else:
    print('WARNING: target_wipe not found!')

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(c)
