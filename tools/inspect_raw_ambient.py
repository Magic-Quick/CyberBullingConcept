import miniaudio
import os

sources = [
    'media/audio/ambient/Жесткие моменты/Morlock War March.mp3',
    'media/audio/ambient/Жесткие моменты/Predator\'s Breath.mp3',
    'media/audio/ambient/Жесткие моменты/Predator\'s Breath (1).mp3',
    'media/audio/ambient/Rust and Bone.mp3',
    'media/audio/ambient/Rust and Bone (1).mp3',
    'media/audio/ambient/Absolute Blackout (эффекты).mp3',
    'media/audio/ambient/Desolate Cry in the Distortion.mp3',
]

for s in sources:
    if os.path.exists(s):
        info = miniaudio.get_file_info(s)
        print(f"{os.path.basename(s):<35} | {info.duration:6.2f}s | {info.sample_rate}Hz | {info.nchannels}ch")
