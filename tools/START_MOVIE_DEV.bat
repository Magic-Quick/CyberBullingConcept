@echo off
chcp 65001 >nul
echo ========================================================
echo   ЗАПУСК DEV-СЕРВЕРА ИНТЕРАКТИВНОГО ФИЛЬМА
echo   Порт: 5174 ^| PixiJS 8 ^| Vite
echo ========================================================
cd /d "%~dp0..\repo"
start http://localhost:5174
call npm.cmd run dev
pause
