import argparse
import os
import sys
import requests

DEFAULT_VOICE_ID = "GquPFn9xormgmHaJ2KdN"  # Geremy — русский, мужской, московский акцент, серьёзный, средних лет
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

def generate_voiceover(text, voice_id=DEFAULT_VOICE_ID, model_id=DEFAULT_MODEL_ID, output_path="voiceover.mp3", stability=0.5, similarity=0.75):
    api_key = get_api_key()
    if not api_key:
        print("Ошибка: Ключ ELEVENLABS_API_KEY не найден.")
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
            "stability": stability,
            "similarity_boost": similarity,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    print(f"Генерация озвучки (Voice: {voice_id}, Model: {model_id})...")
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code == 200:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(res.content)
        print(f"Аудиофайл успешно сохранён: {output_path} ({len(res.content)} байт)")
        return output_path
    else:
        print(f"Ошибка API ({res.status_code}): {res.text}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ElevenLabs Voice Generator")
    parser.add_argument("--text", type=str, help="Текст для озвучки")
    parser.add_argument("--voice-id", type=str, default=DEFAULT_VOICE_ID, help="Voice ID")
    parser.add_argument("--model-id", type=str, default=DEFAULT_MODEL_ID, help="Model ID")
    parser.add_argument("--output", type=str, default="assets/test_voiceover_geremy.mp3", help="Путь для сохранения MP3")
    args = parser.parse_args()

    phrase = args.text or """Скриптор Даниал Искаков в первый же день словил экзистенциальную панику:
«не над плееблом за 8сп работаю а над 3А проектом где любая деталь может привести к падению акций на пару миллиардов».
Архи-Настоятель Ворон благословил его в чате: «как по минному полю».
Тридцать секунд мобильного клика мы собираем с таким трепетом, будто тащим ядерную боеголовку через горящий трюм."""

    generate_voiceover(phrase, voice_id=args.voice_id, model_id=args.model_id, output_path=args.output)
