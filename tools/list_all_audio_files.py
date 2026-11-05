import os

audio_dir = 'repo/src/assets/audio'
files = sorted(os.listdir(audio_dir)) if os.path.exists(audio_dir) else []
print(f"Total audio files in {audio_dir}: {len(files)}")
for f in files:
    if f.endswith(('.mp3', '.wav', '.ogg')):
        sz_kb = os.path.getsize(os.path.join(audio_dir, f)) / 1024
        print(f"  {f:55} ({sz_kb:.1f} KB)")
