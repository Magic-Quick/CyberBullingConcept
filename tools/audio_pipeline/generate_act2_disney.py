# -*- coding: utf-8 -*-
import os
import sys
import requests

DEFAULT_VOICE_ID = "GquPFn9xormgmHaJ2KdN"  # Geremy
DEFAULT_MODEL_ID = "eleven_multilingual_v2"

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

def generate_voiceover(text, voice_id=DEFAULT_VOICE_ID, model_id=DEFAULT_MODEL_ID, output_path="scratch/act2_disney_part.mp3"):
    api_key = get_api_key()
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found.")
        sys.exit(1)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    print(f"Generating Disney voiceover (Voice: {voice_id}, Model: {model_id})...")
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(res.content)
        print(f"SUCCESS: Saved {output_path} ({len(res.content)} bytes)")
        return output_path
    else:
        print(f"API ERROR ({res.status_code}): {res.text}")
        sys.exit(1)

DISNEY_TEXT = """От такого давления к середине недели закоротило даже наш бортовой бот-счётчик утреннего дайджеста.
В среду, когда сдача упала в ноль, бот преисполнился экзистенциального тлена: «как вчера, так и сегодня».
А в четверг у кремниевой железяки окончательно сорвало крышу, и он выкатил сводку: тысяча семьсот восемьдесят три сданных плейбла.
Тысяча семьсот восемьдесят три, блядь. Мы за ночь в горячечном бреду запечатали три соседние галактики, а пацаны в Слаке даже не заметили.

И посреди этого хаоса Преподобный Толкователь Воли Клиентархов Егор Ткачёв внёс рацпредложение:
«Может нам нужен статус “долгий ящик” для таких плейблов?)».
И Верховный Надзиратель Горин на полном серьёзе ответил:
«Надо обсудить нужен ли отдельный статус, у нас он один такой этот плеебл. Который и не отменяют и не продолжают».

Командованию не нужно ничего открывать. Потому что этот «Долгий Ящик» на нашем корабле давно замурован в герметичный саркофаг.
В катакомбном склепе, вмурованная в переборку между отсеками «В разработке» и «Архив», слабо гудит стазис-колба. Главная зловещая реликвия Ковчега — мумифицированный таск Disney в сетке Mintegral.

По регламенту капсула плейбла живёт ровно семь дней. Но этот таск заперт в вечном стазисе уже сто двадцать девять суток при просрочке в сто тридцать два дня. Сто двадцать девять дней экипаж боится открывать створки саркофага Mintegral, чтобы оттуда не пахнуло протухшим ТЗ.
В зеленоватой жиже покачивается полуистлевшее существо Дома Мыши: в почерневших белых перчатках и с облезлыми круглыми ушами. Оно тихо скребётся когтями изнутри о толстый кварц и раз в сутки сквозь шипение хрипит обрывок лицензионного соглашения.
Оно не может умереть — карточку в Notion никто не закрыл. И не может считаться живым — правок нет четыре месяца. Сто двадцать девять дней анабиоза ради незакрытой ячейки в базе. Бюрократия Ковчега не знает пощады."""

if __name__ == "__main__":
    generate_voiceover(DISNEY_TEXT)
