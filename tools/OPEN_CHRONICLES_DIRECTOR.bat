@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Режим режиссёра: http://127.0.0.1:8877/repo/dist/index.html?director
if not exist "repo\dist\index.html" (
  echo Сначала соберите кандидат: cd repo ^&^& npm run build:candidate
  pause
  exit /b 1
)
python tools\chronicles\project_server.py --port 8877 --open
if errorlevel 1 (
  echo Если сервер уже запущен, откройте указанный выше адрес.
  pause
)
