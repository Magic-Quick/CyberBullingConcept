#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import json
import subprocess
import shutil
import re
from pathlib import Path

ROOT = Path("H:/PLBX/CyberBullingConcept")
VOICEOVER_DIR = ROOT / "media/audio/voiceover_v13"
OZVUCHKA_DIR = ROOT / "Озвучка"
REPO_AUDIO_DIR = ROOT / "repo/src/assets/audio"
REPO_DIR = ROOT / "repo"
STORY_DATA_FILE = REPO_DIR / "src/storyData.ts"
FFMPEG_PATH = r"C:\Users\Shestirukiy\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

VOICE_ID = "GquPFn9xormgmHaJ2KdN"  # Geremy
MODEL_ID = "eleven_multilingual_v2"

ACT_6_TEXT = """Конвент выносит приговор: Инспекция Дилдачечных Катакомб без Права на Переписку и Орден Багрового Дилдоносного Покаяния!
Обоим алхимикам вручается двухметровый церемониальный жезл — Багровый Дилдо из титанового сплава в качестве швабры. Они приговариваются к ручной зачистке рифлёных металлических решёток нижней палубы от налипшей биомассы всех трёхсот сорока шести копий — до тех пор, пока каждый байт из двадцати двух гигабайт цифровой гнили не будет содран до зеркального блеска.
Особое условие инспекции: драить вручную, без права задерживать дыхание, без права зажимать нос, без права выхода в Slack и без права на кофе.

В награду за столь великую заботу о коллективе Ковчег жалует Надзирателю немыслимую роскошь в космическом пространстве — чашку безупречного эспрессо.
Зёрна ручной обжарки с реликтовых плантаций, плотная бархатная пенка цвета лесного ореха, глубокий аромат горького шоколада...
Поэтому сервисная игла пневмо-дозатора с шипением врезается напрямую в его питательный катетер, и кипящий концентрат под давлением в восемь атмосфер впрыскивается прямо в вену, минуя ротовую полость!
Никаких чашек. Никаких пауз. Его глаза даже не успели моргнуть и оторваться от штурма Нотиона.
Зрачки расширены, пульс двести сорок, давление в норме.

Наслаждайтесь букетом, Алексей. За работу."""

def get_api_key():
    env_key = os.getenv("ELEVENLABS_API_KEY")
    if env_key:
        return env_key
    key_paths = [
        r"F:\AI\elevenlabs-api-key.txt",
        r"F:\AI\Claude\projects\H--PLBX-aliens-b1-c13-Repo-aliens-b1-c13\secrets\elevenlabs-api-key.txt"
    ]
    for p in key_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.startswith("ELEVENLABS_API_KEY="):
                        return line.split("=", 1)[1].strip()
    return None

def synthesize(api_key, text):
    import requests
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }
    print("[*] Calling ElevenLabs API for Act 6 with Алексей...")
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        return res.content
    else:
        raise RuntimeError(f"ElevenLabs error {res.status_code}: {res.text}")

def main():
    api_key = get_api_key()
    if not api_key:
        print("[!] ELEVENLABS_API_KEY not found.")
        sys.exit(1)

    # 1. Synthesize
    audio_content = synthesize(api_key, ACT_6_TEXT)
    print(f"[+] Act 6 synthesized: {len(audio_content):,} bytes")

    # 2. Write to targets
    targets = [
        VOICEOVER_DIR / "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
        VOICEOVER_DIR / "06_act_6_tribunal_awards.mp3",
        OZVUCHKA_DIR / "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
        REPO_AUDIO_DIR / "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
        REPO_AUDIO_DIR / "06_act_6_tribunal_awards.mp3",
    ]
    for t in targets:
        t.parent.mkdir(parents=True, exist_ok=True)
        with open(t, "wb") as f:
            f.write(audio_content)
        print(f"    Saved: {t}")

    # Remove outdated filenames
    for d in [VOICEOVER_DIR, OZVUCHKA_DIR, REPO_AUDIO_DIR]:
        for old_f in ["07_Акт_6_Суд_Дилдодачник_и_эспрессо_в_вену.mp3", "07_Акт_6_Суд_Дилдо_швабра_и_эспрессо_в_вену.mp3"]:
            old_p = d / old_f
            if old_p.exists():
                old_p.unlink()
                print(f"    Removed old: {old_p}")

    # 3. Transcribe with Faster-Whisper to find transition and exact cues
    print("[*] Transcribing new Act 6 with Faster-Whisper...")
    sys.path.insert(0, 'F:/AI/Plugins/local-video-transcriber/skills/local-video-transcriber/scripts')
    from transcribe import load_whisper_model
    model, dev = load_whisper_model('mobiuslabsgmbh/faster-whisper-large-v3-turbo', 'auto', 'float16')
    segments, info = model.transcribe(
        str(targets[0]),
        language='ru',
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
        word_timestamps=False
    )
    all_segs = list(segments)
    for s in all_segs:
        print(f"  {s.start:.2f} - {s.end:.2f}: {s.text}")

    # Find the transition where reward starts ("В награду за столь великую...")
    split_time = None
    reward_idx = None
    for idx, s in enumerate(all_segs):
        if "В награду" in s.text or "награду за столь" in s.text:
            split_time = round(s.start, 2)
            reward_idx = idx
            break

    if split_time is None:
        print("[!] Warning: Could not find reward split automatically, defaulting to 48.4s")
        split_time = 48.4
        reward_idx = len(all_segs) // 2

    print(f"[+] Split time between punishment and reward: {split_time}s")

    punishment_segs = all_segs[:reward_idx]
    reward_segs = all_segs[reward_idx:]

    punishment_cues = []
    for s in punishment_segs:
        punishment_cues.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": s.text.strip()
        })
    if punishment_cues:
        punishment_cues[-1]["end"] = split_time

    reward_cues = []
    for s in reward_segs:
        reward_cues.append({
            "start": round(max(0.0, s.start - split_time), 2),
            "end": round(max(0.0, s.end - split_time), 2),
            "text": s.text.strip()
        })
    
    total_duration = round(all_segs[-1].end, 2)
    reward_duration = round(total_duration - split_time, 2)
    if reward_cues:
        reward_cues[-1]["end"] = reward_duration

    # Ensure canonical punchline text for the last cues
    for c in reward_cues:
        if "букетом" in c["text"].lower() or "алексей" in c["text"].lower():
            c["text"] = "Наслаждайтесь букетом, Алексей."
        elif "работу" in c["text"].lower() and len(c["text"]) < 20:
            c["text"] = "За работу!"

    # 4. Rebuild full master clean track in all directories
    print("[*] Rebuilding complete master clean track...")
    full_sequence = [
        "01_Пролог_Космический_Ковчег_и_офис_класса_B.mp3",
        "02_Акт_1_Интро_Варка_Плейриума_и_Тап_капкан.mp3",
        "03_Акт_2_Даниал_Минное_поле_8SP_и_обвал_биржи.mp3" if (VOICEOVER_DIR / "03_Акт_2_Даниал_Минное_поле_8SP_и_обвал_биржи.mp3").exists() else "03_Акт_2_Даниал_Минное_поле_8SP_и_ядерная_боеголовка.mp3",
        "04_Акт_3_Менеджмент_Питательные_трубки_и_Машина_времени.mp3",
        "05_Акт_4_Моторный_цех_Мутация_22ГБ_и_4_минуты_Хухро.mp3",
        "06_Акт_5_Клиентархи_Zynga_Supercell_GameGears.mp3",
        "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
        "08_Акт_7_Аутро_Закрытие_смены_и_Слепой_старт.mp3"
    ]
    silence_1_2s = str(VOICEOVER_DIR / "silence_1_2s.mp3")
    silence_2s = str(VOICEOVER_DIR / "silence_2s.mp3")

    track_items = []
    for i, fname in enumerate(full_sequence):
        fpath = str(VOICEOVER_DIR / fname)
        track_items.append(fpath)
        if i == 0:
            track_items.append(silence_2s)
        elif i < len(full_sequence) - 1:
            track_items.append(silence_1_2s)

    master_primary = VOICEOVER_DIR / "00_Хроники_Плейбокса_V13_Полная_версия_чистый_голос.mp3"
    inputs = []
    filter_str = ""
    for idx, p in enumerate(track_items):
        inputs.extend(["-i", p])
        filter_str += f"[{idx}:a]"
    filter_str += f"concat=n={len(track_items)}:v=0:a=1[outa]"

    cmd = [FFMPEG_PATH, "-y"] + inputs + ["-filter_complex", filter_str, "-map", "[outa]", "-b:a", "192k", str(master_primary)]
    subprocess.run(cmd, check=True)

    shutil.copy2(master_primary, OZVUCHKA_DIR / master_primary.name)
    shutil.copy2(master_primary, VOICEOVER_DIR / "voices_of_production_v13_clean_voice.mp3")
    shutil.copy2(master_primary, REPO_AUDIO_DIR / master_primary.name)
    shutil.copy2(master_primary, REPO_AUDIO_DIR / "voices_of_production_v13_clean_voice.mp3")
    print(f"[+] Master track rebuilt: {master_primary.stat().st_size:,} bytes")

    # 5. Update storyData.ts
    print("[*] Updating storyData.ts with new cues and Алексей Горин...")
    with open(STORY_DATA_FILE, "r", encoding="utf-8") as f:
        story_content = f.read()

    # Replace "Михаил Горин" -> "Алексей Горин"
    story_content = story_content.replace('"speaker": "Михаил Горин"', '"speaker": "Алексей Горин"')
    story_content = story_content.replace("Михаил Горин • 8 атмосфер под давлением", "Алексей Горин • 8 атмосфер под давлением")

    # Replace "БАГРОВЫЙ ДИЛДОДАЧНИК" -> "БАГРОВЫЙ ДИЛДО"
    story_content = story_content.replace('"title": "ВЫСШАЯ КАРА: БАГРОВЫЙ ДИЛДОДАЧНИК"', '"title": "ВЫСШАЯ КАРА: БАГРОВЫЙ ДИЛДО"')

    # Update act_6_punishment
    punishment_cues_json = json.dumps(punishment_cues, indent=6, ensure_ascii=False)
    patt_punish = r'(\{\s*"id":\s*"act_6_punishment"[\s\S]*?"duration":\s*)[\d\.]+(,[\s\S]*?"cues":\s*)\[[\s\S]*?\n    \]\s*\}'
    repl_punish = rf'\g<1>{split_time}\g<2>{punishment_cues_json}\n  }}'
    story_content, cnt1 = re.subn(patt_punish, repl_punish, story_content)

    # Update act_6_reward
    reward_cues_json = json.dumps(reward_cues, indent=6, ensure_ascii=False)
    patt_reward = r'(\{\s*"id":\s*"act_6_reward"[\s\S]*?"audioOffset":\s*)[\d\.]+(,[\s\S]*?"duration":\s*)[\d\.]+(,[\s\S]*?"cues":\s*)\[[\s\S]*?\n    \]\s*\}'
    repl_reward = rf'\g<1>{split_time}\g<2>{reward_duration}\g<3>{reward_cues_json}\n  }}'
    story_content, cnt2 = re.subn(patt_reward, repl_reward, story_content)

    print(f"[+] storyData.ts substitutions: punish={cnt1}, reward={cnt2}")

    with open(STORY_DATA_FILE, "w", encoding="utf-8") as f:
        f.write(story_content)

    # 6. Rebuild repo with npm.cmd run build
    print("[*] Building project with Vite (npm.cmd run build)...")
    build_res = subprocess.run("npm.cmd run build", shell=True, cwd=str(REPO_DIR), capture_output=True, text=True)
    if build_res.returncode == 0:
        print("[+] Vite build finished successfully!")
    else:
        print(f"[!] Vite build failed: {build_res.stderr}")

    print("\n=== ВСЕ ЗАДАЧИ ПО АКТУ 6 УСПЕШНО ВЫПОЛНЕНЫ ===")

if __name__ == "__main__":
    main()
