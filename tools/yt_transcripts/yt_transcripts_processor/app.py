"""Скрипт для извлечения субтитров с YouTube-канала и их литературной обработки с помощью LLM (OpenAI).

Оптимизирован для русскоязычных каналов с лором Warhammer 40,000.
"""

import argparse
import os
import re
import sys
import http.cookiejar
import time
from typing import List, Optional, Tuple

from dotenv import load_dotenv
from openai import OpenAI
import requests
import scrapetube
from tqdm import tqdm
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)

from channel_scraper import get_channel_videos_and_name

# Загрузка переменных окружения из .env файла
load_dotenv()

# Системный промпт для редактора Warhammer 40,000
SYSTEM_PROMPT = (
    "Ты профессиональный редактор и знаток лора Warhammer 40,000. "
    "Твоя задача: взять сырой транскрипт с YouTube, расставить знаки препинания, "
    "разбить текст на логические абзацы и исправить ошибки распознавания речи, "
    "особенно в терминах Вархаммера (например, Адептус Механикус, Примархи, Империум, "
    "Экклезиархия и т.д.). Не меняй сам сюжет и стиль автора, только сделай текст "
    "читабельным и грамотным."
)


def sanitize_filename(name: str, max_length: int = 120) -> str:
    """Очищает строку от запрещенных для файловых систем символов.

    Args:
        name: Исходная строка (название видео или канала).
        max_length: Максимальная длина имени файла.

    Returns:
        Безопасное имя файла.
    """
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        cleaned = "untitled"
    return cleaned[:max_length]


def split_text_into_chunks(text: str, max_words_per_chunk: int = 3500) -> List[str]:
    """Разбивает длинный текст на логические части по количеству слов.

    Args:
        text: Исходный длинный текст транскрипта.
        max_words_per_chunk: Максимальное количество слов в одном чанке.

    Returns:
        Список частей текста.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    for i in range(0, len(words), max_words_per_chunk):
        chunk_words = words[i : i + max_words_per_chunk]
        chunks.append(" ".join(chunk_words))
    return chunks


def get_youtube_transcript_client(use_cookies: bool = False) -> YouTubeTranscriptApi:
    """Создает клиент YouTubeTranscriptApi (при use_cookies=True использует cookies.txt)."""
    if use_cookies:
        cookie_path = "cookies.txt"
        if not os.path.exists(cookie_path) and os.path.exists("www.youtube.com_cookies.txt"):
            cookie_path = "www.youtube.com_cookies.txt"

        if os.path.exists(cookie_path):
            try:
                jar = http.cookiejar.MozillaCookieJar(cookie_path)
                jar.load(ignore_discard=True, ignore_expires=True)
                session = requests.Session()
                session.cookies = jar
                return YouTubeTranscriptApi(http_client=session)
            except Exception:
                pass

    return YouTubeTranscriptApi()


def fetch_raw_transcript(
    video_id: str,
    api_client: Optional[YouTubeTranscriptApi] = None,
    preferred_languages: tuple = ("ru", "en"),
) -> Tuple[Optional[str], Optional[str]]:
    """Скачивает субтитры для видео на доступном языке и объединяет их в сплошной текст.

    Сначала ищет приоритетные языки ('ru', 'en'), а при их отсутствии — берет
    любые существующие (включая автосгенерированные).

    Args:
        video_id: ID видео на YouTube.
        api_client: Инстанс YouTubeTranscriptApi.
        preferred_languages: Приоритетный список кодов языков субтитров.

    Returns:
        Кортеж (сплошной текст, код языка) или (None, None).
    """
    if api_client is None:
        api_client = get_youtube_transcript_client()

    for attempt in range(1, 5):
        try:
            # Для версии youtube_transcript_api 1.x
            if hasattr(api_client, "list"):
                transcript_list = api_client.list(video_id)
                target_transcript = None

                # 1. Ищем по приоритетным языкам
                for lang in preferred_languages:
                    try:
                        target_transcript = transcript_list.find_transcript([lang])
                        if target_transcript:
                            break
                    except Exception:
                        pass

                # 2. Если не нашлось приоритетных, берем первый попавшийся транскрипт
                if not target_transcript:
                    try:
                        for t in transcript_list:
                            target_transcript = t
                            break
                    except Exception:
                        pass

                if target_transcript:
                    fetched = target_transcript.fetch()
                    full_text = " ".join(item.text.replace("\n", " ").strip() for item in fetched if item.text)
                    return full_text.strip(), target_transcript.language_code

            # Fallback на get_transcript
            elif hasattr(api_client, "get_transcript"):
                for lang in preferred_languages:
                    try:
                        tl = api_client.get_transcript(video_id, languages=[lang])
                        full_text = " ".join(item.get("text", "").replace("\n", " ").strip() for item in tl if item.get("text"))
                        return full_text.strip(), lang
                    except Exception:
                        pass

            return None, None
        except (NoTranscriptFound, TranscriptsDisabled):
            return None, None
        except Exception as exc:
            exc_str = str(exc)
            if "RequestBlocked" in type(exc).__name__ or "blocking requests" in exc_str:
                if attempt < 4:
                    wait_sec = 30 + (attempt - 1) * 15
                    tqdm.write(f"[PAUSE] YouTube ограничил частоту запросов. Ожидание {wait_sec} сек перед повтором (попытка {attempt}/3)...")
                    time.sleep(wait_sec)
                    continue
            tqdm.write(f"[WARN] Субтитры недоступны для видео {video_id}: {type(exc).__name__}")
            return None, None

    return None, None


def process_text_chunk_with_llm(
    client: OpenAI, chunk: str, model: str = "gpt-4o-mini"
) -> str:
    """Отправляет один чанк текста в OpenAI API для литературной обработки.

    Args:
        client: Инициализированный клиент OpenAI.
        chunk: Фрагмент транскрипта.
        model: Название модели.

    Returns:
        Отредактированный текст.
    """
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Отредактируй следующий фрагмент транскрипта:\n\n{chunk}",
            },
        ],
    )
    return response.choices[0].message.content.strip()


def process_full_transcript(
    client: OpenAI, raw_text: str, model: str = "gpt-4o-mini"
) -> str:
    """Разбивает транскрипт на чанки при необходимости, обрабатывает через LLM и склеивает.

    Args:
        client: Инициализированный клиент OpenAI.
        raw_text: Полный сырой текст видео.
        model: Название модели LLM.

    Returns:
        Итоговый отредактированный текст со всеми абзацами.
    """
    chunks = split_text_into_chunks(raw_text, max_words_per_chunk=3500)
    processed_parts = []

    for idx, chunk in enumerate(chunks, start=1):
        if len(chunks) > 1:
            tqdm.write(f"  └─ Обработка части {idx}/{len(chunks)} через LLM...")
        edited_chunk = process_text_chunk_with_llm(client, chunk, model=model)
        processed_parts.append(edited_chunk)

    return "\n\n".join(processed_parts)


def parse_and_process_channel(
    channel_identifier: str,
    output_dir: str = "output",
    model: str = "gpt-4o-mini",
    max_videos: Optional[int] = None,
    skip_llm: bool = False,
    delay: float = 12.0,
    use_cookies: bool = False,
) -> None:
    """Выполняет полный пайплайн сбора, расшифровки и LLM-обработки для канала.

    Args:
        channel_identifier: URL канала (или @handle/channel_id).
        output_dir: Базовая директория для сохранения результатов.
        model: Модель OpenAI.
        max_videos: Ограничение количества видео для обработки (None — все).
        skip_llm: Если True, сохраняет сырые транскрипты без обращения к OpenAI API.
        delay: Пауза в секундах между обработкой видео для предотвращения блокировок YouTube.
        use_cookies: Использовать ли cookies.txt при наличии.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    openai_client = None

    if skip_llm:
        print("[INFO] Режим без LLM: сырые русские субтитры будут сохранены напрямую в файлы.")
    elif not api_key or api_key == "your_openai_api_key_here":
        print(
            "[WARN] OPENAI_API_KEY не обнаружен или содержит заглушку.\n"
            "Переключаюсь в режим сохранения сырых субтитров (без редактирования через LLM).\n"
            "Чтобы включить редактирование LLM, задайте OPENAI_API_KEY в файле .env."
        )
        skip_llm = True
    else:
        openai_client = OpenAI(
            api_key=api_key,
            base_url=os.getenv("OPENAI_BASE_URL") or None,
        )

    print(f"\n[1/4] Поиск видео для канала: {channel_identifier}")

    # 1. Сначала пробуем прямой надежный парсер (поддерживает русские хэндлы)
    channel_name = None
    all_videos = []
    try:
        channel_name, all_videos = get_channel_videos_and_name(channel_identifier)
        if max_videos:
            all_videos = all_videos[:max_videos]
    except Exception as exc:
        tqdm.write(f"[DEBUG] Прямой сбор страницы канала вернул: {exc}")

    # 2. Если прямой парсер не вернул видео, fallback на scrapetube
    if not all_videos:
        scrapetube_kwargs = {}
        if "youtube.com" in channel_identifier or "youtu.be" in channel_identifier:
            scrapetube_kwargs["channel_url"] = channel_identifier
        elif channel_identifier.startswith("UC"):
            scrapetube_kwargs["channel_id"] = channel_identifier
        elif channel_identifier.startswith("@"):
            scrapetube_kwargs["channel_url"] = f"https://www.youtube.com/{channel_identifier}"
        else:
            scrapetube_kwargs["channel_url"] = f"https://www.youtube.com/@{channel_identifier}"

        try:
            videos_generator = scrapetube.get_channel(**scrapetube_kwargs)
            for v in videos_generator:
                vid = v.get("videoId")
                t_runs = v.get("title", {}).get("runs", [])
                t_text = t_runs[0].get("text", "") if t_runs else f"video_{vid}"
                all_videos.append({"videoId": vid, "title": t_text})
                if max_videos and len(all_videos) >= max_videos:
                    break
        except Exception as exc:
            print(f"ОШИБКА scrapetube при получении списка видео: {exc}")

    if not all_videos:
        print("Видео на канале не найдены либо неверно указан URL/ID канала.")
        return

    if not channel_name or channel_name == "youtube_channel":
        cleaned_id = channel_identifier.rstrip("/").split("/")[-1].replace("@", "")
        channel_name = cleaned_id or "channel_transcripts"

    safe_channel_folder = sanitize_filename(channel_name)
    target_folder = os.path.join(output_dir, safe_channel_folder)
    os.makedirs(target_folder, exist_ok=True)

    print(f"[2/4] Найдено видео: {len(all_videos)}")
    print(f"[3/4] Папка сохранения: {target_folder}")
    print(f"[4/4] Старт обработки видео через прогресс-бар...\n")

    successful_count = 0
    skipped_count = 0

    with tqdm(all_videos, desc="Обработка видео", unit="видео") as pbar:
        for video in pbar:
            video_id = video.get("videoId")
            title_text = ""
            raw_title = video.get("title")
            if isinstance(raw_title, str) and raw_title:
                title_text = raw_title
            elif isinstance(raw_title, dict):
                runs = raw_title.get("runs", [])
                if runs:
                    title_text = runs[0].get("text", "")
            title_text = title_text or f"video_{video_id}"
            safe_title = sanitize_filename(title_text)
            file_name = f"{safe_title}_{video_id}.txt"
            output_file_path = os.path.join(target_folder, file_name)

            # Пропуск, если файл уже обработан ранее
            if os.path.exists(output_file_path):
                pbar.set_postfix_str(f"Пропуск (существует): {video_id}")
                continue

            pbar.set_postfix_str(f"Субтитры: {video_id}")
            api_client = get_youtube_transcript_client(use_cookies=use_cookies)
            raw_text, lang_code = fetch_raw_transcript(
                video_id,
                api_client=api_client,
                preferred_languages=("ru", "en"),
            )

            if not raw_text:
                tqdm.write(f"[WARN] Субтитры не найдены ни на одном языке для: '{title_text}' (ID: {video_id})")
                skipped_count += 1
                continue

            try:
                if not skip_llm and openai_client:
                    pbar.set_postfix_str(f"LLM: {video_id}")
                    final_text = process_full_transcript(
                        client=openai_client, raw_text=raw_text, model=model
                    )
                else:
                    final_text = raw_text

                # Сохранение готового файла
                with open(output_file_path, "w", encoding="utf-8") as f:
                    f.write(f"Название: {title_text}\n")
                    f.write(f"URL: https://www.youtube.com/watch?v={video_id}\n")
                    f.write(f"Язык субтитров: {lang_code}\n")
                    f.write("=" * 60 + "\n\n")
                    f.write(final_text)

                successful_count += 1
                tqdm.write(f"[OK] Сохранено ({lang_code}): {file_name}")
            except Exception as err:
                tqdm.write(f"[ERROR] Ошибка обработки для видео {video_id} ('{title_text}'): {err}")
                skipped_count += 1

            # Пауза между запросами к YouTube для предотвращения банов
            if delay > 0:
                time.sleep(delay)

    print("\n" + "=" * 60)
    print("ИТОГИ ОБРАБОТКИ:")
    print(f"• Успешно обработано и сохранено: {successful_count}")
    print(f"• Пропущено (нет субтитров / ошибки): {skipped_count}")
    print(f"• Папка с материалами: {os.path.abspath(target_folder)}")
    print("=" * 60)


def main():
    """Точка входа для CLI аргументов."""
    parser = argparse.ArgumentParser(
        description="Парсер транскриптов YouTube-каналов с литературной обработкой LLM (Warhammer 40k lore)."
    )
    parser.add_argument(
        "--channel",
        "-c",
        type=str,
        default="https://www.youtube.com/@Voices_of_Imperium",
        help="URL, ID или @handle YouTube-канала (например: https://www.youtube.com/@Voices_of_Imperium)",
    )
    parser.add_argument(
        "--model",
        "-m",
        type=str,
        default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        help="Модель OpenAI (по умолчанию: gpt-4o-mini)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="transcripts_output",
        help="Папка для сохранения транскриптов (по умолчанию: transcripts_output)",
    )
    parser.add_argument(
        "--max-videos",
        type=int,
        default=None,
        help="Максимальное количество видео для обработки (опционально, для тестов)",
    )
    parser.add_argument(
        "--skip-llm",
        action="store_true",
        help="Сохранять сырые субтитры без вызова LLM API",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=10.0,
        help="Пауза в секундах между обработкой видео (по умолчанию: 10.0)",
    )
    parser.add_argument(
        "--use-cookies",
        action="store_true",
        help="Использовать cookies.txt для запросов",
    )

    args = parser.parse_args()

    parse_and_process_channel(
        channel_identifier=args.channel,
        output_dir=args.output,
        model=args.model,
        max_videos=args.max_videos,
        skip_llm=args.skip_llm,
        delay=args.delay,
        use_cookies=args.use_cookies,
    )


if __name__ == "__main__":
    main()
