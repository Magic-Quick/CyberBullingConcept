with open('repo/src/PremiereAudioDirector.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update CSS
target_css = """      .pr-track-header {
        height: 52px;
        border-bottom: 1px solid #272a31;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .pr-header-title {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pr-color-tag {
        width: 6px;
        height: 32px;
        border-radius: 1px;
      }
      .tag-dread { background: #f43f5e; }
      .tag-peace { background: #10b981; }
      .tag-ambient { background: #0284c7; }"""

replace_css = """      .pr-track-header {
        height: 46px;
        border-bottom: 1px solid #272a31;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .pr-track-header.pr-track-header-video {
        height: 38px;
        background: #15131e;
      }
      .pr-header-title {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pr-color-tag {
        width: 6px;
        height: 28px;
        border-radius: 1px;
      }
      .tag-video { background: #a855f7; }
      .tag-dread { background: #f43f5e; }
      .tag-peace { background: #10b981; }
      .tag-ambient { background: #0284c7; }

      .pr-track-btn-mute {
        background: #23272e;
        border: 1px solid #3b4252;
        color: #94a3b8;
        font-size: 10px;
        font-weight: bold;
        width: 22px;
        height: 22px;
        border-radius: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .pr-track-btn-mute:hover {
        background: #333945;
        color: #ffffff;
      }
      .pr-track-btn-mute.active {
        background: #ef4444;
        border-color: #dc2626;
        color: #ffffff;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }"""

if target_css in text:
    text = text.replace(target_css, replace_css, 1)
    print("SUCCESS 1: Updated track headers CSS")
else:
    print("WARNING 1: target_css not found")

# 2. Update lanes and clips CSS
target_lanes = """      /* TRACK LANES */
      .pr-lane {
        height: 52px;
        border-bottom: 1px solid #1e2128;
        position: relative;
        background-image: linear-gradient(90deg, #13151a 0%, #13151a 99%, #181b22 100%);
        background-size: 40px 100%;
        width: 100%;
      }"""

replace_lanes = """      /* TRACK LANES */
      .pr-lane {
        height: 46px;
        border-bottom: 1px solid #1e2128;
        position: relative;
        background-image: linear-gradient(90deg, #13151a 0%, #13151a 99%, #181b22 100%);
        background-size: 40px 100%;
        width: 100%;
      }
      .pr-lane.pr-lane-video {
        height: 38px;
        background: #111018;
        border-bottom: 2px solid #272a36;
      }

      .pr-clip.clip-video {
        background: linear-gradient(180deg, #4c1d95 0%, #2e1065 100%);
        border: 1px solid #a855f7;
        color: #f3e8ff;
        cursor: pointer;
        font-size: 10px;
        padding: 0 6px;
        user-select: none;
      }
      .pr-clip.clip-video:hover {
        background: linear-gradient(180deg, #6b21a8 0%, #3b0764 100%);
        border-color: #d8b4fe;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        z-index: 15;
      }
      .pr-ruler-cut-mark {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #a855f7;
        pointer-events: auto;
        cursor: pointer;
        z-index: 4;
      }
      .pr-ruler-cut-mark:hover {
        background: #d8b4fe;
        width: 3px;
      }"""

if target_lanes in text:
    text = text.replace(target_lanes, replace_lanes, 1)
    print("SUCCESS 2: Updated lanes CSS")
else:
    print("WARNING 2: target_lanes not found")

# 3. Ambient clip pointer styling
target_amb_css = """      .pr-clip.clip-ambient {
        background: linear-gradient(180deg, #0369a1 0%, #082f49 100%);
        border: 1px solid #38bdf8;
        color: #e0f2fe;
      }"""

replace_amb_css = """      .pr-clip.clip-ambient {
        background: linear-gradient(180deg, #0369a1 0%, #082f49 100%);
        border: 1px solid #38bdf8;
        color: #e0f2fe;
        cursor: pointer;
      }
      .pr-clip.clip-ambient:hover {
        border-color: #7dd3fc;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
      }"""

if target_amb_css in text:
    text = text.replace(target_amb_css, replace_amb_css, 1)
    print("SUCCESS 3: Updated ambient clip CSS")
else:
    print("WARNING 3: target_amb_css not found")

with open('repo/src/PremiereAudioDirector.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("CSS updates applied to PremiereAudioDirector.ts")
