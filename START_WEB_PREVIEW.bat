@echo off
chcp 65001 >nul
title ПРЕЗЕНТАЦИЯ СЫГРАВШИЙ В ЯЩИК • PLAYBOX

echo ======================================================================
echo   Запуск локального веб-сервера презентации...
echo   Ссылка: http://localhost:8999/index.html
echo ======================================================================
echo.

cd /d "%~dp0"
start "" "http://localhost:8999/index.html"
python -m http.server 8999
