import os
import sys

# Add directory to sys.path to import generate_voiceover
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
from generate_voiceover import generate_voiceover

patches = [
    {
        "id": "patch_act_3_timemachine",
        "act": "04_act_3",
        "description": "Акт 3: Удаление спойлера машины времени + Палач Старого Стека",
        "text": "Апофеоз менеджмента случился, когда Координатору Скоростной Статики Нику Егорову не хватало пары часов до ачивки за скорость. Палач Старого Стека Максим Мамусин спросил: «Меньше 2.5 получается?»."
    },
    {
        "id": "patch_act_4_christian",
        "act": "05_act_4",
        "description": "Акт 4: Хранитель Чистой Ветки Кристиан",
        "text": "А Хранитель Чистой Ветки Кристиан посмотрел на этот апокалипсис и невозмутимо уронил в консоль: «oops»."
    },
    {
        "id": "patch_act_5_royalark",
        "act": "06_act_5",
        "description": "Акт 5: Палач Старого Стека Максим Мамусин (Royal Ark)",
        "text": "Они обрушили на стальные переборки шквал тяжёлых торпед правок. Палач Старого Стека Максим Мамусин смотрел на трещащие переборки в этом отсеке и передавал в рубку: «Бля, там какое-то мясо щас происходит»."
    },
    {
        "id": "patch_act_5_gamegears",
        "act": "06_act_5",
        "description": "Акт 5: Палач Старого Стека Максим Мамусин (GameGears)",
        "text": "А когда Клиентархи из GameGears прислали депешу: «Из вами сделанных плейблов визуал брать не стоит :)», Палач Старого Стека Максим Мамусин перевёл щиты в боевой режим одним священным словом: «Заебись»."
    },
    {
        "id": "patch_act_6_tribunal",
        "act": "07_act_6",
        "description": "Акт 6: Хранитель Чистой Ветки Кристиан (Трибунал)",
        "text": "И сегодня на эшафот поднимаются Магистр Циклической Несовместимости Кирилл Берёзкин и Хранитель Чистой Ветки Кристиан."
    }
]

out_dir = r"H:\PLBX\CyberBullingConcept\media\audio\voiceover_v13\patches"
os.makedirs(out_dir, exist_ok=True)

print(f"=== Запуск генерации {len(patches)} аудио-патчей через ElevenLabs ===")
for p in patches:
    file_path = os.path.join(out_dir, f"{p['id']}.mp3")
    print(f"\n[+] {p['description']}")
    print(f"    Текст: {p['text']}")
    generate_voiceover(p["text"], output_path=file_path)

print("\n=== Все патчи успешно сгенерированы! ===")
