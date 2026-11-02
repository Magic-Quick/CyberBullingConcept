#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
H:\PLBX\CyberBullingConcept\Эмбиент\separate_ambient.py
Нейросетевое удаление голоса и извлечение фонового эмбиента из треков
через Meta HTDemucs без потери качества.
"""

import sys
import time
from pathlib import Path

import av
import numpy as np
import torch
from demucs.api import Separator
from demucs.audio import save_audio

DIR = Path(__file__).resolve().parent
TRACKS = [
    DIR / "Хроники Плейбокса.mp3",
    DIR / "Хроники Плейбокса (1).mp3"
]

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def load_audio_tensor(file_path: Path, target_sr=44100):
    """Декодирует MP3 через PyAV в PyTorch Tensor с ресемплингом в target_sr"""
    print(f"[*] Декодирование {file_path.name}...")
    container = av.open(str(file_path))
    stream = container.streams.audio[0]
    orig_sr = stream.rate

    resampler = av.AudioResampler(format="fltp", layout="stereo", rate=target_sr)
    frames = []
    for frame in container.decode(stream):
        for resampled_frame in resampler.resample(frame):
            frames.append(resampled_frame.to_ndarray())

    audio_np = np.concatenate(frames, axis=1) # (2, samples)
    tensor = torch.from_numpy(audio_np).float()
    dur_sec = tensor.shape[1] / target_sr
    print(f"[+] Успешно декодировано: {dur_sec:.1f} сек ({dur_sec/60:.2f} мин), {tensor.shape[1]:,} сэмплов")
    return tensor, target_sr

def make_seamless_loop(audio_tensor, sr=44100, loop_duration=90.0, crossfade_sec=6.0):
    """Создаёт бесшовный зацикленный фрагмент из начала трека"""
    total_len = int((loop_duration + crossfade_sec) * sr)
    if audio_tensor.shape[1] < total_len:
        total_len = audio_tensor.shape[1]
        loop_duration = (total_len / sr) - crossfade_sec
        
    loop_samples = int(loop_duration * sr)
    fade_samples = int(crossfade_sec * sr)
    
    snippet = audio_tensor[:, :loop_samples + fade_samples].clone()
    body = snippet[:, :loop_samples].clone()
    tail = snippet[:, loop_samples:loop_samples + fade_samples].clone()
    
    fade_t = torch.linspace(0, 1, fade_samples)
    fade_in = torch.sin(fade_t * np.pi * 0.5)
    fade_out = torch.cos(fade_t * np.pi * 0.5)
    
    body[:, :fade_samples] = body[:, :fade_samples] * fade_in + tail * fade_out
    return body

def process_track(track_path: Path, separator: Separator, track_idx: int, total_tracks: int):
    t_start = time.time()
    print(f"\n{'='*70}")
    print(f"[{track_idx}/{total_tracks}] НАЧАЛО ОБРАБОТКИ: {track_path.name}")
    print(f"{'='*70}")
    
    # 1. Загрузка
    tensor, sr = load_audio_tensor(track_path, target_sr=44100)
    total_samples = tensor.shape[1]
    
    # Прогресс-бар колбэк
    last_print_time = [0.0]
    def callback(info):
        offset = info.get("segment_offset", 0)
        state = info.get("state")
        if state == "end":
            pct = min(100.0, (offset / total_samples) * 100.0)
            now = time.time()
            if now - last_print_time[0] >= 5.0 or pct >= 99.9:
                elapsed = now - t_start
                cur_sec = (offset / sr)
                tot_sec = (total_samples / sr)
                print(f"    [{track_path.name}] Прогресс: {pct:5.1f}% ({cur_sec:.0f}с / {tot_sec:.0f}с) | Прошло: {elapsed:.0f}с")
                last_print_time[0] = now

    separator.update_parameter(callback=callback)

    # 2. Нейросетевое разделение
    print("[*] Запуск разделения стемов через Meta HTDemucs...")
    _, stems = separator.separate_tensor(tensor, sr=sr)
    
    # 3. Суммируем инструментал (всё кроме голоса)
    print("[*] Сведение чистого инструментального эмбиента (Drums + Bass + Other)...")
    instrumental = stems["drums"] + stems["bass"] + stems["other"]
    
    # Нормализация / мягкий лимитер
    peak = instrumental.abs().max().item()
    print(f"    Пиковая амплитуда инструментала: {peak:.3f}")
    if peak > 0.99:
        instrumental = instrumental / (peak * 1.02)
        
    # 4. Сохранение полной версии без вокала (320 kbps MP3)
    out_name = f"{track_path.stem} (Эмбиент без голоса).mp3"
    out_path = DIR / out_name
    print(f"[*] Сохранение полного инструментала в {out_name} (320 kbps)...")
    save_audio(instrumental, out_path, samplerate=sr, bitrate=320, clip="rescale")
    
    # 5. Сохранение бесшовного лупа для фона (90 сек WAV)
    loop_tensor = make_seamless_loop(instrumental, sr=sr, loop_duration=90.0, crossfade_sec=6.0)
    loop_name = f"{track_path.stem} (Бесшовный эмбиент-луп 90с).wav"
    loop_path = DIR / loop_name
    print(f"[*] Создание бесшовного зацикленного фрагмента {loop_name}...")
    save_audio(loop_tensor, loop_path, samplerate=sr, bits_per_sample=16, clip="rescale")
    
    dur_total = time.time() - t_start
    print(f"[SUCCESS] Трек [{track_path.name}] завершён за {dur_total/60:.1f} мин!")
    print(f"    Полный эмбиент: {out_path.name} ({out_path.stat().st_size / (1024*1024):.1f} МБ)")
    print(f"    Бесшовный луп:  {loop_path.name} ({loop_path.stat().st_size / (1024*1024):.1f} МБ)")

def main():
    torch.set_num_threads(8)
    print("="*70)
    print("ИНИЦИАЛИЗАЦИЯ НЕЙРОСЕТЕВОГО РАЗДЕЛИТЕЛЯ ГОЛОСА (Meta HTDemucs)")
    print(f"Потоков процессора: {torch.get_num_threads()}")
    print("="*70)
    
    t0 = time.time()
    separator = Separator(
        model="htdemucs",
        device="cpu",
        shifts=0,
        split=True,
        segment=7.8,
        overlap=0.25
    )
    print(f"[+] Модель HTDemucs готова за {time.time()-t0:.2f} сек.")
    
    valid_tracks = [t for t in TRACKS if t.exists()]
    if not valid_tracks:
        print("[!] Ошибка: Исходные треки не найдены в папке Эмбиент")
        sys.exit(1)
        
    for i, t in enumerate(valid_tracks, 1):
        process_track(t, separator, i, len(valid_tracks))
        
    print("\n" + "="*70)
    print("ВСЕ ТРЕКИ УСПЕШНО ОБРАБОТАНЫ! Голос полностью удалён.")
    print("="*70)

if __name__ == "__main__":
    main()
