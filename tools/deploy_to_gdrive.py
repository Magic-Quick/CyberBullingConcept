"""
СЫГРАВШИЙ В ЯЩИК • Автоматический деплой веб-презентации на Google Диск.
Синхронизирует index.html и бандл web_assets/ в локальную папку Google Drive.
"""

import os
import sys
import shutil
import subprocess

def find_gdrive_path():
    candidates = [
        r"G:\Мой диск",
        r"G:\My Drive",
        os.path.expanduser(r"~\Google Drive"),
        os.path.expanduser(r"~\GoogleDrive"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None

def copy_bundle(src_dir, dst_dir):
    os.makedirs(dst_dir, exist_ok=True)
    
    # 1. Copy index.html and launchers
    files_to_copy = ["index.html", "OPEN_PRESENTATION.bat"]
    for fname in files_to_copy:
        src = os.path.join(src_dir, fname)
        dst = os.path.join(dst_dir, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [OK] Файл: {fname}")

    # 2. Sync assets (Vite production bundle: UI chassis, audio, textures, fonts)
    src_assets = os.path.join(src_dir, "assets")
    dst_assets = os.path.join(dst_dir, "assets")
    if os.path.exists(src_assets):
        print("  [..] Синхронизация assets (интерфейс, аудио, текстуры)...")
        cmd = ["robocopy", src_assets, dst_assets, "/E", "/NP", "/NFL", "/NDL", "/NJH", "/NJS"]
        res = subprocess.run(cmd, capture_output=True)
        if res.returncode < 8:
            print("  [OK] Папка assets синхронизирована!")
        else:
            print(f"  [!] Ошибка robocopy assets (код {res.returncode})")

    # 3. Sync web_assets (legacy raw assets)
    src_assets = os.path.join(src_dir, "web_assets")
    dst_assets = os.path.join(dst_dir, "web_assets")
    if os.path.exists(src_assets):
        print("  [..] Синхронизация папки web_assets (аудио, видео, графика)...")
        # Use robocopy for fast delta sync on Windows
        cmd = [
            "robocopy",
            src_assets,
            dst_assets,
            "/E",
            "/NP",
            "/NFL",
            "/NDL",
            "/NJH",
            "/NJS"
        ]
        res = subprocess.run(cmd, capture_output=True)
        # robocopy return codes < 8 mean success (0=no change, 1=copied, etc.)
        if res.returncode < 8:
            print("  [OK] Папка web_assets синхронизирована!")
        else:
            print(f"  [!] Предупреждение robocopy (код {res.returncode})")

def main():
    # Force UTF-8 stdout
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print()
    print("=" * 70)
    print("   СЫГРАВШИЙ В ЯЩИК • PLAYBOX CYBERBULLING CONCEPT")
    print("   Автоматический деплой презентации на Google Диск")
    print("=" * 70)
    print()

    # Determine root directory of project
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))

    index_html = os.path.join(root_dir, "index.html")
    if not os.path.exists(index_html):
        print(f"[ОШИБКА] Не найден файл презентации: {index_html}")
        sys.exit(1)

    # Find Google Drive
    gdrive_root = find_gdrive_path()
    if not gdrive_root:
        print("[ОШИБКА] Google Диск не обнаружен на компьютере!")
        print("Проверены пути:")
        print("  - G:\\Мой диск")
        print("  - G:\\My Drive")
        print("  - %USERPROFILE%\\Google Drive")
        print("Убедитесь, что приложение Google Drive для Windows запущено.")
        sys.exit(1)

    print(f"[1/3] Обнаружен Google Диск: {gdrive_root}")

    # Targets
    target_main = os.path.join(gdrive_root, "Сыгравший в ящик")
    target_public = os.path.join(gdrive_root, "Public", "Сыгравший в ящик")

    # Deploy to main target
    print(f"[2/3] Деплой в основную папку: {target_main}")
    copy_bundle(root_dir, target_main)

    # Deploy to Public target if Public exists
    if os.path.exists(os.path.join(gdrive_root, "Public")):
        print(f"      + Деплой в публичную папку: {target_public}")
        copy_bundle(root_dir, target_public)

    print()
    print("[3/3] Проверка целостности деплоя...")
    deployed_index = os.path.join(target_main, "index.html")
    if os.path.exists(deployed_index):
        size_kb = os.path.getsize(deployed_index) / 1024
        print(f"  [OK] index.html подтвержден ({size_kb:.1f} KB)")
        print()
        print("=" * 70)
        print("  [УСПЕХ] Презентация успешно развернута на Google Диске!")
        print("=" * 70)
        print()
        print(f"  Локальный путь на Google Диске:")
        print(f"    {deployed_index}")
        print()
        if os.path.exists(target_public):
            print(f"  Публичная папка для расшаривания ссылки коллегам:")
            print(f"    {os.path.join(target_public, 'index.html')}")
            print()
        print("  Google Drive FS синхронизирует все файлы в облако автоматически.")
        print()
        print(f"  Для локального запуска презентации кликните:")
        print(f"    {os.path.join(target_main, 'OPEN_PRESENTATION.bat')}")
        print()
    else:
        print("[ОШИБКА] Файлы не были скопированы!")
        sys.exit(1)

if __name__ == "__main__":
    main()
