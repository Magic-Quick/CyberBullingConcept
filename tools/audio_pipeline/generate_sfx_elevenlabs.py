#!/usr/bin/env python3
"""
Скрипт генерации звуковых эффектов через ElevenLabs Sound Effects API (v1/sound-generation).
Категории:
1. Странные и жуткие монстры Хаоса (Chaos Monsters)
2. Кайфующая толпа на концерте (Ожидание vs Момент накала/дропа)
"""

import os
import sys
import json
import argparse
import requests
from pathlib import Path

# Пресеты звуковых эффектов
SFX_PRESETS = {
    # ------------------ 1. МОНСТРЫ ХАОСА (СТРАННЫЕ И ЖУТКИЕ) ------------------
    "chaos_monster_warp_screech": {
        "category": "chaos_monsters",
        "title": "Варп-визг биомеханической твари",
        "description": "Пронзительный потусторонний визг с органическим щёлканьем жвал и аналоговым скрежетом искажённого эфира",
        "prompt": "Eerie high-pitched biomechanical warp screech, strange discordant alien resonance, wet clicking mandibles, unsettling analogue distortion, terrifying void monster",
        "duration": 4.5,
        "prompt_influence": 0.4
    },
    "chaos_monster_visceral_gut_growl": {
        "category": "chaos_monsters",
        "title": "Утробный гул и шевеление плоти",
        "description": "Низкий суб-басовый демонический рык из трюма, пульсация мутирующей биомассы и влажный треск",
        "prompt": "Deep guttural demonic beast growl, sub-bass subterranean rumble, wet mutated flesh squelching, heavy ominous breathing in empty steel corridor",
        "duration": 5.0,
        "prompt_influence": 0.45
    },
    "chaos_monster_hive_whispers": {
        "category": "chaos_monsters",
        "title": "Шёпот Роя и перестук лап",
        "description": "Множественный зловещий полифонический шёпот, шелест сотен хитиновых лапок по холодному железу крейсера",
        "prompt": "Creepy swarm of eldritch whispering voices, thousands of skittering chitin legs on cold metal floor, eerie chaotic murmurs, dark horror sound design",
        "duration": 6.0,
        "prompt_influence": 0.5
    },
    "chaos_monster_mutant_breathing": {
        "category": "chaos_monsters",
        "title": "Мутант в стазис-капсуле",
        "description": "Тяжёлое захлёбывающееся дыхание сквозь пробитый пневмоклапан и бульканье токсичной слизи",
        "prompt": "Disturbing heavy wet breathing of trapped mutant in damaged stasis pod, bubbling toxic slime, mechanical ventilator hiss, claustrophobic dread",
        "duration": 4.0,
        "prompt_influence": 0.4
    },

    # ------------------ 2. ТОЛПА: ОЖИДАНИЕ АРТИСТА ------------------
    "crowd_anticipation_stadium_murmur": {
        "category": "concert_crowd",
        "title": "Толпа перед выходом артиста (Гул и нетерпение)",
        "description": "Многотысячный гул стадиона в темноте перед выходом артиста, единичные крики, свист, электризующее ожидание",
        "prompt": "Massive indoor arena concert crowd buzzing with anticipation in darkness, excited murmur, occasional screams and whistles, intense pre-show tension, wide acoustic reverb",
        "duration": 6.5,
        "prompt_influence": 0.4
    },
    "crowd_anticipation_chant_building": {
        "category": "concert_crowd",
        "title": "Толпа: Скандирование и призыв артиста",
        "description": "Ритмичный топот, аплодисменты и нарастающее скандирование толпы, зовущей артиста на сцену",
        "prompt": "Huge hyped concert crowd stomping feet and clapping rhythmically, unison chanting and whistling, building momentum before artist steps on stage",
        "duration": 5.5,
        "prompt_influence": 0.45
    },

    # ------------------ 3. ТОЛПА: МОМЕНТ НАКАЛА И ДРОПА В ТРЕКЕ ------------------
    "crowd_climax_explosive_roar": {
        "category": "concert_crowd",
        "title": "Момент накала: Взрывной экстаз толпы на дропе",
        "description": "Оглушительный взрыв радости и крика всего стадиона при ударе главного басового дропа, всеобщий кайф и рёв",
        "prompt": "Explosive ecstatic roar from massive festival stadium crowd, thunderous cheers and screaming in pure hype as the heavy bass drops, overwhelming energy and euphoria",
        "duration": 6.0,
        "prompt_influence": 0.5
    },
    "crowd_climax_singalong_hype": {
        "category": "concert_crowd",
        "title": "Кульминация: Тысячный хор и безумный восторг",
        "description": "Стадионная толпа поёт в унисон на пике трека, неистовые овации, ревущие трибуны, адреналиновый пик",
        "prompt": "Huge concert crowd roaring and singing along passionately at peak climax of rap rock anthem, wild screaming, whistles, vibrating bass in packed arena, goosebumps atmosphere",
        "duration": 7.0,
        "prompt_influence": 0.45
    }
}

def resolve_api_key(explicit_key=None):
    if explicit_key and len(explicit_key.strip()) > 20:
        return explicit_key.strip()

    env_key = os.getenv("ELEVENLABS_API_KEY")
    if env_key and len(env_key.strip()) > 20:
        return env_key.strip()

    key_paths = [
        Path(r"F:\AI\elevenlabs-api-key.txt"),
        Path(r"F:\AI\00_CORE\SECRETS\elevenlabs-api-key.txt"),
        Path(r"F:\AI\Claude\projects\H--PLBX-aliens-b1-c13-Repo-aliens-b1-c13\secrets\elevenlabs-api-key.txt")
    ]
    for p in key_paths:
        if p.exists():
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.startswith("ELEVENLABS_API_KEY="):
                        k = line.split("=", 1)[1].strip()
                        if len(k) > 20:
                            return k
    return None

def generate_sound_effect(api_key, text, duration=5.0, prompt_influence=0.4, output_path=None, proxies=None):
    url = "https://api.elevenlabs.io/v1/sound-generation"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "duration_seconds": duration,
        "prompt_influence": prompt_influence
    }

    response = requests.post(url, headers=headers, json=payload, proxies=proxies, timeout=60)
    if response.status_code == 200:
        if output_path:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)
        return response.content
    else:
        raise RuntimeError(f"ElevenLabs API Error {response.status_code}: {response.text}")

def main():
    parser = argparse.ArgumentParser(description="ElevenLabs SFX Generator")
    parser.add_argument("--key", type=str, help="ElevenLabs API Key (опционально)")
    parser.add_argument("--preset", type=str, help="Имя конкретного пресета (или all для всех)", default="all")
    parser.add_argument("--category", type=str, choices=["chaos_monsters", "concert_crowd", "all"], default="all")
    parser.add_argument("--out-dir", type=str, default=r"media\audio\sfx")
    parser.add_argument("--list", action="store_true", help="Показать список всех пресетов и выйти")
    args = parser.parse_args()

    if args.list:
        print("\n=== ДОСТУПНЫЕ ПРЕСЕТЫ ЗВУКОВЫХ ЭФФЕКТОВ ===")
        for key, p in SFX_PRESETS.items():
            print(f"- [{p['category']}] {key}: {p['title']}")
            print(f"  Промпт: \"{p['prompt']}\" (Длина: {p['duration']}с)")
        return

    api_key = resolve_api_key(args.key)
    if not api_key:
        print("[-] ОШИБКА: Ключ ELEVENLABS_API_KEY не найден.")
        print("    Передайте ключ через --key 'sk_...' или запишите в F:\\AI\\elevenlabs-api-key.txt")
        sys.exit(1)

    # Настройка прокси (локальный v2rayN если доступен)
    proxies = None
    try:
        t = requests.get("http://127.0.0.1:10808", timeout=0.5)
        proxies = {"http": "http://127.0.0.1:10808", "https": "http://127.0.0.1:10808"}
    except Exception:
        pass

    out_root = Path(args.out_dir)
    generated = []

    for name, item in SFX_PRESETS.items():
        if args.category != "all" and item["category"] != args.category:
            continue
        if args.preset != "all" and args.preset != name:
            continue

        target_folder = out_root / item["category"]
        target_file = target_folder / f"{name}.mp3"
        print(f"\n[+] Генерация SFX: {item['title']}...")
        print(f"    Файл: {target_file}")
        print(f"    Промпт: \"{item['prompt']}\" ({item['duration']}s)")

        try:
            content = generate_sound_effect(
                api_key=api_key,
                text=item["prompt"],
                duration=item["duration"],
                prompt_influence=item["prompt_influence"],
                output_path=target_file,
                proxies=proxies
            )
            print(f"    [OK] Успешно сохранён ({len(content)} байт)")
            generated.append((name, item, target_file, len(content)))
        except Exception as e:
            print(f"    [-] Ошибка: {e}")

    print(f"\nИтого сгенерировано: {len(generated)} / {len(SFX_PRESETS)}")

if __name__ == "__main__":
    main()
