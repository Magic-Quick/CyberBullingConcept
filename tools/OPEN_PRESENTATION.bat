@echo off
chcp 65001 >nul
echo Открытие презентации «Сыгравший в ящик»...
cd /d "%~dp0.."
start "" "%~dp0..\index.html"
