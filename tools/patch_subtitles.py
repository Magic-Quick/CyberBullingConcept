with open('repo/src/Subtitles.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: When currentTime < cues[0].start - LEAD_IN, cueIndex = -1 (clean screen before voice starts)
old_cue_boundary = """    if (cueIndex === -1) {
      if (currentTime >= this._cues[this._cues.length - 1].end) {
        cueIndex = this._cues.length - 1;
      } else if (currentTime < this._cues[0].start - LEAD_IN) {
        cueIndex = 0;
      }
    }"""

new_cue_boundary = """    if (cueIndex === -1) {
      if (currentTime >= this._cues[this._cues.length - 1].end) {
        cueIndex = this._cues.length - 1;
      } else if (currentTime < this._cues[0].start - LEAD_IN) {
        cueIndex = -1;
      }
    }"""

if old_cue_boundary in c:
    c = c.replace(old_cue_boundary, new_cue_boundary)
    print('Fixed cue boundary')

# Fix 2: When cueIndex === -1, clear subtitle and background
old_cue_end = """          this._karaokeActiveHighlight.clear();
        }
      }
    }"""

new_cue_end = """          this._karaokeActiveHighlight.clear();
        }
      } else {
        this._counterText.text = '';
        this._mainText.text = '';
        this._background.clear();
        this._slackPopupTargetAlpha = 0;
      }
    }"""

if old_cue_end in c:
    c = c.replace(old_cue_end, new_cue_end)
    print('Fixed cue clear on -1')

# Fix 3: Gorin sequential typo display (one by one, large & readable, ends by 24.70 before food speech)
old_gorin = """    // Gorin Typo Multi-Card Row in Act 3 (act_3_timemachine)
    if (this._actId === 'act_3_timemachine') {
      const GORIN_START = 9.62;
      const GORIN_END = 41.82;

      if (currentTime >= GORIN_START && currentTime < GORIN_END) {
        this._isGorinRowActive = true;
        this._gorinRowContainer.visible = true;

        const t1 = (currentTime >= 9.62) ? 1.0 : 0;
        const t2 = (currentTime >= 18.52) ? 1.0 : 0;
        const t3 = (currentTime >= 19.55) ? 1.0 : 0;
        const t4 = (currentTime >= 20.50) ? 1.0 : 0;"""

new_gorin = """    // Gorin Typo Multi-Card Row in Act 3 (act_3_timemachine)
    // Sequential single-card presentation per user rule: One phrase at a time, large and clean,
    // ending strictly at 24.70s before the food/soup manifesto begins!
    if (this._actId === 'act_3_timemachine') {
      const GORIN_START = 9.62;
      const GORIN_END = 24.70;

      if (currentTime >= GORIN_START && currentTime < GORIN_END) {
        this._isGorinRowActive = true;
        this._gorinRowContainer.visible = true;

        // 1. "Jnghfdbk": 9.62 to 16.64
        // 2. "Корчое": 16.64 to 19.20
        // 3. "пришлижать": 19.20 to 21.52
        // 4. "демоблил": 21.52 to 24.70
        const t1 = (currentTime >= 9.62 && currentTime < 16.64) ? 1.0 : 0;
        const t2 = (currentTime >= 16.64 && currentTime < 19.20) ? 1.0 : 0;
        const t3 = (currentTime >= 19.20 && currentTime < 21.52) ? 1.0 : 0;
        const t4 = (currentTime >= 21.52 && currentTime < 24.70) ? 1.0 : 0;"""

if old_gorin in c:
    c = c.replace(old_gorin, new_gorin)
    print('Fixed gorin sequential typos')

with open('repo/src/Subtitles.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated Subtitles.ts!')
