@echo off
chcp 65001 >nul
echo ====================================================
echo   Запуск Presentation Server с перемоткой
echo   Порт: 8876 ^| Byte-Range Media Seeking
echo ====================================================
cd /d "%~dp0.."
start http://127.0.0.1:8876/index.html#playable-area
python tools\interactive\serve_presentation.py --port 8876
pause
