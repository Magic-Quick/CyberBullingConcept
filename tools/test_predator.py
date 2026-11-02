import miniaudio
import numpy as np
import os

target = None
for root, dirs, files in os.walk('media/audio/ambient'):
    for f in files:
        if "Predator's Breath.mp3" in f:
            target = os.path.join(root, f)
            break

print("Found:", target)
if target:
    with open(target, 'rb') as fp:
        data = fp.read()
    f = miniaudio.decode(data)
    sample_rate = f.sample_rate
    nchannels = f.nchannels
    samples = np.frombuffer(f.samples, dtype=np.int16).astype(np.float32) / 32768.0
    
    start = 149.0
    dur = 52.0
    start_idx = int(start * sample_rate * nchannels)
    end_idx = int((start + dur) * sample_rate * nchannels)
    chunk = samples[start_idx:end_idx]
    
    rms = np.sqrt(np.mean(chunk**2))
    peak = np.max(np.abs(chunk))
    print(f"Predator's Breath (149s - 201s): Peak {20*np.log10(peak):.2f} dBFS, RMS {20*np.log10(rms):.2f} dBFS")
    block_size = int(5.0 * sample_rate * nchannels)
    blocks = [f"{20*np.log10(np.sqrt(np.mean(chunk[b:b+block_size]**2))):.1f}" for b in range(0, len(chunk), block_size)]
    print(f"5s blocks: {', '.join(blocks)}")
