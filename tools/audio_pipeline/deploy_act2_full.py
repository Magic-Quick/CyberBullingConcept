# -*- coding: utf-8 -*-
import os
import shutil
import json

ROOT = r"H:\PLBX\CyberBullingConcept"
SOURCE_AUDIO = os.path.join(ROOT, "scratch", "02_act_2_full.mp3")

targets = [
    os.path.join(ROOT, "repo", "src", "assets", "audio", "02_act_2_dashboard_stasis.mp3"),
    os.path.join(ROOT, "media", "audio", "voiceover_v13", "02_act_2_dashboard_stasis.mp3"),
    os.path.join(ROOT, "Озвучка", "02_act_2_dashboard_stasis.mp3"),
]

for t in targets:
    if os.path.exists(os.path.dirname(t)):
        shutil.copy2(SOURCE_AUDIO, t)
        print(f"Copied audio to: {t} ({os.path.getsize(t)} bytes)")

# Read cues json
with open(os.path.join(ROOT, "scratch", "act2_disney_timeline_cues.json"), "r", encoding="utf-8") as f:
    raw_cues_data = json.load(f)

print(f"Loaded {len(raw_cues_data['cues'])} raw cues.")
