import json
from pathlib import Path

# Load existing whisper transcripts
with open('repo/whisper_transcripts.json', 'r', encoding='utf-8') as f:
    all_data = json.load(f)

# Load the new song transcription from test_transcribe_song.py output
import sys
sys.path.insert(0, 'F:/AI/Plugins/local-video-transcriber/skills/local-video-transcriber/scripts')
from transcribe import load_whisper_model

audio_path = Path('H:/PLBX/CyberBullingConcept/repo/src/assets/audio/servotorization.mp3')
model, dev = load_whisper_model('mobiuslabsgmbh/faster-whisper-large-v3-turbo', 'cuda', 'float16')
segments, _ = model.transcribe(
    str(audio_path),
    language='ru',
    beam_size=5,
    vad_filter=False,
    condition_on_previous_text=False
)

song_cues = []
for s in segments:
    txt = s.text.strip()
    if txt:
        song_cues.append({
            'start': round(s.start, 2),
            'end': round(s.end, 2),
            'text': txt
        })

print(f"Extracted {len(song_cues)} song cues.")
all_data['act_7_song'] = song_cues

with open('repo/whisper_transcripts.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)

print("Saved updated whisper_transcripts.json with full song cues!")
