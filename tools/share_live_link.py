"""
СЫГРАВШИЙ В ЯЩИК • Генератор публичной онлайн-ссылки (Cloudflare Quick Tunnel).
Поднимает локальный веб-сервер и создает бесплатную HTTPS-ссылку для демонстрации коллегам.
"""

import os
import sys
import time
import re
import subprocess
import webbrowser

def main():
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print()
    print("=" * 70, flush=True)
    print("   СЫГРАВШИЙ В ЯЩИК • ПУБЛИЧНАЯ ССЫЛКА ПРЕЗЕНТАЦИИ", flush=True)
    print("   Создание безопасного HTTPS-туннеля Cloudflare...", flush=True)
    print("=" * 70, flush=True)
    print()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))
    cloudflared_bin = os.path.join(script_dir, "internal", "cloudflared.exe")

    if not os.path.exists(cloudflared_bin):
        print(f"[ОШИБКА] Не найден cloudflared.exe: {cloudflared_bin}", flush=True)
        sys.exit(1)

    port = 8999

    # 1. Запуск локального HTTP сервера
    print(f"[1/3] Запуск локального сервера (порт {port})...", flush=True)
    server_cmd = [sys.executable, "-m", "http.server", str(port)]
    server_proc = subprocess.Popen(server_cmd, cwd=root_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(1)

    # 2. Запуск Cloudflare Tunnel
    print("[2/3] Подключение к защищенной сети Cloudflare CDN...", flush=True)
    cf_cmd = [cloudflared_bin, "tunnel", "--url", f"http://127.0.0.1:{port}"]
    cf_proc = subprocess.Popen(cf_cmd, stderr=subprocess.PIPE, text=True, bufsize=1, encoding="utf-8", errors="replace")

    tunnel_url = None
    start_time = time.time()

    while time.time() - start_time < 30:
        line = cf_proc.stderr.readline()
        if not line:
            break
        m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if m:
            tunnel_url = m.group(0)
            break

    if not tunnel_url:
        print("[ОШИБКА] Не удалось получить публичную ссылку Cloudflare.", flush=True)
        server_proc.terminate()
        cf_proc.terminate()
        sys.exit(1)

    # Сохраняем в файл LATEST_LIVE_URL.txt
    url_file = os.path.join(root_dir, "LATEST_LIVE_URL.txt")
    with open(url_file, "w", encoding="utf-8") as f:
        f.write(tunnel_url + "\n")

    # Копирование в буфер обмена Windows
    try:
        cmd_clip = f'Set-Clipboard -Value "{tunnel_url}"'
        subprocess.run(["powershell", "-NoProfile", "-Command", cmd_clip], capture_output=True)
    except Exception:
        pass

    print()
    print("=" * 70, flush=True)
    print("  [ГОТОВО] ВАША ПУБЛИЧНАЯ ОНЛАЙН-ССЫЛКА:", flush=True)
    print()
    print(f"     🌐 {tunnel_url}", flush=True)
    print()
    print("  (Ссылка сохранена в LATEST_LIVE_URL.txt и скопирована в буфер!)", flush=True)
    print("=" * 70, flush=True)
    print()
    print("  - Ссылка открывается в любом браузере, на телефоне и любом ПК.", flush=True)
    print("  - Видео, аудио-треки ИИ-Лорда и арты работают на полной скорости.", flush=True)
    print("  - Сервер работает, пока открыто это окно (для закрытия нажмите Ctrl+C).", flush=True)
    print()

    # Открытие в браузере (если не в тихом режиме)
    if "--no-browser" not in sys.argv:
        webbrowser.open(tunnel_url)

    # Ожидание
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nОстановка сервера и туннеля...", flush=True)
    finally:
        cf_proc.terminate()
        server_proc.terminate()

if __name__ == "__main__":
    main()
