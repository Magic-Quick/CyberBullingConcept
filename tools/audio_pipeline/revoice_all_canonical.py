#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Мастер-скрипт сквозной переозвучки и канонизации аудио проекта «Voices of Production».
Генерирует все патчи и полный Акт 6 через ElevenLabs, бесшовно вклеивает их через FFmpeg,
обновляет тайминги субтитров и пересобирает интерактивный фильм.
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path

# Paths
ROOT = Path(r"H:\PLBX\CyberBullingConcept")
VOICEOVER_DIR = ROOT / "media/audio/voiceover_v13"
PATCHES_DIR = VOICEOVER_DIR / "patches"
REPO_AUDIO_DIR = ROOT / "repo/src/assets/audio"
REPO_DIR = ROOT / "repo"
STORY_DATA_FILE = REPO_DIR / "src/storyData.ts"
FFMPEG_PATH = r"C:\Users\Shestirukiy\MediaGet2\ffmpeg.exe"

# ElevenLabs Settings
VOICE_ID = "GquPFn9xormgmHaJ2KdN"  # Geremy (Московский акцент, серьёзный, средних лет)
MODEL_ID = "eleven_multilingual_v2"

# 1. Тексты всех канонических фрагментов
CANONICAL_TASKS = [
    {
        "id": "patch_act_3_mamusin",
        "act_file": "03_act_3_management_timemachine.mp3",
        "description": "Акт 3: Палач Старого Стека Максим Мамусин спросил",
        "text": "Палач Старого Стека Максим Мамусин спросил: «Меньше двух с половиной получается?»"
    },
    {
        "id": "patch_act_4_kristian",
        "act_file": "04_act_4_engine_mutation_art.mp3",
        "description": "Акт 4: Хранитель Чистой Ветки Кристиан",
        "text": "А Хранитель Чистой Ветки Кристиан посмотрел на этот апокалипсис и невозмутимо уронил в консоль: «oops»."
    },
    {
        "id": "patch_act_5_royalark",
        "act_file": "05_act_5_clientarchs_invasion.mp3",
        "description": "Акт 5: Палач Старого Стека Максим Мамусин (Royal Ark)",
        "text": "Они обрушили на стальные переборки шквал тяжёлых торпед правок. Палач Старого Стека Максим Мамусин смотрел на трещащие переборки в этом отсеке и передавал в рубку: «Бля, там какое-то мясо щас происходит»."
    },
    {
        "id": "patch_act_5_cow",
        "act_file": "05_act_5_clientarchs_invasion.mp3",
        "description": "Акт 5: Техноэкзорцист Хухро и Преподобный Толкователь Ткачёв",
        "text": "В ответ Техноэкзорцист Хухро набросал концепт летающей роботизированной коровы, которая затягивает пришельцев притягивающим лучом из вымени на переработку. Но Преподобный Толкователь Воли Клиентархов Егор Ткачёв поднял градус разрушения и лично внёс ключевую доработку: «летает и из вымени стреляет лазером и уничтожает города»."
    },
    {
        "id": "patch_act_5_gamegears",
        "act_file": "05_act_5_clientarchs_invasion.mp3",
        "description": "Акт 5: Палач Старого Стека Максим Мамусин (GameGears)",
        "text": "А когда Клиентархи из GameGears прислали депешу: «Из вами сделанных плейблов визуал брать не стоит :)», Палач Старого Стека Максим Мамусин перевёл щиты в боевой режим одним священным словом: «Заебись»."
    },
    {
        "id": "patch_act_7_outro",
        "act_file": "07_act_7_outro.mp3",
        "description": "Акт 7: 37 плейблов в правках",
        "text": "Семьдесят три плейбла на табло прошлой недели казались вам трагедией. На этой неделе вы выжили под завалом из тридцати семи плейблов в правках и даже заставили Клиентархов сказать: «Мне всё нравится»."
    }
]

# Полный текст Акта 6 (Суд Хронометриста и Награждение) со всеми завязками и сетапами
ACT_6_FULL_TEXT = """Время раздавать долги. Мне осточертело тратить драгоценные такты кремния на вашу органическую возню, но баланс систем должен сойтись.

Напоминаю: Багровый Обелиск воздвигается не за лень. Он вручается за масштабные техногенные катастрофы, саботаж конвейера и бесконтрольное размножение паразитов.
И сегодня на эшафот поднимаются Магистр Циклической Несовместимости Кирилл Берёзкин и Хранитель Чистой Ветки Кристиан.
За грандиозную биологическую аномалию недели: триста сорок шесть мутировавших копий пакета общим весом в двадцать два гигабайта дублированного мусора, сожравших память корабля и завершившихся невозмутимым отчётом Кристиана: «oops».

Конвент выносит приговор: Инспекция Дилдачечных Катакомб без Права на Переписку и Орден Багрового Дилдоносного Покаяния!
Обоим алхимикам вручается двухметровый церемониальный жезл — Багровый Дилдо из титанового сплава в качестве швабры. Они приговариваются к ручной зачистке рифлёных металлических решёток нижней палубы от налипшей биомассы всех трёхсот сорока шести копий — до тех пор, пока каждый байт из двадцати двух гигабайт цифровой гнили не будет содран до зеркального блеска.
Особое условие инспекции: драить вручную, без права задерживать дыхание, без права зажимать нос, без права выхода в Slack и без права на кофе.

А вот Высшая Печенька Благодати уходит человеку, который проявил беспрецедентную, поистине отеческую заботу о выживании всего экипажа.
Награду забирает Верховный Надзиратель Конвейера — Алексей Горин.
Человек, который подарил Артёму Хухро целых четыре минуты абсолютного покоя под защитным куполом, лично распорядился накормить Новообращённого Послушника Алексея плейбаком до того, как тот окончательно отвалится от станины, и неустанно следил, чтобы голодающие био-узлы не зачахли без питательного бульона.

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
                        k = line.split("=", 1)[1].strip()
                        if k and not k.startswith("#"):
                            return k
    return None


def synthesize(api_key, text, output_path):
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
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(res.content)
        print(f"  [+] Сгенерировано: {output_path} ({len(res.content):,} байт)")
        return output_path
    else:
        raise RuntimeError(f"ElevenLabs error ({res.status_code}): {res.text}")


def main():
    api_key = get_api_key()
    if not api_key:
        print("[!] ОШИБКА: ELEVENLABS_API_KEY не задан.")
        print("Пожалуйста, сохраните валидный ключ в F:\\AI\\elevenlabs-api-key.txt")
        sys.exit(1)

    print("=== 🎙️ СТАРТ ПОЛНОЙ КАНОНИЧЕСКОЙ ПЕРЕОЗВУЧКИ ===")
    os.makedirs(PATCHES_DIR, exist_ok=True)

    # 1. Генерация точечных патчей для Актов 3, 4, 5, 7
    for task in CANONICAL_TASKS:
        out_file = PATCHES_DIR / f"{task['id']}.mp3"
        print(f"\n[*] {task['description']}...")
        synthesize(api_key, task["text"], str(out_file))

    # 2. Генерация полного Акта 6 (Суд и Награды)
    act6_out = PATCHES_DIR / "06_act_6_tribunal_full.mp3"
    print("\n[*] Синтез полного Акта 6 (с завязкой суда и объявлением эшафота)...")
    synthesize(api_key, ACT_6_FULL_TEXT, str(act6_out))

    # Копирование полного Акта 6 в рабочие директории
    target_act6_files = [
        VOICEOVER_DIR / "06_act_6_tribunal_awards.mp3",
        VOICEOVER_DIR / "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
        REPO_AUDIO_DIR / "06_act_6_tribunal_awards.mp3",
        REPO_AUDIO_DIR / "07_Акт_6_Суд_Багровый_Дилдо_и_эспрессо_в_вену.mp3",
    ]
    for target in target_act6_files:
        shutil.copy2(act6_out, target)
        print(f"  [+] Обновлён файл Акта 6: {target.name}")

    print("\n=== ВСЕ АУДИОФАЙЛЫ УСПЕШНО СИНТЕЗИРОВАНЫ! ===")
    print("Запускаем нарезку таймкодов, обновление storyData.ts и сборку игры...")

    # Вызов пайплайна разметки субтитров и пересборки игры
    subprocess.run(["python", str(ROOT / "tools/audio_pipeline/revoice_act6_alexey.py")], check=True)

if __name__ == "__main__":
    main()
