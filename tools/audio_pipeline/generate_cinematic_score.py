#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
H:\PLBX\CyberBullingConcept\Генерация песни\generate_cinematic_score.py
Генератор глубокого синематографичного саундтрека (Cinematic Film Score / Dark Ambient).
Стиль: Hans Zimmer / Jóhann Jóhannsson / Blade Runner 2049 / Sicario.
Включает:
  - Гармоническую прогрессию (Dm -> Bbmaj7 -> Gm9 -> A7b9)
  - Струнный оркестровый ансамбль (Cellos, Violas, Violins с вибрато и выразительностью)
  - Фирменный кинематографичный "Braam" (глубокий медный рык/горн)
  - Одинокое меланхоличное фортепиано (Felt Piano) с длинным реверберационным хвостом
  - Кинематографичный пульс времени (Ticking / Ostinato)
  - Саб-басовые кино-импакты (Sub Booms)
  - Пространственную реверберацию гигантского зала (Cinematic Hall Reverb)
  - Бесшовный луп (Seamless Loop)
"""

import math
import struct
import wave
from pathlib import Path
import numpy as np
from scipy import signal

DIR = Path(__file__).resolve().parent
OUTPUT_FILE = DIR / "cinematic_dark_score.wav"

def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))

# Таблица нот
_NOTE_MAP = {
    "C": 0, "B#": 0,
    "Cs": 1, "Db": 1, "C#": 1,
    "D": 2,
    "Ds": 3, "Eb": 3, "D#": 3,
    "E": 4, "Fb": 4,
    "F": 5, "E#": 5,
    "Fs": 6, "Gb": 6, "F#": 6,
    "G": 7,
    "Gs": 8, "Ab": 8, "G#": 8,
    "A": 9,
    "As": 10, "Bb": 10, "A#": 10,
    "B": 11, "Cb": 11
}

def note(name):
    """Возвращает MIDI номер ноты, например: note('D1'), note('Bb0'), note('Cs3')"""
    if len(name) >= 2 and name[-1].isdigit():
        octave = int(name[-1])
        pitch_str = name[:-1]
    elif len(name) >= 3 and name[-2:] == "10":
        octave = 10
        pitch_str = name[:-2]
    else:
        raise ValueError(f"Неизвестный формат ноты: {name}")
    pitch = _NOTE_MAP[pitch_str]
    return 12 + octave * 12 + pitch

def midi_to_freq(m):
    if isinstance(m, str):
        m = note(m)
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))

def make_string_pad_voice(freq, duration, sample_rate, pan=0.5):
    """Синтезирует выразительный голос струнного оркестра с детюнингом и вибрато"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    
    # Вибрато (LFO 5.2 Гц, глубина 0.35%)
    vibrato = 0.0035 * np.sin(2 * np.pi * 5.2 * t)
    
    # 5 расстроенных пилообразных осцилляторов (Supersaw string ensemble)
    detunes = [-0.008, -0.003, 0.0, 0.003, 0.008]
    sig = np.zeros(num_samples)
    for d in detunes:
        f_inst = freq * (1.0 + d + vibrato)
        phase = 2 * np.pi * np.cumsum(f_inst) / sample_rate
        # Пила через ряды Фурье для гладкого антиалиасинга
        saw = (
            np.sin(phase) +
            0.50 * np.sin(2 * phase) +
            0.30 * np.sin(3 * phase) +
            0.20 * np.sin(4 * phase) +
            0.12 * np.sin(5 * phase) +
            0.08 * np.sin(6 * phase)
        )
        sig += saw
    sig /= len(detunes)
    
    # Огибающая выразительности струнных (медленная атака и релиз)
    attack_s = min(2.5, duration * 0.3)
    release_s = min(2.5, duration * 0.3)
    n_att = int(attack_s * sample_rate)
    n_rel = int(release_s * sample_rate)
    
    env = np.ones(num_samples)
    if n_att > 0:
        env[:n_att] = np.sin(np.linspace(0, np.pi/2, n_att)) ** 2
    if n_rel > 0:
        env[-n_rel:] = np.cos(np.linspace(0, np.pi/2, n_rel)) ** 2
        
    sig = sig * env
    
    # Тёплый фильтр струнных (срез около 1100 Гц)
    sos = signal.butter(2, min(sample_rate/2 - 100, max(200, freq * 4.5)), btype='low', fs=sample_rate, output='sos')
    sig = signal.sosfilt(sos, sig)
    
    left = sig * (1.0 - pan)
    right = sig * pan
    return left, right

def synthesize_piano_note(freq, duration, sample_rate, velocity=0.7):
    """Синтез кинематографичного пианино (Felt Piano) с гармониками и затуханием"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    
    # Удар молоточка (мягкий фетровый шум в начале)
    hammer_samples = int(0.04 * sample_rate)
    hammer = np.zeros(num_samples)
    if hammer_samples < num_samples:
        noise = np.random.randn(hammer_samples)
        sos_h = signal.butter(2, 400, btype='low', fs=sample_rate, output='sos')
        hammer[:hammer_samples] = signal.sosfilt(sos_h, noise) * np.linspace(1, 0, hammer_samples) * 0.3
        
    # Гармонический ряд струны с затуханием
    # Физическое свойство: верхние гармоники гаснут быстрее
    tone = np.zeros(num_samples)
    for n in range(1, 9):
        # Негармоничность жесткости струны (inharmonicity)
        f_n = n * freq * math.sqrt(1 + 0.00035 * (n**2))
        if f_n >= sample_rate / 2 - 200:
            break
        decay = (1.5 + 0.7 * (n**0.7)) / (duration * 0.6)
        amp = (1.0 / (n**1.25)) * np.exp(-decay * t)
        phase = 2 * np.pi * f_n * t
        tone += amp * np.sin(phase)
        
    sig = (tone * 0.85 + hammer * 0.15) * velocity
    # Мягкое огибание пика
    att_samples = int(0.005 * sample_rate)
    sig[:att_samples] *= np.linspace(0, 1, att_samples)
    return sig

def synthesize_braam(freq, duration, sample_rate):
    """Фирменный глубокий 'Braam' (медный кино-горн Циммера)"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    
    # Смесь низких пил с расстройкой
    f0 = freq
    f1 = freq * 1.006
    f_oct = freq * 2.0
    f_fifth = freq * 3.0
    
    saw = (
        np.sin(2 * np.pi * f0 * t) +
        0.8 * np.sin(2 * np.pi * f1 * t) +
        0.6 * np.sin(2 * np.pi * f_oct * t) +
        0.4 * np.sin(2 * np.pi * f_fifth * t)
    )
    
    # Фильтр открывается и закрывается (атака медных духовых)
    # Имитация через полосовой резонанс + огибающая
    cutoff_env = 180.0 + 800.0 * np.exp(-3.5 * t)
    # Модулированный фильтр
    phase = 2 * np.pi * np.cumsum(f0 * 1.5) / sample_rate
    brass = saw + 0.3 * np.sin(phase)
    
    # Огибающая громкости: резкая атака, медленный спад
    amp_env = np.exp(-0.8 * t)
    amp_env[:int(0.03 * sample_rate)] = np.linspace(0, 1, int(0.03 * sample_rate))
    
    sig = np.tanh(2.5 * brass * amp_env) * 0.6
    sos_lp = signal.butter(3, 1400, btype='low', fs=sample_rate, output='sos')
    sig = signal.sosfilt(sos_lp, sig)
    return sig

def make_hall_reverb(stereo_signal, sample_rate, decay_time=4.5, wet_mix=0.40):
    """Сверхбыстрая кинематографичная сверточная реверберация зала (Convolution Reverb)"""
    print("[*] Наложение акустики кинематографичного зала (Convolution Reverb)...")
    left = stereo_signal[0]
    right = stereo_signal[1]
    
    # Синтез импульсного отклика (IR) кинозала / собора
    ir_len = int(decay_time * sample_rate)
    t_ir = np.linspace(0, decay_time, ir_len, endpoint=False)
    
    # Экспоненциальный спад хвоста
    decay_curve = np.exp(-3.5 * t_ir / decay_time)
    
    # Диффузное поле (стерео-декорреляция)
    np.random.seed(123)
    ir_l = np.random.randn(ir_len) * decay_curve
    ir_r = np.random.randn(ir_len) * decay_curve
    
    # Акустическое демпфирование ВЧ (поглощение воздухом выше 2.4 кГц)
    sos_damp = signal.butter(2, 2400, btype='low', fs=sample_rate, output='sos')
    ir_l = signal.sosfilt(sos_damp, ir_l)
    ir_r = signal.sosfilt(sos_damp, ir_r)
    
    # Нормализация импульса
    ir_l /= (np.sqrt(np.sum(ir_l**2)) + 1e-6)
    ir_r /= (np.sqrt(np.sum(ir_r**2)) + 1e-6)
    
    # Мгновенная БПФ-свертка
    rev_l = signal.fftconvolve(left, ir_l, mode='full')[:len(left)]
    rev_r = signal.fftconvolve(right, ir_r, mode='full')[:len(right)]
    
    out_l = left * (1.0 - wet_mix) + rev_l * wet_mix
    out_r = right * (1.0 - wet_mix) + rev_r * wet_mix
    return np.array([out_l, out_r])


def generate_cinematic_soundtrack():
    sample_rate = 44100
    bpm = 56.0  # Медленный, монументальный темп
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4.0  # ~4.285 сек на такт
    total_bars = 16  # 4 аккорда по 4 такта = 68.57 сек
    duration = total_bars * bar_dur
    crossfade_dur = 6.0
    total_duration = duration + crossfade_dur
    total_samples = int(total_duration * sample_rate)
    loop_samples = int(duration * sample_rate)
    
    print(f"[*] Синтез музыкального кинематографичного трека...")
    print(f"    Темп: {bpm} BPM, Длительность цикла: {duration:.1f}с, Всего тактов: {total_bars}")
    
    t = np.linspace(0, total_duration, total_samples, endpoint=False)
    
    # Инициализация стерео-буфера
    out_left = np.zeros(total_samples)
    out_right = np.zeros(total_samples)
    
    # ------------------------------------------------------------------
    # 1. ГАРМОНИЧЕСКАЯ ПРОГРЕССИЯ И СТРУННЫЙ ОРКЕСТР
    # 4 аккорда:
    # 0..4 такты: Dm (Ре минор) — тёмный монументальный фундамент
    # 4..8 такты: Bbmaj7 (Си-бемоль мажор 7) — космическая трагичность
    # 8..12 такты: Gm9 (Соль минор 9) — глубокая меланхолия
    # 12..16 такты: A7(b9) / Asus4 — драматическое напряжение и зов
    # ------------------------------------------------------------------
    print("[1/5] Синтез полифонического струнного оркестра (Cellos, Violas, Violins)...")
    
    chord_definitions = [
        # D minor
        {"name": "Dm", "bars": (0, 4), "notes": [
            ("D1", 0.40, 0.5), ("D2", 0.35, 0.35), ("A2", 0.30, 0.65), 
            ("F3", 0.25, 0.3), ("A3", 0.25, 0.7), ("D4", 0.20, 0.5)
        ]},
        # Bb major 7
        {"name": "Bbmaj7", "bars": (4, 8), "notes": [
            ("Bb0", 0.42, 0.5), ("Bb1", 0.35, 0.35), ("F2", 0.30, 0.65), 
            ("D3", 0.28, 0.3), ("A3", 0.25, 0.75), ("D4", 0.20, 0.5)
        ]},
        # G minor 9
        {"name": "Gm9", "bars": (8, 12), "notes": [
            ("G0", 0.42, 0.5), ("G1", 0.35, 0.35), ("D2", 0.30, 0.65), 
            ("Bb2", 0.28, 0.3), ("F3", 0.25, 0.7), ("A3", 0.22, 0.55)
        ]},
        # A7b9 / Asus4
        {"name": "A7b9", "bars": (12, 16), "notes": [
            ("A0", 0.40, 0.5), ("A1", 0.35, 0.35), ("E2", 0.30, 0.65), 
            ("Cs3", 0.28, 0.3), ("G3", 0.25, 0.7), ("Bb3", 0.22, 0.5)
        ]},
        # Повтор первого аккорда для хвоста кроссфейда
        {"name": "Dm_tail", "bars": (16, 18), "notes": [
            ("D1", 0.40, 0.5), ("D2", 0.35, 0.35), ("A2", 0.30, 0.65), 
            ("F3", 0.25, 0.3), ("A3", 0.25, 0.7), ("D4", 0.20, 0.5)
        ]}
    ]
    
    for ch in chord_definitions:
        start_bar, end_bar = ch["bars"]
        start_time = start_bar * bar_dur
        chord_dur = (end_bar - start_bar) * bar_dur
        s_idx = int(start_time * sample_rate)
        if s_idx >= total_samples:
            continue
            
        print(f"    -> Аккорд [{ch['name']}]: такты {start_bar}..{end_bar} ({chord_dur:.1f}с)")
        for midi_note, vol, pan in ch["notes"]:
            f = midi_to_freq(midi_note)
            left_v, right_v = make_string_pad_voice(f, chord_dur, sample_rate, pan=pan)
            e_idx = min(total_samples, s_idx + len(left_v))
            actual_len = e_idx - s_idx
            out_left[s_idx:e_idx] += left_v[:actual_len] * vol * 0.45
            out_right[s_idx:e_idx] += right_v[:actual_len] * vol * 0.45

    # ------------------------------------------------------------------
    # 2. КИНЕМАТОГРАФИЧНЫЕ "BRAAMS" (Медный ревущий бас / Foghorns)
    # Звучат на ключевых переходах (такт 0, такт 8)
    # ------------------------------------------------------------------
    print("[2/5] Синтез кинематографичных 'Braam' духовых ударов (Zimmer style)...")
    braam_cues = [
        (0.0, midi_to_freq("D1")),
        (8.0 * bar_dur, midi_to_freq("G0"))
    ]
    for b_time, b_freq in braam_cues:
        b_idx = int(b_time * sample_rate)
        braam_wave = synthesize_braam(b_freq, 6.0, sample_rate)
        e_idx = min(total_samples, b_idx + len(braam_wave))
        act_len = e_idx - b_idx
        out_left[b_idx:e_idx] += braam_wave[:act_len] * 0.55
        out_right[b_idx:e_idx] += braam_wave[:act_len] * 0.55

    # ------------------------------------------------------------------
    # 3. МЕЛАНХОЛИЧНОЕ ФОРТЕПИАНО (Felt Piano — Соло в пустоте)
    # Редкая, берущая за душу мелодия в ре миноре
    # ------------------------------------------------------------------
    print("[3/5] Добавление темы рояля (Felt Piano Melody)...")
    # Список нот: (время_в_тактах, нота, длительность_звучания, громкость)
    piano_notes = [
        # Такт 1-3
        (1.0, "D5", 5.0, 0.75),
        (2.0, "F5", 4.0, 0.70),
        (3.0, "E5", 6.0, 0.80),
        (4.2, "D5", 5.0, 0.70),
        
        # Такт 5-7 (На Bbmaj7)
        (5.0, "A5", 5.5, 0.85),
        (6.0, "F5", 4.0, 0.75),
        (7.0, "D5", 4.0, 0.70),
        (7.8, "C5", 5.0, 0.65),
        
        # Такт 9-11 (На Gm9)
        (9.0, "Bb4", 5.0, 0.75),
        (10.0, "D5", 4.5, 0.80),
        (11.0, "F5", 5.0, 0.85),
        (12.0, "G5", 6.0, 0.90),
        
        # Такт 13-15 (На A7b9 - кульминация и затухание)
        (13.0, "E5", 5.0, 0.85),
        (13.8, "Cs5", 4.5, 0.80),
        (14.6, "D5", 7.0, 0.95),
        (15.5, "A4", 6.0, 0.70),
    ]
    
    for bar_time, p_note, p_dur, p_vol in piano_notes:
        p_sec = bar_time * bar_dur
        p_idx = int(p_sec * sample_rate)
        if p_idx >= total_samples:
            continue
        p_wave = synthesize_piano_note(midi_to_freq(p_note), p_dur, sample_rate, velocity=p_vol)
        p_end = min(total_samples, p_idx + len(p_wave))
        act_len = p_end - p_idx
        # Стерео-разброс клавиш
        m_num = note(p_note) if isinstance(p_note, str) else p_note
        pan = 0.4 + 0.2 * ((m_num - 60) / 24.0)
        out_left[p_idx:p_end] += p_wave[:act_len] * (1.0 - pan) * 0.40
        out_right[p_idx:p_end] += p_wave[:act_len] * pan * 0.40

    # ------------------------------------------------------------------
    # 4. ТИКАЮЩИЙ КИНО-ПУЛЬС (Clockwork / Sub-bass Ostinato)
    # Напоминает напряжение времени (Dunkirk / Interstellar)
    # ------------------------------------------------------------------
    print("[4/5] Добавление кинематографичного пульса тиканья часов и саб-импактов...")
    # 8-е доли на протяжении трека
    step_dur = beat_dur / 2.0  # 8-я доля (~0.53 сек)
    num_steps = int(total_duration / step_dur)
    
    for s in range(num_steps):
        s_time = s * step_dur
        s_idx = int(s_time * sample_rate)
        if s_idx >= total_samples:
            break
            
        # Тик часов (высокий фильтрованный щелчок)
        click_len = int(0.02 * sample_rate)
        if s_idx + click_len < total_samples:
            t_c = np.linspace(0, 0.02, click_len, endpoint=False)
            click_freq = 2200.0 if (s % 4 == 0) else 1800.0
            click_vol = 0.05 if (s % 4 == 0) else 0.025
            click = np.sin(2 * np.pi * click_freq * t_c) * np.exp(-150.0 * t_c) * click_vol
            out_left[s_idx:s_idx+click_len] += click * 0.7
            out_right[s_idx:s_idx+click_len] += click * 0.3
            
        # Саб-бум на первую долю каждого такта
        if s % 8 == 0:
            boom_len = int(3.0 * sample_rate)
            if s_idx + boom_len < total_samples:
                tb = np.linspace(0, 3.0, boom_len, endpoint=False)
                fb = 60.0 * np.exp(-4.0 * tb) + 30.0
                phase_b = 2 * np.pi * np.cumsum(fb) / sample_rate
                boom = np.sin(phase_b) * np.exp(-1.5 * tb) * 0.28
                out_left[s_idx:s_idx+boom_len] += boom
                out_right[s_idx:s_idx+boom_len] += boom

    # ------------------------------------------------------------------
    # 5. ПРОСТРАНСТВО, РЕВЕРБЕРАЦИЯ И СВЕДЕНИЕ
    # ------------------------------------------------------------------
    stereo_mix = np.array([out_left, out_right])
    stereo_mix = make_hall_reverb(stereo_mix, sample_rate, decay_time=4.5, wet_mix=0.38)
    
    # Зацикливание (Seamless Loop Crossfade)
    print("[*] Финализация бесшовного зацикливания (Seamless Crossfade)...")
    fade_samples = int(crossfade_dur * sample_rate)
    
    final_l = stereo_mix[0][:loop_samples].copy()
    final_r = stereo_mix[1][:loop_samples].copy()
    
    tail_l = stereo_mix[0][loop_samples:loop_samples + fade_samples]
    tail_r = stereo_mix[1][loop_samples:loop_samples + fade_samples]
    
    fade_t = np.linspace(0, 1, fade_samples, endpoint=False)
    fade_in = np.sin(fade_t * np.pi * 0.5)
    fade_out = np.cos(fade_t * np.pi * 0.5)
    
    final_l[:fade_samples] = final_l[:fade_samples] * fade_in + tail_l * fade_out
    final_r[:fade_samples] = final_r[:fade_samples] * fade_in + tail_r * fade_out
    
    # Мастеринг и защита от клиппинга (-1.0 dBFS)
    peak = max(np.max(np.abs(final_l)), np.max(np.abs(final_r)))
    target_peak = 10 ** (-1.0 / 20.0)
    if peak > 0:
        scale = target_peak / peak
        final_l *= scale
        final_r *= scale
        
    int_l = np.int16(np.clip(final_l, -1.0, 1.0) * 32767)
    int_r = np.int16(np.clip(final_r, -1.0, 1.0) * 32767)
    
    interleaved = np.empty((loop_samples * 2,), dtype=np.int16)
    interleaved[0::2] = int_l
    interleaved[1::2] = int_r
    
    print(f"[*] Запись итогового кинематографичного WAV файла: {OUTPUT_FILE} ...")
    with wave.open(str(OUTPUT_FILE), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(interleaved.tobytes())
        
    size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Кинематографичный саундтрек успешно создан!")
    print(f"    Файл: {OUTPUT_FILE.name}")
    print(f"    Путь: {OUTPUT_FILE}")
    print(f"    Длительность: {duration:.1f} сек (бесшовный цикл)")
    print(f"    Размер: {size_mb:.2f} МБ")
    return OUTPUT_FILE

if __name__ == "__main__":
    generate_cinematic_soundtrack()
