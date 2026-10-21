#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
H:\PLBX\CyberBullingConcept\tools\project_dispatcher.py
Единый голосовой диспетчер проекта «Сыгравший в ящик»:
  1. Принимает задачу (диктовка через Win+H или ввод текста).
  2. Определяет тематику по ключевым словам.
  3. Сопоставляет с конкретным чатом Антигравити (где уже есть контекст).
  4. Запускает выполнение через соответствующий движок (Агрон / Gemini Pool / Midjourney)
     либо готовит промпт для вставки в целевой чат.
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Кодировка UTF-8 для вывода в консоль
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(r"H:\PLBX\CyberBullingConcept").resolve()
REGISTRY_FILE = PROJECT_DIR / "tools" / "chat_registry.json"
GEMINI_PIPELINE = Path(r"F:\AI\gemini-integration\gemini_pipeline.py")
MJ_PIPELINE = Path(r"F:\AI\midjourney-integration\mj_pipeline.py")

def copy_to_clipboard(text: str):
    """Копирует текст в буфер обмена Windows через clip.exe"""
    try:
        proc = subprocess.Popen(['clip.exe'], stdin=subprocess.PIPE, close_fds=True)
        proc.communicate(input=text.encode('utf-16'))
        return True
    except Exception:
        return False

def load_registry():
    if REGISTRY_FILE.exists():
        try:
            return json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[!] Ошибка загрузки реестра: {e}")
    return {}

def classify_task(task_text: str, registry: dict):
    task_lower = task_text.lower()
    best_match = None
    max_score = 0

    for domain_key, data in registry.items():
        score = 0
        for kw in data.get("keywords", []):
            if kw in task_lower:
                score += 1
        if score > max_score:
            max_score = score
            best_match = (domain_key, data)

    if best_match and max_score > 0:
        return best_match[0], best_match[1]

    # По умолчанию - структура / общий Gemini
    return "project_structure", registry.get("project_structure", {})

def main():
    registry = load_registry()

    print("=" * 65)
    print(" 🎙️  ГОЛОСОВОЙ ДИСПЕТЧЕР ПРОЕКТА: «ХРОНИКИ ПЛЕЙБОКСА»")
    print("=" * 65)
    print(" Подсказка: Нажмите [Win + H] для включения голосовой диктовки.")
    print(" Надиктуйте задачу, нажмите Enter (или напишите текст вручную):\n")

    if len(sys.argv) > 1:
        task_text = " ".join(sys.argv[1:]).strip()
        print(f"> {task_text}")
    else:
        try:
            task_text = input("🎤 Ваша задача: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nВыход.")
            return

    if not task_text:
        print("[!] Задача не введена. Завершение работы.")
        return

    domain_key, domain_info = classify_task(task_text, registry)
    domain_name = domain_info.get("name", "Общая задача")
    conv_id = domain_info.get("conversation_id")
    engine = domain_info.get("engine", "gemini")
    context_files = domain_info.get("context_files", [])

    print("\n" + "-" * 65)
    print(f"🎯 Определена категория:  {domain_name}")
    if conv_id:
        print(f"💬 Чат в Антигравити:     conversation://{conv_id}")
    if context_files:
        print(f"📁 Файлы контекста:       {', '.join(context_files)}")
    print(f"⚙️  Целевой движок:        {engine.upper()}")
    print("-" * 65)

    copy_to_clipboard(task_text)
    print("📋 Текст задачи скопирован в буфер обмена Windows.")

    # Выбор режима действия
    print("\nВыберите действие:")
    print("  1. [Enter] Запустить через внешний движок прямо сейчас (0 токенов Claude)")
    print("  2. Только открыть/перейти в соответствующий чат в Антигравити")
    print("  3. Выход")

    try:
        choice = input("\nВаш выбор [1]: ").strip()
    except (KeyboardInterrupt, EOFError):
        choice = "3"

    if choice in ("", "1"):
        if engine == "agron":
            print(f"\n🚀 Отправка задачи в Gemini Pro агенту «Агрон»...")
            cmd = [
                sys.executable,
                str(GEMINI_PIPELINE),
                "--path", str(PROJECT_DIR),
                "--agent", "agron",
                "--task", task_text
            ]
            subprocess.run(cmd)
        elif engine == "midjourney":
            print(f"\n🎨 Отправка задачи в Midjourney...")
            cmd = [
                sys.executable,
                str(MJ_PIPELINE),
                "--prompt", task_text
            ]
            subprocess.run(cmd)
        else:
            print(f"\n⚡ Отправка задачи в Gemini Pool для глубокого анализа...")
            cmd = [
                sys.executable,
                str(GEMINI_PIPELINE),
                "--path", str(PROJECT_DIR),
                "--task", task_text
            ]
            subprocess.run(cmd)
    elif choice == "2":
        if conv_id:
            print(f"\n🔗 Ссылка на чат: conversation://{conv_id}")
            print("Текст уже в буфере обмена! Просто перейдите в чат и нажмите Ctrl+V.")
        else:
            print("\nДля этого типа задач отдельный чат не зафиксирован.")
    
    print("\nГотово. Нажмите любую клавишу для закрытия...")
    try:
        input()
    except Exception:
        pass

if __name__ == "__main__":
    main()
