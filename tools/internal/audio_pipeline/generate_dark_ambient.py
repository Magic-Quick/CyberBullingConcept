#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
H:\PLBX\CyberBullingConcept\Генерация песни\generate_dark_ambient.py
Генератор мрачного кинематографичного эмбиента для проекта CyberBullingConcept (Цитадель «Плей-Бокс»).
Синтезирует многослойный бесшовный (seamless loop) трек в формате WAV.
"""

import math
import struct
import wave
from pathlib import Path
import numpy as np
from scipy import signal

DIR = Path(__file__).resolve().parent
OUTPUT_FILE = DIR / "dark_ambient_citadel.wav"

def generate_ambient(duration=90.0, sample_rate=44100, seed=42):
    print(f"[*] Инициализация синтезатора мрачного эмбиента...")
    print(f"    Длительность: {duration}с, Частота: {sample_rate} Гц")
    np.random.seed(seed)
    
    crossfade_duration = 6.0
    total_duration = duration + crossfade_duration
    total_samples = int(total_duration * sample_rate)
    loop_samples = int(duration * sample_rate)
    fade_samples = int(crossfade_duration * sample_rate)
    t = np.linspace(0, total_duration, total_samples, endpoint=False)
    
    # -------------------------------------------------------------
    # СЛОЙ 1: Реакторный Суб-Дрон Цитадели (Sub-bass Reactor Drone)
    # Основной тон: Ре (D0/D1: 36.71 Гц, 73.42 Гц, бинауральные биения)
    # -------------------------------------------------------------
    print("[1/5] Синтез суб-басового реактора и тектонического гула...")
    root_f = 36.71
    # Медленная модуляция фазы и амплитуды (дыхание корабля ~20 сек цикл)
    lfo_breath = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)
    lfo_detune = 0.3 * np.sin(2 * np.pi * 0.02 * t)
    
    drone_l = (
        0.50 * np.sin(2 * np.pi * root_f * t) +
        0.35 * np.sin(2 * np.pi * (root_f * 2 + lfo_detune) * t) +
        0.20 * np.sin(2 * np.pi * (root_f * 3) * t) +
        0.10 * np.sin(2 * np.pi * (root_f * 4.02) * t)
    ) * (0.8 + 0.2 * lfo_breath)
    
    drone_r = (
        0.50 * np.sin(2 * np.pi * (root_f + 0.45) * t) +  # 0.45 Гц дельта-ритм (бинауральное давление)
        0.35 * np.sin(2 * np.pi * (root_f * 2 - lfo_detune) * t) +
        0.20 * np.sin(2 * np.pi * (root_f * 3 + 0.15) * t) +
        0.10 * np.sin(2 * np.pi * (root_f * 4 - 0.05) * t)
    ) * (0.8 + 0.2 * lfo_breath)
    
    # Мягкое ламповое насыщение (теплый сатуратор)
    drone_l = np.tanh(1.6 * drone_l)
    drone_r = np.tanh(1.6 * drone_r)
    
    # -------------------------------------------------------------
    # СЛОЙ 2: Вентиляция охлаждения памяти и Подпространственный ветер
    # Фильтрованный розовый/броуновский шум с плавающим резонансом
    # -------------------------------------------------------------
    print("[2/5] Генерация атмосферы вентиляционных шахт и шума кэша...")
    white_noise_l = np.random.randn(total_samples)
    white_noise_r = np.random.randn(total_samples)
    
    # Броуновский шум (интегрирование белого)
    brown_l = np.cumsum(white_noise_l)
    brown_l -= np.mean(brown_l)
    brown_l /= (np.max(np.abs(brown_l)) + 1e-6)
    
    brown_r = np.cumsum(white_noise_r)
    brown_r -= np.mean(brown_r)
    brown_r /= (np.max(np.abs(brown_r)) + 1e-6)
    
    # Полосовая фильтрация: низкочастотный гул сквозняка (60-280 Гц)
    sos_wind = signal.butter(4, [60, 280], btype='bandpass', fs=sample_rate, output='sos')
    wind_l = signal.sosfilt(sos_wind, brown_l) * 0.45
    wind_r = signal.sosfilt(sos_wind, brown_r) * 0.45
    
    # Медленный панорамный свист (срез 400-800 Гц)
    sos_hiss = signal.butter(2, [350, 750], btype='bandpass', fs=sample_rate, output='sos')
    hiss_l = signal.sosfilt(sos_hiss, white_noise_l) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.03 * t))
    hiss_r = signal.sosfilt(sos_hiss, white_noise_r) * 0.08 * (0.6 + 0.4 * np.cos(2 * np.pi * 0.03 * t))
    
    # -------------------------------------------------------------
    # СЛОЙ 3: Металлический резонанс саркофагов и цеховых перекрытий
    # Резонансные пики (Тритон и малая секунда: 77.78 Гц, 103.8 Гц, 155.5 Гц)
    # -------------------------------------------------------------
    print("[3/5] Синтез металлического диссонанса и скрежета арматуры...")
    metal_l = np.zeros(total_samples)
    metal_r = np.zeros(total_samples)
    
    res_freqs = [77.78, 103.83, 138.59, 155.56, 220.0]  # Ebs, Abs, D, Eb, A (мрачный диссонантный кластер)
    for idx, f in enumerate(res_freqs):
        sos_bp = signal.butter(2, [max(20, f - 3), min(sample_rate/2 - 20, f + 3)], btype='bandpass', fs=sample_rate, output='sos')
        filtered_l = signal.sosfilt(sos_bp, white_noise_l)
        filtered_r = signal.sosfilt(sos_bp, white_noise_r)
        
        # Индивидуальная медленная модуляция для каждого резонанса
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * (0.015 * (idx + 1)) * t + idx * 1.3)
        pan = 0.5 + 0.4 * np.sin(2 * np.pi * (0.02 * (idx + 1)) * t)
        
        metal_l += filtered_l * mod * (1.0 - pan) * 0.25
        metal_r += filtered_r * mod * pan * 0.25
        
    metal_l = np.tanh(2.0 * metal_l)
    metal_r = np.tanh(2.0 * metal_r)

    # -------------------------------------------------------------
    # СЛОЙ 4: Гидравлический пульс конвейера (Периодический глухой удар)
    # Отражает работу пресса правок: удар каждые 12 секунд
    # -------------------------------------------------------------
    print("[4/5] Добавление ритма гидравлических поршней и ударов пресса...")
    thud_l = np.zeros(total_samples)
    thud_r = np.zeros(total_samples)
    
    pulse_interval = 12.0 # сек
    num_pulses = int(total_duration / pulse_interval) + 1
    
    for i in range(num_pulses):
        hit_time = i * pulse_interval + 2.0 # сдвиг на 2 сек от начала
        hit_sample = int(hit_time * sample_rate)
        if hit_sample >= total_samples:
            break
            
        decay_time = 3.5 # длительность затухания
        decay_samples = int(decay_time * sample_rate)
        end_sample = min(total_samples, hit_sample + decay_samples)
        actual_len = end_sample - hit_sample
        
        t_hit = np.linspace(0, actual_len / sample_rate, actual_len, endpoint=False)
        # Падающая частота (pitch dive) от 90 Гц до 32 Гц
        f_pitch = 32.0 + 58.0 * np.exp(-12.0 * t_hit)
        phase = 2 * np.pi * np.cumsum(f_pitch) / sample_rate
        
        amp_env = np.exp(-1.8 * t_hit)
        # Суб-удар
        hit_wave = np.sin(phase) * amp_env * 0.35
        # Мягкий клиппинг удара
        hit_wave = np.tanh(1.5 * hit_wave)
        
        # Легкая стерео-асимметрия
        thud_l[hit_sample:end_sample] += hit_wave * 0.95
        thud_r[hit_sample:end_sample] += hit_wave * 1.05

    # -------------------------------------------------------------
    # СЛОЙ 5: Цифровая телеметрия ИИ-Лорда (Сверхтонкие артефакты сканера)
    # Редкие высокочастотные импульсы/щелчки сканирования био-узлов
    # -------------------------------------------------------------
    print("[5/5] Добавление телеметрии и высокочастотных квантовых щелчков...")
    telemetry_l = np.zeros(total_samples)
    telemetry_r = np.zeros(total_samples)
    
    # 25 случайных событий телеметрии за трек
    num_blips = int(total_duration / 3.5)
    blip_times = np.random.uniform(1.0, total_duration - 1.0, num_blips)
    for b_time in blip_times:
        b_idx = int(b_time * sample_rate)
        b_len = int(0.12 * sample_rate)
        if b_idx + b_len >= total_samples:
            continue
        tb = np.linspace(0, 0.12, b_len, endpoint=False)
        b_freq = np.random.choice([1450.0, 1820.0, 2240.0, 3180.0, 4400.0])
        blip = np.sin(2 * np.pi * b_freq * tb) * np.exp(-40.0 * tb) * 0.04
        
        # Стерео-позиция
        pan = np.random.uniform(0.1, 0.9)
        telemetry_l[b_idx:b_idx+b_len] += blip * (1.0 - pan)
        telemetry_r[b_idx:b_idx+b_len] += blip * pan

    # -------------------------------------------------------------
    # МИКШИРОВАНИЕ
    # -------------------------------------------------------------
    mix_l = drone_l * 0.40 + wind_l * 0.28 + hiss_l * 0.15 + metal_l * 0.22 + thud_l * 0.35 + telemetry_l * 0.20
    mix_r = drone_r * 0.40 + wind_r * 0.28 + hiss_r * 0.15 + metal_r * 0.22 + thud_r * 0.35 + telemetry_r * 0.20

    # -------------------------------------------------------------
    # БЕСШОВНОЕ ЗАЦИКЛИВАНИЕ (Seamless Loop Crossfade)
    # Переносим хвост (fade_samples) в начало с квадратичным сглаживанием
    # -------------------------------------------------------------
    print("[*] Создание бесшовного зацикливания (Seamless Loop)...")
    loop_l = mix_l[:loop_samples].copy()
    loop_r = mix_r[:loop_samples].copy()
    
    tail_l = mix_l[loop_samples:loop_samples + fade_samples]
    tail_r = mix_r[loop_samples:loop_samples + fade_samples]
    
    fade_t = np.linspace(0, 1, fade_samples, endpoint=False)
    fade_in = np.sin(fade_t * np.pi * 0.5)
    fade_out = np.cos(fade_t * np.pi * 0.5)
    
    loop_l[:fade_samples] = loop_l[:fade_samples] * fade_in + tail_l * fade_out
    loop_r[:fade_samples] = loop_r[:fade_samples] * fade_in + tail_r * fade_out

    # -------------------------------------------------------------
    # МАСТЕРИНГ: Лимитирование и Нормализация до -1 dBFS
    # -------------------------------------------------------------
    print("[*] Мастеринг, защита от клиппинга и нормализация...")
    max_peak = max(np.max(np.abs(loop_l)), np.max(np.abs(loop_r)))
    target_peak = 10 ** (-1.0 / 20.0) # -1.0 dB
    if max_peak > 0:
        scale = target_peak / max_peak
        loop_l *= scale
        loop_r *= scale
        
    # Преобразование в 16-бит PCM
    int_l = np.int16(np.clip(loop_l, -1.0, 1.0) * 32767)
    int_r = np.int16(np.clip(loop_r, -1.0, 1.0) * 32767)
    
    # Интерливинг стерео (L, R, L, R...)
    interleaved = np.empty((loop_samples * 2,), dtype=np.int16)
    interleaved[0::2] = int_l
    interleaved[1::2] = int_r
    
    print(f"[*] Запись WAV файла: {OUTPUT_FILE} ...")
    with wave.open(str(OUTPUT_FILE), 'wb') as wav_file:
        wav_file.setnchannels(2)      # Стерео
        wav_file.setsampwidth(2)      # 16 бит = 2 байта
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(interleaved.tobytes())
        
    size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Готово! Аудиофайл создан успешно:")
    print(f"    Файл: {OUTPUT_FILE.name}")
    print(f"    Путь: {OUTPUT_FILE}")
    print(f"    Длительность: {duration} сек (бесшовный луп)")
    print(f"    Размер: {size_mb:.2f} МБ")
    return OUTPUT_FILE

if __name__ == "__main__":
    generate_ambient(duration=90.0, sample_rate=44100, seed=42)
