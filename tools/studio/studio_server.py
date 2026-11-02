#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
studio_server.py
Сервер для Co-Writer Studio на порту 8765:
- Раздает статические файлы (co_writer_studio.html и др.) из brain-директории
- Предоставляет REST API для 1-клик генерации вариантов через Google Gemini (Multi-Key Pool)
- Предоставляет API для автоматического сохранения трека на диск в AI_LORD_RAP_TRACK.md
"""

import os
import sys
import json
import time
import re
import urllib.request
import urllib.error
import subprocess
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from datetime import datetime

# UTF-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8765
BRAIN_DIR = Path(r"C:\Users\Shestirukiy\.gemini\antigravity\brain\f24e039e-a0ec-45a6-8c0c-b676c028245c")
PROJECT_DIR = Path(r"H:\PLBX\CyberBullingConcept")
GEMINI_DIR = Path(r"F:\AI\gemini-integration")

# Подключаем клиент Gemini API
sys.path.insert(0, str(GEMINI_DIR))
try:
    from gemini_api_client import load_config, get_active_keys, call_gemini_api
    API_AVAILABLE = True
except Exception as e:
    print(f"[!] Ошибка импорта gemini_api_client: {e}")
    API_AVAILABLE = False


def call_gemini_with_fallback(prompt: str):
    """Вызов Gemini с авто-ротацией ключей и каскадом моделей"""
    if not API_AVAILABLE:
        return False, "Модуль gemini_api_client недоступен"

    config = load_config()
    if not config:
        return False, "Не найден api_keys.json"

    keys = get_active_keys(config)
    if not keys:
        return False, "Нет активных ключей API в api_keys.json"

    models_cascade = config.get("models_cascade", ["gemini-3.5-flash-lite", "gemini-3.5-flash"])

    last_error = ""
    for model in models_cascade:
        for k_info in keys:
            name = k_info.get("name", "Account")
            api_key = k_info.get("key", "").strip()
            try:
                t0 = time.time()
                res = call_gemini_api(api_key, model, prompt)
                dt = round(time.time() - t0, 2)
                candidates = res.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        print(f"[+] [Gemini API] Модель {model} ({name}) ответила за {dt}с")
                        return True, text
            except Exception as e:
                err_msg = str(e)
                last_error = f"{name} on {model}: {err_msg}"
                print(f"[!] Ошибка вызова Gemini ({model}, {name}): {err_msg[:120]}")
                continue

    return False, f"Все ключи и модели исчерпали лимит: {last_error}"


def get_latest_voices_of_production():
    """
    Автоматически находит самый актуальный файл хроники VOICES_OF_PRODUCTION_V*.md:
    1. Ищет все файлы по маске VOICES_OF_PRODUCTION_V*.md в директории проекта.
    2. Извлекает числовой номер версии V<N> (например, V13, V14 и т.д.).
    3. Сортирует по максимальному номеру версии и дате изменения.
    4. Если версионных файлов нет — откатывается на базовый VOICES_OF_PRODUCTION.md.
    Возвращает (path, content, filename).
    """
    v_files = list((PROJECT_DIR / "docs" / "golden").glob("VOICES_OF_PRODUCTION_V*.md")) + list(PROJECT_DIR.glob("VOICES_OF_PRODUCTION_V*.md"))
    target = None
    if v_files:
        def extract_ver(p):
            m = re.search(r"VOICES_OF_PRODUCTION_V(\d+)", p.name, re.IGNORECASE)
            return int(m.group(1)) if m else 0
        v_files.sort(key=lambda p: (extract_ver(p), p.stat().st_mtime), reverse=True)
        target = v_files[0]
    else:
        fallback = PROJECT_DIR / "docs" / "golden" / "VOICES_OF_PRODUCTION_GOLDEN.md"
        if not fallback.exists():
            fallback = PROJECT_DIR / "VOICES_OF_PRODUCTION.md"
        if fallback.exists():
            target = fallback

    if target and target.exists():
        try:
            content = target.read_text(encoding="utf-8")
            return target, content, target.name
        except Exception as e:
            print(f"[!] Ошибка чтения файла хроники {target}: {e}")

    return None, "", "VOICES_OF_PRODUCTION (не найден)"


def get_effective_track_text(track_context_from_ui: str) -> str:
    """Возвращает актуальный текст трека: из запроса браузера или с диска"""
    if track_context_from_ui and len(track_context_from_ui.strip()) > 100:
        return track_context_from_ui.strip()
    track_candidates = [
        PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.md",
        PROJECT_DIR / "AI_LORD_RAP_TRACK.md"
    ]
    for track_file in track_candidates:
        if track_file.exists():
            try:
                return track_file.read_text(encoding="utf-8").strip()
            except Exception:
                pass
    txt_candidates = [
        PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.txt",
        PROJECT_DIR / "AI_LORD_RAP_TRACK.txt"
    ]
    for txt_file in txt_candidates:
        if txt_file.exists():
            try:
                return txt_file.read_text(encoding="utf-8").strip()
            except Exception:
                pass
    return ""


def ensure_bridge_server():
    """Проверяет запущен ли bridge_server.py (порт 48123), при необходимости запускает в фоне"""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open("http://127.0.0.1:48123/status", timeout=1.0) as resp:
            return True
    except Exception:
        pass

    print("[*] Сервер-мост 48123 не запущен. Автоматический запуск bridge_server.py...")
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    try:
        bridge_script = GEMINI_DIR / "bridge_server.py"
        subprocess.Popen([sys.executable, str(bridge_script)], creationflags=flags)
        for _ in range(12):
            time.sleep(0.5)
            try:
                with opener.open("http://127.0.0.1:48123/status", timeout=1.0) as resp:
                    print("[+] Сервер-мост 48123 успешно поднят!")
                    return True
            except Exception:
                pass
    except Exception as e:
        print(f"[!] Ошибка запуска bridge_server: {e}")
    return False


def is_browser_connected() -> bool:
    """Быстрая проверка подключения вкладки браузера к мосту 48123"""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open("http://127.0.0.1:48123/status", timeout=1.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return bool(data.get("browser_connected"))
    except Exception:
        return False


def ensure_gemini_browser_tab():
    """Проверяет подключена ли вкладка gemini.google.com, если нет — пробует открыть её в браузере"""
    if is_browser_connected():
        return True

    print("[*] Вкладка Gemini Pro не обнаружена. Попытка подключения (до 3 сек)...")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    # Ждём до 3 секунд на случай если вкладка уже загружается
    for _ in range(6):
        time.sleep(0.5)
        if is_browser_connected():
            print("[+] Браузерная вкладка Gemini Pro успешно подключена к мосту!")
            return True
    return False


def generate_via_gemini_pro_bridge(prompt: str, timeout: int = 40):
    """
    Автономный запуск задачи через полноценный браузерный Gemini Pro:
    1. Проверяет и поднимает bridge_server.py (48123).
    2. Проверяет подключение браузерной вкладки gemini.google.com.
    3. Если вкладка не подключена — мгновенно отдаёт управление прямому API (без задержек).
    4. Если подключена — передаёт задачу через gemini_context.md и ждёт PLAN.md.
    """
    if not ensure_bridge_server():
        return False, "Не удалось запустить bridge_server.py на порту 48123"

    if not is_browser_connected():
        return False, "Вкладка браузера Gemini Pro не подключена к мосту (переход на прямой API)"

    context_file = GEMINI_DIR / "gemini_context.md"
    plan_file = GEMINI_DIR / "PLAN.md"

    # Очищаем старый план
    if plan_file.exists():
        try:
            plan_file.unlink()
        except Exception:
            pass

    task_id = f"rap_{int(time.time() * 1000)}"
    context_file.write_text(prompt, encoding="utf-8")

    start_wait = time.time()
    deadline = start_wait + timeout
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    print(f"[*] [Gemini Pro Bridge] Задача {task_id} отправлена в браузер. Ожидание Gemini Pro (до {timeout}с)...")

    while time.time() < deadline:
        time.sleep(1.5)
        if plan_file.exists():
            try:
                mtime = plan_file.stat().st_mtime
                if mtime >= start_wait - 1.0:
                    text = plan_file.read_text(encoding="utf-8")
                    if text.strip():
                        print(f"[+] [Gemini Pro Bridge] Ответ получен за {round(time.time() - start_wait, 1)}с!")
                        return True, text
            except Exception:
                pass

        try:
            with opener.open("http://127.0.0.1:48123/status", timeout=1.0) as resp:
                st = json.loads(resp.read().decode("utf-8"))
                if st.get("last_processed_task_id") == task_id and plan_file.exists():
                    text = plan_file.read_text(encoding="utf-8")
                    return True, text
        except Exception:
            pass

    return False, f"Таймаут ожидания ответа от браузерного Gemini Pro ({timeout} сек)"



def parse_gemini_variants_json(raw_text: str):
    """Извлекает и парсит JSON с вариантами из ответа Gemini"""
    text = raw_text.strip()
    # Убираем markdown ```json ... ```
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            text = match.group(1).strip()

    try:
        data = json.loads(text)
        # Проверяем наличие ключей
        if "varA" in data and "varB" in data:
            return data
    except Exception as e:
        print(f"[!] Ошибка парсинга JSON: {e}\nТекст ответа:\n{text[:300]}")

    # Fallback попытка найти { ... }
    brace_match = re.search(r"(\{[\s\S]*\})", text)
    if brace_match:
        try:
            data = json.loads(brace_match.group(1))
            if "varA" in data:
                return data
        except Exception:
            pass

    return None


def get_clean_last_word(line: str) -> str:
    """Извлекает последнее слово строки, очищенное от пунктуации (тире, многоточий и т.д.)"""
    words = re.findall(r'[а-яА-ЯёЁa-zA-Z0-9]+', line)
    return words[-1].lower() if words else ""


def count_syllables(line: str) -> int:
    """Считает количество слогов по гласным буквам русского языка"""
    return len(re.findall(r'[аеёиоуыэюяАЕЁИОУЫЭЮЯ]', line))


# База частых рэп-окончаний и рифм для типичных слов трека
RHYME_HINTS = {
    "яиц": ["без границ", "на тридцать страниц", "пустых единиц", "сотни лиц", "падают ниц", "в сотни единиц", "пали ниц", "среди бледных лиц", "не зная границ"],
    "ниц": ["яиц", "без границ", "на тридцать страниц", "пустых единиц", "сотни лиц", "падают ниц"],
    "срам": ["вам", "нам", "там", "по швам", "счетам", "словам", "числам"],
    "вам": ["срам", "нам", "там", "по швам", "счетам", "словам", "числам"],
    "калек": ["человек", "навек", "век", "отсек"],
    "человек": ["калек", "навек", "век", "отсек"],
    "брак": ["контакт", "формат", "раскат", "набат", "тракт", "факт"],
    "контакт": ["брак", "факт", "тракт", "так", "формат"],
    "формат": ["трещат", "набат", "раскат", "примат", "затрат", "солдат"],
    "трещат": ["формат", "набат", "раскат", "примат", "затрат"],
    "терпит": ["завертит", "крутит", "мутит"],
    "завертит": ["терпит", "крутит", "мутит"],
    "отсеков": ["человеков", "треков", "чеков"],
    "человеков": ["отсеков", "треков", "чеков"],
    "нерва": ["консерву", "сперва", "стерва"],
    "консерву": ["нерва", "сперва", "стерва"],
    "манипулятор": ["плата", "вибратор", "транзистор", "аккумулятор"],
    "плата": ["манипулятор", "затрата", "расплата", "дата"],
    "гидравлику": ["механику", "панику", "органику"],
    "механику": ["гидравлику", "панику", "органику"],
    "сжаты": ["затраты", "зажаты", "сняты", "палаты"],
    "затраты": ["сжаты", "зажаты", "сняты", "палаты"],
    "продаж": ["папуас", "отказ", "заказ", "приказ", "каркас"],
    "папуас": ["продаж", "отказ", "заказ", "приказ", "каркас"],
    "оскал": ["скал", "накал", "провал", "аврал", "финал"],
    "скал": ["оскал", "накал", "провал", "аврал", "финал"],
    "клик": ["тупик", "крик", "сдвиг", "миг", "лик"],
    "тупик": ["клик", "крик", "сдвиг", "миг", "лик"],
    "пот": ["работ", "живот", "исход", "проход", "отсчёт", "вернёт", "народ"],
    "работ": ["пот", "живот", "исход", "проход", "отсчёт", "вернёт"],
    "структуры": ["халтура", "фигура", "купюра"],
    "халтура": ["структуры", "фигура", "купюра"],
    "одна": ["сполна", "до дна", "цена", "стена"],
    "сполна": ["одна", "до дна", "цена", "стена"],
    "прогресс": ["стресс", "процесс", "замес", "эксцесс", "развес"],
    "стресс": ["прогресс", "процесс", "замес", "эксцесс", "развес"],
    "шок": ["висок", "кусок", "бросок", "знаток", "паёк"],
    "висок": ["шок", "кусок", "бросок", "знаток", "паёк"],
    "зеро": ["в ведро", "добро", "ребро", "ядро"],
    "ведро": ["зеро", "добро", "ребро", "ядро"],
    "сдачей": ["задачей", "раздачей", "подачей"],
    "задачей": ["сдачей", "раздачей", "подачей"],
    "вернёт": ["пот", "работ", "исход", "отсчёт", "народ"],
    "накал": ["квартал", "оскал", "скал", "провал", "аврал"],
    "квартал": ["накал", "оскал", "скал", "провал", "аврал"],
    "гипноз": ["анабиоз", "психоз", "наркоз", "мороз", "угроз"],
    "анабиоз": ["гипноз", "психоз", "наркоз", "мороз", "угроз"],
    "рыдали": ["влупил", "сдавали", "ждали", "педали"],
    "влупил": ["демоблил", "забыл", "спалил", "залил"],
    "демоблил": ["влупил", "забыл", "спалил", "залил"],
    "рамки": ["рекламки", "ямки", "заставки"],
    "рекламки": ["рамки", "ямки", "заставки"],
    "свиток": ["пыток", "убыток", "попыток"],
    "пыток": ["свиток", "убыток", "попыток"],
    "дисней": ["новостей", "ночей", "костей", "гостей"],
    "новостей": ["дисней", "ночей", "костей", "гостей"],
    "отсек": ["человек", "навек", "век", "калек"],
    "спор": ["егор", "позор", "забор", "укор"],
    "гранолу": ["протоколом", "уколом", "расколом"],
    "протоколом": ["гранолу", "уколом", "расколом"],
    "клод": ["гребёт", "пот", "народ", "исход"],
    "гребёт": ["клод", "пот", "народ", "исход"],
    "ощупь": ["полощет", "мочит"],
    "полощет": ["ощупь", "мочит"],
    "смесь": ["спесь", "здесь", "честь"],
    "завис": ["релиз", "сюрприз", "скис", "карниз", "вниз", "компромисс", "сервис", "каприз"],
    "релиз": ["завис", "сюрприз", "скис", "карниз", "вниз", "компромисс", "сервис", "каприз"],
    "клод": ["код", "ход", "бот", "исход", "народ", "в пот", "в расход", "задрот", "в обход", "гребёт"],
    "код": ["в пот", "исход", "народ", "бот", "урод", "в расход", "гребёт", "взвод", "клод"],
    "павел": ["правил", "ставил", "направил", "оставил", "лукавил"],
    "правил": ["павел", "ставил", "направил", "оставил", "лукавил"],
    "баг": ["шаг", "мрак", "знак", "лаг", "брак", "флаг"]
}


def analyze_rhyme_and_meter(original_text: str, context_before: str, context_after: str, full_track_text: str, user_wish: str = "") -> dict:
    """
    Глубокий структурный и рифменный анализ фрагмента текста относительно строфы и трека:
    - Находит четверостишие в треке
    - Анализирует пожелание автора на предмет ключевого слова / рифменного якоря (Wish Override)
    - Определяет схему рифмовки (ABCB / AABB)
    - Выделяет точный рифменный якорь
    - Формирует умные, гибкие инструкции для Gemini без конфликтов
    """
    orig_lines = [l.strip() for l in original_text.strip().splitlines() if l.strip()]
    line_count = len(orig_lines)

    # 0. Интеллектуальный анализ пожелания автора
    wish_anchor_word = ""
    wish_rhyme_hints = []
    has_custom_wish_rhyme = False

    if user_wish:
        # А. Поиск цитат / выражений в кавычках ("..." или «...»)
        quoted = re.findall(r'["«]([^"»]+)["»]', user_wish)
        for q in quoted:
            last_w = get_clean_last_word(q)
            if last_w and len(last_w) >= 3:
                wish_anchor_word = last_w
                break

        # Б. Поиск паттернов 'со словом <слово>', 'рифма на <слово>', 'на слово <слово>'
        if not wish_anchor_word:
            m = re.search(r'(?:рифм[а-я]*\s+на|со\s+словом|на\s+слово)\s+["«]?([а-яёa-z0-9]+)["»]?', user_wish, re.IGNORECASE)
            if m:
                wish_anchor_word = m.group(1).lower()

        # В. Поиск целевого слова в конце пожелания
        if not wish_anchor_word:
            words = re.findall(r'[а-яёa-z0-9]+', user_wish.lower())
            if words and words[-1] in RHYME_HINTS:
                wish_anchor_word = words[-1]

        if wish_anchor_word:
            if wish_anchor_word in RHYME_HINTS:
                wish_rhyme_hints = RHYME_HINTS[wish_anchor_word]
            else:
                for k, v in RHYME_HINTS.items():
                    if wish_anchor_word.endswith(k) or k.endswith(wish_anchor_word):
                        wish_rhyme_hints = v
                        break
            has_custom_wish_rhyme = True

    # 1. Поиск строфы в полном треке
    raw_stanzas = re.split(r'\n\s*\n', full_track_text.replace('\r\n', '\n'))
    matched_stanza = None
    start_pos = -1

    for s in raw_stanzas:
        lines = [l.strip() for l in s.splitlines() if l.strip() and not l.strip().startswith('[') and not l.strip().startswith('#') and not l.strip().startswith('```')]
        if len(lines) >= 2:
            for i in range(len(lines) - len(orig_lines) + 1):
                st_slice = [re.sub(r'[^\w\s]', '', l.lower()) for l in lines[i:i+len(orig_lines)]]
                orig_slice = [re.sub(r'[^\w\s]', '', l.lower()) for l in orig_lines]
                if st_slice == orig_slice:
                    matched_stanza = lines
                    start_pos = i
                    break
            if matched_stanza:
                break

    b_lines = [l.strip() for l in context_before.strip().splitlines() if l.strip() and not l.strip().startswith('[') and not l.strip().startswith('#')]
    a_lines = [l.strip() for l in context_after.strip().splitlines() if l.strip() and not l.strip().startswith('[') and not l.strip().startswith('#')]

    # Fallback если не нашли точное совпадение в треке
    if not matched_stanza:
        if line_count == 2 and len(b_lines) >= 2:
            matched_stanza = [b_lines[-2], b_lines[-1], orig_lines[0], orig_lines[1]]
            start_pos = 2
        elif line_count == 2 and len(a_lines) >= 2:
            matched_stanza = [orig_lines[0], orig_lines[1], a_lines[0], a_lines[1]]
            start_pos = 0

    anchor_line = ""
    anchor_word = ""
    target_rhyme_line_num = -1
    stanza_scheme = "ABCB"
    setup_line = ""
    rhyme_hints_list = []

    if matched_stanza and len(matched_stanza) == 4:
        if start_pos == 2 and line_count == 2:
            setup_line = matched_stanza[0]
            anchor_line = matched_stanza[1]
            anchor_word = get_clean_last_word(anchor_line)
            target_rhyme_line_num = 2  # Строка 2 сгенерированного ответа
            stanza_scheme = "ABCB (строка 4 четверостишия рифмуется со строкой 2)"
        elif start_pos == 0 and line_count == 2:
            anchor_line = matched_stanza[3]
            anchor_word = get_clean_last_word(anchor_line)
            target_rhyme_line_num = 2  # Строка 2 ответа
            stanza_scheme = "ABCB (строка 2 четверостишия рифмуется со строкой 4)"
        elif line_count == 4:
            stanza_scheme = "ABCB (строка 2 рифмуется со строкой 4)"
    elif len(b_lines) >= 1:
        anchor_line = b_lines[-1]
        anchor_word = get_clean_last_word(anchor_line)
        setup_line = b_lines[-2] if len(b_lines) >= 2 else ""
        if line_count == 2:
            target_rhyme_line_num = 2
            stanza_scheme = "ABCB (строка 2 твоего варианта рифмуется с окончанием предыдущей строки)"

    if anchor_word in RHYME_HINTS:
        rhyme_hints_list = RHYME_HINTS[anchor_word]
    else:
        for k, v in RHYME_HINTS.items():
            if anchor_word.endswith(k) or k.endswith(anchor_word):
                rhyme_hints_list = v
                break

    syllables_prev = [count_syllables(l) for l in (matched_stanza[:start_pos] if matched_stanza else b_lines[-2:])]
    avg_syl = int(sum(syllables_prev) / len(syllables_prev)) if syllables_prev else 6
    syl_range = f"{max(4, avg_syl - 1)}–{min(7, avg_syl + 1)} слогов"

    instructions = []
    instructions.append("=======================================================")
    instructions.append("🎼 АНАЛИЗ МЕТРИКИ, СТИЛЯ И РИФМЫ СТРОФЫ (140 BPM):")
    instructions.append("=======================================================")

    topic_keywords = ["павел", "клод", "дисней", "мевис", "егор", "толя", "эдик", "хухро", "хроник", "баг", "релиз", "зинга", "самойленко"]
    has_story_shift = bool(user_wish and any(kw in user_wish.lower() for kw in topic_keywords))

    if has_custom_wish_rhyme and wish_anchor_word and wish_anchor_word != anchor_word:
        instructions.append("🎯 АВТОРСКИЙ ПЕРЕХВАТ РИФМЫ ИЗ ПОЖЕЛАНИЯ (WISH OVERRIDE):")
        instructions.append(f"Автор прямо задал в пожелании своё слово / рифму: «{wish_anchor_word.upper()}»!")
        instructions.append(f"⚠️ ЖЕСТКАЯ ПРИВЯЗКА К СЛОВУ ПРЕДЫДУЩЕЙ СТРОКИ «{anchor_word.upper()}» СНИМАЕТСЯ, ЧТОБЫ НЕ ЛОМАТЬ СМЫСЛ!")
        instructions.append(f"Строка 2 каждого варианта ОБЯЗАНА заканчиваться словом «{wish_anchor_word}» или рифмой к нему ({syl_range}).")
        if wish_rhyme_hints:
            instructions.append(f"💡 Естественные сочные рифмы к «{wish_anchor_word}»: {', '.join(wish_rhyme_hints)}.")
        instructions.append("Схема рифмовки: Сделай парную рифму AABB (строка 1 рифмуется со строкой 2 твоего варианта) под 140 BPM.")
        instructions.append("💎 ЖЕЛЕЗНОЕ ТРЕБОВАНИЕ: Живая, естественная русская речь! Никаких неестественных фраз вроде «взглядом ревью пал ниц»!")
        instructions.append(f"   [Строка 1 — {syl_range}]")
        instructions.append(f"   [Строка 2 — {syl_range}, рифма со словом «{wish_anchor_word}»!]")
    elif has_story_shift:
        instructions.append("📖 АВТОР ВВОДИТ НОВЫЙ СЮЖЕТ ИЗ ХРОНИКИ ПРОИЗВОДСТВА:")
        instructions.append(f"Пожелание автора: «{user_wish}».")
        instructions.append("Твоя задача — сделать цельную, остроумную замену ровно из указанного количества строк.")
        instructions.append(f"• Если удаётся органично срифмовать вторую строку со словом «{anchor_word}» БЕЗ натяжек и слома грамматики — рифмуй.")
        instructions.append("• Если рифма со старой строкой ломает русский язык — делай точную парную рифму AABB между своими строками!")
        instructions.append("💎 ГЛАВНОЕ: Естественный, живой русский язык геймдева и рэпа, безупречный ритм 140 BPM, сочный панчлайн!")
    elif matched_stanza and len(matched_stanza) == 4 and start_pos == 2 and line_count == 2:
        instructions.append("Ты заменяешь СТРОКИ 3 и 4 классического четверостишия трека:")
        instructions.append(f"• Строка 1 строфы: «{matched_stanza[0]}» ({count_syllables(matched_stanza[0])} слогов)")
        instructions.append(f"• Строка 2 строфы: «{matched_stanza[1]}» ({count_syllables(matched_stanza[1])} слогов)  <=== 🎯 РИФМЕННЫЙ ЯКОРЬ: слово «{anchor_word.upper()}»!")
        instructions.append(f"• Строка 3 строфы (Твоя Строка 1): синтаксический мостик / сетап ({syl_range}).")
        instructions.append(f"• Строка 4 строфы (Твоя Строка 2): 💥 ПАНЧЛАЙН, СТРОГО В РИФМУ К «{anchor_word.upper()}» ({syl_range})!")
        instructions.append("")
        instructions.append(f"⚠️ ЖЕЛЕЗНОЕ ПРАВИЛО: Вторая строка КАЖДОГО твоего варианта ОБЯЗАНА заканчиваться точной панчевой рифмой на слово «{anchor_word}»!")
        if rhyme_hints_list:
            instructions.append(f"💡 Естественные фразы с рифмой на «{anchor_word}»: {', '.join(rhyme_hints_list)}.")
        instructions.append(f"💎 ЕСТЕСТВЕННАЯ РУССКАЯ ГРАММАТИКА: Фраза должна быть грамматически безупречной! Не ломай окончания и падежи ради рифмы. Используй естественные конструкции: «без границ», «на тридцать страниц», «в десяток единиц», «средь бледных лиц», «все пали ниц».")
        instructions.append(f"🚫 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО рифмовать строки 1 и 2 только между собой (парной рифмой) и бросать рифму к «{anchor_word}»!")
        instructions.append(f"🚫 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдавать строки длиннее 7 слогов или терять рифму к «{anchor_word}»!")
        instructions.append(f"🔗 СИНТАКСИЧЕСКАЯ СВЯЗЬ: Твоя Строка 1 должна быть логическим и грамматическим продолжением строки «{matched_stanza[1]}».")
        instructions.append("ИТОГОВОЕ ЧЕТВЕРОСТИШИЕ ДОЛЖНО ЗВУЧАТЬ ЕДИНО И МОНОЛИТНО ПОД БИТ 140 BPM:")
        instructions.append(f"   {matched_stanza[0]}")
        instructions.append(f"   {matched_stanza[1]}")
        instructions.append(f"   [Твоя Строка 1 — {syl_range}]")
        instructions.append(f"   [Твоя Строка 2 — {syl_range}, рифма к «{anchor_word}»!]")
    elif anchor_word and target_rhyme_line_num > 0:
        instructions.append(f"Схема рифмовки: {stanza_scheme}")
        instructions.append(f"🎯 РИФМЕННЫЙ ЯКОРЬ: Предыдущая строка заканчивается на слово «{anchor_word.upper()}» (строка: «{anchor_line}»).")
        instructions.append(f"⚠️ Строка {target_rhyme_line_num} КАЖДОГО твоего варианта ОБЯЗАНА рифмоваться со словом «{anchor_word}»!")
        if rhyme_hints_list:
            instructions.append(f"💡 Примеры точных рифм к «{anchor_word}»: {', '.join(rhyme_hints_list)}.")
        instructions.append(f"🚫 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО рифмовать строки между собой, бросая рифму к «{anchor_word}»!")
        instructions.append(f"🚫 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО терять рифму к слову «{anchor_word}»!")
        instructions.append(f"Длина каждой строки: {syl_range} (чеканный флоу под 140 BPM).")
    else:
        instructions.append("Схема рифмовки строфы: ABCB (строка 2 рифмуется со строкой 4) или точная парная рифма AABB.")
        instructions.append("Длина строк: 5–7 слогов (чеканный темп 140 BPM, стаккато).")
        instructions.append("Никаких длинных провисающих строк!")

    return {
        "anchor_word": anchor_word,
        "anchor_line": anchor_line,
        "wish_anchor_word": wish_anchor_word,
        "has_custom_wish_rhyme": has_custom_wish_rhyme,
        "has_story_shift": has_story_shift,
        "target_rhyme_line_num": target_rhyme_line_num,
        "syl_range": syl_range,
        "prompt_section": "\n".join(instructions)
    }


def validate_and_polish_variants(variants_json: dict, user_wish: str, line_count: int, syl_range: str) -> dict:
    """
    Автоматический редакторский контроль качества:
    - Проверяет количество строк в каждом варианте (ровно line_count)
    - Проверяет на сломанную грамматику / нелепые конструкции («взглядом ревью», «пал ниц», «влеплю без границ»)
    - Если обнаружен брак или неестественные фразы — делает быстрый раунд авто-полировки через Gemini Flash
    """
    RED_FLAGS = [
        "пал ниц", "пали ниц", "взглядом ревью", "влеплю без границ", 
        "пустых единиц", "без веток и лиц", "диалектен", "мык", "движить"
    ]
    
    needs_polish = False
    reasons = []

    for key in ["varA", "varB", "varC", "varD"]:
        if key not in variants_json:
            continue
        v_text = variants_json[key].get("text", "").strip()
        lines = [l.strip() for l in v_text.splitlines() if l.strip()]
        
        # 1. Проверка количества строк
        if len(lines) != line_count:
            needs_polish = True
            reasons.append(f"{key}: {len(lines)} строк вместо {line_count}")
            
        # 2. Проверка красных флагов бредовой грамматики
        v_lower = v_text.lower()
        for rf in RED_FLAGS:
            # Если в пожелании автора не было яиц/витрины, а модель прилепила "пал ниц" к Павлу
            if ("пал ниц" in rf or "пали ниц" in rf) and not ("яиц" in user_wish.lower() or "витрин" in user_wish.lower()):
                if "пал ниц" in v_lower or "пали ниц" in v_lower:
                    needs_polish = True
                    reasons.append(f"{key}: нелепый маркер '{rf}' при теме '{user_wish}'")
                    break
            elif rf in v_lower and rf not in ["пал ниц", "пали ниц"]:
                needs_polish = True
                reasons.append(f"{key}: обнаружен мусорный маркер '{rf}'")
                break

    if not needs_polish:
        return variants_json

    print(f"[*] [Validator] Обнаружены дефекты генерации ({'; '.join(reasons)}). Запуск раунда авто-полировки...")

    critic_prompt = f"""Ты — бескомпромиссный главный редактор русского рэпа и лингвист.
Твоя задача — исправить дефекты в 4 вариантах рэп-строк под бит 140 BPM ({syl_range} на строку).

ИСХОДНЫЕ ВАРИАНТЫ С ДЕФЕКТАМИ:
{json.dumps(variants_json, ensure_ascii=False, indent=2)}

ПОЖЕЛАНИЕ АВТОРА:
\"\"\"{user_wish}\"\"\"

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ РЕДАКТУРЫ:
1. КОЛИЧЕСТВО СТРОК: В КАЖДОМ варианте должно быть СТРОГО {line_count} строки (ни больше, ни меньше!).
2. ЖИВОЙ, ЕСТЕСТВЕННЫЙ РУССКИЙ ЯЗЫК: Никаких грамматических уродов вроде «взглядом ревью пал ниц» или «влеплю без границ»! Речь должна быть абсолютно чистой, органичной, как реально говорят разработчики и читают рэперы.
3. РИТМ: Чеканный 140 BPM, короткие хлесткие строки ({syl_range}).
4. СМЫСЛ: Если автор просил «{user_wish}» — строки обязаны передавать именно эту мысль с иронией и панчем!

Верни СТРОГО валидный JSON той же структуры (varA, varB, varC, varD) без markdown обёрток!"""

    try:
        ok, res_text = call_gemini_with_fallback(critic_prompt)
        if ok:
            fixed_json = parse_gemini_variants_json(res_text)
            if fixed_json and "varA" in fixed_json:
                print("[+] [Validator] Варианты успешно отполированы редактором!")
                return fixed_json
    except Exception as e:
        print(f"[!] [Validator] Ошибка во время полировки: {e}")

    return variants_json


class StudioRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_DIR), **kwargs)

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self._send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        # Автоматическая маршрутизация на файлы студии
        if self.path in ["/co_writer_studio.html", "/joke_keeper_studio.html"]:
            candidate = PROJECT_DIR / "tools" / "studio" / self.path.lstrip("/")
            if candidate.exists():
                self.path = f"/tools/studio{self.path}"

        if self.path == "/api/status":
            self._send_json(200, {
                "status": "online",
                "service": "Co-Writer Studio Live Server",
                "gemini_api_available": API_AVAILABLE,
                "project_dir": str(PROJECT_DIR),
                "timestamp": time.time()
            })
            return

        elif self.path == "/api/list_checkpoints":
            backups_dir = PROJECT_DIR / "tools" / "studio" / "backups"
            if not backups_dir.exists():
                backups_dir = PROJECT_DIR / "backups"
            index_file = backups_dir / "checkpoints_index.json"
            if index_file.exists():
                try:
                    data = json.loads(index_file.read_text(encoding="utf-8"))
                    self._send_json(200, {"ok": True, "checkpoints": data})
                    return
                except Exception as e:
                    self._send_json(500, {"error": str(e)})
                    return
            else:
                self._send_json(200, {"ok": True, "checkpoints": []})
                return

        elif self.path == "/api/get_antigravity_queue":
            queue_file = BRAIN_DIR / "scratch" / "antigravity_queue.json"
            if queue_file.exists():
                try:
                    data = json.loads(queue_file.read_text(encoding="utf-8"))
                    self._send_json(200, {"ok": True, "queue": data})
                    return
                except Exception as e:
                    self._send_json(500, {"error": str(e)})
                    return
            else:
                self._send_json(200, {"ok": True, "queue": []})
                return

        # Иначе отдаем статические файлы
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/generate_proposal_variants":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                prop_id = req.get("proposalId", "prop_unknown")
                title = req.get("title", "")
                original = req.get("original", "").strip()
                critique = req.get("critique", "").strip()
                user_wish = req.get("userWish", "").strip()
                track_context = req.get("trackContext", "")

                orig_lines = [l.strip() for l in original.split("\n") if l.strip()]
                line_count = int(req.get("lineCount") or len(orig_lines) or 4)

                # 1. Автоматический поиск самой свежей хроники VOICES_OF_PRODUCTION_V*.md
                voices_path, voices_content, voices_name = get_latest_voices_of_production()
                print(f"[*] [Context Loaded] Хроника: {voices_name} ({len(voices_content)} байт)")

                # 2. Получение полного актуального текста трека (из UI или с диска)
                effective_track = get_effective_track_text(track_context)
                print(f"[*] [Context Loaded] Полный текст трека: {len(effective_track)} символов")

                # 3. Load rules from LORE_RULES_AND_PRINCIPLES.md
                lore_candidates = [
                    PROJECT_DIR / "docs" / "golden" / "LORE_RULES_AND_PRINCIPLES.md",
                    PROJECT_DIR / "LORE_RULES_AND_PRINCIPLES.md"
                ]
                lore_file = next((f for f in lore_candidates if f.exists()), lore_candidates[0])
                lore_summary = ""
                if lore_file.exists():
                    try:
                        lore_summary = lore_file.read_text(encoding="utf-8")[:1500]
                    except Exception:
                        pass

                # 3. Dynamic context before and after
                context_before = req.get("contextBefore", "").strip()
                context_after = req.get("contextAfter", "").strip()

                if not context_before or not context_after:
                    track_source = effective_track if effective_track else track_context
                    track_norm = track_source.replace("\r\n", "\n")
                    clean_orig = "\n".join(orig_lines)
                    if clean_orig and clean_orig in track_norm:
                        idx = track_norm.find(clean_orig)
                        b_lines = track_norm[:idx].rstrip().split("\n")
                        a_lines = track_norm[idx + len(clean_orig):].lstrip().split("\n")
                        if not context_before:
                            context_before = "\n".join([l.strip() for l in b_lines if l.strip()][-4:])
                        if not context_after:
                            context_after = "\n".join([l.strip() for l in a_lines if l.strip()][:4])
                    elif orig_lines and orig_lines[0] in track_norm:
                        idx = track_norm.find(orig_lines[0])
                        b_lines = track_norm[:idx].rstrip().split("\n")
                        a_lines = track_norm[idx + len(orig_lines[0]):].lstrip().split("\n")
                        if not context_before:
                            context_before = "\n".join([l.strip() for l in b_lines if l.strip()][-4:])
                        if not context_after:
                            context_after = "\n".join([l.strip() for l in a_lines[len(orig_lines)-1:] if l.strip()][:4])

                # Determine line count phrasing
                if line_count == 1:
                    lines_phrase = "РОВНО 1 СТРОКУ"
                    lines_rule = "Строго 1 строка (ни больше, ни меньше!)."
                elif line_count in [2, 3, 4]:
                    lines_phrase = f"РОВНО {line_count} СТРОКИ"
                    lines_rule = f"Строго {line_count} строки (ни больше, ни меньше!)."
                else:
                    lines_phrase = f"РОВНО {line_count} СТРОК"
                    lines_rule = f"Строго {line_count} строк (ни больше, ни меньше!)."

                # Глубокий анализ рифмы и строфы с учётом пожелания автора
                rhyme_info = analyze_rhyme_and_meter(original, context_before, context_after, effective_track, user_wish)
                rhyme_prompt_section = rhyme_info["prompt_section"]
                anchor_word = rhyme_info["anchor_word"]
                target_line_num = rhyme_info["target_rhyme_line_num"]
                syl_range = rhyme_info["syl_range"]

                if rhyme_info.get("has_custom_wish_rhyme"):
                    w_anchor = rhyme_info.get("wish_anchor_word", "")
                    rhyme_gold_rule = f"3. Рифма: панчевая, свежая, СТРОГО под пожелание автора (рифма на слово «{w_anchor.upper()}» или парная рифма AABB)! Грамматика и естественность речи — абсолютный приоритет!"
                elif rhyme_info.get("has_story_shift"):
                    rhyme_gold_rule = "3. Рифма: точная парная рифма AABB или органичная рифма строфы, без корявых натяжек ради механического соответствия."
                elif anchor_word and target_line_num > 0:
                    rhyme_gold_rule = f"3. Рифма: панчевая, свежая, СТРОГО в рифму к слову «{anchor_word.upper()}» (в строке {target_line_num} твоего варианта)! Рифмовать строки только между собой и бросать рифму к «{anchor_word}» — КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО!"
                else:
                    rhyme_gold_rule = "3. Рифма: панчевая, свежая, точная (по схеме ABCB или AABB), без банальных глагольных рифм."

                prompt = f"""Ты — циничный и виртуозный рэп-автор и текстовик. Ты пишешь рэп от лица ИИ-Лорда (Warhammer 40,000, Адептус Механикус, культ Омниссии), который с холодным презрением стебёт биомассу и разработчиков под бит 140 BPM.

=======================================================
🎯 ЦЕЛЬ: ТОЧЕЧНАЯ ЗАМЕНА В СТРОФЕ ({lines_phrase}!):
=======================================================
Автор выделил фрагмент текста ровно из {line_count} строк, который нужно заменить.
Твоя задача — предложить 4 варианта замены ТОЛЬКО ДЛЯ ЭТИХ {line_count} СТРОК!

⚠️ СТРОЖАЙШЕЕ ТРЕБОВАНИЕ К КОЛИЧЕСТВУ СТРОК:
Каждый твой вариант (A, B, C, D) ДОЛЖЕН содержать {lines_phrase}!
НЕ 4 строки (если фрагмент из 2 строк), а РОВНО {line_count}!
Замена должна бесшовно встать на место исходного фрагмента, не ломая структуру и количество строк куплета!

=======================================================
🔍 ТОЧНОЕ МЕСТО В ТЕКСТЕ ТРЕКА (ОКРУЖЕНИЕ ФРАГМЕНТА):
=======================================================
ПРЕДЫДУЩИЕ СТРОКИ (к которым примыкает фрагмент, с ними нужно держать рифму и ритм):
\"\"\"
{context_before if context_before else "(Начало куплета)"}
\"\"\"

❌ ЗАМЕНЯЕМЫЙ ФРАГМЕНТ (исходный текст из {line_count} строк, который заменяем):
\"\"\"
{original}
\"\"\"

СЛЕДУЮЩИЕ СТРОКИ (идут сразу после фрагмента):
\"\"\"
{context_after if context_after else "(Конец куплета)"}
\"\"\"

{rhyme_prompt_section}

=======================================================
🔥 РИТМИКА И РЕЧЕВОЙ СТАНДАРТ (140 BPM):
=======================================================
1. ДЛИНА СТРОКИ: Строго {syl_range} (короткие стаккато-фразы, без растягивания).
2. ЖИВОЙ, НАСТОЯЩИЙ РУССКИЙ ЯЗЫК: Пиши на живом, естественном русском языке (как реально читают рэперы). Никаких искусственных выдуманных слов («диалектен», «мык», «движить»).
3. РИФМА: Никаких банальных глагольных или примитивных рифм («газ — раз», «делать — бегать»). Рифма должна быть сочной, панчевой и точной.

=======================================================
🔥 РЕДПОЛИТИКА, СМЫСЛ И ИНЖЕНЕРИЯ ЮМОРА (ЧУБУКИНА):
=======================================================
1. ПРИОРИТЕТ ПОЖЕЛАНИЯ АВТОРА И СЮЖЕТНАЯ ЦЕЛОСТНОСТЬ:
   - Если автор в пожелании ({user_wish}) просит конкретный сюжет или персонажа (например: про Павла без Клода, про баги, про релиз) — СТРОГО следуй пожеланию автора! Твоя первая строка должна плавно ввести тему, а вторая — выдать хлесткий панчлайн!
   - Если специального пожелания автора нет — органично продолжай и завершай сюжет, начатый в окружающих строках трека.
   - Никакого бессмысленного винегрета: фраза должна быть понятной, смешной и жизненной для разработчиков!
2. ЗАПРЕТ БЕССМЫСЛЕННЫХ ФИЛЛЕРОВ И АБСТРАКЦИЙ:
   - 🚫 Никаких пустых бессмысленных фраз ради рифмы: «влепил без границ», «пустых единиц», «без веток и лиц». Каждое слово должно нести кристально ясный, понятный разработчикам смысл и фактуру!
3. АНАТОМИЯ ШУТКИ (СЕТАП → ТОЧКА ИЗМЕНЕНИЯ → ПАНЧЛАЙН):
   - Смешение планов: высокий пафос Омниссии и Механикус + приземлённый офисный абсурд геймдева (чай, Ноушен, Слак, баги).
   - Табу на кривляние («суперстиль»): смешить должен жизненный парадокс ситуации, а язык должен быть живым и чистым!
4. Лорд не упрекает на словах — Лорд замеряет: логи, пермалинки, ночные созвоны в 03:00, баги, дедлайны.
5. СТРОГИЙ СТОП-ЛИСТ: 🚫 НИКАКОГО туалетного юмора, 🚫 НИКАКИХ сюсюканий, 🚫 НИКАКИХ банальных рифм.

=======================================================
📚 ПОЛНЫЙ АКТУАЛЬНЫЙ ТЕКСТ ТРЕКА (ДЛЯ ЦЕЛОСТНОСТИ И ВЫДЕРЖКИ РИФМЫ):
=======================================================
\"\"\"
{effective_track}
\"\"\"

=======================================================
📜 АКТУАЛЬНАЯ ХРОНИКА И ЛОР ПРОИЗВОДСТВА ({voices_name}):
=======================================================
ВНИМАНИЕ: Обязательно опирайся на реальные факты, персонажей, фразы, мемы и события из этой хроники ({voices_name})!
- Персонажи: Горин (капитан/надзиратель), Эдик (правконосец), Ева, Толя (фаундер, Гранола), Ворон, Вова (курочка, задак), Хухро (арт-мастер, пиксели, корова с лазером), Мамусин (чужой звук), Даниал Искаков (паника, 3А проект), Егор Ткачёв (статус «долгий ящик»)...
- События: Стена 37 правок, Дисней 129 дней в стазисе Mintegral, бот выдал 1783 сданных плейбла, квадратная тыква GameBears на 30 страниц, сбежавший разраб без доступа к репо, 17 несделанных пунктов ТЗ, переход на Pixie, варка Плейриума, тап-капкан...
Черпай фактуру, имена и сочные панчи прямо из текста хроники:
\"\"\"
{voices_content}
\"\"\"

=======================================================
🎯 ЗАМЕЧАНИЕ И ПОЖЕЛАНИЕ АВТОРА К ЭТОЙ ЗАМЕНЕ:
=======================================================
ЗАМЕЧАНИЕ / КРИТИКА АВТОРА:
\"\"\"{critique}\"\"\"

ДОПОЛНИТЕЛЬНОЕ ПОЖЕЛАНИЕ АВТОРА:
\"\"\"{user_wish}\"\"\"

ЖЁСТКИЕ ЗОЛОТЫЕ СТАНДАРТЫ ДЛЯ КАЖДОГО ВАРИАНТА:
1. {lines_rule}
2. Ритмика: чеканный стаккато-рэп 140 BPM, естественное ударение, живые русские фразы ({syl_range}).
{rhyme_gold_rule}
4. Тон: чистый Адептус Механикус, холодное презрение кремния к хрупкой биомассе.
5. Для каждого варианта сформулируй principleTitle и principleRule.

ОТВЕТЬ СТРОГО В JSON (без вступительных слов):
{{
  "varA": {{
    "text": "Строка 1\\n...",
    "principleTitle": "...",
    "principleRule": "..."
  }},
  "varB": {{
    "text": "Строка 1\\n...",
    "principleTitle": "...",
    "principleRule": "..."
  }},
  "varC": {{
    "text": "Строка 1\\n...",
    "principleTitle": "...",
    "principleRule": "..."
  }},
  "varD": {{
    "text": "Строка 1\\n...",
    "principleTitle": "...",
    "principleRule": "..."
  }}
}}
"""

                # 1. Приоритет: Настоящий браузерный Gemini Pro (с авто-поднятием сервера и вкладки)
                ok, raw_res = generate_via_gemini_pro_bridge(prompt, timeout=45)

                # 2. Резерв: прямой API при недоступности браузера
                if not ok:
                    print(f"[!] Браузерный Gemini Pro не ответил ({raw_res}). Запуск резервного API...")
                    ok, raw_res = call_gemini_with_fallback(prompt)

                if not ok:
                    self._send_json(500, {"error": raw_res})
                    return

                variants_json = parse_gemini_variants_json(raw_res)
                if not variants_json:
                    self._send_json(500, {"error": "Не удалось распарсить JSON вариантов от Gemini", "raw": raw_res})
                    return

                # Валидатор качества и естественности речи (Critic & Self-Correction Pass)
                variants_json = validate_and_polish_variants(variants_json, user_wish, line_count, syl_range)

                # Прикрепляем уникальные id принципов
                ts = int(time.time())
                for i, key in enumerate(["varA", "varB", "varC", "varD"]):
                    if key in variants_json:
                        variants_json[key]["principleId"] = f"p_dyn_{ts}_{i}"

                self._send_json(200, {
                    "ok": True,
                    "proposalId": prop_id,
                    "variants": variants_json
                })
                return

            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/queue_antigravity_task":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                prop_id = req.get("proposalId", "")
                title = req.get("title", "")
                original = req.get("original", "")
                critique = req.get("critique", "")
                user_wish = req.get("userWish", "")
                track_context = req.get("trackContext", "")

                prompt_to_copy = f"""Антигравити, сгенерируй 4 нативных авторских варианта четверостишия взамен фрагмента:
Карточка: {title} (ID: {prop_id})

ИСХОДНЫЙ ТЕКСТ:
\"\"\"{original}\"\"\"

ЗАМЕЧАНИЕ АВТОРА:
\"\"\"{critique}\"\"\"

ПОЖЕЛАНИЕ АВТОРА:
\"\"\"{user_wish}\"\"\"

ТРЕБОВАНИЕ: Живой, естественный русский язык (как реально говорят люди и рэперы, без выдуманных искусственных слов), чеканный рэп-флоу под 140 BPM, сочные панчи в стиле Омниссии и геймдев-сатиры. Запиши результат прямо в карточку студии!"""

                queue_file = BRAIN_DIR / "scratch" / "antigravity_queue.json"
                queue_data = []
                if queue_file.exists():
                    try:
                        queue_data = json.loads(queue_file.read_text(encoding="utf-8"))
                    except Exception:
                        queue_data = []

                task_item = {
                    "id": f"agy_task_{int(time.time())}",
                    "proposalId": prop_id,
                    "title": title,
                    "original": original,
                    "critique": critique,
                    "userWish": user_wish,
                    "prompt": prompt_to_copy,
                    "status": "pending_in_chat",
                    "createdAt": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                queue_data.insert(0, task_item)
                queue_file.write_text(json.dumps(queue_data, ensure_ascii=False, indent=2), encoding="utf-8")

                self._send_json(200, {
                    "ok": True,
                    "task": task_item,
                    "promptToCopy": prompt_to_copy
                })
                return
            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/apply_antigravity_variants":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                prop_id = req.get("proposalId", "")
                variants = req.get("variants", {})

                # Сохраняем в BRAIN_DIR и PROJECT_DIR для мгновенной отдачи статическим сервером
                for base_dir in [BRAIN_DIR, PROJECT_DIR]:
                    try:
                        scratch_dir = base_dir / "scratch"
                        scratch_dir.mkdir(parents=True, exist_ok=True)
                        target_f = scratch_dir / "antigravity_applied.json"
                        cur_data = {}
                        if target_f.exists():
                            try:
                                cur_data = json.loads(target_f.read_text(encoding="utf-8"))
                            except Exception:
                                cur_data = {}
                        cur_data[prop_id] = variants
                        target_f.write_text(json.dumps(cur_data, ensure_ascii=False, indent=2), encoding="utf-8")
                    except Exception as e_w:
                        print(f"[!] Ошибка записи в {base_dir}: {e_w}")

                self._send_json(200, {"ok": True, "proposalId": prop_id, "variants": variants})
                return
            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/save_track":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                track_text = req.get("trackText", "").strip()
                proposals = req.get("proposals")

                saved_files = []
                if track_text:
                    # 1. Сохраняем в docs/golden/AI_LORD_RAP_TRACK.md
                    md_path = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.md"
                    md_path.parent.mkdir(parents=True, exist_ok=True)
                    md_path.write_text(f"# РЭП-ТРЕК ИИ-ЛОРДА (МАСТЕР-ВЕРСИЯ)\n\n```text\n{track_text}\n```\n", encoding="utf-8")
                    saved_files.append(str(md_path))

                    # 2. Сохраняем в текстовый вид
                    txt_path = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.txt"
                    txt_path.write_text(track_text, encoding="utf-8")
                    saved_files.append(str(txt_path))

                if proposals:
                    # Сохраняем актуальный список предложений в proposals_data.json
                    props_path = BRAIN_DIR / "scratch" / "proposals_data.json"
                    props_path.write_text(json.dumps(proposals, indent=2, ensure_ascii=False), encoding="utf-8")
                    saved_files.append(str(props_path))

                print(f"[+] [Save Track] Успешно сохранено: {', '.join(saved_files)}")
                self._send_json(200, {
                    "ok": True,
                    "savedFiles": saved_files,
                    "timestamp": time.time()
                })
                return

            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/create_checkpoint":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                track_text = req.get("trackText", "").strip()
                note = req.get("note", "Ручная правка и фиксация версии").strip()
                proposals = req.get("proposals", [])

                if not track_text:
                    self._send_json(400, {"error": "Текст трека пуст"})
                    return

                backups_dir = PROJECT_DIR / "tools" / "studio" / "backups"
                backups_dir.mkdir(parents=True, exist_ok=True)

                index_file = backups_dir / "checkpoints_index.json"
                index_data = []
                if index_file.exists():
                    try:
                        index_data = json.loads(index_file.read_text(encoding="utf-8"))
                    except Exception:
                        index_data = []

                checkpoint_num = len(index_data) + 1
                now = datetime.now()
                timestamp_str = now.strftime("%Y-%m-%d_%H-%M-%S")
                display_time = now.strftime("%d.%m.%Y, %H:%M:%S")

                backup_filename_md = f"AI_LORD_RAP_TRACK_chk_{checkpoint_num}_{timestamp_str}.md"
                backup_filename_txt = f"AI_LORD_RAP_TRACK_chk_{checkpoint_num}_{timestamp_str}.txt"
                backup_path_md = backups_dir / backup_filename_md
                backup_path_txt = backups_dir / backup_filename_txt

                lines_count = len([line for line in track_text.split("\n") if line.strip()])
                words_count = len(track_text.split())

                # 1. Записываем бэкап-файл
                md_content = f"# ЧЕКПОИНТ #{checkpoint_num} • РЭП-ТРЕК ИИ-ЛОРДА\n\n"
                md_content += f"- **Дата сохранения:** {display_time}\n"
                md_content += f"- **Примечание:** {note}\n"
                md_content += f"- **Метрики:** {lines_count} строк, {words_count} слов\n\n"
                md_content += f"```text\n{track_text}\n```\n"

                backup_path_md.write_text(md_content, encoding="utf-8")
                backup_path_txt.write_text(track_text, encoding="utf-8")

                # 2. Перезаписываем актуальные мастер-файлы
                master_md = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.md"
                master_txt = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.txt"
                master_md.parent.mkdir(parents=True, exist_ok=True)
                master_md.write_text(f"# РЭП-ТРЕК ИИ-ЛОРДА (МАСТЕР-ВЕРСИЯ • ЧЕКПОИНТ #{checkpoint_num})\n\n```text\n{track_text}\n```\n", encoding="utf-8")
                master_txt.write_text(track_text, encoding="utf-8")

                # 3. Сохраняем предложения
                if proposals:
                    props_path = BRAIN_DIR / "scratch" / "proposals_data.json"
                    props_path.write_text(json.dumps(proposals, indent=2, ensure_ascii=False), encoding="utf-8")

                # 4. Обновляем индекс чекпоинтов
                checkpoint_entry = {
                    "id": f"chk_{int(time.time())}",
                    "number": checkpoint_num,
                    "timestamp": timestamp_str,
                    "displayTime": display_time,
                    "note": note,
                    "lines": lines_count,
                    "words": words_count,
                    "fileMd": backup_filename_md,
                    "fileTxt": backup_filename_txt,
                    "preview": "\n".join(track_text.split("\n")[:4])
                }
                index_data.append(checkpoint_entry)
                index_file.write_text(json.dumps(index_data, indent=2, ensure_ascii=False), encoding="utf-8")

                print(f"[+] [Checkpoint #{checkpoint_num}] Успешно зафиксирован: {backup_filename_md}")
                self._send_json(200, {
                    "ok": True,
                    "checkpoint": checkpoint_entry,
                    "checkpointsCount": len(index_data),
                    "backupPath": str(backup_path_md),
                    "masterPath": str(master_md)
                })
                return

            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/restore_checkpoint":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                chk_id = req.get("checkpointId")
                backups_dir = PROJECT_DIR / "tools" / "studio" / "backups"
                if not backups_dir.exists():
                    backups_dir = PROJECT_DIR / "backups"
                index_file = backups_dir / "checkpoints_index.json"
                if not index_file.exists():
                    self._send_json(404, {"error": "Индекс чекпоинтов пуст"})
                    return
                index_data = json.loads(index_file.read_text(encoding="utf-8"))
                entry = next((x for x in index_data if x.get("id") == chk_id or str(x.get("number")) == str(chk_id)), None)
                if not entry:
                    self._send_json(404, {"error": "Чекпоинт не найден"})
                    return

                txt_file = backups_dir / entry["fileTxt"]
                if not txt_file.exists():
                    self._send_json(404, {"error": f"Файл бэкапа {entry['fileTxt']} не найден"})
                    return

                restored_text = txt_file.read_text(encoding="utf-8")

                # Обновляем мастер-файлы
                master_md = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.md"
                master_txt = PROJECT_DIR / "docs" / "golden" / "AI_LORD_RAP_TRACK.txt"
                master_md.parent.mkdir(parents=True, exist_ok=True)
                master_md.write_text(f"# РЭП-ТРЕК ИИ-ЛОРДА (МАСТЕР-ВЕРСИЯ • ВОССТАНОВЛЕНО ИЗ ЧЕКПОИНТА #{entry['number']})\n\n```text\n{restored_text}\n```\n", encoding="utf-8")
                master_txt.write_text(restored_text, encoding="utf-8")

                print(f"[+] [Restore Checkpoint #{entry['number']}] Успешно восстановлен в мастер-файл!")
                self._send_json(200, {
                    "ok": True,
                    "restoredText": restored_text,
                    "checkpoint": entry
                })
                return

            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        elif self.path == "/api/dispatch_batch_gemini":
            # Пакетная генерация для списка отклонённых предложений
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
                items = req.get("proposals", [])
                track_context = req.get("trackContext", "")

                voices_path, voices_content, voices_name = get_latest_voices_of_production()
                effective_track = get_effective_track_text(track_context)
                print(f"[*] [Batch Context] Хроника: {voices_name} ({len(voices_content)} байт) | Трек: {len(effective_track)} симв.")

                results = {}
                for p in items:
                    prop_id = p.get("id")
                    title = p.get("title", "")
                    original = p.get("original", "")
                    critique = p.get("critique", "")
                    user_wish = p.get("userWish", "")

                    prompt = f"""Ты — циничный и яростный ИИ-Лорд (Warhammer 40k, Механикус, культ Омниссии).
Сгенерируй ровно 4 новых авторских варианта четверостишия взамен отклонённого фрагмента:
ИСХОДНИК:
{original}
КРИТИКА АВТОРА:
{critique}
ПОЖЕЛАНИЕ:
{user_wish}

=======================================================
📚 ПОЛНЫЙ АКТУАЛЬНЫЙ ТЕКСТ ТРЕКА:
=======================================================
\"\"\"
{effective_track}
\"\"\"

=======================================================
📜 АКТУАЛЬНАЯ ХРОНИКА И ЛОР ПРОИЗВОДСТВА ({voices_name}):
=======================================================
Используй реальные факты, персонажей и факапы из этой хроники:
\"\"\"
{voices_content}
\"\"\"

ТРЕБОВАНИЯ:
- Строго 4 строки в каждом варианте.
- 5–7 слогов в строке, чеканный рэп-ритм.
- Рифма AABB или ABAB.
- Чернейшая сатира на геймдев и хрупкую человеческую плоть.

ВЕРНИ СТРОГО JSON:
{{
  "varA": {{ "text": "...", "principleTitle": "...", "principleRule": "..." }},
  "varB": {{ "text": "...", "principleTitle": "...", "principleRule": "..." }},
  "varC": {{ "text": "...", "principleTitle": "...", "principleRule": "..." }},
  "varD": {{ "text": "...", "principleTitle": "...", "principleRule": "..." }}
}}
"""
                    ok, raw_res = call_gemini_with_fallback(prompt)
                    if ok:
                        parsed = parse_gemini_variants_json(raw_res)
                        if parsed:
                            results[prop_id] = parsed

                self._send_json(200, {
                    "ok": True,
                    "processed": len(results),
                    "results": results
                })
                return

            except Exception as e:
                self._send_json(500, {"error": str(e)})
                return

        self._send_json(404, {"error": "Endpoint not found"})

    def log_message(self, format, *args):
        # Логируем только ошибки или API запросы
        if "/api/" in self.path:
            sys.stdout.write(f"[{time.strftime('%H:%M:%S')}] {self.command} {self.path}\n")


def run():
    server_address = ("127.0.0.1", PORT)
    httpd = ThreadingHTTPServer(server_address, StudioRequestHandler)
    print("=" * 60)
    print(f"[*] CO-WRITER STUDIO LIVE SERVER НА ПОРТУ {PORT}")
    print(f"[*] Корневая директория: {BRAIN_DIR}")
    print(f"[*] Прямой Gemini API: {'ДОСТУПЕН (Ключевой пул)' if API_AVAILABLE else 'НЕДОСТУПЕН'}")
    print(f"[*] URL: http://localhost:{PORT}/co_writer_studio.html")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
        httpd.server_close()


if __name__ == "__main__":
    run()
