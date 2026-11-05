with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace _isDraggingTimeline with _isTimelineDragging
text = text.replace('_isDraggingTimeline', '_isTimelineDragging')

# 2. goToAct signature: add isNaturalTransition
t_goto = "public goToAct(index: number, autoPlay?: boolean, crossfadeSec: number = 0): void {"
r_goto = "public goToAct(index: number, autoPlay?: boolean, crossfadeSec: number = 0, isNaturalTransition: boolean = false): void {"

if t_goto in text:
    text = text.replace(t_goto, r_goto, 1)
    print("Updated goToAct signature with isNaturalTransition")
else:
    print("WARNING: t_goto not found")

# 3. nextAct: pass true for isNaturalTransition
t_next = "this.goToAct(this._currentActIndex + 1, undefined, crossfadeSec);"
r_next = "this.goToAct(this._currentActIndex + 1, undefined, crossfadeSec, true);"

if t_next in text:
    text = text.replace(t_next, r_next, 1)
    print("Updated nextAct to pass isNaturalTransition = true")
else:
    print("WARNING: t_next not found")

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("MovieApp.ts patched successfully!")
