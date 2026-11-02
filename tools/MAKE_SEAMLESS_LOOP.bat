@echo off
chcp 65001 >nul
echo ========================================================
echo   ХРОНИКИ ПРОДАКШЕН-КОВЧЕГА • БЕСШОВНОЕ ЗАЦИКЛИВАНИЕ
echo ========================================================
echo [*] Запуск алгоритма кроссфейд-интерполяции (Premiere-style)...
if "%~1"=="" (
    python "%~dp0visual_pipeline\make_seamless_loop.py"
) else (
    python "%~dp0visual_pipeline\make_seamless_loop.py" "%~1" "%~2" "%~3"
)
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Бесшовное видео успешно создано!
) else (
    echo.
    echo [ERR] Ошибка при обработке видео.
)
pause
