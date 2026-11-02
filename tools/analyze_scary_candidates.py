import miniaudio
import numpy as np
import os

candidates = [
    (r'media\audio\ambient\Жесткие моменты\Predator\'s Breath.mp3', 149.0, 52.0, 'Predator_Terror_to_Nightmare'),
    (r'media\audio\ambient\Rust and Bone.mp3', 176.0, 52.0, 'Rust_and_Bone_Full_Grimdark'),
    (r'media\audio\ambient\Absolute Blackout (эффекты).mp3', 142.0, 52.0, 'Absolute_Blackout_Industrial'),
    (r'media\audio\ambient\Жесткие моменты\Morlock War March.mp3', 140.0, 52.0, 'Morlock_Heavy_March'),
]

for path, start, dur, label in candidates:
    if not os.path.exists(path):
        print(f"NOT FOUND: {path}")
        continue
    try:
        with open(path, 'rb') as fp:
            data = fp.read()
        f = miniaudio.decode(data)
        sample_rate = f.sample_rate
        nchannels = f.nchannels
        samples = np.frombuffer(f.samples, dtype=np.int16).astype(np.float32) / 32768.0
        
        start_idx = int(start * sample_rate * nchannels)
        end_idx = int((start + dur) * sample_rate * nchannels)
        chunk = samples[start_idx:end_idx]
        
        rms = np.sqrt(np.mean(chunk**2))
        peak = np.max(np.abs(chunk))
        rms_db = 20 * np.log10(rms) if rms > 0 else -999
        peak_db = 20 * np.log10(peak) if peak > 0 else -999
        
        # 5-second sub-blocks
        block_size = int(5.0 * sample_rate * nchannels)
        blocks_rms = []
        for b in range(0, len(chunk), block_size):
            sub = chunk[b:b+block_size]
            if len(sub) > 0:
                sub_rms = 20 * np.log10(np.sqrt(np.mean(sub**2)))
                blocks_rms.append(f"{sub_rms:.1f}")
                
        print(f"=== {label} ===")
        print(f"Duration: {dur}s | Peak: {peak_db:.2f} dBFS | Overall RMS: {rms_db:.2f} dBFS")
        print(f"5s blocks RMS: {', '.join(blocks_rms)}")
        print()
    except Exception as e:
        print(f"ERROR on {path}: {e}")
