@echo off
chcp 65001 >nul
echo ====================================================
echo Запуск Co-Writer & Joke Keeper Studio Server...
echo Порт: 8765
echo ====================================================
cd /d "%~dp0.."
python tools\internal\studio\studio_server.py
pause
