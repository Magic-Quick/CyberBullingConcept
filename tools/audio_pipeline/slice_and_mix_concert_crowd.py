#!/usr/bin/env python3
"""
Скрипт нарезки crowd-эффектов из hugeextendedcrowd7.mp3 с плавными фейдами
и микширования в концертный трек servotorization.mp3.
"""

import os
import subprocess
import shutil
from pathlib import Path

FFMPEG = r"C:\Program Files\3DCoat-2022\data\ThirdParty\ffmpeg.exe"
SRC_CROWD = r"H:\PLBX\CyberBullingConcept\media\audio\sfx\hugeextendedcrowd7.mp3"
OUT_SFX_DIR = r"H:\PLBX\CyberBullingConcept\media\audio\sfx\concert_crowd"

MAIN_TRACK = r"H:\PLBX\CyberBullingConcept\repo\src\assets\audio\servotorization.mp3"
BACKUP_TRACK = r"H:\PLBX\CyberBullingConcept\media\audio\sfx\servotorization_original_clean.mp3"

TARGET_TRACK_COPIES = [
    r"H:\PLBX\CyberBullingConcept\repo\src\assets\audio\servotorization.mp3",
    r"H:\PLBX\CyberBullingConcept\web_assets\audio\servotorization.mp3"
]

CROWD_SLICES = [
    {
        "name": "01_crowd_intro_establishing",
        "ss": 0.0,
        "t": 9.5,
        "fade_in": 0.8,
        "fade_out": 2.0,
        "mix_time": 0.0,
        "volume": 0.38,
        "desc": "Заявочный план арены (0.0s - 9.5s) — гул зала и овации перед первыми строками ИИ-Лорда"
    },
    {
        "name": "02_crowd_break1_calm_passage",
        "ss": 22.0,
        "t": 9.5,
        "fade_in": 1.2,
        "fade_out": 1.8,
        "mix_time": 36.46,
        "volume": 0.32,
        "desc": "Проигрыш без слов 1 (36.46s - 45.87s) — пролёт камеры над залом, ритмичный стадионный гул"
    },
    {
        "name": "03_crowd_drop1_accent",
        "ss": 8.5,
        "t": 6.8,
        "fade_in": 0.3,
        "fade_out": 1.8,
        "mix_time": 77.4,
        "volume": 0.46,
        "desc": "Момент накала 1 (77.4s - 84.2s) — взрывной рёв толпы после «Только на том конце этой цепи продаж» на панчлайне «Заседает такой же примат-папуас!»"
    },
    {
        "name": "04_crowd_break2_pre_chorus",
        "ss": 25.0,
        "t": 5.0,
        "fade_in": 1.0,
        "fade_out": 1.2,
        "mix_time": 99.0,
        "volume": 0.35,
        "desc": "Проигрыш без слов 2 (99.0s - 104.0s) — раскачка зала перед припевом «Валюта одна»"
    },
    {
        "name": "05_crowd_break3_pre_acceleration",
        "ss": 2.5,
        "t": 7.0,
        "fade_in": 1.5,
        "fade_out": 1.5,
        "mix_time": 138.5,
        "volume": 0.34,
        "desc": "Проигрыш без слов 3 (138.5s - 145.5s) — нарастающий рёв зала перед разгоном и цирком шапито"
    },
    {
        "name": "06_crowd_climax_furious_drop",
        "ss": 8.0,
        "t": 10.0,
        "fade_in": 0.3,
        "fade_out": 2.0,
        "mix_time": 165.5,
        "volume": 0.48,
        "desc": "Момент накала 2 (165.5s - 175.5s) — яростный пик, дроп «Ему подавай!», соляк и ролл-колл команды"
    },
    {
        "name": "07_crowd_outro_stadium_apotheosis",
        "ss": 10.0,
        "t": 16.0,
        "fade_in": 1.5,
        "fade_out": 3.5,
        "mix_time": 221.45,
        "volume": 0.42,
        "desc": "Апофеоз и финал (221.45s - 237.24s) — финальное соло, триумфальный пролёт над ареной и рёв зала"
    }
]

def slice_crowd_audio():
    os.makedirs(OUT_SFX_DIR, exist_ok=True)
    generated_files = []

    print(f"[+] Нарезка слоёв толпы из {SRC_CROWD}...")
    for item in CROWD_SLICES:
        out_file = os.path.join(OUT_SFX_DIR, f"{item['name']}.mp3")
        fade_out_start = max(0.0, item["t"] - item["fade_out"])
        
        af_filter = f"afade=t=in:ss=0:d={item['fade_in']},afade=t=out:st={fade_out_start:.2f}:d={item['fade_out']}"
        
        cmd = [
            FFMPEG, "-y",
            "-ss", str(item["ss"]),
            "-t", str(item["t"]),
            "-i", SRC_CROWD,
            "-af", af_filter,
            "-b:a", "320k",
            out_file
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"    [OK] Срез: {item['name']}.mp3 ({item['t']}s, fade_in={item['fade_in']}s, fade_out={item['fade_out']}s)")
            generated_files.append((out_file, item))
        else:
            print(f"    [-] Ошибка нарезки {item['name']}: {res.stderr}")
            
    return generated_files

def mix_into_concert_track():
    # 1. Проверяем наличие бэкапа оригинального трека
    if not os.path.exists(BACKUP_TRACK):
        print(f"[+] Создание резервной копии оригинального трека: {BACKUP_TRACK}")
        shutil.copyfile(MAIN_TRACK, BACKUP_TRACK)

    # 2. Формируем команду ffmpeg для сведения
    input_args = ["-i", BACKUP_TRACK]
    filter_parts = []
    amix_inputs = ["[0:a]"]

    for idx, item in enumerate(CROWD_SLICES, start=1):
        slice_path = os.path.join(OUT_SFX_DIR, f"{item['name']}.mp3")
        input_args.extend(["-i", slice_path])
        
        delay_ms = int(item["mix_time"] * 1000)
        filter_parts.append(
            f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume={item['volume']}[c{idx}]"
        )
        amix_inputs.append(f"[c{idx}]")

    num_inputs = len(CROWD_SLICES) + 1
    amix_str = "".join(amix_inputs) + f"amix=inputs={num_inputs}:duration=first:dropout_transition=0:normalize=0[mixed]"
    limiter_str = "[mixed]alimiter=limit=0.98:attack=5:release=50[outa]"
    
    full_filter = ";".join(filter_parts + [amix_str, limiter_str])

    temp_out = MAIN_TRACK + ".tmp.mp3"
    cmd = [
        FFMPEG, "-y",
        *input_args,
        "-filter_complex", full_filter,
        "-map", "[outa]",
        "-b:a", "320k",
        "-ar", "48000",
        temp_out
    ]

    print("\n[+] Сведение концертного трека (оригинал + 7 слоёв толпы)...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[-] Ошибка сведения ffmpeg: {res.stderr}")
        return False

    # 3. Раскладываем готовый сведённый трек по целевым путям
    print(f"[+] Замена мастер-трека на сведённую концертную версию ({temp_out})...")
    for target in TARGET_TRACK_COPIES:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(temp_out, target)
        print(f"    [OK] Обновлён: {target}")

    if os.path.exists(temp_out):
        os.remove(temp_out)

    print("[SUCCESS] Концертный трек успешно обновлён с динамической стадионной толпой!")
    return True

if __name__ == "__main__":
    slice_crowd_audio()
    mix_into_concert_track()
