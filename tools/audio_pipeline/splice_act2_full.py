# -*- coding: utf-8 -*-
import json
import subprocess
from faster_whisper import WhisperModel

FFMPEG_PATH = r"C:\Users\Shestirukiy\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
BASE_ACT2_AUDIO = "repo/src/assets/audio/02_act_2_dashboard_stasis.mp3"
RAW_DISNEY_AUDIO = "scratch/act2_disney_part.mp3"
TRIMMED_DISNEY_AUDIO = "scratch/act2_disney_trimmed.mp3"
SILENCE_AUDIO = "scratch/silence_05s.mp3"
COMBINED_AUDIO = "scratch/02_act_2_full.mp3"

# 1. Trim Disney audio at 140.35 with slight fadeout to eliminate glitch word
print("Trimming Disney audio...")
trim_cmd = [
    FFMPEG_PATH, "-y",
    "-t", "140.35",
    "-i", RAW_DISNEY_AUDIO,
    "-af", "afade=t=out:st=140.15:d=0.20",
    "-b:a", "192k",
    TRIMMED_DISNEY_AUDIO
]
subprocess.run(trim_cmd, check=True)

# 2. Generate 0.5s silence
silence_cmd = [
    FFMPEG_PATH, "-y",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "0.50",
    "-b:a", "192k",
    SILENCE_AUDIO
]
subprocess.run(silence_cmd, check=True)

# 3. Concatenate using filter_complex
concat_cmd = [
    FFMPEG_PATH, "-y",
    "-i", BASE_ACT2_AUDIO,
    "-i", SILENCE_AUDIO,
    "-i", TRIMMED_DISNEY_AUDIO,
    "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[outa]",
    "-map", "[outa]",
    "-b:a", "192k",
    COMBINED_AUDIO
]
subprocess.run(concat_cmd, check=True)

def get_audio_duration(file_path):
    cmd = [FFMPEG_PATH, "-i", file_path]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    for line in p.stderr.split("\n"):
        if "Duration:" in line:
            time_str = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = time_str.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

total_dur = get_audio_duration(COMBINED_AUDIO)
base_dur = get_audio_duration(BASE_ACT2_AUDIO)
disney_trimmed_dur = get_audio_duration(TRIMMED_DISNEY_AUDIO)
print(f"Base Duration: {base_dur:.2f}s")
print(f"Trimmed Disney Duration: {disney_trimmed_dur:.2f}s")
print(f"Total Combined Duration: {total_dur:.2f}s")

# 4. Transcribe TRIMMED Disney audio to get pristine timing
print("Transcribing trimmed Disney audio...")
model = WhisperModel("small", device="cpu", compute_type="int8")
segments, _ = model.transcribe(TRIMMED_DISNEY_AUDIO, language="ru")

# Note: In storyData.ts, Act 2 has voiceDelay = 5.0s!
# Base cues in storyData.ts start at 5.0s and end around 67.90s.
# The base audio is 63.29s.
# The splice offset in storyData timeline is: 5.0 (voiceDelay) + base_dur (63.29) + 0.5 (silence) = 68.79s!
timeline_offset = round(5.0 + base_dur + 0.50, 2)
print(f"Timeline offset for Disney cues: {timeline_offset}s")

disney_cues = []
for s in segments:
    # Filter out empty or hallucinated segments
    txt = s.text.strip()
    if not txt:
        continue
    c_start = round(timeline_offset + s.start, 2)
    c_end = round(timeline_offset + s.end, 2)
    disney_cues.append({
        "start": c_start,
        "end": c_end,
        "text": txt
    })

with open("scratch/act2_disney_timeline_cues.json", "w", encoding="utf-8") as f:
    json.dump({
        "timeline_offset": timeline_offset,
        "total_act_duration": round(timeline_offset + disney_trimmed_dur + 2.0, 2), # 2s outro breathing room
        "cues": disney_cues
    }, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {len(disney_cues)} cues for timeline.")
