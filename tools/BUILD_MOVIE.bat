@echo off
chcp 65001 >nul
echo ========================================================
echo   СБОРКА ИНТЕРАКТИВНОГО ФИЛЬМА (SINGLE-FILE HTML)
echo ========================================================
cd /d "%~dp0..\repo"
call npm.cmd run build
echo.
echo [✓] Сборка завершена в repo\dist\index.html
pause
