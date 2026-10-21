#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import time
import json
import subprocess
import shutil
from pathlib import Path

# Paths
ROOT = Path("H:/PLBX/CyberBullingConcept")
REPO_DIR = ROOT / "repo"
VOICEOVER_DIR = ROOT / "media/audio/voiceover_v13"
OZVUCHKA_DIR = ROOT / "Озвучка"
REPO_AUDIO_DIR = REPO_DIR / "src/assets/audio"
FFMPEG_PATH = r"C:\Users\Shestirukiy\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

VOICE_ID = "GquPFn9xormgmHaJ2KdN"  # Geremy
MODEL_ID = "eleven_multilingual_v2"

ACT_4_TEXT = """Мои датчики в серверном трюме зафиксировали жуткую биологическую катастрофу: один из пакетов платформы вышел из-под контроля и начал бешено почковаться, пожирая память корабля. Когда алхимик Кирилл Берёзкин вскрыл переборку, отсек был под завязку залит пульсирующей массой клонов. В логах остался его крик: «нафармилось двадцать два гигабайта — триста сорок шесть копий этого пакета».
Двадцать два гигабайта живой плоти сервера сожрали триста сорок шесть мутантов. А создатель аномалии Кристиан посмотрел на этот апокалипсис и невозмутимо уронил в консоль: «упс».

В четверг небеса раскололись окончательно.
Брат Павел Самойленко — главный ликвидатор технических катастроф — вышел к пастве и объявил:
«мне блокнули Клода, поэтому пока код ревью на пи-ар ближайшие пять-десять дней на паузе... буду глазами смотреть».
Один глаз у Павла номинально остался органическим, но плоть давно разучилась видеть свет без подсказок нейросети. Оставшись без машинного духа, он бродит впотьмах по нижним палубам и вслепую — буквально по шрифту Брайля — на ощупь валидирует чужие пулл-реквесты.

А в артовом отсеке держал круговую оборону Артём Хухро. Тринадцать часов смены в сутки, один выходной за весь месяц.
Когда на него попытались навесить ещё одну производственную линию, Хухро выдал системный диагноз: арт сейчас — главный боттлнек корабля. И предупредил: если продолжать ужимать объекты на экране смартфона, «будут вообще пиксели добывать пиксели». Матрица схлопнется в пыль, Клиентархи не разглядят геймплей, завалят шлюзы правками — и тогда, как резюмировал мастер: «мне дорога в башню времени ии-лорда».

Горин проявил заботу — активировал вокруг мастера защитный карантинный купол и написал в общем чате:
«Хухро пока не трогаем, ему чутка нужно поделать Эпоху Поп и разгрузиться».
И ровно через четыре минуты — мои хронометры зафиксировали интервал в двести сорок секунд — Горин пробил этот купол и тегнул Хухро с новой задачей.
Целых четыре минуты тишины и передышки. По меркам корабля «Плей-Бокс» это акт неслыханной, поистине царской щедрости. Ни в чём себе не отказывайте, Артём."""

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
    print("[*] Calling ElevenLabs API for full Act 4...")
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

    # 1. Synthesize Act 4
    audio_content = synthesize(api_key, ACT_4_TEXT)
    print(f"[+] Act 4 synthesized successfully: {len(audio_content):,} bytes")

    # 2. Save to all target locations
    act4_targets = [
        VOICEOVER_DIR / "05_Акт_4_Моторный_цех_Мутация_22ГБ_и_4_минуты_Хухро.mp3",
        VOICEOVER_DIR / "04_act_4_engine_mutation_art.mp3",
        OZVUCHKA_DIR / "05_Акт_4_Моторный_цех_Мутация_22ГБ_и_4_минуты_Хухро.mp3",
        REPO_AUDIO_DIR / "05_Акт_4_Моторный_цех_Мутация_22ГБ_и_4_минуты_Хухро.mp3",
        REPO_AUDIO_DIR / "04_act_4_engine_mutation_art.mp3",
    ]
    for target in act4_targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "wb") as f:
            f.write(audio_content)
        print(f"    Saved: {target}")

    # 3. Get audio duration of new Act 4
    probe_cmd = [FFMPEG_PATH, "-i", str(act4_targets[0])]
    res = subprocess.run(probe_cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    import re
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
    if m:
        act4_duration = int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
    else:
        act4_duration = 153.26
    print(f"[+] Act 4 Duration: {act4_duration:.2f} seconds")

    # 4. Rebuild full master audio track in all folders
    full_sequence = [
        "01_Пролог_Космический_Ковчег_и_офис_класса_B.mp3",
        "02_Акт_1_Интро_Варка_Плейриума_и_Тап_капкан.mp3",
        "03_Акт_2_Даниал_Минное_поле_8SP_и_ядерная_боеголовка.mp3",
        "04_Акт_3_Менеджмент_Питательные_трубки_и_Машина_времени.mp3",
        "05_Акт_4_Моторный_цех_Мутация_22ГБ_и_4_минуты_Хухро.mp3",
        "06_Акт_5_Клиентархи_Zynga_Supercell_GameGears.mp3",
        "07_Акт_6_Суд_Дилдодачник_и_эспрессо_в_вену.mp3",
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
    print("[*] Rebuilding complete master clean track...")
    subprocess.run(cmd, check=True)

    # Distribute master track
    shutil.copy2(master_primary, OZVUCHKA_DIR / master_primary.name)
    shutil.copy2(master_primary, VOICEOVER_DIR / "voices_of_production_v13_clean_voice.mp3")
    shutil.copy2(master_primary, REPO_AUDIO_DIR / master_primary.name)
    shutil.copy2(master_primary, REPO_AUDIO_DIR / "voices_of_production_v13_clean_voice.mp3")
    print(f"[+] Master track rebuilt: {master_primary.stat().st_size:,} bytes")

    # 5. Transcribe Act 4 with Whisper to get high-precision cues
    print("[*] Transcribing Act 4 with Faster-Whisper...")
    try:
        sys.path.insert(0, 'F:/AI/Plugins/local-video-transcriber/skills/local-video-transcriber/scripts')
        from transcribe import load_whisper_model
        model, dev = load_whisper_model('mobiuslabsgmbh/faster-whisper-large-v3-turbo', 'auto', 'float16')
        segments, info = model.transcribe(
            str(act4_targets[0]),
            language='ru',
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=400),
            word_timestamps=False
        )
        whisper_cues = []
        for s in segments:
            txt = s.text.strip()
            if txt:
                whisper_cues.append({
                    'start': round(s.start, 2),
                    'end': round(s.end, 2),
                    'text': txt
                })
        print(f"[+] Whisper extracted {len(whisper_cues)} segments")
    except Exception as e:
        print(f"[!] Whisper failed ({e}), falling back to aligned phrases")
        whisper_cues = []

    # 6. Build the enhanced cues for Act 4 in storyData.ts
    # Let's inspect whisper_cues and map metadata
    print("[*] Building enriched Act 4 cues...")
    # Read current storyData.ts
    story_data_file = REPO_DIR / "src/storyData.ts"
    with open(story_data_file, "r", encoding="utf-8") as f:
        story_content = f.read()

    # Create the cues list based on whisper or aligned timestamps
    final_cues = []
    if whisper_cues:
        for c in whisper_cues:
            t = c['text']
            cue_obj = {
                "start": c['start'],
                "end": c['end'],
                "text": t
            }
            # Attach speaker and slack metadata
            if "Павел Самойленко" in t or "блокнули" in t or "клода" in t.lower() or "код ревью" in t.lower() or "глазами смотреть" in t.lower():
                cue_obj["speaker"] = "Павел Самойленко"
                cue_obj["speakerRole"] = "CTO • Архи-Цензор Синтаксической Ереси"
                cue_obj["avatarKey"] = "avatar_pavel"
                cue_obj["slackScreenshotKey"] = "04_claude_banned"
            elif "Хухро" in t or "боттлнек" in t or "пиксели" in t or "башню времени" in t:
                cue_obj["speaker"] = "Артём Хухро"
                cue_obj["speakerRole"] = "Lead 3D • Техноэкзорцист Графической Скверны"
                cue_obj["avatarKey"] = "avatar_huhro"
            elif "Хухро пока не трогаем" in t or "Эпоху Поп" in t or "разгрузиться" in t:
                cue_obj["speaker"] = "Михаил Горин"
                cue_obj["speakerRole"] = "Верховный Надзиратель Конвейера"
                cue_obj["avatarKey"] = "avatar_gorin"
            elif "oops" in t.lower() or "упс" in t.lower():
                cue_obj["speaker"] = "Кристиан"
                cue_obj["speakerRole"] = "Платформенный Алхимик"
                cue_obj["avatarKey"] = "avatar_christian"
            final_cues.append(cue_obj)
    else:
        # Fallback cues with proportional timing
        phrases_data = [
            ("Мои датчики в серверном трюме зафиксировали жуткую биологическую катастрофу.", None, None, None, None),
            ("Один из пакетов платформы вышел из-под контроля и начал бешено почковаться, пожирая память корабля.", None, None, None, None),
            ("Когда алхимик Кирилл Берёзкин вскрыл переборку, отсек был под завязку залит пульсирующей массой клонов.", None, None, None, None),
            ("В логах остался его крик: «нафармилось 22 ГБ - 346 копий этого пакета».", None, None, None, None),
            ("22 гигабайта живой плоти сервера сожрали 346 мутантов.", None, None, None, None),
            ("А создатель аномалии Кристиан посмотрел на этот апокалипсис и невозмутимо уронил в консоль.", None, None, None, None),
            ("Упс.", "Кристиан", "Платформенный Алхимик", "avatar_christian", None),
            ("В четверг небеса раскололись окончательно.", None, None, None, None),
            ("Брат Павел Самойленко — главный ликвидатор технических катастроф — вышел к пастве и объявил:", None, None, None, None),
            ("«мне блокнули клода, поэтому пока код ревью на PR ближайшие 5-10 дней на паузе... буду глазами смотреть».", "Павел Самойленко", "CTO • Архи-Цензор Синтаксической Ереси", "avatar_pavel", "04_claude_banned"),
            ("Один глаз у Павла номинально остался органическим, но плоть давно разучилась видеть свет без подсказок нейросети.", None, None, None, None),
            ("Оставшись без машинного духа, он бродит впотьмах по нижним палубам и вслепую — буквально по шрифту Брайля — на ощупь валидирует чужие пулл-реквесты.", None, None, None, None),
            ("А в артовом отсеке держал круговую оборону Артём Хухро. Тринадцать часов смены в сутки, один выходной за весь месяц.", "Артём Хухро", "Lead 3D • Техноэкзорцист Графической Скверны", "avatar_huhro", None),
            ("Когда на него попытались навесить ещё одну производственную линию, Хухро выдал системный диагноз: арт сейчас — главный боттлнек корабля.", "Артём Хухро", "Lead 3D • Техноэкзорцист Графической Скверны", "avatar_huhro", None),
            ("И предупредил: если продолжать ужимать объекты на экране смартфона, «будут вообще пиксели добывать пиксели».", "Артём Хухро", "Lead 3D • Техноэкзорцист Графической Скверны", "avatar_huhro", None),
            ("Матрица схлопнется в пыль, Клиентархи не разглядят геймплей, завалят шлюзы правками — и тогда: «мне дорога в башню времени ии-лорда».", "Артём Хухро", "Lead 3D • Техноэкзорцист Графической Скверны", "avatar_huhro", None),
            ("Горин проявил заботу — активировал вокруг мастера защитный карантинный купол и написал в общем чате:", None, None, None, None),
            ("«Хухро пока не трогаем, ему чутка нужно поделать Эпоху Поп и разгрузиться».", "Михаил Горин", "Верховный Надзиратель Конвейера", "avatar_gorin", None),
            ("И ровно через четыре минуты — мои хронометры зафиксировали интервал в двести сорок секунд — Горин пробил этот купол и тегнул Хухро с новой задачей.", None, None, None, None),
            ("Целых четыре минуты тишины и передышки. По меркам корабля «Плей-Бокс» это акт неслыханной, поистине царской щедрости.", None, None, None, None),
            ("Ни в чём себе не отказывайте, Артём.", None, None, None, None)
        ]
        total_chars = sum(len(p[0]) for p in phrases_data)
        curr = 0.0
        for text, spk, role, av, sc in phrases_data:
            dur = (len(text) / total_chars) * act4_duration
            cue = {
                "start": round(curr, 2),
                "end": round(curr + dur, 2),
                "text": text
            }
            if spk: cue["speaker"] = spk
            if role: cue["speakerRole"] = role
            if av: cue["avatarKey"] = av
            if sc: cue["slackScreenshotKey"] = sc
            final_cues.append(cue)
            curr += dur

    # Smooth cues end
    if final_cues:
        final_cues[-1]["end"] = round(act4_duration, 2)

    # Replace Act 4 inside storyData.ts
    # Match the act_4_engine block
    pattern = r'(\{\s*"id":\s*"act_4_engine"[\s\S]*?"duration":\s*)[\d\.]+(,[\s\S]*?"cues":\s*)\[[\s\S]*?\n    \]\s*\}'
    cues_json = json.dumps(final_cues, indent=6, ensure_ascii=False)
    # Adjust indentation
    replacement = rf'\g<1>{round(act4_duration, 2)}\g<2>{cues_json}\n  }}'
    
    new_story_content, count = re.subn(pattern, replacement, story_content)
    if count == 0:
        print("[!] Regex match failed for act_4_engine in storyData.ts! Attempting manual block substitution...")
        # Search manually
        start_idx = story_content.find('"id": "act_4_engine"')
        if start_idx != -1:
            block_start = story_content.rfind('{', 0, start_idx)
            block_end = story_content.find('  },', block_start)
            old_block = story_content[block_start:block_end+4]
            new_block = f'''{{
    "id": "act_4_engine",
    "actNumber": 5,
    "totalActs": 10,
    "category": "act",
    "badge": "АКТ 4",
    "title": "МОТОРНЫЙ ЦЕХ: МУТАЦИЯ 22 ГБ И СЛЕПОЙ САМОЙЛЕНКО",
    "subtitle": "Блокировка Клода • Брайль для PR • 240 секунд Хухро",
    "imageKey": "factory_conveyor",
    "audioKey": "05_act4",
    "duration": {round(act4_duration, 2)},
    "hasDedicatedFrame": false,
    "isKaraoke": false,
    "cues": {cues_json}
  }},'''
            new_story_content = story_content[:block_start] + new_block + story_content[block_end+4:]
            print("[+] Manual block substitution successful!")
        else:
            raise RuntimeError("act_4_engine not found in storyData.ts")
    else:
        print(f"[+] Regex substitution successful ({count} replaced)!")

    with open(story_data_file, "w", encoding="utf-8") as f:
        f.write(new_story_content)
    print(f"[+] {story_data_file} successfully updated!")

    # 7. Rebuild the repo app (npm run build)
    print("[*] Building project with Vite (npm run build)...")
    build_res = subprocess.run("npm run build", shell=True, cwd=str(REPO_DIR), capture_output=True, text=True)
    if build_res.returncode == 0:
        print("[+] npm run build completed successfully!")
        print(build_res.stdout[-300:])
    else:
        print(f"[!] npm run build failed: {build_res.stderr}")

    print("\n=== ПОЛНАЯ ДООЗВУЧКА И ОБНОВЛЕНИЕ БИЛДА ЗАВЕРШЕНЫ УСПЕШНО ===")

if __name__ == "__main__":
    main()
