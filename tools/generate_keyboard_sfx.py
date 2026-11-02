import miniaudio
import numpy as np
import wave
import base64
import os

path = r'C:\Users\Shestirukiy\.gemini\antigravity\brain\7e05c127-e194-4ef1-ac61-34782dc6e1d1\.user_uploaded\uploaded_media_1792695345355.mp3'
dec = miniaudio.decode_file(path)
raw_samples = np.array(dec.samples, dtype=np.float32)

if dec.nchannels == 2:
    mono = raw_samples.reshape(-1, 2).mean(axis=1)
else:
    mono = raw_samples

sr = dec.sample_rate

# 9 distinct key clicks across the 5.46s audio (added 2 more: 4.111s and 5.208s)
target_times = [0.285, 0.447, 0.938, 1.183, 1.331, 1.770, 3.285, 4.111, 5.208]

extracted_wavs = []
wav_dir = r'H:\PLBX\CyberBullingConcept\repo\src\assets\audio\keyboard'
os.makedirs(wav_dir, exist_ok=True)

for idx, t in enumerate(target_times):
    center = int(t * sr)
    search_w = int(0.015 * sr)
    local_center = center - search_w + np.argmax(np.abs(mono[center - search_w : center + search_w]))
    
    # backtrack to find where signal emerges from noise
    peak_val = np.abs(mono[local_center])
    thresh = 0.025 * peak_val
    start = local_center
    for i in range(local_center, max(0, local_center - int(0.012 * sr)), -1):
        if np.abs(mono[i]) < thresh:
            start = i
            break
            
    # Include 2ms before onset for a clean non-clipped transient
    start = max(0, start - int(0.002 * sr))
    
    # Duration ~85ms
    duration_samples = int(0.085 * sr)
    end = min(len(mono), start + duration_samples)
    
    chunk = mono[start:end].copy()
    
    # Normalize peak to a comfortable 0.65 (softer digital headroom)
    c_peak = np.max(np.abs(chunk))
    if c_peak > 0:
        chunk = chunk * (0.65 / c_peak)
        
    # Smooth fade-in (1.5ms) and fade-out (22ms)
    fi_len = int(0.0015 * sr)
    fo_len = int(0.022 * sr)
    chunk[:fi_len] *= np.linspace(0, 1, fi_len)
    chunk[-fo_len:] *= np.linspace(1, 0, fo_len)
    
    # Convert to 16-bit PCM mono
    int16_chunk = np.clip(chunk * 32767, -32768, 32767).astype(np.int16)
    
    # Save WAV
    wav_filename = f'key_click_{idx+1}.wav'
    wav_path = os.path.join(wav_dir, wav_filename)
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(int16_chunk.tobytes())
        
    with open(wav_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
        
    data_uri = f'data:audio/wav;base64,{b64}'
    extracted_wavs.append((wav_filename, data_uri, len(chunk) / sr * 1000))
    print(f"Extracted {wav_filename}: onset={start/sr:.4f}s, dur={len(chunk)/sr*1000:.1f}ms, b64_len={len(b64)}")

# Generate TypeScript module with base64 data URIs
ts_content = f'''// 9 Real Keyboard Keystroke Sounds extracted from user audio recording
// Pre-cut and trimmed with zero-latency onsets for typewriter effect and button clicks.

export const KEYBOARD_CLICKS_BASE64: string[] = [
'''

for filename, uri, dur in extracted_wavs:
    ts_content += f"  // {filename} ({dur:.1f}ms)\n  '{uri}',\n"

ts_content += '];\n'

ts_path = r'H:\PLBX\CyberBullingConcept\repo\src\keyboardAudioData.ts'
with open(ts_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Successfully generated {ts_path} with {len(extracted_wavs)} key sounds.")
