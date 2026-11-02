@echo off
chcp 65001 >nul
python "%~dp0share_live_link.py" %*
pause
