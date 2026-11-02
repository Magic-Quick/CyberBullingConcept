#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract exact whisper timestamps for all audio files in the movie project.
"""
import sys
import json
import time
from pathlib import Path

sys.path.insert(0, 'F:/AI/Plugins/local-video-transcriber/skills/local-video-transcriber/scripts')
from transcribe import load_whisper_model

audio_dir = Path('H:/PLBX/CyberBullingConcept/repo/src/assets/audio')
out_file = Path('H:/PLBX/CyberBullingConcept/repo/whisper_transcripts.json')

files_to_transcribe = [
    ('00_prologue_space_expose.mp3', 'prologue_space'),
    ('01_act_1_intro.mp3', 'act_1_convent'),
    ('02_act_2_dashboard_stasis.mp3', 'act_2_sarcophagus'),
    ('03_act_3_management_timemachine.mp3', 'act_3_timemachine'),
    ('04_act_4_engine_mutation_art.mp3', 'act_4_engine'),
    ('05_act_5_clientarchs_invasion.mp3', 'act_5_clientarchs'),
    ('06_act_6_tribunal_awards.mp3', 'act_6_tribunal'),
    ('07_act_7_outro.mp3', 'act_8_outro'),
    ('servotorization.mp3', 'act_7_song'),
]

print('[*] Loading Whisper Large-v3-Turbo on CUDA...')
model, dev = load_whisper_model('mobiuslabsgmbh/faster-whisper-large-v3-turbo', 'auto', 'float16')
print(f'[+] Model loaded on {dev}')

all_transcripts = {}

for filename, act_id in files_to_transcribe:
    audio_path = audio_dir / filename
    if not audio_path.exists():
        print(f'[!] Audio file not found: {audio_path}')
        continue

    print(f'[*] Transcribing {filename} ({act_id})...', flush=True)
    t0 = time.time()
    segments, info = model.transcribe(
        str(audio_path),
        language='ru',
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
        word_timestamps=False
    )

    cues = []
    for s in segments:
        txt = s.text.strip()
        if txt:
            cues.append({
                'start': round(s.start, 2),
                'end': round(s.end, 2),
                'text': txt
            })

    elapsed = round(time.time() - t0, 2)
    print(f'    -> {len(cues)} segments transcribed in {elapsed}s')
    all_transcripts[act_id] = cues

with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(all_transcripts, f, indent=2, ensure_ascii=False)

print(f'\n[SUCCESS] All transcripts saved to {out_file}')
