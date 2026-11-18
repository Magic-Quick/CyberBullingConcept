@echo off
chcp 65001 >nul
echo ====================================================
echo   Presentation Server: перемотка и сохранение монтажа
echo   Порт: 8876 ^| Byte-Range Media Seeking
echo ====================================================
cd /d "%~dp0.."
start http://127.0.0.1:8876/index.html#playable-area
python tools\chronicles\project_server.py --port 8876
pause
