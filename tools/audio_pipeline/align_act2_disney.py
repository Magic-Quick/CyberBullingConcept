# -*- coding: utf-8 -*-
import json
import subprocess
from faster_whisper import WhisperModel

FFMPEG_PATH = r"C:\Users\Shestirukiy\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
DISNEY_AUDIO = "scratch/act2_disney_part.mp3"
BASE_ACT2_AUDIO = "repo/src/assets/audio/02_act_2_dashboard_stasis.mp3"
OUTPUT_COMBINED_AUDIO = "scratch/02_act_2_full_combined.mp3"

def get_audio_duration(file_path):
    cmd = [FFMPEG_PATH, "-i", file_path]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    for line in p.stderr.split("\n"):
        if "Duration:" in line:
            time_str = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = time_str.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

print(f"Checking base Act 2 duration: {BASE_ACT2_AUDIO}")
base_dur = get_audio_duration(BASE_ACT2_AUDIO)
print(f"Base Act 2 Duration: {base_dur:.2f}s")

disney_dur = get_audio_duration(DISNEY_AUDIO)
print(f"Disney part Duration: {disney_dur:.2f}s")

# Let's transcribe Disney audio with faster-whisper
print("Transcribing Disney part with faster-whisper...")
model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(DISNEY_AUDIO, language="ru")

disney_cues = []
for s in segments:
    disney_cues.append({
        "local_start": round(s.start, 2),
        "local_end": round(s.end, 2),
        "text": s.text.strip()
    })

with open("scratch/disney_cues_raw.json", "w", encoding="utf-8") as f:
    json.dump(disney_cues, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(disney_cues)} segments from Disney audio.")
