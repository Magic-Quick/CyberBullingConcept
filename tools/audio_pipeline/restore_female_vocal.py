#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
H:\PLBX\CyberBullingConcept\Эмбиент\restore_female_vocal.py
Возвращает атмосферный женский крик/вокализ из интро (7.0с - 13.8с)
обратно в фоновый эмбиент, оставляя дикторский текст вырезанным.
"""

import sys
import wave
from pathlib import Path
import numpy as np
import av
import torch
from demucs.audio import save_audio

DIR = Path(__file__).resolve().parent

VOCAL_EXTRACT = DIR / "vocals_first_35s.wav"
INSTRUMENTAL_MP3 = DIR / "Хроники Плейбокса (Эмбиент без голоса).mp3"
LOOP_WAV = DIR / "Хроники Плейбокса (Бесшовный эмбиент-луп 90с).wav"

TRACK1_MP3 = DIR / "Хроники Плейбокса (1) (Эмбиент без голоса).mp3"
TRACK1_LOOP_WAV = DIR / "Хроники Плейбокса (1) (Бесшовный эмбиент-луп 90с).wav"

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def load_wav(path: Path):
    with wave.open(str(path), 'rb') as wf:
        sr = wf.getframerate()
        ch = wf.getnchannels()
        buf = wf.readframes(wf.getnframes())
        audio = np.frombuffer(buf, dtype=np.int16).reshape(-1, ch).T.astype(np.float32) / 32768.0
        return audio, sr

def load_mp3(path: Path, target_sr=44100):
    container = av.open(str(path))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="fltp", layout="stereo", rate=target_sr)
    frames = []
    for frame in container.decode(stream):
        for resampled_frame in resampler.resample(frame):
            frames.append(resampled_frame.to_ndarray())
    return np.concatenate(frames, axis=1), target_sr

def extract_and_clean_female_cry():
    """Извлекает и оформляет плавный фейд для женского крика/вокализа (7.0с - 13.8с)"""
    audio, sr = load_wav(VOCAL_EXTRACT)
    start_sec = 7.0
    end_sec = 13.9
    
    start_sample = int(start_sec * sr)
    end_sample = int(end_sec * sr)
    cry = audio[:, start_sample:end_sample].copy()
    
    # Плавная атака (0.6 сек) и релиз (0.8 сек), чтобы не было щелчков
    fade_in_len = int(0.6 * sr)
    fade_out_len = int(0.8 * sr)
    
    fade_in = np.sin(np.linspace(0, np.pi/2, fade_in_len)) ** 2
    fade_out = np.cos(np.linspace(0, np.pi/2, fade_out_len)) ** 2
    
    cry[:, :fade_in_len] *= fade_in
    cry[:, -fade_out_len:] *= fade_out
    
    # Сохраняем изолированный чистый сэмпл вокализа
    sample_file = DIR / "Женский_вокализ_интро.wav"
    int_pcm = np.int16(cry.clip(-1, 1) * 32767)
    interleaved = np.empty((int_pcm.shape[1] * 2,), dtype=np.int16)
    interleaved[0::2] = int_pcm[0]
    interleaved[1::2] = int_pcm[1]
    with wave.open(str(sample_file), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(interleaved.tobytes())
    print(f"[+] Изолированный сэмпл сохранён: {sample_file.name} ({cry.shape[1]/sr:.2f} сек)")
    return cry, start_sample, sr

def mix_cry_into_audio(base_audio, cry, start_sample):
    out = base_audio.copy()
    end_sample = min(out.shape[1], start_sample + cry.shape[1])
    cry_len = end_sample - start_sample
    
    # Добавляем вокализ с естественным балансом (1.0)
    out[:, start_sample:end_sample] += cry[:, :cry_len]
    
    # Мягкая защита от перегруза
    peak = np.max(np.abs(out))
    if peak > 0.99:
        out = out / (peak * 1.02)
    return out

def main():
    print("="*70)
    print("ВОССТАНОВЛЕНИЕ ФОНОВОГО ЖЕНСКОГО ВОКАЛИЗА В ЭМБИЕНТЕ")
    print("="*70)
    
    cry, start_sample, sr = extract_and_clean_female_cry()
    
    # 1. Применяем к 'Хроники Плейбокса' (Полный MP3)
    if INSTRUMENTAL_MP3.exists():
        print(f"[*] Сведение вокализа в {INSTRUMENTAL_MP3.name}...")
        base_mp3, _ = load_mp3(INSTRUMENTAL_MP3, target_sr=sr)
        mixed_mp3 = mix_cry_into_audio(base_mp3, cry, start_sample)
        
        out_mp3_path = DIR / "Хроники Плейбокса (Эмбиент + Женский вокализ).mp3"
        tensor_mp3 = torch.from_numpy(mixed_mp3).float()
        save_audio(tensor_mp3, out_mp3_path, samplerate=sr, bitrate=320, clip="rescale")
        print(f"[+] Создан: {out_mp3_path.name}")
        
    # 2. Применяем к 'Хроники Плейбокса' (Бесшовный луп 90с)
    if LOOP_WAV.exists():
        print(f"[*] Сведение вокализа в {LOOP_WAV.name}...")
        base_loop, _ = load_wav(LOOP_WAV)
        mixed_loop = mix_cry_into_audio(base_loop, cry, start_sample)
        
        out_loop_path = DIR / "Хроники Плейбокса (Бесшовный луп 90с + Женский вокализ).wav"
        tensor_loop = torch.from_numpy(mixed_loop).float()
        save_audio(tensor_loop, out_loop_path, samplerate=sr, bits_per_sample=16, clip="rescale")
        print(f"[+] Создан: {out_loop_path.name}")

    # 3. Дополнительно: опциональный вариант для трека (1) с этим же вокализом
    if TRACK1_MP3.exists():
        print(f"[*] Добавление вокализа в {TRACK1_MP3.name} (как альтернативный вариант)...")
        base_t1, _ = load_mp3(TRACK1_MP3, target_sr=sr)
        mixed_t1 = mix_cry_into_audio(base_t1, cry, start_sample)
        
        out_t1_path = DIR / "Хроники Плейбокса (1) (Эмбиент + Женский вокализ).mp3"
        tensor_t1 = torch.from_numpy(mixed_t1).float()
        save_audio(tensor_t1, out_t1_path, samplerate=sr, bitrate=320, clip="rescale")
        print(f"[+] Создан: {out_t1_path.name}")

    if TRACK1_LOOP_WAV.exists():
        base_t1_loop, _ = load_wav(TRACK1_LOOP_WAV)
        mixed_t1_loop = mix_cry_into_audio(base_t1_loop, cry, start_sample)
        
        out_t1_loop_path = DIR / "Хроники Плейбокса (1) (Бесшовный луп 90с + Женский вокализ).wav"
        tensor_t1_loop = torch.from_numpy(mixed_t1_loop).float()
        save_audio(tensor_t1_loop, out_t1_loop_path, samplerate=sr, bits_per_sample=16, clip="rescale")
        print(f"[+] Создан: {out_t1_loop_path.name}")

    print("\n[SUCCESS] Женский вокализ успешно возвращён во все эмбиент-дорожки!")

if __name__ == "__main__":
    main()
